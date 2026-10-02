// Edge Function : claim-certificate-reward
// Applique le « 1 mois offert » du Certificat THRIVE Maison (CGU §5).
//
// Appelants :
//   • le trigger DB sur p3_rewards (en-tête x-push-secret = secret Vault
//     push_trigger_secret) — automatique à l'émission du certificat ;
//   • l'app du parent (JWT), juste après l'émission ou depuis le certificat —
//     filet si le trigger n'a pas pu partir. Idempotent dans les deux cas.
//
// Étapes :
//   1. Éligibilité revérifiée en base : récompense « certificat » présente ET
//      les 3 fiches cœur de la semaine 13 réalisées pour l'enfant.
//   2. Un seul crédit par famille (reward_grants, unique famille+récompense).
//   3. Montant = prix d'un mois de la formule MENSUELLE (lookup_key Stripe).
//   4. Selon l'abonnement du payeur :
//        stripe   → coupon « once » créé si absent, ajouté à l'abonnement
//                   (remises existantes conservées) → APPLIED ;
//        store    → STORE_MANUAL + alerte aux super-admins (code d'offre Apple/Google) ;
//        deferred → PENDING : create-checkout-session l'applique au prochain paiement.
//
// verify_jwt: false (le trigger n'a pas de JWT) — l'autorisation est faite ici.
// Secrets : STRIPE_SECRET_KEY ; Vault : push_trigger_secret (via push_config()).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, ensureAmountCoupon, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { isUuid, PLAN_LOOKUP_KEYS } from "../_shared/billing_core.ts";
import {
  billableSubscription,
  CERTIFICATE_ACTIVITIES,
  CERTIFICATE_COUPON_NAME,
  CERTIFICATE_REWARD_ID,
  couponIdFor,
  discountsWithCoupon,
  isCertificateEarned,
  pickPayer,
  rewardChannel,
  type SubscriptionMirror,
} from "../_shared/reward_core.ts";

type Grant = {
  id: string;
  status: string;
  channel: string | null;
  amount_minor: number | null;
  currency: string | null;
};

Deno.serve(withSentry("claim-certificate-reward", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const childId = body?.child_id;
    if (!isUuid(childId)) return fail("validation", "child_id invalide", 422);

    // ── Autorisation : trigger DB (secret partagé) ou parent de la famille ──
    let callerId: string | null = null;
    const secret = req.headers.get("x-push-secret");
    if (secret) {
      const { data: cfg } = await admin.rpc("push_config");
      if (!cfg?.push_trigger_secret || secret !== cfg.push_trigger_secret) {
        return fail("forbidden", "Secret invalide", 403);
      }
    } else {
      const user = await authUser(req);
      if (!user) return fail("unauthorized", "Authentification requise", 401);
      callerId = user.id;
    }

    // ── Famille de l'enfant et appartenance de l'appelant ──
    const { data: child } = await admin
      .from("children")
      .select("id, family_id, families(id, parent_id)")
      .eq("id", childId)
      .maybeSingle();
    const family = (Array.isArray(child?.families) ? child?.families[0] : child?.families) as
      | { id: string; parent_id: string }
      | null
      | undefined;
    if (!child || !family) return fail("not_found", "Enfant introuvable", 404);

    if (callerId && callerId !== family.parent_id) {
      const { data: member } = await admin
        .from("family_members")
        .select("id")
        .eq("family_id", family.id)
        .eq("profile_id", callerId)
        .in("member_role", ["OWNER", "PARENT"])
        .maybeSingle();
      if (!member) return fail("forbidden", "Cet enfant n'appartient pas à ta famille", 403);
    }

    // ── 1. Éligibilité revérifiée ──
    const [{ data: reward }, { data: moments }] = await Promise.all([
      admin.from("p3_rewards").select("reward_id").eq("child_id", childId).eq("reward_id", CERTIFICATE_REWARD_ID).maybeSingle(),
      admin.from("p3_moments").select("activity_id").eq("child_id", childId).in("activity_id", [...CERTIFICATE_ACTIVITIES]),
    ]);
    if (!reward || !isCertificateEarned((moments ?? []).map((m) => m.activity_id as string))) {
      return fail("not_eligible", "Le certificat n'est pas encore obtenu", 409);
    }

    // ── 2. Crédit unique par famille ──
    const { data: existing } = await admin
      .from("reward_grants")
      .select("id, status, channel, amount_minor, currency")
      .eq("family_id", family.id)
      .eq("reward_id", CERTIFICATE_REWARD_ID)
      .maybeSingle();
    let grant = existing as Grant | null;
    if (grant && (grant.status === "APPLIED" || grant.status === "STORE_MANUAL")) {
      return json({ status: grant.status, channel: grant.channel, grant_id: grant.id });
    }
    if (!grant) {
      const { data: created, error } = await admin
        .from("reward_grants")
        .insert({ family_id: family.id, reward_id: CERTIFICATE_REWARD_ID, child_id: childId })
        .select("id, status, channel, amount_minor, currency")
        .single();
      if (error) {
        // Course entre le trigger et l'app : l'autre appel a créé la ligne.
        if (error.code === "23505") return json({ status: "PENDING", channel: null });
        throw new Error(`reward_grants: ${error.message}`);
      }
      grant = created as Grant;
    }

    // ── 3. Montant : un mois de la formule mensuelle ──
    const prices = await stripe<{ data: { unit_amount: number | null; currency: string }[] }>("GET", "/prices", {
      active: true,
      lookup_keys: [PLAN_LOOKUP_KEYS.mensuel],
      limit: 1,
    });
    const price = prices.data[0];
    if (!price?.unit_amount) return fail("not_found", "Prix mensuel introuvable", 404);
    const amount = price.unit_amount;
    const currency = price.currency;

    // ── 4. Payeur et canal ──
    const ids = [...new Set([callerId, family.parent_id].filter(Boolean) as string[])];
    const { data: subs } = await admin
      .from("billing_subscriptions")
      .select("user_id, active, store, expires_at, stripe_customer_id")
      .in("user_id", ids);
    const rows = (subs ?? []) as NonNullable<SubscriptionMirror>[];
    const ordered = ids.map((id) => rows.find((r) => r.user_id === id) ?? null).filter(Boolean) as SubscriptionMirror[];
    const now = new Date();
    const payer = pickPayer(ordered, family.parent_id, now);
    const channel = rewardChannel(payer, now);
    const payerId = payer?.user_id ?? family.parent_id;

    const update = async (patch: Record<string, unknown>) => {
      const { error } = await admin
        .from("reward_grants")
        .update({ payer_id: payerId, amount_minor: amount, currency, ...patch })
        .eq("id", grant!.id);
      if (error) throw new Error(`reward_grants: ${error.message}`);
    };

    if (channel === "store") {
      await update({ status: "STORE_MANUAL", channel: "store", applied_at: null });
      const { data: supers } = await admin.from("profiles").select("id").eq("role", "SUPER_ADMIN").eq("is_active", true);
      if (supers?.length) {
        await admin.from("notifications").insert(
          supers.map((s) => ({
            user_id: s.id,
            type: "ADMIN_ALERT",
            title: "Certificat Maison : 1 mois à offrir (App Store / Google Play)",
            body: `Une famille abonnée sur ${payer?.store === "play_store" ? "Google Play" : "l'App Store"} a obtenu le certificat : remettre un code d'offre d'un mois.`,
            data: { path: "/admin/families", family_id: family.id, reward_grant_id: grant!.id },
          })),
        );
      }
      return json({ status: "STORE_MANUAL", channel: "store", grant_id: grant.id });
    }

    if (channel === "deferred") {
      await update({ status: "PENDING", channel: "deferred" });
      return json({ status: "PENDING", channel: "deferred", grant_id: grant.id });
    }

    // channel === "stripe" : coupon unique par montant, ajouté à l'abonnement
    const couponId = couponIdFor(amount, currency);
    await ensureAmountCoupon(couponId, amount, currency, CERTIFICATE_COUPON_NAME);

    const list = await stripe<{ data: { id: string; status: string; created: number; discounts?: (string | { id: string })[] }[] }>(
      "GET",
      "/subscriptions",
      { customer: payer!.stripe_customer_id!, status: "all", limit: 20 },
    );
    const sub = billableSubscription(list.data);
    if (!sub) {
      // Le miroir disait « actif » mais Stripe n'a rien de facturable : crédit réservé.
      await update({ status: "PENDING", channel: "deferred" });
      return json({ status: "PENDING", channel: "deferred", grant_id: grant.id });
    }

    try {
      await stripe("POST", `/subscriptions/${sub.id}`, {
        discounts: discountsWithCoupon(sub.discounts, couponId),
        metadata: { reward_grant_id: grant.id },
      }, `reward-${grant.id}`);
    } catch (e) {
      await update({ status: "FAILED", channel: "stripe", error: e instanceof Error ? e.message.slice(0, 500) : "stripe" });
      throw e;
    }
    await update({
      status: "APPLIED",
      channel: "stripe",
      stripe_coupon_id: couponId,
      stripe_subscription_id: sub.id,
      applied_at: new Date().toISOString(),
      error: null,
    });
    return json({ status: "APPLIED", channel: "stripe", grant_id: grant.id });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement web non configuré", 503);
    }
    await captureError(e);
    return fail(e instanceof StripeError ? "stripe_error" : "internal", e instanceof Error ? e.message : "Erreur interne", e instanceof StripeError ? 502 : 500);
  }
}));

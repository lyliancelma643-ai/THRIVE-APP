// Edge Function : create-checkout-session
// Crée une session Stripe Checkout (abonnement P3, web) pour le parent connecté.
//
//   • App User ID = id Supabase, posé à la fois dans `client_reference_id`, dans
//     les metadata de la session ET dans celles de l'abonnement (`app_user_id`) :
//     RevenueCat et notre webhook retrouvent le compte quoi qu'il arrive.
//   • Essai gratuit de TRIAL_DAYS jours, une seule fois par compte ; la carte est
//     toujours demandée (payment_method_collection=always).
//   • Refus si un abonnement est déjà actif, quelle que soit la plateforme
//     (évite le double prélèvement web + App Store). Filet indépendant du
//     miroir RevenueCat : l'historique Stripe du client est relu (abonnement
//     encore facturable → 409 ; abonnement passé → plus d'essai).
//   • Une seule session de paiement ouverte par compte : les précédentes sont
//     expirées (deux onglets ne peuvent pas créer deux abonnements).
//   • Client Stripe unique par compte, réutilisé (portail client, cartes).
//   • success_url / cancel_url ramènent sur /parent/abonnement (origine filtrée).
//   • « 1 mois offert » du Certificat Maison réservé (reward_grants PENDING,
//     famille du parent) : posé en remise sur la session ; le webhook le marque
//     appliqué au paiement. Stripe interdit alors les codes promo dans la même session.
//
// verify_jwt: true · rôle : PARENT.
// Secrets : STRIPE_SECRET_KEY, APP_ORIGINS (optionnel).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, ensureAmountCoupon, env, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { CERTIFICATE_COUPON_NAME, CERTIFICATE_REWARD_ID, couponIdFor } from "../_shared/reward_core.ts";
import {
  isPlanCode,
  parseOrigins,
  PLAN_LOOKUP_KEYS,
  resolveReturnOrigin,
  stripeHistoryVerdict,
  TRIAL_DAYS,
} from "../_shared/billing_core.ts";

Deno.serve(withSentry("create-checkout-session", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);
    if (user.role !== "PARENT") {
      return fail("forbidden", "Votre rôle donne déjà accès à tout le contenu", 403);
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    if (!isPlanCode(plan)) return fail("validation", "Plan invalide (mensuel | annuel)", 422);

    const admin = adminClient();
    const { data: row } = await admin
      .from("billing_subscriptions")
      .select("active, expires_at, ever_subscribed, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stillActive = row?.active === true && (!row.expires_at || new Date(row.expires_at) > new Date());
    if (stillActive) {
      return fail("already_subscribed", "Votre abonnement est déjà actif", 409);
    }

    // Prix actif par lookup_key (le montant vit dans Stripe, jamais ici).
    const prices = await stripe<{ data: { id: string }[] }>("GET", "/prices", {
      active: true,
      lookup_keys: [PLAN_LOOKUP_KEYS[plan]],
      limit: 1,
    });
    const priceId = prices.data[0]?.id;
    if (!priceId) return fail("not_found", "Offre introuvable", 404);

    // Client Stripe unique par compte.
    let customerId = row?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe<{ id: string }>("POST", "/customers", {
        email: user.email ?? undefined,
        preferred_locales: ["fr-CA", "fr"],
        metadata: { app_user_id: user.id },
      }, `customer-${user.id}`);
      customerId = customer.id;
      const { error } = await admin.from("billing_subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(`billing_subscriptions: ${error.message}`);
    }

    const origin = resolveReturnOrigin(
      body?.origin ?? req.headers.get("origin"),
      parseOrigins(env("APP_ORIGINS")),
    );
    let trialEligible = row?.ever_subscribed !== true;

    // Filet Stripe (si RevenueCat a manqué un événement) + sessions ouvertes.
    if (row?.stripe_customer_id) {
      const history = await stripe<{ data: { status: string }[] }>("GET", "/subscriptions", {
        customer: customerId,
        status: "all",
        limit: 100,
      });
      const verdict = stripeHistoryVerdict(history.data);
      if (verdict.billable) return fail("already_subscribed", "Votre abonnement est déjà actif", 409);
      if (verdict.everSubscribed) trialEligible = false;

      const open = await stripe<{ data: { id: string }[] }>("GET", "/checkout/sessions", {
        customer: customerId,
        status: "open",
        limit: 100,
      });
      for (const s of open.data) {
        await stripe("POST", `/checkout/sessions/${s.id}/expire`);
      }
    }

    // Crédit du certificat réservé pour la famille (titulaire ou co-parent).
    const { data: owned } = await admin.from("families").select("id").eq("parent_id", user.id);
    const { data: joined } = await admin
      .from("family_members").select("family_id").eq("profile_id", user.id).in("member_role", ["OWNER", "PARENT"]);
    const familyIds = [...new Set([...(owned ?? []).map((f) => f.id), ...(joined ?? []).map((m) => m.family_id)])];
    let rewardGrantId: string | null = null;
    let couponId: string | null = null;
    if (familyIds.length) {
      const { data: grant } = await admin
        .from("reward_grants")
        .select("id, amount_minor, currency")
        .in("family_id", familyIds)
        .eq("reward_id", CERTIFICATE_REWARD_ID)
        .eq("status", "PENDING")
        .limit(1)
        .maybeSingle();
      if (grant?.amount_minor && grant.currency) {
        couponId = couponIdFor(grant.amount_minor, grant.currency);
        await ensureAmountCoupon(couponId, grant.amount_minor, grant.currency, CERTIFICATE_COUPON_NAME);
        rewardGrantId = grant.id;
      }
    }

    const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      ...(couponId ? { discounts: [{ coupon: couponId }] } : { allow_promotion_codes: true }),
      locale: "fr-CA",
      billing_address_collection: "auto",
      customer_update: { address: "auto", name: "auto" },
      metadata: { app_user_id: user.id, plan, ...(rewardGrantId ? { reward_grant_id: rewardGrantId } : {}) },
      subscription_data: {
        metadata: { app_user_id: user.id, plan },
        ...(trialEligible
          ? {
              trial_period_days: TRIAL_DAYS,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
            }
          : {}),
      },
      success_url: `${origin}/parent/abonnement?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/parent/abonnement?checkout=cancel`,
    });

    return json({ url: session.url, id: session.id });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement web non configuré", 503);
    }
    await captureError(e);
    const message = e instanceof Error ? e.message : "Erreur interne";
    return fail(e instanceof StripeError ? "stripe_error" : "internal", message, e instanceof StripeError ? 502 : 500);
  }
}));

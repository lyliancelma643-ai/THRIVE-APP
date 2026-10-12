// Edge Function : create-program-checkout
// Session Stripe Checkout (mode=payment) pour un programme THRIVE
// (Groupe · Individuel · Complet), 1er versement ou paiement en une fois.
//
//   • Le client envoie SEULEMENT { pack, mode, origin? } (Zod strict) : tout
//     montant / prix / devise reçu est refusé (422). Le montant vient de
//     _shared/program_billing.ts et est revérifié en SQL (program_create_order).
//   • Refus d'un second pack : pack en cours (le sien ou celui du titulaire de
//     sa famille) ou commande déjà active → 409 (même règle que 080).
//   • Carte conservée pour le versement 2 (setup_future_usage=off_session).
//   • Prix : lookup_key du catalogue s'il correspond au montant serveur, sinon
//     price_data (voir buildProgramCheckoutParams).
//   • automatic_tax seulement si STRIPE_TAX_ENABLED=true (défaut : false).
//   • Loi 25 : seuls l'id du compte et le courriel du parent vont chez Stripe ;
//     aucune donnée d'enfant.
//   • success_url / cancel_url → /parent/programme/{pack} (origine filtrée par
//     APP_ORIGINS, même mécanique que create-checkout-session).
//
// verify_jwt: true · rôle : PARENT.
// Secrets : STRIPE_SECRET_KEY, APP_ORIGINS (optionnel), STRIPE_TAX_ENABLED (optionnel).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, env, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { hasActivePack, parseOrigins, resolveReturnOrigin } from "../_shared/billing_core.ts";
import {
  buildProgramCheckoutParams,
  catalogPriceMatches,
  envFlag,
  installmentHtCents,
  programLookupKey,
  programQuote,
  ProgramCheckoutRequest,
} from "../_shared/program_billing.ts";

const DB_ERRORS: Record<string, [string, string, number]> = {
  pack_active: ["pack_active", "Un pack THRIVE est déjà en cours", 409],
  already_enrolled: ["already_enrolled", "Une inscription est déjà en cours", 409],
  amount_mismatch: ["amount_mismatch", "Montant incohérent", 500],
};

Deno.serve(withSentry("create-program-checkout", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);
    if (user.role !== "PARENT") return fail("forbidden", "Réservé aux parents", 403);

    const parsed = ProgramCheckoutRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("validation", "Requête invalide (pack, mode)", 422);
    const { pack, mode } = parsed.data;

    const admin = adminClient();

    // Pack en cours (le sien ou celui du titulaire de sa famille) → pas de second pack.
    const { data: memberships } = await admin
      .from("family_members").select("families(parent_id)").eq("profile_id", user.id);
    const holders = [
      user.id,
      ...((memberships ?? []) as { families: { parent_id: string } | { parent_id: string }[] | null }[])
        .flatMap((m) => (Array.isArray(m.families) ? m.families : m.families ? [m.families] : []))
        .map((f) => f.parent_id),
    ];
    const { data: packs } = await admin
      .from("pack_enrollments").select("starts_on, ends_on").in("parent_id", holders);
    if (hasActivePack(packs)) return fail("pack_active", "Un pack THRIVE est déjà en cours", 409);

    // Commandes en attente : leur session Checkout est expirée (une seule ouverte).
    const { data: pending } = await admin
      .from("program_orders").select("id, status, stripe_checkout_session_id")
      .eq("parent_id", user.id).in("status", ["en_attente", "active"]);
    if ((pending ?? []).some((o) => o.status === "active")) {
      return fail("already_enrolled", "Une inscription est déjà en cours", 409);
    }

    // Client Stripe unique par compte (partagé avec Maison web).
    const { data: billing } = await admin
      .from("billing_subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    let customerId: string | null = billing?.stripe_customer_id ?? null;
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

    for (const o of pending ?? []) {
      if (o.stripe_checkout_session_id) {
        await stripe("POST", `/checkout/sessions/${o.stripe_checkout_session_id}/expire`).catch(() => {});
      }
    }

    // Commande + versement 1 (montant serveur revérifié en SQL).
    const amount = installmentHtCents(pack, mode, 1);
    const { data: created, error: orderErr } = await admin.rpc("program_create_order", {
      p_parent: user.id, p_pack: pack, p_mode: mode, p_amount_ht: amount, p_customer: customerId,
    });
    if (orderErr) {
      const known = DB_ERRORS[orderErr.message];
      if (known) return fail(known[0], known[1], known[2]);
      throw new Error(`program_create_order: ${orderErr.message}`);
    }
    const orderId = String((created as Record<string, unknown>).order_id);
    const installmentId = String((created as Record<string, unknown>).installment_id);

    // Prix du catalogue s'il est conforme au montant serveur, sinon price_data.
    let priceId: string | null = null;
    try {
      const prices = await stripe<{ data: { id: string; unit_amount: number; currency: string; tax_behavior: string; active: boolean }[] }>(
        "GET", "/prices", { active: true, lookup_keys: [programLookupKey(pack, mode)], limit: 1 },
      );
      const p = prices.data[0];
      if (catalogPriceMatches(p, amount)) priceId = p.id;
      else if (p) await captureError(new Error(`Prix ${programLookupKey(pack, mode)} ≠ montant serveur : repli price_data`));
    } catch (e) {
      if (e instanceof StripeError && e.code === "not_configured") throw e;
      await captureError(e);
    }

    const origin = resolveReturnOrigin(parsed.data.origin ?? req.headers.get("origin"), parseOrigins(env("APP_ORIGINS")));
    const back = `${origin}/parent/programme/${pack.toLowerCase()}`;

    let session: { id: string; url: string; expires_at?: number };
    try {
      session = await stripe<{ id: string; url: string; expires_at?: number }>(
        "POST", "/checkout/sessions",
        buildProgramCheckoutParams({
          pack, mode, rank: 1, orderId, installmentId, appUserId: user.id, customerId, priceId,
          taxEnabled: envFlag(env("STRIPE_TAX_ENABLED")),
          successUrl: `${back}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${back}?checkout=cancel`,
        }),
        `program-checkout-${orderId}`,
      );
    } catch (e) {
      await admin.from("program_orders").update({ status: "annulee", updated_at: new Date().toISOString() }).eq("id", orderId);
      throw e;
    }

    await admin.from("program_orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);
    await admin.from("program_installments").update({
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      checkout_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    }).eq("id", installmentId);

    return json({ url: session.url, id: session.id, order_id: orderId, quote: programQuote(pack, mode) });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement non configuré", 503);
    }
    await captureError(e);
    const message = e instanceof Error ? e.message : "Erreur interne";
    return fail(e instanceof StripeError ? "stripe_error" : "internal", message, e instanceof StripeError ? 502 : 500);
  }
}));

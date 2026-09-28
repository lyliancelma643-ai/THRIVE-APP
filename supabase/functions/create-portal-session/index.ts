// Edge Function : create-portal-session
// Lien vers le Portail client Stripe : l'abonné web annule, change de carte,
// de formule (mensuel ↔ annuel) ou télécharge ses factures en autonomie.
// Réservé aux abonnements pris sur le web (store = stripe) : un abonnement
// App Store / Google Play se gère dans les réglages du téléphone.
// verify_jwt: true · rôle : PARENT. Secrets : STRIPE_SECRET_KEY, APP_ORIGINS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, env, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { parseOrigins, resolveReturnOrigin } from "../_shared/billing_core.ts";

Deno.serve(withSentry("create-portal-session", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);

    const { data: row } = await adminClient()
      .from("billing_subscriptions")
      .select("stripe_customer_id, store")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row?.stripe_customer_id) {
      return fail("not_found", "Aucun abonnement web associé à ce compte", 404);
    }
    if (row.store && row.store !== "stripe") {
      return fail("wrong_store", "Cet abonnement se gère depuis votre téléphone", 409);
    }

    const body = await req.json().catch(() => ({}));
    const origin = resolveReturnOrigin(
      body?.origin ?? req.headers.get("origin"),
      parseOrigins(env("APP_ORIGINS")),
    );

    const portal = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: row.stripe_customer_id,
      return_url: `${origin}/parent/abonnement?portal=return`,
      locale: "fr-CA",
    });

    return json({ url: portal.url });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement web non configuré", 503);
    }
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

// Edge Function : billing-sync
// Resynchronise l'accès du compte connecté depuis RevenueCat (source de vérité).
//   • Retour de Stripe Checkout : `session_id` fourni → on vérifie que la session
//     appartient bien à ce compte (client_reference_id), on déclare l'abonnement
//     à RevenueCat (POST /v1/receipts), puis on relit l'état. Le déblocage ne
//     dépend donc pas de la vitesse des webhooks.
//   • Sans `session_id` : bouton « Actualiser mon accès » (restauration web).
// verify_jwt: true · tout compte connecté.
// Secrets : STRIPE_SECRET_KEY, REVENUECAT_SECRET_API_KEY, REVENUECAT_STRIPE_PUBLIC_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import {
  adminClient,
  authUser,
  corsHeaders,
  fail,
  json,
  rcPostStripeReceipt,
  stripe,
  syncFromRevenueCat,
} from "../_shared/billing.ts";
import { appUserIdFromCheckoutSession } from "../_shared/billing_core.ts";
import { consumeRateLimit, RATE_LIMITS, tooManyRequests } from "../_shared/rate-limit.ts";

Deno.serve(withSentry("billing-sync", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);

    const rl = await consumeRateLimit(user.id, RATE_LIMITS.billingSync);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id : null;
    const admin = adminClient();

    if (sessionId) {
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
        return fail("validation", "session_id invalide", 422);
      }
      const session = await stripe<{
        client_reference_id: string | null;
        metadata: Record<string, string> | null;
        subscription: string | null;
        customer: string | null;
        status: string;
      }>("GET", `/checkout/sessions/${sessionId}`);

      if (appUserIdFromCheckoutSession(session) !== user.id.toLowerCase()) {
        return fail("forbidden", "Cette session de paiement n'appartient pas à ce compte", 403);
      }
      if (session.status === "complete" && session.subscription) {
        await rcPostStripeReceipt(user.id, session.subscription);
        if (session.customer) {
          await admin.from("billing_subscriptions").upsert(
            { user_id: user.id, stripe_customer_id: session.customer },
            { onConflict: "user_id" },
          );
        }
      }
    }

    const status = await syncFromRevenueCat(admin, user.id);
    return json({ status });
  } catch (e) {
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

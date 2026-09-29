// Edge Function : stripe-webhook
// Événements Stripe de l'abonnement web P3 (signature vérifiée à la main —
// HMAC SHA-256, tolérance 5 min, comparaison à temps constant).
//
//   • checkout.session.completed (mode subscription) : déclare l'abonnement à
//     RevenueCat pour l'App User ID porté par la session (client_reference_id),
//     mémorise le client Stripe, puis resynchronise le miroir.
//   • customer.subscription.created / updated / deleted, invoice.paid,
//     invoice.payment_failed : l'abonnement est redéclaré à RevenueCat (qui
//     relit Stripe) puis le miroir est resynchronisé (l'état fait foi chez
//     RevenueCat, jamais ici).
//
// Toujours 200 une fois la signature validée (sauf erreur interne) : Stripe
// ne réessaie que sur 5xx, et chaque traitement est idempotent.
// verify_jwt: FALSE (authentification par signature Stripe).
// Secrets : STRIPE_WEBHOOK_SECRET, REVENUECAT_SECRET_API_KEY, REVENUECAT_STRIPE_PUBLIC_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, env, json, rcPostStripeReceipt, syncFromRevenueCat } from "../_shared/billing.ts";
import { appUserIdFromCheckoutSession, isUuid } from "../_shared/billing_core.ts";
import { verifyStripeSignature } from "./verify.ts";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
]);
const INVOICE_EVENTS = new Set(["invoice.paid", "invoice.payment_failed"]);

Deno.serve(withSentry("stripe-webhook", async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const secret = env("STRIPE_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Webhook non configuré" }, 503);

    const signature = req.headers.get("Stripe-Signature");
    if (!signature) return json({ error: "Signature manquante" }, 400);

    const payload = await req.text();
    if (!(await verifyStripeSignature(payload, signature, secret))) {
      return json({ error: "Signature invalide" }, 400);
    }

    const event = JSON.parse(payload);
    const object = event?.data?.object ?? {};
    const admin = adminClient();

    if (event?.type === "checkout.session.completed") {
      if (object.mode !== "subscription") return json({ received: true, ignored: "mode" });
      const appUserId = appUserIdFromCheckoutSession(object);
      if (!appUserId) return json({ received: true, ignored: "no_app_user_id" });

      if (object.customer) {
        await admin.from("billing_subscriptions").upsert(
          { user_id: appUserId, stripe_customer_id: object.customer },
          { onConflict: "user_id" },
        );
      }
      if (object.subscription) await rcPostStripeReceipt(appUserId, object.subscription);
      await syncFromRevenueCat(admin, appUserId);
      return json({ received: true });
    }

    if (SUBSCRIPTION_EVENTS.has(event?.type) || INVOICE_EVENTS.has(event?.type)) {
      const meta = INVOICE_EVENTS.has(event.type)
        ? object?.subscription_details?.metadata ?? object?.parent?.subscription_details?.metadata
        : object?.metadata;
      let appUserId: string | null = isUuid(meta?.app_user_id) ? meta.app_user_id : null;

      // Repli : retrouver le compte par le client Stripe.
      if (!appUserId && typeof object.customer === "string") {
        const { data } = await admin
          .from("billing_subscriptions").select("user_id")
          .eq("stripe_customer_id", object.customer).maybeSingle();
        appUserId = data?.user_id ?? null;
      }
      if (!appUserId) return json({ received: true, ignored: "no_app_user_id" });

      // On (re)déclare l'abonnement à RevenueCat à chaque événement : RC relit
      // alors l'état chez Stripe (renouvellement, annulation, impayé, fin
      // d'essai…) même si son propre webhook Stripe n'est pas configuré.
      const subscriptionId: string | null = INVOICE_EVENTS.has(event.type)
        ? (typeof object.subscription === "string" ? object.subscription : null) ??
          object?.parent?.subscription_details?.subscription ?? null
        : typeof object.id === "string" ? object.id : null;
      if (subscriptionId) await rcPostStripeReceipt(appUserId, subscriptionId);
      await syncFromRevenueCat(admin, appUserId);
      return json({ received: true });
    }

    return json({ received: true, ignored: event?.type ?? "unknown" });
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

// Edge Function : revenuecat-webhook
// Point d'entrée UNIQUE de l'état d'abonnement, toutes plateformes (Stripe,
// App Store, Google Play, accès offerts) : RevenueCat appelle cette URL à chaque
// événement (achat, renouvellement, annulation, expiration, problème de
// paiement, transfert…). On ne fait pas confiance au contenu de l'événement :
// on relit l'état chez RevenueCat pour chaque compte concerné, puis on met à
// jour le miroir billing_subscriptions (qui pilote la RLS de « Maison »).
//
// Authentification : en-tête Authorization = REVENUECAT_WEBHOOK_AUTH (valeur
// posée dans RevenueCat > Integrations > Webhooks), comparée à temps constant.
// verify_jwt: FALSE. Secrets : REVENUECAT_WEBHOOK_AUTH, REVENUECAT_SECRET_API_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, env, json, syncFromRevenueCat } from "../_shared/billing.ts";
import { appUserIdsFromRcEvent, constantTimeEqual } from "../_shared/billing_core.ts";

Deno.serve(withSentry("revenuecat-webhook", async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const expected = env("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) return json({ error: "Webhook non configuré" }, 503);
  const received = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(received, expected) && !constantTimeEqual(received, `Bearer ${expected}`)) {
    return json({ error: "Non autorisé" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event ?? {};
    if (event.type === "TEST") return json({ received: true, test: true });

    const ids = appUserIdsFromRcEvent(event);
    const admin = adminClient();
    for (const id of ids) {
      await syncFromRevenueCat(admin, id);
    }
    return json({ received: true, synced: ids.length });
  } catch (e) {
    await captureError(e);
    // 500 → RevenueCat réessaie (backoff), la synchro est idempotente.
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

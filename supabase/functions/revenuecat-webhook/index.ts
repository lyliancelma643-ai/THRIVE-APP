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
// En plus (audit P1-14) : signature HMAC-SHA256 X-RevenueCat-Webhook-Signature
// (t=<unix>,v1=<hex> sur `${t}.${corps brut}`, fenêtre de 5 min), cf. signature.ts.
// REVENUECAT_WEBHOOK_HMAC_SECRET (secret de signature RevenueCat) :
//   • posé   → signature OBLIGATOIRE, rejet 401 si absente/invalide/expirée ;
//   • absent → HMAC non exigé (compat. tant que la signature n'est pas activée
//              côté RevenueCat) ; seul l'en-tête Authorization protège alors.
// verify_jwt: FALSE. Secrets : REVENUECAT_WEBHOOK_AUTH, REVENUECAT_SECRET_API_KEY,
// REVENUECAT_WEBHOOK_HMAC_SECRET (optionnel, recommandé).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, env, json, syncFromRevenueCat } from "../_shared/billing.ts";
import { appUserIdsFromRcEvent, constantTimeEqual } from "../_shared/billing_core.ts";
import { SIGNATURE_HEADER, verifyRevenueCatSignature } from "./signature.ts";

Deno.serve(withSentry("revenuecat-webhook", async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const expected = env("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) return json({ error: "Webhook non configuré" }, 503);
  const received = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqual(received, expected) && !constantTimeEqual(received, `Bearer ${expected}`)) {
    return json({ error: "Non autorisé" }, 401);
  }

  // Corps brut lu une seule fois, en OCTETS : la signature porte sur les octets
  // exacts reçus (pas de décodage/ré-encodage UTF-8 avant la vérification).
  const rawBytes = new Uint8Array(await req.arrayBuffer());
  const hmacSecret = env("REVENUECAT_WEBHOOK_HMAC_SECRET");
  if (hmacSecret) {
    const verdict = await verifyRevenueCatSignature(req.headers.get(SIGNATURE_HEADER), rawBytes, hmacSecret);
    if (!verdict.ok) return json({ error: "Signature invalide", reason: verdict.reason }, 401);
  }

  try {
    let body: { event?: Record<string, unknown> } = {};
    try {
      body = JSON.parse(new TextDecoder().decode(rawBytes));
    } catch {
      body = {};
    }
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

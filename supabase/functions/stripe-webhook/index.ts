// Edge Function : stripe-webhook
// Réception des événements Stripe (signature vérifiée manuellement — HMAC
// SHA-256, tolérance 5 min). Sur checkout.session.completed : écrit
// l'entitlement ACTIVE de la famille ; le trigger de la migration 038
// synchronise families.pack (seul chemin d'écriture autorisé, service_role).
// verify_jwt: FALSE (authentification par signature Stripe, pas par JWT).
// Secrets requis : STRIPE_WEBHOOK_SECRET.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { isValidPlanCode, verifyStripeSignature } from "./verify.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(withSentry("stripe-webhook", async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Webhook non configuré" }, 503);

    const signature = req.headers.get("Stripe-Signature");
    if (!signature) return json({ error: "Signature manquante" }, 400);

    const payload = await req.text();
    const valid = await verifyStripeSignature(payload, signature, secret);
    if (!valid) return json({ error: "Signature invalide" }, 400);

    const event = JSON.parse(payload);

    if (event?.type === "checkout.session.completed") {
      const session = event.data?.object ?? {};
      const familyId = session?.metadata?.family_id;
      const planCode = session?.metadata?.plan_code;
      if (!familyId || !planCode) return json({ error: "Metadata incomplète" }, 400);
      if (!isValidPlanCode(planCode)) {
        return json({ error: "plan_code invalide" }, 400);
      }

      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Un seul entitlement ACTIVE par famille (index unique) : on met à jour
      // l'actif s'il existe, sinon on le crée. Le trigger 038 fait le reste.
      const { data: active } = await admin
        .from("entitlements").select("id")
        .eq("family_id", familyId).eq("status", "ACTIVE").maybeSingle();

      if (active?.id) {
        const { error } = await admin
          .from("entitlements")
          .update({ plan_id: planCode, starts_at: new Date().toISOString() })
          .eq("id", active.id);
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await admin
          .from("entitlements")
          .insert({ family_id: familyId, plan_id: planCode, status: "ACTIVE" });
        if (error) return json({ error: error.message }, 500);
      }
    }

    return json({ received: true }, 200);
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

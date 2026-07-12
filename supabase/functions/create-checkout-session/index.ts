// Edge Function : create-checkout-session
// Crée une session Stripe Checkout (paiement unique, CAD) pour l'upgrade de
// forfait d'une famille. Le paiement validé déclenche le webhook stripe-webhook
// qui écrit l'entitlement — jamais d'écriture directe de families.pack ici.
// verify_jwt: true  ·  rôle: PARENT (propriétaire de la famille)
// Secrets requis : STRIPE_SECRET_KEY (sinon 503 not_configured, repli UI).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withSentry, captureError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (code: string, message: string, status: number) => json({ code, message }, status);

const PACK_ORDER = ["ESSENTIEL", "AVANCE", "PERFORMANCE"];

Deno.serve(withSentry("create-checkout-session", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return fail("not_configured", "Paiement en ligne non configuré", 503);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("unauthorized", "Authentification requise", 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return fail("unauthorized", "Utilisateur introuvable", 401);

    const body = await req.json().catch(() => ({}));
    const planCode = String(body?.plan_code ?? "");
    if (!PACK_ORDER.includes(planCode)) return fail("validation", "plan_code invalide", 422);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // La famille du parent connecté (le payeur)
    const { data: family } = await admin
      .from("families").select("id, pack").eq("parent_id", user.id).maybeSingle();
    if (!family) return fail("not_found", "Aucune famille associée à ce compte", 404);

    // Upgrade uniquement (jamais de downgrade par paiement)
    if (PACK_ORDER.indexOf(planCode) <= PACK_ORDER.indexOf(String(family.pack))) {
      return fail("validation", "Ce forfait est déjà inclus dans votre abonnement", 400);
    }

    const { data: plan } = await admin
      .from("plans").select("code, label, price_cents, currency").eq("code", planCode).maybeSingle();
    if (!plan) return fail("not_found", "Forfait introuvable", 404);

    // Origine de retour : l'app (jamais une origine arbitraire non listée)
    const allowedOrigins = [
      "https://app.thrivesportpositive.com",
      "http://localhost:3001",
    ];
    const requested = String(body?.origin ?? req.headers.get("origin") ?? "");
    const origin = allowedOrigins.includes(requested) ? requested : allowedOrigins[0];

    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/parent/upgrade?checkout=success`,
      cancel_url: `${origin}/parent/upgrade?checkout=cancelled`,
      "line_items[0][price_data][currency]": String(plan.currency ?? "CAD").toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(plan.price_cents),
      "line_items[0][price_data][product_data][name]": `THRIVE — Forfait ${plan.label} (parcours 13 séances)`,
      "line_items[0][quantity]": "1",
      "metadata[family_id]": family.id,
      "metadata[plan_code]": plan.code,
    });
    if (user.email) form.set("customer_email", user.email);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok || !session?.url) {
      return fail("stripe_error", session?.error?.message ?? "Création de session impossible", 502);
    }

    return json({ url: session.url }, 200);
  } catch (e) {
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

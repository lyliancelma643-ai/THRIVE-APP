// Edge Function : billing-plans
// Offre web de P3 lue en direct chez Stripe (jamais de prix codé en dur) :
// les prix actifs portant les lookup_keys thrive_moments_mensuel / _annuel,
// + l'éligibilité de l'utilisateur à l'essai gratuit (une fois par compte).
// verify_jwt: true · rôle : tout compte connecté.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { PLAN_LOOKUP_KEYS, TRIAL_DAYS, type PlanCode } from "../_shared/billing_core.ts";

type StripePrice = {
  id: string;
  lookup_key: string | null;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
  product: { name?: string; description?: string | null } | string;
};

Deno.serve(withSentry("billing-plans", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);

    const lookupKeys = Object.values(PLAN_LOOKUP_KEYS);
    const prices = await stripe<{ data: StripePrice[] }>("GET", "/prices", {
      active: true,
      lookup_keys: lookupKeys,
      expand: ["data.product"],
      limit: 10,
    });

    const plans = (Object.keys(PLAN_LOOKUP_KEYS) as PlanCode[])
      .map((code) => {
        const p = prices.data.find((x) => x.lookup_key === PLAN_LOOKUP_KEYS[code]);
        if (!p || p.unit_amount === null || !p.recurring) return null;
        const product = typeof p.product === "object" ? p.product : {};
        return {
          plan: code,
          amount: p.unit_amount,
          currency: p.currency.toUpperCase(),
          interval: p.recurring.interval,
          interval_count: p.recurring.interval_count,
          name: product.name ?? null,
        };
      })
      .filter(Boolean);

    const { data: row } = await adminClient()
      .from("billing_subscriptions").select("ever_subscribed").eq("user_id", user.id).maybeSingle();

    return json({
      plans,
      trial_days: TRIAL_DAYS,
      trial_eligible: row?.ever_subscribed !== true,
    });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement web non configuré", 503);
    }
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// Entrées/sorties de la monétisation hybride, partagées par les edge functions
// billing-plans, create-checkout-session, create-portal-session, billing-sync,
// stripe-webhook et revenuecat-webhook.
//
// Secrets (supabase secrets set …) — JAMAIS dans le code ni côté client :
//   STRIPE_SECRET_KEY               clé secrète Stripe (sk_live_… / sk_test_…)
//   STRIPE_WEBHOOK_SECRET           secret de signature de l'endpoint stripe-webhook
//   REVENUECAT_SECRET_API_KEY       clé secrète RevenueCat v1 (sk_…) — lecture des abonnés
//   REVENUECAT_STRIPE_PUBLIC_KEY    clé publique de l'app Stripe dans RevenueCat (strp_…)
//   REVENUECAT_WEBHOOK_AUTH         valeur exacte de l'en-tête Authorization du webhook RC
//   APP_ORIGINS                     origines autorisées pour les retours (CSV)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  deriveBillingStatus,
  encodeStripeForm,
  type BillingStatus,
  type FormValue,
  type RcSubscriber,
} from "./billing_core.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const fail = (code: string, message: string, status: number) =>
  json({ code, message }, status);

export function env(name: string): string {
  return Deno.env.get(name) ?? "";
}

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Utilisateur authentifié (JWT Supabase) + rôle d'autorité (app_metadata). */
export async function authUser(req: Request): Promise<{ id: string; email: string | null; role: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    role: String((user.app_metadata as Record<string, unknown> | undefined)?.role ?? "PARENT"),
  };
}

// ── Stripe (REST, sans SDK) ──────────────────────────────────────────────────
export class StripeError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, FormValue> = {},
  idempotencyKey?: string,
): Promise<T> {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new StripeError("Stripe non configuré", 503, "not_configured");
  const body = encodeStripeForm(params);
  const url = method === "GET" && body ? `https://api.stripe.com/v1${path}?${body}` : `https://api.stripe.com/v1${path}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(url, { method, headers, body: method === "POST" ? body : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StripeError(data?.error?.message ?? `Stripe ${res.status}`, res.status, data?.error?.code);
  }
  return data as T;
}

// ── RevenueCat (REST v1) ────────────────────────────────────────────────────
const RC_API = "https://api.revenuecat.com/v1";

export async function rcGetSubscriber(appUserId: string): Promise<RcSubscriber | null> {
  const key = env("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY manquant");
  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const data = await res.json();
  return (data?.subscriber ?? null) as RcSubscriber | null;
}

/**
 * Déclare un abonnement Stripe à RevenueCat pour cet App User ID
 * (POST /v1/receipts, X-Platform: stripe). Idempotent côté RevenueCat.
 * `fetchToken` = id d'abonnement Stripe (sub_…) ou de session Checkout (cs_…).
 */
export async function rcPostStripeReceipt(appUserId: string, fetchToken: string): Promise<void> {
  const key = env("REVENUECAT_STRIPE_PUBLIC_KEY");
  if (!key) throw new Error("REVENUECAT_STRIPE_PUBLIC_KEY manquant");
  const res = await fetch(`${RC_API}/receipts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Platform": "stripe",
    },
    body: JSON.stringify({ app_user_id: appUserId, fetch_token: fetchToken }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RevenueCat receipts ${res.status} ${text.slice(0, 200)}`);
  }
}

/** Relit l'état chez RevenueCat et met à jour le miroir billing_subscriptions. */
export async function syncFromRevenueCat(admin: SupabaseClient, appUserId: string): Promise<BillingStatus> {
  const subscriber = await rcGetSubscriber(appUserId);
  const status = deriveBillingStatus(subscriber, new Date());

  // Le profil doit exister (FK) : un App User ID inconnu est ignoré.
  const { data: profile } = await admin.from("profiles").select("id").eq("id", appUserId).maybeSingle();
  if (!profile) return status;

  const { data: existing } = await admin
    .from("billing_subscriptions").select("ever_subscribed").eq("user_id", appUserId).maybeSingle();

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: appUserId,
      active: status.active,
      store: status.store,
      product_id: status.product_id,
      period_type: status.period_type,
      will_renew: status.will_renew,
      expires_at: status.expires_at,
      billing_issue_at: status.billing_issue_at,
      is_sandbox: status.is_sandbox,
      ever_subscribed: status.ever_subscribed || existing?.ever_subscribed === true,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`billing_subscriptions: ${error.message}`);
  return { ...status, ever_subscribed: status.ever_subscribed || existing?.ever_subscribed === true };
}

/** Coupon « once » à montant fixe : créé s'il n'existe pas (identifiant déterministe). */
export async function ensureAmountCoupon(id: string, amountMinor: number, currency: string, name: string): Promise<void> {
  try {
    await stripe("GET", `/coupons/${id}`);
  } catch (e) {
    if (!(e instanceof StripeError) || e.status !== 404) throw e;
    await stripe("POST", "/coupons", {
      id,
      amount_off: amountMinor,
      currency,
      duration: "once",
      name,
    }, `coupon-${id}`);
  }
}

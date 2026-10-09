// Limitation de débit par utilisateur (audit P1-8).
// S'appuie sur public.consume_rate_limit (migration 078), exécutable seulement
// par service_role : on appelle donc la RPC avec la clé service_role.
//
// Comportement si la RPC échoue (migration 078 pas encore appliquée, réseau) :
// on LAISSE PASSER (fail-open) et on journalise, pour ne pas bloquer des
// fonctions de conformité (export, suppression) ou le déblocage d'un achat.
import { createClient } from "jsr:@supabase/supabase-js@2";

export type RateLimitRule = { bucket: string; max: number; windowSeconds: number };

/** Règles par fonction. Valeurs prudentes : un usage humain normal ne les atteint pas. */
export const RATE_LIMITS = {
  billingSync: { bucket: "billing-sync", max: 10, windowSeconds: 60 },
  accountDeletion: { bucket: "request-account-deletion", max: 5, windowSeconds: 3600 },
  exportMyData: { bucket: "export-my-data", max: 5, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitResult = { allowed: boolean; retryAfter: number };

export async function consumeRateLimit(userId: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    console.warn("[rate-limit] SUPABASE_URL/SERVICE_ROLE_KEY absents : limite ignorée");
    return { allowed: true, retryAfter: 0 };
  }
  try {
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_user: userId,
      p_bucket: rule.bucket,
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error || !data) {
      console.warn("[rate-limit] RPC indisponible, limite ignorée :", error?.message);
      return { allowed: true, retryAfter: 0 };
    }
    const d = data as { allowed?: boolean; retry_after?: number };
    return { allowed: d.allowed !== false, retryAfter: Math.max(0, Number(d.retry_after ?? 0)) };
  } catch (e) {
    console.warn("[rate-limit] erreur, limite ignorée :", e instanceof Error ? e.message : e);
    return { allowed: true, retryAfter: 0 };
  }
}

/** Réponse 429 standard (en-tête Retry-After en secondes). */
export function tooManyRequests(retryAfter: number, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: "Trop de requêtes, réessayez plus tard.", code: "rate_limited", retry_after: retryAfter }),
    {
      status: 429,
      headers: { ...headers, "Content-Type": "application/json", "Retry-After": String(Math.max(1, retryAfter)) },
    },
  );
}

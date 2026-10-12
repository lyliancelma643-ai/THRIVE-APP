// Edge Function : request-intro-call (écran Y3 — appel de 15 minutes). AUCUN paiement.
//
// JWT obligatoire. Valide l'entrée (Zod), applique la limite de débit 078, puis
// appelle la RPC public.request_intro_call AVEC le JWT du parent : c'est la base
// qui impose parent = auth.uid(), propriété de l'enfant, créneau futur, quota de
// 3 demandes ouvertes et alerte admin (migration 082). Renvoie l'id créé.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { consumeRateLimit, tooManyRequests, type RateLimitRule } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Règle locale (le fichier partagé n'est pas dans le périmètre de ce lot).
const INTRO_CALL_RATE: RateLimitRule = { bucket: "request-intro-call", max: 5, windowSeconds: 3600 };

const inputSchema = z.object({
  mode: z.enum(["video", "telephone"]),
  slot: z.string().datetime({ offset: true }),
  childId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

// Codes stables levés par la RPC (message de l'exception) → statut HTTP.
const RPC_ERRORS: Record<string, number> = {
  not_parent: 403,
  child_not_owned: 403,
  invalid_mode: 422,
  invalid_slot: 422,
  invalid_note: 422,
  quota_reached: 409,
  duplicate_slot: 409,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withSentry("request-intro-call", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée", code: "method_not_allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé", code: "unauthorized" }, 401);
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supa.auth.getUser();
    if (error || !user) return json({ error: "Non autorisé", code: "unauthorized" }, 401);

    const rl = await consumeRateLimit(user.id, INTRO_CALL_RATE);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter, corsHeaders);

    const parsed = inputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Demande invalide", code: "invalid_input" }, 422);
    const { mode, slot, childId, note } = parsed.data;

    const { data, error: rpcErr } = await supa.rpc("request_intro_call", {
      p_mode: mode,
      p_creneau: slot,
      p_child: childId ?? null,
      p_note: note && note.length > 0 ? note : null,
    });
    if (rpcErr) {
      const code = rpcErr.message in RPC_ERRORS ? rpcErr.message : null;
      if (code) return json({ error: "Demande refusée", code }, RPC_ERRORS[code]);
      await captureError(rpcErr);
      return json({ error: "Erreur interne", code: "internal" }, 500);
    }
    return json({ id: data as string, status: "demande" }, 201);
  } catch (e) {
    await captureError(e);
    return json({ error: "Erreur interne", code: "internal" }, 500);
  }
}));

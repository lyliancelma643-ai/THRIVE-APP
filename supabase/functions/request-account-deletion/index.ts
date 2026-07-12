// Edge Function : request-account-deletion (droit à l'oubli)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withSentry, captureError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withSentry("request-account-deletion", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supa.auth.getUser();
    if (error || !user) return json({ error: "Utilisateur introuvable" }, 401);
    const body = await req.json().catch(() => ({}));
    const reason: string | null = body?.reason ?? null;
    const { data: existing } = await supa
      .from("deletion_requests")
      .select("id, status, requested_at")
      .eq("target_profile_id", user.id)
      .eq("status", "PENDING")
      .maybeSingle();
    if (existing) {
      return json({ message: "Une demande de suppression est déjà en attente.", request: existing }, 200);
    }
    const { data: inserted, error: insErr } = await supa
      .from("deletion_requests")
      .insert({ requested_by: user.id, target_profile_id: user.id, reason })
      .select("id, status, requested_at")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);
    return json({ success: true, request: inserted, message: "Demande de suppression enregistrée." }, 201);
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

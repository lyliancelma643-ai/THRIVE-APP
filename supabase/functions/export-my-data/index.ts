// Edge Function : export-my-data (portabilité RGPD/Loi 25)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withSentry, captureError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

Deno.serve(withSentry("export-my-data", async (req: Request) => {
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
    const tables = [
      "profiles", "families", "children", "reports", "video_session_runs",
      "questionnaires", "notifications", "consents", "entitlements",
      "coach_assignments", "program_enrollments", "sessions", "messages",
    ];
    const data: Record<string, unknown> = {};
    for (const t of tables) {
      const { data: rows, error: e } = await supa.from(t).select("*");
      data[t] = e ? { error: e.message } : (rows ?? []);
    }
    return json(
      {
        export_format: "thrive.v1",
        exported_at: new Date().toISOString(),
        subject: { user_id: user.id, email: user.email },
        note: "Données limitées par le contrôle d'accès (RLS).",
        data,
      },
      200,
      { "Content-Disposition": `attachment; filename="thrive-export-${user.id}.json"` },
    );
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

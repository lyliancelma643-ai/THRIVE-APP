// Edge Function : admin-delete-user
// Suppression DÉFINITIVE d'un compte (Auth + cascade base) — SUPER ADMIN uniquement.
//
// Effets :
//   - auth.users supprimé → l'adresse mail est libérée (la personne peut
//     recréer un compte ensuite).
//   - Cascade : profiles → families → children → toutes les données liées
//     (bilans, séances, messages, notifications…) via les FK ON DELETE CASCADE.
//
// Garde-fous :
//   - Appelant SUPER_ADMIN uniquement (rôle lu depuis app_metadata, pas profiles).
//   - Interdiction de se supprimer soi-même et de supprimer un SUPER_ADMIN.
//   - Les FK RESTRICT (programs.coach_id, reports.generated_by) font échouer
//     proprement la suppression d'un coach encore titulaire → message clair.
//
// verify_jwt: true

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

Deno.serve(withSentry("admin-delete-user", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Utilisateur introuvable" }, 401);

    // Autorité du rôle = app_metadata (non falsifiable par l'utilisateur)
    if (user.app_metadata?.role !== "SUPER_ADMIN") {
      return json({ error: "Réservé au Super Admin" }, 403);
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") {
      return json({ error: "userId manquant" }, 400);
    }
    if (userId === user.id) {
      return json({ error: "Impossible de supprimer son propre compte" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Cible : jamais un SUPER_ADMIN
    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !target?.user) return json({ error: "Compte cible introuvable" }, 404);
    if (target.user.app_metadata?.role === "SUPER_ADMIN") {
      return json({ error: "Un Super Admin ne peut pas être supprimé" }, 403);
    }
    const targetEmail = target.user.email ?? userId;

    // Trace d'audit AVANT suppression (la ligne survit : user_id → SET NULL)
    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "DELETE_ACCOUNT",
      table_name: "auth.users",
      record_id: userId,
      new_data: { deleted_email: targetEmail, deleted_role: target.user.app_metadata?.role },
    }).then(() => {}, () => {}); // best effort : ne bloque pas la suppression

    // Suppression définitive (cascade profiles → familles → enfants → données)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      const msg = /foreign key|violates/i.test(delErr.message)
        ? "Suppression bloquée : ce compte est encore référencé (ex. coach titulaire de " +
          "programmes ou auteur de rapports). Réassigne ou supprime d'abord ces éléments."
        : delErr.message;
      return json({ error: msg }, 409);
    }

    return json({ ok: true, deletedEmail: targetEmail });
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
}));

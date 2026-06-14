// Edge Function : admin-update-user
// Applique un LOT de modifications de comptes décidées dans l'admin
// (« Comptes ») et validées d'un seul clic sur le bouton « Enregistrer ».
//
// Pour chaque compte, deux actions possibles :
//   - Changement de rôle  → met à jour user_metadata.role (Auth) ET profiles.role,
//     afin que les accès (middleware/login) changent RÉELLEMENT.
//   - Activation / désactivation → ban / un-ban dans Supabase Auth (bloque ou
//     rouvre la connexion) ET profiles.is_active.
//
// Règles d'accès :
//   - Appelant ADMIN ou SUPER_ADMIN uniquement.
//   - Seul un SUPER_ADMIN peut attribuer le rôle ADMIN.
//   - On ne peut jamais cibler un SUPER_ADMIN ni soi-même (anti-lockout).
//
// verify_jwt: true

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ~100 ans : équivaut à un bannissement permanent tant que non réactivé.
const BAN_FOREVER = "876000h";
const ASSIGNABLE_ROLES = ["PARENT", "COACH", "ADMIN"] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Change = { id: string; role?: string; isActive?: boolean };
type Result = { id: string; ok: boolean; error?: string };

Deno.serve(async (req: Request) => {
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

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const callerRole = callerProfile?.role as string | undefined;
    if (callerRole !== "ADMIN" && callerRole !== "SUPER_ADMIN") {
      return json({ error: "Accès réservé aux administrateurs" }, 403);
    }

    const body = await req.json().catch(() => null);
    const changes: Change[] = Array.isArray(body?.changes) ? body.changes : [];
    if (changes.length === 0) {
      return json({ error: "Aucune modification à appliquer" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Rôles actuels des comptes ciblés (pour protéger les SUPER_ADMIN et
    // n'écrire que ce qui change réellement).
    const ids = [...new Set(changes.map((c) => c.id).filter(Boolean))];
    const { data: targets } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_active")
      .in("id", ids);
    const targetById = new Map((targets ?? []).map((t) => [t.id, t]));

    const results: Result[] = [];

    for (const change of changes) {
      const { id } = change;
      const target = targetById.get(id);
      try {
        if (!id) throw new Error("Identifiant manquant");
        if (id === user.id) throw new Error("Vous ne pouvez pas vous modifier vous-même");
        if (!target) throw new Error("Compte introuvable");
        if (target.role === "SUPER_ADMIN") throw new Error("Un super admin ne peut pas être modifié");

        // ── Changement de rôle ──────────────────────────────────────────────
        if (change.role !== undefined && change.role !== target.role) {
          const role = String(change.role).toUpperCase();
          if (!ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
            throw new Error(`Rôle invalide : ${role}`);
          }
          if (role === "ADMIN" && callerRole !== "SUPER_ADMIN") {
            throw new Error("Seul un super admin peut nommer un ADMIN");
          }

          // Auth : on fusionne avec les métadonnées existantes (prénom/nom).
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
          const meta = { ...(authUser?.user?.user_metadata ?? {}), role };
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: meta,
          });
          if (authErr) throw authErr;

          const { error: profErr } = await supabaseAdmin
            .from("profiles")
            .update({ role, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (profErr) throw profErr;
        }

        // ── Activation / désactivation (ban réel) ───────────────────────────
        if (change.isActive !== undefined && change.isActive !== target.is_active) {
          const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
            ban_duration: change.isActive ? "none" : BAN_FOREVER,
          });
          if (banErr) throw banErr;

          const { error: profErr } = await supabaseAdmin
            .from("profiles")
            .update({ is_active: change.isActive, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (profErr) throw profErr;
        }

        results.push({ id, ok: true });
      } catch (e) {
        results.push({ id, ok: false, error: e instanceof Error ? e.message : "Erreur" });
      }
    }

    const applied = results.filter((r) => r.ok).length;
    const failed = results.length - applied;
    return json({ applied, failed, results }, failed > 0 ? 207 : 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
});

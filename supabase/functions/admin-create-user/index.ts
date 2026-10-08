// Edge Function : admin-create-user
// Création de comptes (PARENT / COACH / ADMIN).
// Admin : compte confirmé avec mot de passe. Parent : INVITATION par e-mail
// (le co-parent choisit lui-même son mot de passe via le lien).
//
// Règles d'accès :
//   - ADMIN / SUPER_ADMIN : peuvent créer PARENT et COACH
//   - SUPER_ADMIN uniquement : peut créer ADMIN
//   - PARENT : peut inviter un co-parent (PARENT) pour sa famille, quota du forfait vérifié AVANT
//
// verify_jwt: true

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parentQuotaReached, passwordProblem, planCreation } from "./policy.ts";
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

Deno.serve(withSentry("admin-create-user", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Utilisateur introuvable" }, 401);

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const callerRole = callerProfile?.role as string | undefined;
    if (!callerRole) return json({ error: "Profil appelant introuvable" }, 403);

    const body = await req.json();
    const {
      email, password, firstName, lastName,
      role = "PARENT", phone, speciality, bio,
    } = body ?? {};

    const targetRole = String(role).toUpperCase();
    const plan = planCreation(callerRole, targetRole);
    if (!plan.ok) return json({ error: plan.error }, plan.status);

    if (!email || !firstName || !lastName || (plan.mode === "direct" && !password)) {
      return json({ error: "email, firstName, lastName (et password pour un compte direct) sont requis" }, 400);
    }
    if (plan.mode === "direct") {
      const problem = passwordProblem(String(password));
      if (problem) return json({ error: problem }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const cleanEmail = String(email).trim().toLowerCase();
    const meta = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      role: targetRole,
    };

    let created;
    let createError;
    if (plan.mode === "invite") {
      // Quota du forfait vérifié AVANT toute création (le trigger de
      // family_members le revérifie, mais le compte serait déjà créé).
      const { data: fam } = await supabaseAdmin
        .from("families").select("id, pack").eq("parent_id", user.id).limit(1).maybeSingle();
      if (!fam) return json({ error: "Ajoute d'abord ton enfant : le co-parent rejoindra sa famille." }, 409);
      const [{ data: planRow }, { count }] = await Promise.all([
        supabaseAdmin.from("plans").select("limits").eq("code", fam.pack).maybeSingle(),
        supabaseAdmin.from("family_members").select("id", { count: "exact", head: true }).eq("family_id", fam.id),
      ]);
      const maxParents = (planRow?.limits as { maxParents?: number } | null)?.maxParents;
      if (parentQuotaReached(count ?? 0, maxParents)) {
        return json({ error: "Quota de comptes parents atteint pour ton forfait." }, 403);
      }
      const appUrl = Deno.env.get("APP_URL") ?? "https://app.thrivesportpositive.com";
      ({ data: created, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        cleanEmail,
        { data: meta, redirectTo: `${appUrl}/reset-password` },
      ));
      // app_metadata.role = autorité (non modifiable par l'utilisateur).
      if (!createError && created?.user?.id) {
        await supabaseAdmin.auth.admin.updateUserById(created.user.id, { app_metadata: { role: targetRole } });
      }
    } else {
      // Le trigger handle_new_user crée le profil avec le bon rôle pour
      // PARENT/COACH ; le rôle ADMIN est promu explicitement juste après.
      ({ data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        app_metadata: { role: targetRole },
        user_metadata: meta,
      }));
    }

    if (createError) {
      const msg = createError.message ?? "Création impossible";
      const status = /already|exist|registered/i.test(msg) ? 409 : 400;
      return json({ error: msg }, status);
    }

    const newUserId = created.user?.id;
    if (!newUserId) return json({ error: "Compte non créé" }, 500);

    const profilePatch: Record<string, unknown> = {
      role: targetRole,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (phone) profilePatch.phone = phone;
    if (speciality) profilePatch.speciality = speciality;
    if (bio) profilePatch.bio = bio;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profilePatch)
      .eq("id", newUserId)
      .select("id, email, first_name, last_name, role, is_active")
      .single();

    if (profileError) return json({ error: profileError.message }, 500);

    return json({ profile }, 201);
  } catch (e) {
    await captureError(e);
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
}));

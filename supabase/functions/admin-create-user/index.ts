// Edge Function : admin-create-user
// Création universelle de comptes (PARENT / COACH / ADMIN) auto-confirmés,
// sans email de validation — style Netflix.
//
// Règles d'accès :
//   - ADMIN / SUPER_ADMIN : peuvent créer PARENT et COACH
//   - SUPER_ADMIN uniquement : peut créer ADMIN
//   - PARENT : peut créer un co-parent (PARENT) pour sa famille
//
// verify_jwt: true

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    if (!email || !password || !firstName || !lastName) {
      return json({ error: "email, password, firstName et lastName sont requis" }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "Le mot de passe doit faire au moins 8 caractères" }, 400);
    }

    const targetRole = String(role).toUpperCase();
    const isAdminCaller = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN";

    if (!["PARENT", "COACH", "ADMIN"].includes(targetRole)) {
      return json({ error: "Rôle invalide (PARENT, COACH ou ADMIN)" }, 400);
    }
    if (targetRole === "ADMIN" && callerRole !== "SUPER_ADMIN") {
      return json({ error: "Seul un SUPER_ADMIN peut créer un compte ADMIN" }, 403);
    }
    if (!isAdminCaller && !(callerRole === "PARENT" && targetRole === "PARENT")) {
      return json({ error: "Accès refusé" }, 403);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Le trigger handle_new_user crée le profil avec le bon rôle pour
    // PARENT/COACH ; le rôle ADMIN (interdit en self-service par le
    // trigger) est promu explicitement juste après avec le service role.
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        // app_metadata.role = autorité (non modifiable par l'utilisateur).
        app_metadata: { role: targetRole },
        user_metadata: {
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          role: targetRole,
        },
      });

    if (createError) {
      const msg = createError.message ?? "Création impossible";
      const status = /already|exist/i.test(msg) ? 409 : 400;
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
    return json({ error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
});

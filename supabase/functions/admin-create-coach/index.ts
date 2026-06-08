// Edge Function : admin-create-coach
// Crée un utilisateur Supabase Auth + profil COACH
// Nécessite le service role key (SUPABASE_SERVICE_ROLE_KEY)
// verify_jwt: true  →  seul un admin connecté peut appeler cette fonction

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Vérifier que l'appelant est bien un ADMIN ────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client avec le token de l'utilisateur connecté (vérification rôle)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier que c'est un ADMIN
    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Accès refusé : rôle ADMIN requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Lire le body ────────────────────────────────────────────────
    const body = await req.json();
    const { email, password, firstName, lastName, phone, speciality, bio } = body;

    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "email, password, firstName et lastName sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit faire au moins 8 caractères" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Créer le compte Auth avec le service role key ───────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: "COACH",
      },
    });

    if (createError) {
      if (
        createError.message.includes("already registered") ||
        createError.message.includes("already been registered")
      ) {
        return new Response(
          JSON.stringify({ error: "Un compte avec cet email existe déjà" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createError;
    }

    // ── 4. Upsert le profil COACH complet ─────────────────────────────
    // IMPORTANT : la colonne s'appelle phone_number (pas phone) dans la table profiles
    const { data: coachProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: email.toLowerCase().trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone?.trim() ?? null,   // ← nom réel de la colonne
        speciality: speciality?.trim() ?? null,
        bio: bio?.trim() ?? null,
        role: "COACH",
        is_active: true,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Coach ${firstName} ${lastName} créé avec succès`,
        coach: coachProfile,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[admin-create-coach] Erreur:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

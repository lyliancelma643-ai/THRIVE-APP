// Edge Function : generate-parent-report
// Assemble la version PARENT (parent_reports) à partir d'un bilan coach structuré
// (coach_reports) et, si disponible, d'un gabarit (report_templates), selon
// séance × âge × pack × langue. Le coach prévisualise puis envoie. Idempotent :
// un seul parent_report par coach_report (ré-génération = mise à jour).
// verify_jwt: true  ·  rôles: COACH (auteur) / ADMIN / SUPER_ADMIN

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withSentry, captureError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (code: string, message: string, status: number, details: unknown = null) =>
  json({ code, message, details }, status);

Deno.serve(withSentry("generate-parent-report", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("unauthorized", "Authentification requise", 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return fail("unauthorized", "Utilisateur introuvable", 401);

    const { data: prof } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    const role = (prof?.role as string | undefined) ?? "";
    if (!["COACH", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return fail("forbidden", "Réservé aux coachs et admins", 403);
    }

    const body = await req.json().catch(() => ({}));
    const coachReportId = body?.coach_report_id;
    const lang = String(body?.lang ?? "fr");
    if (!coachReportId) return fail("validation", "coach_report_id requis", 422);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: cr, error: crErr } = await admin
      .from("coach_reports").select("*").eq("id", coachReportId).single();
    if (crErr || !cr) return fail("not_found", "Bilan coach introuvable", 404);

    // L'auteur (ou un admin) uniquement
    if (cr.coach_id !== user.id && !["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return fail("forbidden", "Vous n'êtes pas l'auteur de ce bilan", 403);
    }

    // Niveau de détail piloté par le forfait de la famille (matrice `plans`) —
    // jamais par la requête : le pack fait foi (Essentiel 1 · Avancé 2 · Performance 3).
    const { data: fam } = await admin
      .from("children").select("family:families(pack)").eq("id", cr.child_id).maybeSingle();
    const famRel = (fam as { family?: unknown })?.family;
    const pack = String(
      (Array.isArray(famRel) ? famRel[0]?.pack : (famRel as { pack?: string })?.pack) ?? "ESSENTIEL",
    );
    const { data: plan } = await admin
      .from("plans").select("limits").eq("code", pack).maybeSingle();
    const detailLevel = Number((plan?.limits as { detailLevel?: number })?.detailLevel ?? 1);

    // Numéro de séance (pour le gabarit)
    let sessionNumber: number | null = null;
    if (cr.session_id) {
      const { data: sess } = await admin
        .from("sessions").select("session_number").eq("id", cr.session_id).maybeSingle();
      sessionNumber = sess?.session_number ?? null;
    }

    // Gabarit éventuel : le gabarit premium du pack (report_templates.pack_level)
    // prime sur le gabarit générique ; sinon assemblage par défaut
    const { data: tpls } = await admin
      .from("report_templates").select("body_template, pack_level")
      .eq("lang", lang)
      .eq("age_group", cr.age_group ?? "")
      .eq("session_number", sessionNumber ?? -1)
      .or(`pack_level.eq.${pack},pack_level.is.null`);
    const tpl =
      (tpls ?? []).find((t) => t.pack_level === pack) ??
      (tpls ?? []).find((t) => !t.pack_level) ??
      null;

    // Assemblage de la version parent (sections filtrées par niveau de détail)
    const sections: Record<string, unknown> = {};
    const add = (k: string, v: unknown) => {
      if (v !== null && v !== undefined && v !== "") sections[k] = v;
    };
    add("message_coach", cr.coach_message_parent);
    add("forces", cr.forces_via);
    if (detailLevel >= 2) {
      add("resume", cr.performance_summary);
      add("objectif", cr.life_skill_target);
      add("recommandations_maison", cr.home_recommendations);
    }
    if (detailLevel >= 3) {
      add("transfert", cr.transfer_notes);
      add("reussites", cr.success_count);
      add("rpe", cr.rpe);
    }

    const parentBody = {
      template: tpl?.body_template ?? null,
      detail_level: detailLevel,
      session_number: sessionNumber,
      age_group: cr.age_group ?? null,
      sections,
    };

    // Idempotence : 1 parent_report par coach_report
    const { data: existing } = await admin
      .from("parent_reports").select("id").eq("coach_report_id", coachReportId).maybeSingle();

    let result;
    if (existing?.id) {
      const { data, error } = await admin.from("parent_reports")
        .update({ parent_visible_body: parentBody, detail_level: detailLevel, language: lang })
        .eq("id", existing.id).select("*").single();
      if (error) return fail("db_error", error.message, 500);
      result = data;
    } else {
      const { data, error } = await admin.from("parent_reports")
        .insert({
          coach_report_id: coachReportId, child_id: cr.child_id,
          parent_visible_body: parentBody, detail_level: detailLevel, language: lang,
        }).select("*").single();
      if (error) return fail("db_error", error.message, 500);
      result = data;

      // Journal : nouveau bilan disponible (uniquement à la première génération)
      await admin.from("progress_log").insert({
        child_id: cr.child_id, event_type: "REPORT",
        title: "Nouveau bilan disponible",
        summary: cr.life_skill_target ?? "Bilan de séance",
      });
    }

    return json({ parent_report: result }, 201);
  } catch (e) {
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

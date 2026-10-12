// Edge Function : admin-create-program-link
// Lien de paiement Stripe Checkout d'un programme, créé PAR un admin POUR un parent
// (entrée 1 de GO 3 §5-O2 : l'admin copie le lien et l'envoie lui-même — aucun
// courriel n'est envoyé ici, le dépôt n'a pas de service d'envoi).
//
//   • ADMIN / SUPER_ADMIN seulement (app_metadata.role) ; autre rôle → 403.
//   • Corps Zod strict { parent_id, pack, mode } : tout montant reçu → 422.
//   • Mêmes règles qu'O1 (create-program-checkout) : montant serveur
//     (_shared/program_billing.ts, revérifié en SQL par program_create_order),
//     refus pack_active / already_enrolled, mêmes metadata Stripe (kind=program,
//     app_user_id = le PARENT), mêmes success/cancel (/parent/programme/{pack}).
//   • Journal audit_logs (PROGRAM_LINK_CREATED). Renvoie { url, expires_at }.
//
// NB : la logique de create-program-checkout est DUPLIQUÉE ici (minimalement) plutôt
// que factorisée, pour ne pas toucher au fichier d'O1 ni risquer de régression.
//
// verify_jwt: true · rôle : ADMIN / SUPER_ADMIN.
// Secrets : STRIPE_SECRET_KEY, APP_ORIGINS (optionnel), STRIPE_TAX_ENABLED (optionnel).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, env, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { hasActivePack, parseOrigins, resolveReturnOrigin } from "../_shared/billing_core.ts";
import {
  buildProgramCheckoutParams,
  catalogPriceMatches,
  envFlag,
  installmentHtCents,
  programLookupKey,
} from "../_shared/program_billing.ts";
import { AdminProgramLinkRequest, canCreateProgramLink } from "./logic.ts";

const DB_ERRORS: Record<string, [string, string, number]> = {
  pack_active: ["pack_active", "Un pack THRIVE est déjà en cours pour ce parent", 409],
  already_enrolled: ["already_enrolled", "Une inscription est déjà en cours pour ce parent", 409],
  parent_not_found: ["not_found", "Parent introuvable", 404],
  amount_mismatch: ["amount_mismatch", "Montant incohérent", 500],
};

Deno.serve(withSentry("admin-create-program-link", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);
    if (!canCreateProgramLink(user.role)) return fail("forbidden", "Réservé aux administrateurs", 403);

    const parsed = AdminProgramLinkRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("validation", "Requête invalide (parent_id, pack, mode)", 422);
    const { parent_id: parentId, pack, mode } = parsed.data;

    const admin = adminClient();

    const { data: parent } = await admin
      .from("profiles").select("id, email, role").eq("id", parentId).maybeSingle();
    if (!parent || String(parent.role) !== "PARENT") return fail("not_found", "Parent introuvable", 404);

    // Pack en cours (le sien ou celui du titulaire de sa famille) → pas de second pack.
    const { data: memberships } = await admin
      .from("family_members").select("families(parent_id)").eq("profile_id", parentId);
    const holders = [
      parentId,
      ...((memberships ?? []) as { families: { parent_id: string } | { parent_id: string }[] | null }[])
        .flatMap((m) => (Array.isArray(m.families) ? m.families : m.families ? [m.families] : []))
        .map((f) => f.parent_id),
    ];
    const { data: packs } = await admin
      .from("pack_enrollments").select("starts_on, ends_on").in("parent_id", holders);
    if (hasActivePack(packs)) return fail("pack_active", "Un pack THRIVE est déjà en cours pour ce parent", 409);

    const { data: pending } = await admin
      .from("program_orders").select("id, status, stripe_checkout_session_id")
      .eq("parent_id", parentId).in("status", ["en_attente", "active"]);
    if ((pending ?? []).some((o) => o.status === "active")) {
      return fail("already_enrolled", "Une inscription est déjà en cours pour ce parent", 409);
    }

    // Client Stripe unique par compte (partagé avec Maison web).
    const { data: billing } = await admin
      .from("billing_subscriptions").select("stripe_customer_id").eq("user_id", parentId).maybeSingle();
    let customerId: string | null = billing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe<{ id: string }>("POST", "/customers", {
        email: parent.email ?? undefined,
        preferred_locales: ["fr-CA", "fr"],
        metadata: { app_user_id: parentId },
      }, `customer-${parentId}`);
      customerId = customer.id;
      const { error } = await admin.from("billing_subscriptions").upsert(
        { user_id: parentId, stripe_customer_id: customerId },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(`billing_subscriptions: ${error.message}`);
    }

    for (const o of pending ?? []) {
      if (o.stripe_checkout_session_id) {
        await stripe("POST", `/checkout/sessions/${o.stripe_checkout_session_id}/expire`).catch(() => {});
      }
    }

    // Commande + versement 1 (montant serveur revérifié en SQL).
    const amount = installmentHtCents(pack, mode, 1);
    const { data: created, error: orderErr } = await admin.rpc("program_create_order", {
      p_parent: parentId, p_pack: pack, p_mode: mode, p_amount_ht: amount, p_customer: customerId,
    });
    if (orderErr) {
      const known = DB_ERRORS[orderErr.message];
      if (known) return fail(known[0], known[1], known[2]);
      throw new Error(`program_create_order: ${orderErr.message}`);
    }
    const orderId = String((created as Record<string, unknown>).order_id);
    const installmentId = String((created as Record<string, unknown>).installment_id);

    let priceId: string | null = null;
    try {
      const prices = await stripe<{ data: { id: string; unit_amount: number; currency: string; tax_behavior: string; active: boolean }[] }>(
        "GET", "/prices", { active: true, lookup_keys: [programLookupKey(pack, mode)], limit: 1 },
      );
      const p = prices.data[0];
      if (catalogPriceMatches(p, amount)) priceId = p.id;
      else if (p) await captureError(new Error(`Prix ${programLookupKey(pack, mode)} ≠ montant serveur : repli price_data`));
    } catch (e) {
      if (e instanceof StripeError && e.code === "not_configured") throw e;
      await captureError(e);
    }

    // Pas d'en-tête Origin pertinent (appel admin) : première origine autorisée.
    const origin = resolveReturnOrigin(null, parseOrigins(env("APP_ORIGINS")));
    const back = `${origin}/parent/programme/${pack.toLowerCase()}`;

    let session: { id: string; url: string; expires_at?: number };
    try {
      session = await stripe<{ id: string; url: string; expires_at?: number }>(
        "POST", "/checkout/sessions",
        buildProgramCheckoutParams({
          pack, mode, rank: 1, orderId, installmentId, appUserId: parentId, customerId, priceId,
          taxEnabled: envFlag(env("STRIPE_TAX_ENABLED")),
          successUrl: `${back}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${back}?checkout=cancel`,
        }),
        `program-link-${orderId}`,
      );
    } catch (e) {
      await admin.from("program_orders").update({ status: "annulee", updated_at: new Date().toISOString() }).eq("id", orderId);
      throw e;
    }

    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
    await admin.from("program_orders").update({ stripe_checkout_session_id: session.id }).eq("id", orderId);
    await admin.from("program_installments").update({
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      checkout_expires_at: expiresAt,
    }).eq("id", installmentId);

    const { error: auditErr } = await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "PROGRAM_LINK_CREATED",
      table_name: "program_orders",
      record_id: orderId,
      new_data: { parent_id: parentId, pack, mode, installment_id: installmentId },
    });
    if (auditErr) await captureError(new Error(`audit_logs: ${auditErr.message}`));

    return json({ url: session.url, expires_at: expiresAt });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement non configuré", 503);
    }
    await captureError(e);
    const message = e instanceof Error ? e.message : "Erreur interne";
    return fail(e instanceof StripeError ? "stripe_error" : "internal", message, e instanceof StripeError ? 502 : 500);
  }
}));

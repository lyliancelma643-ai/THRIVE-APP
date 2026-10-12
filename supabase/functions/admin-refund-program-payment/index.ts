// Edge Function : admin-refund-program-payment
// Remboursement (total ou partiel) d'un versement de programme, par un admin.
//
//   • ADMIN / SUPER_ADMIN seulement (app_metadata.role, non modifiable par
//     l'utilisateur) ; tout autre rôle → 403.
//   • Corps (Zod strict) : { installment_id, amount_cents, reason } — montant
//     SAISI en cents, ≤ montant payé − déjà remboursé ; motif obligatoire.
//     Aucune politique automatique : la règle de garantie (R3) est [À COMPLÉTER]
//     par Lylian ; l'admin saisit le montant.
//   • Journal : audit_logs (demande AVANT l'appel Stripe, résultat APRÈS).
//   • Idempotency-Key Stripe : un double clic ne rembourse qu'une fois.
//   • Le statut « remboursee » est posé par le webhook charge.refunded ; le pack
//     n'est PAS retiré (décision admin séparée : admin_end_pack).
//
// verify_jwt: true · rôle : ADMIN / SUPER_ADMIN.
// Secrets : STRIPE_SECRET_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { decideRefund, refundIdempotencyKey, RefundRequest, REFUND_ROLES } from "../_shared/program_billing.ts";

Deno.serve(withSentry("admin-refund-program-payment", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    const user = await authUser(req);
    if (!user) return fail("unauthorized", "Authentification requise", 401);
    if (!REFUND_ROLES.has(user.role)) return fail("forbidden", "Réservé aux administrateurs", 403);

    const parsed = RefundRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail("validation", "installment_id, amount_cents (entier > 0) et reason (3 caractères min.) requis", 422);
    }
    const body = parsed.data;

    const admin = adminClient();
    const { data: inst, error } = await admin
      .from("program_installments")
      .select("id, order_id, rank, status, stripe_payment_intent_id, amount_paid_cents, amount_refunded_cents")
      .eq("id", body.installment_id)
      .maybeSingle();
    if (error) throw new Error(`program_installments: ${error.message}`);
    if (!inst) return fail("not_found", "Versement introuvable", 404);

    const decision = decideRefund(user.role, body, inst);
    if (!decision.ok) return fail(decision.code, decision.message, decision.status);

    const audit = (action: string, extra: Record<string, unknown>) =>
      admin.from("audit_logs").insert({
        user_id: user.id,
        action,
        table_name: "program_installments",
        record_id: inst.id,
        new_data: {
          order_id: inst.order_id,
          rank: inst.rank,
          amount_cents: body.amount_cents,
          reason: body.reason,
          ...extra,
        },
      });

    // Journal obligatoire AVANT l'argent : pas de trace ⇒ pas de remboursement.
    const { error: auditErr } = await audit("PROGRAM_REFUND_REQUESTED", {});
    if (auditErr) throw new Error(`audit_logs: ${auditErr.message}`);

    try {
      const refund = await stripe<{ id: string; status: string; amount: number }>("POST", "/refunds", {
        payment_intent: inst.stripe_payment_intent_id,
        amount: body.amount_cents,
        reason: "requested_by_customer",
        metadata: { kind: "program", installment_id: inst.id, order_id: inst.order_id, admin_id: user.id },
      }, refundIdempotencyKey(inst.id, body.amount_cents, inst.amount_refunded_cents ?? 0));

      await audit("PROGRAM_REFUND_DONE", { refund_id: refund.id, refund_status: refund.status })
        .then(({ error: e }) => e && captureError(new Error(`audit_logs: ${e.message}`)));
      return json({ refund_id: refund.id, status: refund.status, amount_cents: refund.amount });
    } catch (e) {
      await audit("PROGRAM_REFUND_FAILED", { error: e instanceof Error ? e.message : String(e) })
        .then(() => {}, () => {});
      throw e;
    }
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement non configuré", 503);
    }
    await captureError(e);
    const message = e instanceof Error ? e.message : "Erreur interne";
    return fail(e instanceof StripeError ? "stripe_error" : "internal", message, e instanceof StripeError ? 502 : 500);
  }
}));

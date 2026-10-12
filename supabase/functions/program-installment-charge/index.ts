// Edge Function : program-installment-charge
// Traite les versements 2 « dus » (créés par la validation de la séance 7, 081).
//
//   • Garde-fou PROGRAM_AUTOCHARGE_ENABLED (défaut : false) :
//       false → rien n'est prélevé. Une session Checkout (lien de paiement,
//               24 h max chez Stripe, régénérée au passage suivant si expirée)
//               est créée et l'alerte admin (private.notify_admins, catégorie
//               billing) porte le lien à transmettre au parent.
//               Courriel automatique au parent : [À COMPLÉTER] — aucun mécanisme
//               d'envoi de courriel transactionnel n'existe dans le dépôt.
//       true  → PaymentIntent hors session sur la carte du versement 1.
//               SCA (authentication_required / requires_action) ⇒ lien de
//               paiement + alerte, AUCUNE nouvelle tentative automatique.
//               Échec carte ⇒ statut echouee (webhook) + lien + alerte.
//   • Ne traite que les versements au statut `due` (pas de boucle sur les échecs) ;
//     un versement `echouee` n'est retraité que sur demande explicite (installment_id).
//   • L'état « payé » n'est JAMAIS écrit ici : seul le webhook Stripe le pose.
//
// Appel : ADMIN / SUPER_ADMIN (JWT, app_metadata.role) — bouton admin — ou
// tâche planifiée avec l'en-tête x-cron-secret = PROGRAM_CRON_SECRET.
// Corps : { installment_id?: uuid }.
// verify_jwt: true.
// Secrets : STRIPE_SECRET_KEY, PROGRAM_AUTOCHARGE_ENABLED, PROGRAM_CRON_SECRET,
//           STRIPE_TAX_ENABLED, APP_ORIGINS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSentry, captureError } from "../_shared/sentry.ts";
import { adminClient, authUser, corsHeaders, env, fail, json, stripe, StripeError } from "../_shared/billing.ts";
import { constantTimeEqual, parseOrigins } from "../_shared/billing_core.ts";
import {
  buildProgramCheckoutParams,
  decideChargeOutcome,
  envFlag,
  InstallmentChargeRequest,
  PROGRAM_CURRENCY,
  PROGRAM_LABELS,
  type ProgramMode,
  type ProgramPack,
} from "../_shared/program_billing.ts";

type Row = {
  id: string;
  order_id: string;
  rank: number;
  status: string;
  amount_ht_cents: number;
  tax_cents: number;
  charge_attempts: number;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  program_orders: {
    id: string;
    parent_id: string | null;
    pack: ProgramPack;
    mode: ProgramMode;
    status: string;
    stripe_customer_id: string | null;
    stripe_payment_method_id: string | null;
  };
};

async function isAuthorized(req: Request): Promise<boolean> {
  const cron = env("PROGRAM_CRON_SECRET");
  const given = req.headers.get("x-cron-secret") ?? "";
  if (cron.length >= 16 && given && constantTimeEqual(given, cron)) return true;
  const user = await authUser(req);
  return !!user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
}

Deno.serve(withSentry("program-installment-charge", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", "Méthode non autorisée", 405);

  try {
    if (!(await isAuthorized(req))) return fail("forbidden", "Réservé aux administrateurs", 403);
    const parsed = InstallmentChargeRequest.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail("validation", "Requête invalide", 422);

    const admin = adminClient();
    let query = admin
      .from("program_installments")
      .select("id, order_id, rank, status, amount_ht_cents, tax_cents, charge_attempts, checkout_url, checkout_expires_at, program_orders!inner(id, parent_id, pack, mode, status, stripe_customer_id, stripe_payment_method_id)")
      .eq("rank", 2)
      .eq("program_orders.status", "active");
    query = parsed.data.installment_id
      ? query.eq("id", parsed.data.installment_id).in("status", ["due", "echouee"])
      : query.eq("status", "due");
    const { data, error } = await query.limit(50);
    if (error) throw new Error(`program_installments: ${error.message}`);

    const autocharge = envFlag(env("PROGRAM_AUTOCHARGE_ENABLED"));
    const taxEnabled = envFlag(env("STRIPE_TAX_ENABLED"));
    const origin = parseOrigins(env("APP_ORIGINS"))[0];
    const results: { installment_id: string; outcome: string }[] = [];

    for (const row of (data ?? []) as unknown as Row[]) {
      const order = row.program_orders;
      if (!order.parent_id || !order.stripe_customer_id) {
        results.push({ installment_id: row.id, outcome: "skipped_no_customer" });
        continue;
      }

      const sendLink = async (reason: "autocharge_off" | "sca" | "failed") => {
        const fresh = row.checkout_url && row.checkout_expires_at && new Date(row.checkout_expires_at) > new Date(Date.now() + 3600_000);
        if (fresh && reason === "autocharge_off") return "link_already_sent";
        const back = `${origin}/parent/programme/${order.pack.toLowerCase()}`;
        const session = await stripe<{ id: string; url: string; expires_at?: number }>(
          "POST", "/checkout/sessions",
          buildProgramCheckoutParams({
            pack: order.pack, mode: order.mode, rank: 2, orderId: order.id, installmentId: row.id,
            appUserId: order.parent_id!, customerId: order.stripe_customer_id!, priceId: null, taxEnabled,
            successUrl: `${back}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${back}?checkout=cancel`,
          }),
          `program-link-${row.id}-${row.charge_attempts}-${Math.floor(Date.now() / 3_600_000)}`,
        );
        const { error: linkErr } = await admin.rpc("program_record_installment_link", {
          p_installment: row.id,
          p_session_id: session.id,
          p_url: session.url,
          p_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          p_reason: reason,
        });
        if (linkErr) throw new Error(`program_record_installment_link: ${linkErr.message}`);
        // [À COMPLÉTER] courriel au parent avec session.url (aucun service d'envoi dans le dépôt).
        return reason === "autocharge_off" ? "link_sent" : `link_sent_${reason}`;
      };

      try {
        if (!autocharge) {
          results.push({ installment_id: row.id, outcome: await sendLink("autocharge_off") });
          continue;
        }

        // Carte du versement 1 (mémorisée par le webhook payment_intent.succeeded).
        const paymentMethod = order.stripe_payment_method_id;
        if (!paymentMethod) {
          results.push({ installment_id: row.id, outcome: await sendLink("failed") });
          continue;
        }

        const tax = taxEnabled ? row.tax_cents : 0; // [À COMPLÉTER] Stripe Tax Calculations si activé.
        await admin.from("program_installments")
          .update({ charge_attempts: row.charge_attempts + 1, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        let piStatus: string | null = null;
        let errorCode: string | null = null;
        try {
          const pi = await stripe<{ id: string; status: string }>("POST", "/payment_intents", {
            amount: row.amount_ht_cents + tax,
            currency: PROGRAM_CURRENCY,
            customer: order.stripe_customer_id,
            payment_method: paymentMethod,
            off_session: true,
            confirm: true,
            description: `${PROGRAM_LABELS[order.pack]} — versement 2/2`,
            metadata: {
              app_user_id: order.parent_id, kind: "program", pack: order.pack, mode: order.mode,
              installment: "2", order_id: order.id, installment_id: row.id, tax_cents: String(tax),
            },
          }, `program-inst-${row.id}-${row.charge_attempts + 1}`);
          piStatus = pi.status;
        } catch (e) {
          if (!(e instanceof StripeError) || e.status >= 500) throw e;
          errorCode = e.code ?? "card_error";
        }

        const outcome = decideChargeOutcome({ piStatus, errorCode });
        if (outcome === "needs_link") {
          results.push({ installment_id: row.id, outcome: await sendLink("sca") });
        } else if (outcome === "failed") {
          results.push({ installment_id: row.id, outcome: await sendLink("failed") });
        } else {
          results.push({ installment_id: row.id, outcome }); // paid / processing : le webhook confirme.
        }
      } catch (e) {
        await captureError(e);
        results.push({ installment_id: row.id, outcome: "error" });
      }
    }

    return json({ autocharge, processed: results.length, results });
  } catch (e) {
    if (e instanceof StripeError && e.code === "not_configured") {
      return fail("not_configured", "Paiement non configuré", 503);
    }
    await captureError(e);
    return fail("internal", e instanceof Error ? e.message : "Erreur interne", 500);
  }
}));

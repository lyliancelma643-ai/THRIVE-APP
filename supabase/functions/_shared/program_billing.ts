// ─────────────────────────────────────────────────────────────────────────────
// Cœur PUR des programmes payés par Stripe (Groupe · Individuel · Complet).
// Aucune API Deno, aucun réseau : testable tel quel (program_billing.test.ts).
//
// Règles (GO 3 §3.2 / §5-O1) :
//   • Les MONTANTS vivent ICI, côté serveur (et sont revérifiés en SQL, 081).
//     Le client envoie seulement `pack` + `mode` ; tout autre champ (montant,
//     prix, devise…) est REFUSÉ par le schéma Zod strict.
//   • Prix hors taxes (tax_behavior=exclusive), en cents CAD.
//   • Taxe d'AFFICHAGE Québec : TPS 5 % + TVQ 9,975 % (= ×1,14975), arrondies
//     séparément au cent (comme sur une facture québécoise). Le montant
//     réellement perçu est celui de Stripe (automatic_tax si STRIPE_TAX_ENABLED).
//   • Aucune donnée d'enfant n'est envoyée à Stripe (Loi 25).
// ─────────────────────────────────────────────────────────────────────────────

// Zod via deno.land/x (le dépôt a un node_modules racine sans zod : npm: ne se résout pas).
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { FormValue } from "./billing_core.ts";

export const PROGRAM_PACKS = ["GROUPE", "INDIVIDUEL", "COMPLET"] as const;
export type ProgramPack = typeof PROGRAM_PACKS[number];

export const PROGRAM_MODES = ["deux_versements", "une_fois"] as const;
export type ProgramMode = typeof PROGRAM_MODES[number];

export const PROGRAM_CURRENCY = "cad";

/** Total hors taxes par pack, en cents CAD (gamme V3, 2026-10-02). */
export const PROGRAM_TOTAL_HT_CENTS: Record<ProgramPack, number> = {
  GROUPE: 60_000,
  INDIVIDUEL: 150_000,
  COMPLET: 200_000,
};

/** Libellés envoyés à Stripe (aucune donnée personnelle). */
export const PROGRAM_LABELS: Record<ProgramPack, string> = {
  GROUPE: "THRIVE Groupe",
  INDIVIDUEL: "THRIVE Individuel",
  COMPLET: "THRIVE Complet",
};

/** Code fiscal Stripe « services généraux » (utilisé par le repli price_data). */
export const PROGRAM_TAX_CODE = "txcd_20030000";

const LOOKUP_BASE: Record<ProgramPack, string> = {
  GROUPE: "thrive_groupe_v1",
  INDIVIDUEL: "thrive_individuel_v1",
  COMPLET: "thrive_complet_v1",
};

/** lookup_key Stripe stable : `_versement` (2 versements) ou `_complet` (une fois). */
export function programLookupKey(pack: ProgramPack, mode: ProgramMode): string {
  return `${LOOKUP_BASE[pack]}_${mode === "une_fois" ? "complet" : "versement"}`;
}

/** Toutes les lookup_keys attendues (script de création du catalogue). */
export function allProgramLookupKeys(): { pack: ProgramPack; mode: ProgramMode; lookupKey: string; unitAmount: number }[] {
  return PROGRAM_PACKS.flatMap((pack) =>
    PROGRAM_MODES.map((mode) => ({
      pack,
      mode,
      lookupKey: programLookupKey(pack, mode),
      unitAmount: installmentHtCents(pack, mode, 1),
    }))
  );
}

/** Nombre de versements du mode. */
export function installmentCount(mode: ProgramMode): 1 | 2 {
  return mode === "une_fois" ? 1 : 2;
}

/** Montant HT d'un versement (rang 1 ou 2), en cents. Lève si le rang n'existe pas. */
export function installmentHtCents(pack: ProgramPack, mode: ProgramMode, rank: number): number {
  const total = PROGRAM_TOTAL_HT_CENTS[pack];
  if (mode === "une_fois") {
    if (rank !== 1) throw new Error("Un paiement en une fois n'a qu'un versement");
    return total;
  }
  if (rank !== 1 && rank !== 2) throw new Error("Rang de versement invalide");
  const first = Math.ceil(total / 2);
  return rank === 1 ? first : total - first;
}

// ── Taxes d'affichage (Québec) ───────────────────────────────────────────────
// En entiers : TPS = 5 % ; TVQ = 9,975 % ; arrondi « demi vers le haut » au cent.
function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

export function qcTaxes(htCents: number): { gst: number; qst: number; total: number } {
  if (!Number.isInteger(htCents) || htCents < 0) throw new Error("Montant HT invalide");
  const gst = roundDiv(htCents * 5, 100);
  const qst = roundDiv(htCents * 9975, 100_000);
  return { gst, qst, total: gst + qst };
}

/** Montant TTC d'affichage (HT + TPS + TVQ). */
export function withQcTaxes(htCents: number): number {
  return htCents + qcTaxes(htCents).total;
}

/** Résumé serveur d'une commande (tout ce que l'UI peut afficher). */
export function programQuote(pack: ProgramPack, mode: ProgramMode) {
  const installments = Array.from({ length: installmentCount(mode) }, (_, i) => {
    const rank = i + 1;
    const ht = installmentHtCents(pack, mode, rank);
    const tax = qcTaxes(ht);
    return {
      rank,
      due_when: rank === 1 ? "inscription" : "seance_7",
      amount_ht_cents: ht,
      tax_cents: tax.total,
      amount_ttc_cents: ht + tax.total,
    };
  });
  return {
    pack,
    mode,
    currency: PROGRAM_CURRENCY,
    total_ht_cents: PROGRAM_TOTAL_HT_CENTS[pack],
    installments,
  };
}

// ── Validation des requêtes (Zod strict : tout champ inconnu = refus) ───────
export const ProgramCheckoutRequest = z.object({
  pack: z.enum(PROGRAM_PACKS),
  mode: z.enum(PROGRAM_MODES),
  /** Origine de retour souhaitée (filtrée par APP_ORIGINS). */
  origin: z.string().max(200).optional(),
}).strict();
export type ProgramCheckoutRequest = z.infer<typeof ProgramCheckoutRequest>;

export const InstallmentChargeRequest = z.object({
  installment_id: z.string().uuid().optional(),
}).strict();

export const RefundRequest = z.object({
  installment_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  reason: z.string().trim().min(3).max(500),
}).strict();
export type RefundRequest = z.infer<typeof RefundRequest>;

// ── Remboursement : autorisation et plafond ──────────────────────────────────
export type RefundableInstallment = {
  id: string;
  status: string;
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number | null;
  amount_refunded_cents: number | null;
};

export type RefundDecision =
  | { ok: true; maxCents: number }
  | { ok: false; code: "forbidden" | "not_paid" | "amount_too_high"; status: number; message: string };

export const REFUND_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** Le rôle vient de app_metadata.role (non modifiable par l'utilisateur). */
export function decideRefund(role: string, req: RefundRequest, inst: RefundableInstallment): RefundDecision {
  if (!REFUND_ROLES.has(role)) {
    return { ok: false, code: "forbidden", status: 403, message: "Réservé aux administrateurs" };
  }
  const paid = inst.amount_paid_cents ?? 0;
  const already = inst.amount_refunded_cents ?? 0;
  if (!inst.stripe_payment_intent_id || paid <= 0 || !["payee", "remboursee"].includes(inst.status)) {
    return { ok: false, code: "not_paid", status: 409, message: "Ce versement n'a pas été payé" };
  }
  const maxCents = paid - already;
  if (req.amount_cents > maxCents) {
    return {
      ok: false,
      code: "amount_too_high",
      status: 422,
      message: `Montant supérieur au remboursable (${maxCents} ¢)`,
    };
  }
  return { ok: true, maxCents };
}

/**
 * Clé d'idempotence Stripe du remboursement : un double clic (même versement,
 * même montant, même état déjà remboursé) ne rembourse qu'une fois.
 */
export function refundIdempotencyKey(installmentId: string, amountCents: number, alreadyRefundedCents: number): string {
  return `program-refund-${installmentId}-${alreadyRefundedCents}-${amountCents}`;
}

// ── Versement 2 : issue d'un prélèvement hors session ────────────────────────
export type ChargeOutcome = "paid" | "processing" | "needs_link" | "failed";

/**
 * • succeeded                       → payé (le webhook confirmera) ;
 * • processing                      → en attente du webhook ;
 * • requires_action / SCA exigée    → envoyer un lien (aucune nouvelle tentative) ;
 * • tout le reste (carte refusée…)  → échec, alerte admin (aucune nouvelle tentative).
 */
export function decideChargeOutcome(input: { piStatus?: string | null; errorCode?: string | null }): ChargeOutcome {
  if (input.errorCode === "authentication_required") return "needs_link";
  if (input.piStatus === "requires_action" || input.piStatus === "requires_confirmation") return "needs_link";
  if (input.piStatus === "succeeded") return "paid";
  if (input.piStatus === "processing") return "processing";
  return "failed";
}

/** Drapeau booléen d'environnement : seule la valeur exacte « true » active. */
export function envFlag(value: string | undefined | null): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

// ── Webhook : quels événements relèvent des programmes ? ─────────────────────
export const PROGRAM_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
]);

type StripeEventLike = {
  id?: unknown;
  type?: unknown;
  data?: { object?: Record<string, unknown> | null } | null;
} | null | undefined;

/**
 * Vrai si l'événement doit partir vers le traitement « programmes ».
 *   • metadata.kind === 'program' (sessions Checkout et PaymentIntents que
 *     nous créons) ;
 *   • charge.refunded : le PaymentIntent est cherché en base (la charge ne
 *     porte pas toujours les metadata) — un PI inconnu revient « not_program ».
 * Le flux Maison (mode=subscription, aucune metadata.kind) n'est jamais routé ici.
 */
export function isProgramEvent(event: StripeEventLike): boolean {
  const type = typeof event?.type === "string" ? event.type : "";
  if (!PROGRAM_EVENT_TYPES.has(type)) return false;
  const object = event?.data?.object ?? {};
  if (type === "charge.refunded") return typeof object.payment_intent === "string";
  const meta = (object.metadata ?? {}) as Record<string, unknown>;
  if (type.startsWith("checkout.session.") && object.mode === "subscription") return false;
  return meta.kind === "program";
}

/** Sous-ensemble de l'objet Stripe transmis à la base (pas de PII inutile). */
export function programEventPayload(object: Record<string, unknown>): Record<string, unknown> {
  const pick = [
    "id", "object", "mode", "status", "payment_status", "payment_intent", "customer",
    "client_reference_id", "amount_total", "amount_received", "amount", "amount_refunded",
    "payment_method", "metadata", "total_details", "last_payment_error",
  ];
  const out: Record<string, unknown> = {};
  for (const k of pick) {
    if (!(k in object)) continue;
    if (k === "last_payment_error") {
      const e = (object[k] ?? {}) as Record<string, unknown>;
      out[k] = { code: e.code ?? null, decline_code: e.decline_code ?? null };
    } else if (k === "total_details") {
      const t = (object[k] ?? {}) as Record<string, unknown>;
      out[k] = { amount_tax: t.amount_tax ?? null };
    } else {
      out[k] = object[k];
    }
  }
  return out;
}

/** Contrat minimal d'appel RPC (client Supabase service_role ou faux en test). */
export type RpcLike = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Traite un événement programme : UN appel à la fonction SQL idempotente
 * `program_apply_stripe_event` (081), qui enregistre l'id d'événement et
 * applique la transition dans la même transaction. Rejoué → « duplicate ».
 */
export async function handleProgramEvent(
  event: { id: string; type: string; data: { object: Record<string, unknown> } },
  rpc: RpcLike,
): Promise<string> {
  const { data, error } = await rpc("program_apply_stripe_event", {
    p_event_id: event.id,
    p_type: event.type,
    p_object: programEventPayload(event.data.object),
  });
  if (error) throw new Error(`program_apply_stripe_event: ${error.message}`);
  return String(data ?? "");
}

// ── Paramètres de session Checkout (sans réseau) ─────────────────────────────
export type CheckoutBuildInput = {
  pack: ProgramPack;
  mode: ProgramMode;
  rank: 1 | 2;
  orderId: string;
  installmentId: string;
  appUserId: string;
  customerId: string;
  /** id de prix Stripe trouvé par lookup_key ET conforme au montant serveur, sinon null. */
  priceId: string | null;
  taxEnabled: boolean;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Prix : on prend le prix du catalogue (lookup_key) s'il existe ET correspond
 * exactement au montant serveur (catalogue propre dans les rapports Stripe) ;
 * sinon repli `price_data` avec le montant serveur (le paiement reste juste même
 * si le script du catalogue n'a pas tourné ou si un prix a dérivé).
 */
export function buildProgramCheckoutParams(i: CheckoutBuildInput): Record<string, FormValue> {
  const amount = installmentHtCents(i.pack, i.mode, i.rank);
  const metadata = {
    app_user_id: i.appUserId,
    kind: "program",
    pack: i.pack,
    mode: i.mode,
    installment: String(i.rank),
    order_id: i.orderId,
    installment_id: i.installmentId,
  };
  const label = `${PROGRAM_LABELS[i.pack]} — ${
    i.mode === "une_fois" ? "paiement complet" : `versement ${i.rank}/2`
  }`;
  const lineItem = i.priceId ? { price: i.priceId, quantity: 1 } : {
    quantity: 1,
    price_data: {
      currency: PROGRAM_CURRENCY,
      unit_amount: amount,
      tax_behavior: "exclusive",
      product_data: { name: label, tax_code: PROGRAM_TAX_CODE, metadata: { kind: "program", pack: i.pack } },
    },
  };
  return {
    mode: "payment",
    customer: i.customerId,
    client_reference_id: i.appUserId,
    line_items: [lineItem],
    locale: "fr-CA",
    billing_address_collection: i.taxEnabled ? "required" : "auto",
    customer_update: { address: "auto", name: "auto" },
    ...(i.taxEnabled ? { automatic_tax: { enabled: true } } : {}),
    metadata,
    payment_intent_data: {
      metadata,
      description: label,
      // Carte conservée pour le versement 2 (seulement s'il y en a un).
      ...(i.mode === "deux_versements" && i.rank === 1 ? { setup_future_usage: "off_session" } : {}),
    },
    success_url: i.successUrl,
    cancel_url: i.cancelUrl,
  };
}

/** Vrai si le prix du catalogue correspond exactement au montant serveur. */
export function catalogPriceMatches(
  price: { unit_amount?: number | null; currency?: string | null; tax_behavior?: string | null; active?: boolean } | null | undefined,
  expectedCents: number,
): boolean {
  return !!price && price.active !== false && price.unit_amount === expectedCents &&
    String(price.currency).toLowerCase() === PROGRAM_CURRENCY && price.tax_behavior === "exclusive";
}

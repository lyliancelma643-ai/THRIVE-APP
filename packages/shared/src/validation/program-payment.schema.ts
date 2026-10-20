import { z } from 'zod';

// Programmes payés par Stripe (Groupe · Individuel · Complet) — contrat client/serveur.
// Miroir des edge functions (supabase/functions/_shared/program_billing.ts) et de la
// migration 081. Le client N'ENVOIE JAMAIS de montant : seulement { pack, mode }.

export const PROGRAM_PACKS = ['GROUPE', 'INDIVIDUEL', 'COMPLET'] as const;
export const PROGRAM_MODES = ['deux_versements', 'une_fois'] as const;

export const ProgramPackSchema = z.enum(PROGRAM_PACKS);
export const ProgramModeSchema = z.enum(PROGRAM_MODES);
export type ProgramPack = z.infer<typeof ProgramPackSchema>;
export type ProgramMode = z.infer<typeof ProgramModeSchema>;

/** Requête de create-program-checkout (strict : tout champ inconnu, montant compris, est refusé en 422). */
export const ProgramCheckoutRequestSchema = z
  .object({
    pack: ProgramPackSchema,
    mode: ProgramModeSchema,
    origin: z.string().max(200).optional(),
  })
  .strict();
export type ProgramCheckoutRequest = z.infer<typeof ProgramCheckoutRequestSchema>;

/** Requête de admin-create-program-link (ADMIN / SUPER_ADMIN). */
export const AdminProgramLinkRequestSchema = z
  .object({
    parent_id: z.string().uuid(),
    pack: ProgramPackSchema,
    mode: ProgramModeSchema,
  })
  .strict();
export type AdminProgramLinkRequest = z.infer<typeof AdminProgramLinkRequestSchema>;

export const ProgramInstallmentQuoteSchema = z.object({
  rank: z.number().int(),
  due_when: z.enum(['inscription', 'seance_7']),
  amount_ht_cents: z.number().int(),
  tax_cents: z.number().int(),
  amount_ttc_cents: z.number().int(),
});

export const ProgramQuoteSchema = z.object({
  pack: ProgramPackSchema,
  mode: ProgramModeSchema,
  currency: z.string(),
  total_ht_cents: z.number().int(),
  installments: z.array(ProgramInstallmentQuoteSchema),
});
export type ProgramQuote = z.infer<typeof ProgramQuoteSchema>;

/** Réponse 200 de create-program-checkout. */
export const ProgramCheckoutResponseSchema = z.object({
  url: z.string().url(),
  id: z.string(),
  order_id: z.string(),
  quote: ProgramQuoteSchema,
});
export type ProgramCheckoutResponse = z.infer<typeof ProgramCheckoutResponseSchema>;

/** Réponse 200 de admin-create-program-link. */
export const AdminProgramLinkResponseSchema = z.object({
  url: z.string().url(),
  expires_at: z.string().nullable(),
});
export type AdminProgramLinkResponse = z.infer<typeof AdminProgramLinkResponseSchema>;

/** Codes d'erreur `{ code, message }` renvoyés par les fonctions programmes. */
export const PROGRAM_ERROR_CODES = [
  'unauthorized', // 401
  'forbidden', // 403
  'method_not_allowed', // 405
  'validation', // 422
  'pack_active', // 409 : un pack THRIVE est déjà en cours
  'already_enrolled', // 409 : une inscription est déjà en cours
  'not_found', // 404
  'amount_mismatch', // 500
  'not_configured', // 503
  'stripe_error', // 502
  'internal', // 500
] as const;
export type ProgramErrorCode = (typeof PROGRAM_ERROR_CODES)[number];

// ── Lignes de la base (migration 20261012_081_program_payments.sql) ──────────
export const PROGRAM_ORDER_STATUSES = ['en_attente', 'active', 'soldee', 'annulee', 'remboursee'] as const;
export const PROGRAM_INSTALLMENT_STATUSES = ['due', 'payee', 'echouee', 'remboursee'] as const;

export const ProgramOrderSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  pack: ProgramPackSchema,
  mode: ProgramModeSchema,
  currency: z.literal('cad'),
  total_ht_cents: z.number().int(),
  status: z.enum(PROGRAM_ORDER_STATUSES),
  stripe_customer_id: z.string().nullable(),
  stripe_payment_method_id: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  pack_enrollment_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProgramOrder = z.infer<typeof ProgramOrderSchema>;

export const ProgramInstallmentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  rank: z.union([z.literal(1), z.literal(2)]),
  amount_ht_cents: z.number().int(),
  tax_cents: z.number().int(),
  status: z.enum(PROGRAM_INSTALLMENT_STATUSES),
  due_when: z.enum(['inscription', 'seance_7']),
  due_at: z.string(),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  checkout_url: z.string().nullable(),
  checkout_expires_at: z.string().nullable(),
  requires_action: z.boolean(),
  failure_code: z.string().nullable(),
  charge_attempts: z.number().int(),
  amount_paid_cents: z.number().int().nullable(),
  tax_paid_cents: z.number().int().nullable(),
  amount_refunded_cents: z.number().int(),
  paid_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProgramInstallment = z.infer<typeof ProgramInstallmentSchema>;

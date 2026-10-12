import { z } from 'zod';

// Demande d'appel de 15 minutes (Y3). Aucun paiement.
// Appelle la fonction edge `request-intro-call` (lot O4, migration 082) qui
// enregistre la demande et prévient l'équipe. `addToCalendar` reste côté app.
// Le client Supabase est importé à la demande pour que la validation reste
// testable hors React Native (introCall.test.ts).

export const introCallInputSchema = z.object({
  mode: z.enum(['video', 'telephone']),
  /** Créneau choisi, ISO 8601. */
  slot: z.string().datetime({ offset: true }),
  childId: z.string().uuid().optional(),
  /** Petit mot facultatif pour l'équipe. */
  note: z.string().trim().max(500).optional(),
  addToCalendar: z.boolean().default(false),
});

export type IntroCallInput = z.input<typeof introCallInputSchema>;

export type IntroCallResult =
  | { status: 'not_implemented' }
  | { status: 'requested'; id?: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

const INVALID_MESSAGE = 'Choisis un mode et un créneau.';
const GENERIC_ERROR = 'La demande n’a pas pu être envoyée. Réessaie dans un instant.';

/** Messages neutres par code renvoyé par la fonction edge. */
const ERROR_MESSAGES: Record<string, IntroCallResult> = {
  invalid_input: { status: 'invalid', message: INVALID_MESSAGE },
  invalid_mode: { status: 'invalid', message: INVALID_MESSAGE },
  invalid_slot: { status: 'invalid', message: 'Ce créneau n’est plus disponible. Choisis-en un autre.' },
  invalid_note: { status: 'invalid', message: 'Ton message est un peu long : 500 caractères au plus.' },
  duplicate_slot: { status: 'invalid', message: 'Tu as déjà demandé ce créneau.' },
  quota_reached: {
    status: 'error',
    message: 'Tu as déjà des demandes en attente. L’équipe te répond très vite.',
  },
  rate_limited: { status: 'error', message: 'Trop de demandes d’un coup. Réessaie un peu plus tard.' },
};

/** Traduit un code d'erreur de la fonction edge en résultat neutre (pur, testé). */
export function introCallErrorResult(code: string | null | undefined): IntroCallResult {
  return (code && ERROR_MESSAGES[code]) || { status: 'error', message: GENERIC_ERROR };
}

/** Corps envoyé à la fonction edge : uniquement ce que le serveur attend. */
export function toIntroCallBody(input: z.output<typeof introCallInputSchema>) {
  return {
    mode: input.mode,
    slot: input.slot,
    ...(input.childId ? { childId: input.childId } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
}

async function readErrorCode(error: unknown): Promise<string | null> {
  // FunctionsHttpError : la réponse HTTP est dans `context`.
  const ctx = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (!ctx || typeof ctx.json !== 'function') return null;
  try {
    const body = (await ctx.json()) as { code?: unknown } | null;
    return typeof body?.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

export async function requestIntroCall(input: IntroCallInput): Promise<IntroCallResult> {
  const parsed = introCallInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'invalid', message: INVALID_MESSAGE };
  try {
    const { supabaseClient } = await import('@thrive/shared');
    const { data, error } = await supabaseClient.functions.invoke('request-intro-call', {
      body: toIntroCallBody(parsed.data),
    });
    if (error) return introCallErrorResult(await readErrorCode(error));
    const id = (data as { id?: unknown } | null)?.id;
    return typeof id === 'string' ? { status: 'requested', id } : { status: 'requested' };
  } catch {
    return { status: 'error', message: GENERIC_ERROR };
  }
}

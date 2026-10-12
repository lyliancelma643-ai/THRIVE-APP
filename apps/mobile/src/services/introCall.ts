import { z } from 'zod';

// Demande d'appel de 15 minutes (Y3). Aucun paiement. Stub : la fonction edge
// `request-intro-call` sera créée par le lot O4 ; le contrat d'entrée est figé ici.

export const introCallInputSchema = z.object({
  mode: z.enum(['video', 'telephone']),
  /** Créneau choisi, ISO 8601. */
  slot: z.string().datetime({ offset: true }),
  childId: z.string().uuid().optional(),
  addToCalendar: z.boolean().default(false),
});

export type IntroCallInput = z.input<typeof introCallInputSchema>;

export type IntroCallResult =
  | { status: 'not_implemented' }
  | { status: 'requested' }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string };

export async function requestIntroCall(input: IntroCallInput): Promise<IntroCallResult> {
  const parsed = introCallInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'invalid', message: 'Choisis un mode et un créneau.' };
  // [À COMPLÉTER : O4 — appeler supabase.functions.invoke('request-intro-call', { body: parsed.data }).]
  return { status: 'not_implemented' };
}

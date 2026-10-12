// Paiement des programmes (Groupe / Individuel / Complet) — interface côté app.
// Le client N'ENVOIE JAMAIS de montant : seulement le pack et le mode ; le serveur
// décide du montant, des taxes et des versements. Stub rempli par le lot O2.

export type ProgramPack = 'groupe' | 'individuel' | 'complet';
export type ProgramPaymentMode = 'deux_versements' | 'une_fois';

export type ProgramCheckoutResult =
  | { status: 'not_implemented' }
  | { status: 'opened' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function isProgramPack(v: unknown): v is ProgramPack {
  return v === 'groupe' || v === 'individuel' || v === 'complet';
}

/** Démarre le paiement d'un programme. [À COMPLÉTER : O2 — Checkout serveur ouvert dans le navigateur de l'app.] */
export async function startProgramCheckout(
  _pack: ProgramPack,
  _mode: ProgramPaymentMode,
): Promise<ProgramCheckoutResult> {
  return { status: 'not_implemented' };
}

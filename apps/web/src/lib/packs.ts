// Packs clients THRIVE et droits d'accès au lecteur de bilan.
// Source de vérité du droit = families.pack (verrouillé en base, cf. migration 023).

export type Pack = 'ESSENTIEL' | 'AVANCE' | 'PERFORMANCE';

export const PACK_ORDER: Pack[] = ['ESSENTIEL', 'AVANCE', 'PERFORMANCE'];

export const PACK_LABELS: Record<Pack, string> = {
  ESSENTIEL: 'Essentiel',
  AVANCE: 'Avancé',
  PERFORMANCE: 'Performance',
};

export const PACK_PRICES: Record<Pack, string> = {
  ESSENTIEL: '1 700 $',
  AVANCE: '2 000 $',
  PERFORMANCE: '2 500 $',
};

// Le pack Avancé débloque bilan détaillé + observations uniquement aux bilans d'étape.
export const AVANCE_UNLOCK_SESSIONS = [3, 7, 13];

export function isPack(v: unknown): v is Pack {
  return v === 'ESSENTIEL' || v === 'AVANCE' || v === 'PERFORMANCE';
}

export function asPack(v: unknown): Pack {
  return isPack(v) ? v : 'ESSENTIEL';
}

// Message du coach : inclus dans tous les packs (les 13 fins de séance).
export function canSeeMessage(_pack: Pack): boolean {
  return true;
}

// Bilan détaillé + observations :
//   Performance → toutes les séances ; Avancé → séances 3/7/13 ; Essentiel → jamais.
export function canSeePremium(pack: Pack, sessionNumber: number | null): boolean {
  if (pack === 'PERFORMANCE') return true;
  if (pack === 'AVANCE')
    return sessionNumber != null && AVANCE_UNLOCK_SESSIONS.includes(sessionNumber);
  return false;
}

// Phrase d'incitation à l'upgrade, adaptée au pack courant.
export function upgradeHint(pack: Pack): string {
  if (pack === 'AVANCE') {
    return `Votre pack Avancé donne accès aux bilans des séances 3, 7 et 13. Passez au pack Performance (${PACK_PRICES.PERFORMANCE}) pour débloquer toutes les séances.`;
  }
  return `Inclus dès le pack Avancé (${PACK_PRICES.AVANCE} — bilans des séances 3, 7 et 13) et Performance (${PACK_PRICES.PERFORMANCE} — toutes les séances).`;
}

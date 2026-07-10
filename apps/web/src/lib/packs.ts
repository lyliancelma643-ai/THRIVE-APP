// Packs clients THRIVE et matrice de droits (features + quotas).
// Source de vérité du droit = families.pack (verrouillé en base, cf. migration 023),
// synchronisé depuis les entitlements (migration 038). Cette constante est la
// copie conforme du seed SQL de la table `plans` — toute évolution se fait aux
// deux endroits (docs/segmentation-forfaits.md §2 est la référence).

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

export const PACK_PRICE_CENTS: Record<Pack, number> = {
  ESSENTIEL: 170000,
  AVANCE: 200000,
  PERFORMANCE: 250000,
};

export const PACK_TAGLINES: Record<Pack, string> = {
  ESSENTIEL: 'Le parcours THRIVE complet avec votre coach.',
  AVANCE: 'Comprenez la progression, aux moments clés.',
  PERFORMANCE: "L'accompagnement le plus profond et le plus personnalisé.",
};

// ── Matrice de droits ────────────────────────────────────────────────────────

export type PlanFeature =
  | 'detailedBilan'
  | 'skillBreakdown'
  | 'lsssCurve'
  | 'emotionWheel'
  | 'progressJournal'
  | 'coachLetter'
  | 'coachMessaging'
  | 'csvExport'
  | 'pdfExport'
  | 'premiumTemplates'
  | 'aiSummary';

export type PlanLimitKey =
  | 'maxChildren'
  | 'maxParents'
  | 'historyMonths'
  | 'detailLevel'
  | 'storageMb';

export const PLAN_FEATURES: Record<Pack, Record<PlanFeature, boolean>> = {
  ESSENTIEL: {
    detailedBilan: false,
    skillBreakdown: false,
    lsssCurve: false,
    emotionWheel: false,
    progressJournal: false,
    coachLetter: false,
    coachMessaging: false,
    csvExport: false,
    pdfExport: false,
    premiumTemplates: false,
    aiSummary: false,
  },
  AVANCE: {
    detailedBilan: true,
    skillBreakdown: true,
    lsssCurve: true,
    emotionWheel: true,
    progressJournal: true,
    coachLetter: true,
    coachMessaging: false,
    csvExport: false,
    pdfExport: false,
    premiumTemplates: false,
    aiSummary: false,
  },
  PERFORMANCE: {
    detailedBilan: true,
    skillBreakdown: true,
    lsssCurve: true,
    emotionWheel: true,
    progressJournal: true,
    coachLetter: true,
    coachMessaging: true,
    csvExport: true,
    pdfExport: true,
    premiumTemplates: true,
    aiSummary: false, // ⚠️ « à venir » — aucune intégration LLM (décision C)
  },
};

// null = illimité
export const PLAN_LIMITS: Record<Pack, Record<PlanLimitKey, number | null>> = {
  ESSENTIEL: { maxChildren: 1, maxParents: 1, historyMonths: 3, detailLevel: 1, storageMb: 100 },
  AVANCE: { maxChildren: 2, maxParents: 2, historyMonths: 12, detailLevel: 2, storageMb: 500 },
  PERFORMANCE: { maxChildren: null, maxParents: null, historyMonths: null, detailLevel: 3, storageMb: 2000 },
};

// Séances dont le bilan détaillé est visible ; null = toutes.
export const DETAILED_BILAN_SESSIONS: Record<Pack, number[] | null> = {
  ESSENTIEL: [],
  AVANCE: [3, 7, 13],
  PERFORMANCE: null,
};

export function can(pack: Pack, feature: PlanFeature): boolean {
  return PLAN_FEATURES[pack][feature];
}

export function limit(pack: Pack, key: PlanLimitKey): number | null {
  return PLAN_LIMITS[pack][key];
}

// Quota atteint ? (null = illimité → jamais atteint)
export function quotaReached(pack: Pack, key: PlanLimitKey, current: number): boolean {
  const max = limit(pack, key);
  return max !== null && current >= max;
}

// ── Rétrocompatibilité (mêmes signatures qu'avant la matrice) ────────────────

// Le pack Avancé débloque bilan détaillé + observations uniquement aux bilans d'étape.
export const AVANCE_UNLOCK_SESSIONS = DETAILED_BILAN_SESSIONS.AVANCE as number[];

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
  if (!can(pack, 'detailedBilan')) return false;
  const sessions = DETAILED_BILAN_SESSIONS[pack];
  if (sessions === null) return true;
  return sessionNumber != null && sessions.includes(sessionNumber);
}

// Phrase d'incitation à l'upgrade, adaptée au pack courant.
export function upgradeHint(pack: Pack): string {
  if (pack === 'AVANCE') {
    return `Votre pack Avancé donne accès aux bilans des séances 3, 7 et 13. Passez au pack Performance (${PACK_PRICES.PERFORMANCE}) pour débloquer toutes les séances.`;
  }
  return `Inclus dès le pack Avancé (${PACK_PRICES.AVANCE} — bilans des séances 3, 7 et 13) et Performance (${PACK_PRICES.PERFORMANCE} — toutes les séances).`;
}

// Incitation générique pour une fonctionnalité verrouillée (jauge fine, LSSS,
// émotions, journal, messagerie, exports) — indique le premier pack qui l'ouvre.
export function featureUpgradeHint(feature: PlanFeature): string {
  const firstPack = PACK_ORDER.find((p) => PLAN_FEATURES[p][feature]);
  if (!firstPack) return 'Cette fonctionnalité arrive prochainement.';
  return `Inclus dès le pack ${PACK_LABELS[firstPack]} (${PACK_PRICES[firstPack]}).`;
}

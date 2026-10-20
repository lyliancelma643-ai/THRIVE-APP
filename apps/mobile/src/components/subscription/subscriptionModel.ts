// « Mon abonnement » (X2) : traduit l'accès RÉEL (RevenueCat + access_state) en texte à afficher. Logique PURE (testée).
// Deux états du canevas : « Maison inclus avec le programme, puis l'option de continuer » (V1/V3) et
// « essai en cours, Gérer / Restaurer » (V2) ; plus les états annexes (actif, offert, aucun). Aucun prix en dur.

import type { ManagementMode } from '../../services/subscription-logic';

export type SubscriptionTag = { label: string; tone: 'ok' | 'tint' };

export type SubscriptionDetail = {
  /** « Accès ouvert jusqu’à » / « Fin de l’essai » / « Renouvellement le ». */
  label: string;
  value: string;
  /** Avancement de l'essai (0 à 1) ; absent hors essai. */
  progress?: number | null;
};

export type SubscriptionModel = {
  status: string;
  tag: SubscriptionTag | null;
  detail: SubscriptionDetail | null;
  /** Mention sous le détail (« Ensuite, tu pourras continuer à … via l’App Store. »). */
  note: string | null;
  /** Rangée « Partagé avec ton co-parent ». */
  shared: boolean;
  /** Rangée « Payé via l’App Store » (achat fait dans le store de CE téléphone). */
  storeRow: boolean;
  /** Rangée « Payé avec ton programme · Programme réglé par Stripe · aucun abonnement séparé ». */
  programRow: boolean;
  /** « Ton abonnement est actif sur ce compte. » (payé ailleurs : neutre, sans lien). */
  externalNote: boolean;
  /** « Gérer dans … » + « Restaurer les achats » : seulement si l'achat vient du store de ce téléphone. */
  manage: boolean;
  /** Bouton « Découvrir l’abonnement » (aucun accès). */
  discover: boolean;
};

export type SubscriptionInput = {
  isLoading: boolean;
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrial: boolean;
  willRenew: boolean;
  management: ManagementMode;
  fromProgram: boolean;
  /** Nom du programme actif (« Individuel »), si connu. */
  programName?: string | null;
  /** Dates déjà formatées (« 9 novembre 2026 »), vides si inconnues. */
  endDate: string;
  packEnd: string;
  /** Formule de l'abonnement actif, lue dans l'offering : « Annuel · 299 $ par an ». */
  planLine: string | null;
  /** « 299 $ par an » (pour « Puis … »). */
  planPrice: string | null;
  /** Prix de l'offering pour « puis l'option de continuer ». */
  offer: { monthly: string | null; annual: string | null };
  trialProgress: number | null;
  /** « l’App Store » / « Google Play ». */
  storeName: string;
};

export function buildSubscriptionModel(i: SubscriptionInput): SubscriptionModel {
  const native = i.isSubscribed && i.management === 'native';
  const base: SubscriptionModel = {
    status: '',
    tag: null,
    detail: null,
    note: null,
    shared: i.isSubscribed || i.fromProgram,
    storeRow: native,
    programRow: i.fromProgram && !native,
    externalNote: i.isSubscribed && i.management === 'external',
    manage: native,
    discover: !i.isLoading && !i.hasAccess,
  };

  if (i.isLoading) return { ...base, status: 'Vérification…' };

  if (i.fromProgram && !i.isSubscribed) {
    const prices = [
      i.offer.monthly ? `${i.offer.monthly} par mois` : null,
      i.offer.annual ? `${i.offer.annual} par an` : null,
    ].filter(Boolean);
    return {
      ...base,
      status: i.programName ? `Inclus avec ton programme ${i.programName}` : 'Inclus avec ton programme',
      tag: { label: 'Actif', tone: 'ok' },
      detail: { label: 'Accès ouvert jusqu’à', value: i.packEnd || 'la fin du programme' },
      note: prices.length
        ? `Ensuite, tu pourras continuer à ${prices.join(' ou ')}, via ${i.storeName}.`
        : `Ensuite, tu pourras continuer avec un abonnement Maison, via ${i.storeName}.`,
    };
  }
  if (!i.isSubscribed && i.hasAccess) return { ...base, status: 'Inclus dans ton accompagnement THRIVE.' };
  if (!i.isSubscribed) return { ...base, status: 'Aucun abonnement actif.' };

  if (i.management === 'gift') {
    return { ...base, status: i.endDate ? `Accès offert jusqu’au ${i.endDate}.` : 'Accès offert.', tag: { label: 'Actif', tone: 'ok' } };
  }
  if (i.isTrial) {
    return {
      ...base,
      status: i.planLine ?? (i.endDate ? `Essai gratuit jusqu’au ${i.endDate}.` : 'Essai gratuit en cours.'),
      tag: { label: 'Essai gratuit', tone: 'tint' },
      detail: i.endDate ? { label: 'Fin de l’essai', value: i.endDate, progress: i.trialProgress } : null,
      note: i.endDate
        ? `${i.planPrice ? `Puis ${i.planPrice}, renouvelé` : 'Renouvelé'} automatiquement. Annule au moins 24 h avant pour ne rien payer.`
        : null,
    };
  }
  if (i.endDate) {
    return {
      ...base,
      status: i.planLine ?? (i.willRenew ? `Actif · renouvellement le ${i.endDate}.` : `Actif jusqu’au ${i.endDate}, sans renouvellement.`),
      tag: { label: 'Actif', tone: 'ok' },
      detail: { label: i.willRenew ? 'Renouvellement le' : 'Actif jusqu’au', value: i.endDate },
      note: i.willRenew ? null : 'Ton abonnement ne se renouvellera pas.',
    };
  }
  return { ...base, status: i.planLine ?? 'Abonnement actif.', tag: { label: 'Actif', tone: 'ok' } };
}

/** Avancement de l'essai : (maintenant − début) / (fin − début), borné à [0, 1] ; null si une date manque. */
export function trialProgress(startIso: string | null | undefined, endIso: string | null | undefined, now = new Date()): number | null {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  return Math.min(1, Math.max(0, (now.getTime() - s) / (e - s)));
}

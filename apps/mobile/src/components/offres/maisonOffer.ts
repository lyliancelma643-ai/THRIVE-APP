// Données de la carte « THRIVE Maison » (Y) : tout vient de l'offering RevenueCat, jamais de constantes.
// Logique PURE (testée) : le conteneur lit l'offering, la vue ne reçoit que du texte prêt à afficher.

import { annualSavingPercent, isoPeriodFr, perPeriodFr } from '../../services/subscription-logic';

export type MaisonBadge = 'inclus' | 'abonnement' | null;

export type MaisonOfferData = {
  loading: boolean;
  /** « 32,50 $ » (priceString du store) et son unité « par mois ». */
  monthly: { price: string; unit: string } | null;
  /** « 299 $ » et « par an · −23 % ». */
  annual: { price: string; unit: string } | null;
  /** « 1 mois d’essai gratuit · partagé avec ton co-parent » (absent si l'offering ne déclare pas d'essai). */
  trialLine: string | null;
  /** « l’App Store » / « Google Play ». */
  storeName: string;
  /** Étiquette en haut à droite : « Inclus » (programme) ou « Ton abonnement ». */
  badge: MaisonBadge;
};

type PackageInput = { priceString: string; price: number; subscriptionPeriod?: string | null };

export function buildMaisonOfferData(input: {
  loading: boolean;
  monthly: PackageInput | null;
  annual: PackageInput | null;
  /** Période d'essai gratuit ISO 8601 de l'offering (P1M…), ou null. */
  trialIso: string | null;
  android: boolean;
  badge: MaisonBadge;
}): MaisonOfferData {
  const saving = annualSavingPercent(input.monthly?.price, input.annual?.price);
  const trial = isoPeriodFr(input.trialIso);
  return {
    loading: input.loading,
    monthly: input.monthly
      ? { price: input.monthly.priceString, unit: perPeriodFr(input.monthly.subscriptionPeriod ?? 'P1M').replace('/ ', 'par ') }
      : null,
    annual: input.annual
      ? { price: input.annual.priceString, unit: `par an${saving ? ` · −${saving} %` : ''}` }
      : null,
    trialLine: trial ? `${trial} d’essai gratuit · partagé avec ton co-parent` : null,
    storeName: input.android ? 'Google Play' : 'l’App Store',
    badge: input.badge,
  };
}

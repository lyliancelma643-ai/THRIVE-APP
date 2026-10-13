// Fixtures DEV du lot « offres » : offering factice au format RevenueCat + données de démonstration du canevas
// (7 novembre, 10 novembre, Vague d'automne, créneaux du mardi 14 octobre…). JAMAIS importé par l'app réelle.

import { buildMaisonOfferData, type MaisonBadge } from '../../components/offres/maisonOffer';
import { programByPack } from '../../components/offres/pricing';
import type { DayOption } from '../../components/offres/slots';
import { buildPaywallContent, type PackageLike } from '../../components/subscription/paywallModel';
import { buildSubscriptionModel } from '../../components/subscription/subscriptionModel';

/** Offering factice : Maison annuel 299 $ et mensuel 32,50 $, essai gratuit d'1 mois. */
export const FAKE_ANNUAL: PackageLike = {
  identifier: '$rc_annual',
  product: { identifier: 'thrive_moments_annuel', priceString: '299 $', price: 299, currencyCode: 'CAD', subscriptionPeriod: 'P1Y' },
};
export const FAKE_MONTHLY: PackageLike = {
  identifier: '$rc_monthly',
  product: { identifier: 'thrive_moments_mensuel', priceString: '32,50 $', price: 32.5, currencyCode: 'CAD', subscriptionPeriod: 'P1M' },
};
export const FAKE_TRIAL_ISO = 'P1M';
/** « Aujourd'hui » de la maquette : 10 octobre 2026 (essai d'un mois → 7 novembre / 10 novembre). */
export const DEMO_NOW = new Date(2026, 9, 10, 12, 0);

export function demoPaywallContent(selectedId: string) {
  return buildPaywallContent({
    packages: [FAKE_ANNUAL, FAKE_MONTHLY],
    selectedId,
    trialIso: FAKE_TRIAL_ISO,
    monthlyPrice: FAKE_MONTHLY.product.price,
    annualPrice: FAKE_ANNUAL.product.price,
    now: DEMO_NOW,
    android: false,
  });
}

export function demoMaisonOffer(badge: MaisonBadge) {
  return buildMaisonOfferData({
    loading: false,
    monthly: FAKE_MONTHLY.product,
    annual: FAKE_ANNUAL.product,
    trialIso: FAKE_TRIAL_ISO,
    android: false,
    badge,
  });
}

export const DEMO_VISIO_NOTE = 'Hors de l’île de Montréal ? Individuel aussi en visio, à [prix visio à confirmer].';
export const DEMO_COHORT = { title: 'Vague d’automne · 8–11 ans', detail: '2 inscrits · le groupe démarre dès 2' };
export const DEMO_PROGRAM = programByPack('groupe')!;

const slotTimes: [number, number, boolean][] = [[17, 0, true], [17, 30, false], [18, 0, true], [18, 30, true], [19, 0, true], [19, 30, true]];
const dayDefs: [string, string, number][] = [['lun.', 'Lundi', 13], ['mar.', 'Mardi', 14], ['mer.', 'Mercredi', 15], ['jeu.', 'Jeudi', 16], ['ven.', 'Vendredi', 17]];

/** Les cinq jours de la maquette (libellés de la maquette, tels quels). */
export const DEMO_DAYS: DayOption[] = dayDefs.map(([weekday, full, n]) => ({
  key: `2026-10-${n}`,
  weekday,
  dayNum: n,
  long: `${full} ${n} octobre`,
  month: 'Octobre 2026',
  short: `${full.toLowerCase()} ${n} oct.`,
  slots: slotTimes.map(([h, m, available]) => ({
    iso: new Date(2026, 9, n, h, m).toISOString(),
    time: `${h} h ${String(m).padStart(2, '0')}`,
    available,
  })),
}));

/** X2 : V1/V3 = « Maison inclus avec le programme » ; V2 = « essai en cours » (deux ÉTATS réels du même écran). */
export function demoSubscriptionModel(state: 'programme' | 'essai', programName: string | null = null) {
  return buildSubscriptionModel({
    isLoading: false,
    hasAccess: true,
    isSubscribed: state === 'essai',
    isTrial: state === 'essai',
    willRenew: true,
    management: state === 'essai' ? 'native' : 'none',
    fromProgram: state === 'programme',
    programName,
    endDate: '9 novembre 2026',
    packEnd: '',
    planLine: 'Annuel · 299 $ par an',
    planPrice: '299 $ par an',
    offer: { monthly: FAKE_MONTHLY.product.priceString, annual: FAKE_ANNUAL.product.priceString },
    trialProgress: 0.2,
    storeName: 'l’App Store',
  });
}

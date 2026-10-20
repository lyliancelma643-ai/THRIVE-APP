// Textes du paywall de Maison (D2) construits depuis l'offering RevenueCat. Logique PURE (testée) : aucun prix en dur.

const MONTHS_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 10 nov. 2026 ». */
export function formatShortDateFr(d: Date): string {
  return `${d.getDate()} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 10 nov. » (sans l'année). */
export function formatShortDayMonthFr(d: Date): string {
  return `${d.getDate()} ${MONTHS_ABBR[d.getMonth()]}`;
}

/**
 * Mention légale du paywall (Apple 3.1.2 / Google Play) : essai éventuel, prix facturé, périodicité, renouvellement
 * automatique, où annuler. Les liens « Conditions · Confidentialité » sont ajoutés par la vue.
 */
export function buildFinePrint(i: {
  /** Date de fin de l'essai (premier paiement), ou null s'il n'y a pas d'essai. */
  firstPayment: Date | null;
  /** priceString du store (« 299 $ »). */
  price: string;
  /** « par an » / « par mois ». */
  perPeriod: string;
  /** « soit 24,92 $ par mois » pour un abonnement annuel. */
  perMonth: string | null;
  android: boolean;
}): string {
  const head = i.firstPayment ? `Gratuit jusqu’au ${formatShortDateFr(i.firstPayment)}, puis ` : '';
  const month = i.perMonth ? ` (${i.perMonth})` : '';
  const store = i.android ? 'Google Play' : 'Apple';
  return `${head}${i.price} ${i.perPeriod}${month}. Renouvellement automatique ; annulable dans les réglages de ton compte ${store} au moins 24 h avant la fin de la période.`;
}

// ── Vue complète du paywall depuis un offering (utilisé par le conteneur ET par la galerie DEV) ──────────────────

import {
  annualSavingPercent,
  formatDayMonthFr,
  formatMoneyFr,
  isoPeriodFr,
  perMonthFromAnnual,
  perPeriodFr,
  trialTimeline,
} from '../../services/subscription-logic';
import type { PaywallViewProps } from './PaywallView';

/** Forme minimale d'un package RevenueCat (le vrai `PurchasesPackage` convient). */
export type PackageLike = {
  identifier: string;
  product: { identifier: string; priceString: string; price: number; currencyCode?: string | null; subscriptionPeriod?: string | null };
};

/** Nom de l'abonnement, identique à celui des fiches App Store / Google Play. */
export const SUBSCRIPTION_NAME = 'THRIVE — Le moment qui compte';

export type PaywallContent = Pick<
  PaywallViewProps,
  'trial' | 'trialLine' | 'noTrialHero' | 'plans' | 'selectedId' | 'ctaLabel' | 'ctaCaption' | 'finePrint'
>;

const unitOf = (iso: string | null | undefined) => perPeriodFr(iso).replace('/ ', 'par ');

/**
 * Tout le texte du paywall, lu dans l'offering : prix facturé, périodes, essai (déjà filtré par l'éligibilité),
 * frise calculée depuis la période d'essai. Aucun prix ni date en dur.
 */
export function buildPaywallContent(i: {
  /** Déjà triés : annuel, mensuel, puis le reste. */
  packages: readonly PackageLike[];
  selectedId: string | null;
  /** Période d'essai ISO du package choisi si le parent y a droit (sinon null). */
  trialIso: string | null;
  /** Prix mensuel / annuel pour le pourcentage d'économie. */
  monthlyPrice: number | null | undefined;
  annualPrice: number | null | undefined;
  now: Date;
  android: boolean;
}): PaywallContent {
  const saving = annualSavingPercent(i.monthlyPrice, i.annualPrice);
  const selected = i.packages.find((p) => p.identifier === i.selectedId) ?? i.packages[0] ?? null;
  const trialLabel = isoPeriodFr(i.trialIso);
  const timeline = i.trialIso ? trialTimeline(i.now, i.trialIso) : null;

  const plans = i.packages.map((pkg) => {
    const p = pkg.product;
    const isAnnual = pkg.identifier === '$rc_annual';
    const isMonthly = pkg.identifier === '$rc_monthly';
    const perMonth = isAnnual ? perMonthFromAnnual(p.price) : null;
    const billed = isAnnual
      ? `${p.priceString} facturés une fois par an`
      : isMonthly
        ? `${p.priceString} facturés chaque mois`
        : `${p.priceString} ${perPeriodFr(p.subscriptionPeriod)}`;
    return {
      id: pkg.identifier,
      name: isAnnual ? 'Annuel' : isMonthly ? 'Mensuel' : 'Formule',
      // Apple 3.1.2(c) : le montant facturé est l'élément de prix le plus visible ; le mensuel équivalent reste secondaire.
      headline: p.priceString,
      unit: isAnnual ? 'par an' : isMonthly ? 'par mois' : unitOf(p.subscriptionPeriod),
      sub: perMonth ? `soit ${formatMoneyFr(perMonth, p.currencyCode)} par mois` : billed,
      saving: isAnnual && saving ? `−${saving} %` : null,
      accessibilityLabel: `${SUBSCRIPTION_NAME}, ${isAnnual ? 'annuel' : isMonthly ? 'mensuel' : 'formule'} : ${billed}, renouvellement automatique`,
    };
  });

  const selPerMonth = selected?.identifier === '$rc_annual' ? perMonthFromAnnual(selected.product.price) : null;
  return {
    trial:
      i.trialIso && trialLabel && timeline
        ? { periodLabel: trialLabel, timeline: { today: 'Aujourd’hui', notice: formatDayMonthFr(timeline.notice), firstPayment: formatDayMonthFr(timeline.firstPayment) } }
        : null,
    trialLine: selected
      ? `Puis ${selected.product.priceString} ${unitOf(selected.product.subscriptionPeriod)}. Annule quand tu veux.`
      : 'Un mois complet, gratuit. Annule quand tu veux.',
    noTrialHero: selected ? { price: selected.product.priceString, period: unitOf(selected.product.subscriptionPeriod) } : null,
    plans,
    selectedId: selected?.identifier ?? null,
    ctaLabel: i.trialIso ? (trialLabel === '1 mois' ? 'Commencer mon mois gratuit' : `Commencer mon essai de ${trialLabel}`) : 'M’abonner',
    ctaCaption: i.trialIso && timeline ? `0 $ aujourd’hui · rien à payer avant le ${formatShortDayMonthFr(timeline.firstPayment)}` : null,
    finePrint: selected
      ? buildFinePrint({
          firstPayment: i.trialIso && timeline ? timeline.firstPayment : null,
          price: selected.product.priceString,
          perPeriod: unitOf(selected.product.subscriptionPeriod),
          perMonth: selPerMonth ? `soit ${formatMoneyFr(selPerMonth, selected.product.currencyCode)} par mois` : null,
          android: i.android,
        })
      : '',
  };
}

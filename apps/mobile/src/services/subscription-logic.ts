// ─────────────────────────────────────────────────────────────────────────────
// Logique PURE de l'abonnement mobile (aucune dépendance native) — testée dans
// subscription-logic.test.ts.
//
// RÈGLE ANTI-STEERING (App Store 3.1.1 / Google Play Paiements) : rien ici ni
// dans l'UI mobile ne mentionne, ne propose ni ne lie un paiement ailleurs que
// dans l'app. Un abonnement pris hors store est seulement RECONNU (accès ouvert)
// et présenté avec un message neutre, sans lien sortant.
// ─────────────────────────────────────────────────────────────────────────────

/** Entitlement RevenueCat unique de P3 — identique sur iOS, Android et web. */
export const ENTITLEMENT_ID = 'thrive_moments';

/** Rôles qui ont accès à tout, sans paywall ni achat. */
export const STAFF_ROLES = ['COACH', 'ADMIN', 'SUPER_ADMIN'] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Comment l'app mobile doit présenter la gestion de l'abonnement :
 *   • native   : payé via Apple / Google → bouton « Gérer mon abonnement » qui
 *                ouvre les réglages d'abonnement du téléphone ;
 *   • external : payé ailleurs (ex. autre plateforme) → message neutre, AUCUN
 *                bouton d'annulation ni lien sortant ;
 *   • gift     : accès offert (promotionnel) → message neutre ;
 *   • none     : pas d'abonnement actif.
 */
export type ManagementMode = 'native' | 'external' | 'gift' | 'none';

export function managementMode(
  store: string | null | undefined,
  platformOS: 'ios' | 'android' | string,
): ManagementMode {
  if (!store) return 'none';
  const s = store.toUpperCase();
  if (s === 'PROMOTIONAL') return 'gift';
  if (platformOS === 'ios' && (s === 'APP_STORE' || s === 'MAC_APP_STORE')) return 'native';
  if (platformOS === 'android' && s === 'PLAY_STORE') return 'native';
  // Abonnement Apple vu depuis Android (ou l'inverse), web, test store… :
  // on ne peut ni ne doit renvoyer vers un autre canal de paiement.
  return 'external';
}

/**
 * Repli de « Gérer mon abonnement » : n'ouvre une URL que si c'est la page
 * d'abonnement du store natif du téléphone. CustomerInfo.managementURL peut
 * pointer vers le portail Stripe quand le compte a aussi un abonnement web :
 * l'ouvrir sur mobile serait un lien sortant de paiement (anti-steering).
 */
export function isNativeStoreManagementUrl(
  url: string | null | undefined,
  platformOS: 'ios' | 'android' | string,
): boolean {
  // Pas de `new URL()` : le polyfill React Native n'implémente pas hostname.
  const m = /^(?:https|itms-apps):\/\/([^/?#:@]+)(?:[/?#]|$)/i.exec(url ?? '');
  if (!m) return false;
  const host = m[1].toLowerCase();
  if (platformOS === 'ios') return host === 'apps.apple.com' || host.endsWith('.apps.apple.com');
  if (platformOS === 'android') return host === 'play.google.com';
  return false;
}

/** « 1 mois », « 2 semaines », « 3 jours », « 1 an » depuis une période ISO 8601 (P1M…). */
export function isoPeriodFr(iso: string | null | undefined): string | null {
  const m = /^P(\d+)([DWMY])$/.exec(iso ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === 'D') return n === 7 ? '1 semaine' : `${n} jour${n > 1 ? 's' : ''}`;
  if (unit === 'W') return `${n} semaine${n > 1 ? 's' : ''}`;
  if (unit === 'M') return `${n} mois`;
  return `${n} an${n > 1 ? 's' : ''}`;
}

/** Unité affichée après le prix : « / mois », « / an ». */
export function perPeriodFr(iso: string | null | undefined): string {
  const m = /^P(\d+)([DWMY])$/.exec(iso ?? '');
  if (!m) return '';
  const n = Number(m[1]);
  const label = { D: 'jour', W: 'semaine', M: 'mois', Y: 'an' }[m[2] as 'D' | 'W' | 'M' | 'Y'];
  return n === 1 ? `/ ${label}` : `/ ${isoPeriodFr(iso)}`;
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Liens légaux du paywall (App Store 3.1.2 / Google Play Abonnements) ─────

/** Contrat de licence standard d'Apple : valable comme « Conditions » sur iOS uniquement. */
export const APPLE_STANDARD_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export type LegalLinks = { terms: string; privacy: string; complete: boolean };

/**
 * Conditions d'utilisation + politique de confidentialité à afficher sur le
 * paywall. Les deux sont obligatoires : `complete` est faux si l'une manque, et
 * le paywall refuse alors de vendre (mieux vaut pas d'achat qu'un rejet ou un
 * achat sans information légale). Sur Android, l'EULA d'Apple ne vaut rien.
 */
export function legalLinks(
  env: { terms?: string | null; privacy?: string | null },
  platformOS: 'ios' | 'android' | string,
): LegalLinks {
  const clean = (u: string | null | undefined) => (/^https:\/\/\S+$/i.test(u ?? '') ? (u as string) : '');
  const terms = clean(env.terms) || (platformOS === 'ios' ? APPLE_STANDARD_EULA : '');
  const privacy = clean(env.privacy);
  return { terms, privacy, complete: Boolean(terms && privacy) };
}

// ── Suppression de compte (App Store 5.1.1(v)) ───────────────────────────────

/**
 * Avertissement à afficher AVANT de demander la suppression du compte : un
 * abonnement App Store / Google Play n'est pas annulé par la suppression (seul
 * son titulaire peut l'annuler dans son store). null = rien à signaler.
 */
export function deletionSubscriptionWarning(
  store: string | null | undefined,
  willRenew: boolean,
  platformOS: 'ios' | 'android' | string,
): string | null {
  const s = (store ?? '').toUpperCase();
  if (!willRenew) return null;
  if (s === 'APP_STORE' || s === 'MAC_APP_STORE') {
    return 'Votre abonnement App Store continuera d’être facturé par Apple tant que vous ne l’aurez pas annulé'
      + (platformOS === 'ios' ? ' (bouton « Gérer mon abonnement » ci-dessous).' : ' depuis les réglages de votre iPhone.');
  }
  if (s === 'PLAY_STORE') {
    return 'Votre abonnement Google Play continuera d’être facturé par Google tant que vous ne l’aurez pas annulé'
      + (platformOS === 'android' ? ' (bouton « Gérer mon abonnement » ci-dessous).' : ' depuis Google Play sur votre téléphone Android.');
  }
  if (s === 'STRIPE' || s === 'RC_BILLING') {
    // Pas de lien ni de mention d'un autre moyen de paiement (anti-steering) :
    // l'abonnement est annulé côté serveur au moment de la suppression.
    return 'Votre abonnement en cours sera arrêté au moment de la suppression du compte.';
  }
  return null;
}

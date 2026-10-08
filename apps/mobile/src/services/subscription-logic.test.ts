// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services
import { describe, expect, it } from 'vitest';
import {
  APPLE_STANDARD_EULA,
  deletionSubscriptionWarning,
  formatDateFr,
  isNativeStoreManagementUrl,
  isoPeriodFr,
  isStaffRole,
  legalLinks,
  managementMode,
  perPeriodFr,
} from './subscription-logic';

describe('managementMode — gestion croisée des abonnements', () => {
  it('Apple sur iPhone / Google sur Android → réglages natifs', () => {
    expect(managementMode('APP_STORE', 'ios')).toBe('native');
    expect(managementMode('PLAY_STORE', 'android')).toBe('native');
  });
  it('payé ailleurs (web Stripe, autre store) → neutre, sans lien sortant', () => {
    expect(managementMode('STRIPE', 'ios')).toBe('external');
    expect(managementMode('RC_BILLING', 'android')).toBe('external');
    expect(managementMode('APP_STORE', 'android')).toBe('external');
    expect(managementMode('PLAY_STORE', 'ios')).toBe('external');
  });
  it('accès offert / aucun abonnement', () => {
    expect(managementMode('PROMOTIONAL', 'ios')).toBe('gift');
    expect(managementMode(null, 'ios')).toBe('none');
  });
});

describe('rôles sans paywall', () => {
  it('coach, admin et super admin ont accès sans achat', () => {
    for (const r of ['COACH', 'ADMIN', 'SUPER_ADMIN']) expect(isStaffRole(r)).toBe(true);
    for (const r of ['PARENT', 'CHILD', '', null]) expect(isStaffRole(r)).toBe(false);
  });
});

describe('périodes ISO en français', () => {
  it('libellés', () => {
    expect(isoPeriodFr('P1M')).toBe('1 mois');
    expect(isoPeriodFr('P1W')).toBe('1 semaine');
    expect(isoPeriodFr('P7D')).toBe('1 semaine');
    expect(isoPeriodFr('P3D')).toBe('3 jours');
    expect(isoPeriodFr('P1Y')).toBe('1 an');
    expect(isoPeriodFr('bad')).toBeNull();
    expect(perPeriodFr('P1M')).toBe('/ mois');
    expect(perPeriodFr('P1Y')).toBe('/ an');
  });
  it('dates', () => {
    expect(formatDateFr('2026-10-26T12:00:00Z')).toBe('26 octobre 2026');
    expect(formatDateFr(null)).toBe('');
  });
});

describe('isNativeStoreManagementUrl — jamais de lien sortant de paiement', () => {
  it('accepte la page d’abonnement du store du téléphone', () => {
    expect(isNativeStoreManagementUrl('https://apps.apple.com/account/subscriptions', 'ios')).toBe(true);
    expect(isNativeStoreManagementUrl('https://play.google.com/store/account/subscriptions?sku=x', 'android')).toBe(true);
  });
  it('refuse le portail Stripe, un autre store ou une URL invalide', () => {
    expect(isNativeStoreManagementUrl('https://billing.stripe.com/p/login/abc', 'ios')).toBe(false);
    expect(isNativeStoreManagementUrl('https://play.google.com/store/account/subscriptions', 'ios')).toBe(false);
    expect(isNativeStoreManagementUrl('https://apps.apple.com.evil.example/x', 'ios')).toBe(false);
    expect(isNativeStoreManagementUrl('http://apps.apple.com/account/subscriptions', 'ios')).toBe(false);
    expect(isNativeStoreManagementUrl(null, 'android')).toBe(false);
    expect(isNativeStoreManagementUrl('pas une url', 'android')).toBe(false);
  });
});

describe('legalLinks — liens obligatoires du paywall', () => {
  it('iOS : EULA Apple par défaut pour les conditions, confidentialité obligatoire', () => {
    expect(legalLinks({}, 'ios')).toEqual({ terms: APPLE_STANDARD_EULA, privacy: '', complete: false });
    expect(legalLinks({ privacy: 'https://x.test/confidentialite' }, 'ios').complete).toBe(true);
  });
  it('Android : pas d’EULA Apple, les deux URL sont exigées', () => {
    expect(legalLinks({ privacy: 'https://x.test/p' }, 'android').complete).toBe(false);
    expect(legalLinks({ terms: 'https://x.test/c', privacy: 'https://x.test/p' }, 'android')).toEqual({
      terms: 'https://x.test/c',
      privacy: 'https://x.test/p',
      complete: true,
    });
  });
  it('URL non https ou vide → ignorée', () => {
    expect(legalLinks({ terms: 'http://x.test', privacy: 'javascript:alert(1)' }, 'android').complete).toBe(false);
  });
});

describe('deletionSubscriptionWarning — suppression de compte', () => {
  it('abonnement store qui se renouvelle → avertissement de facturation continue', () => {
    expect(deletionSubscriptionWarning('APP_STORE', true, 'ios')).toMatch(/Apple/);
    expect(deletionSubscriptionWarning('PLAY_STORE', true, 'android')).toMatch(/Google/);
  });
  it('abonnement web : arrêté côté serveur, sans mention de paiement externe', () => {
    const msg = deletionSubscriptionWarning('STRIPE', true, 'ios') ?? '';
    expect(msg).not.toMatch(/stripe|web|site|https?:/i);
  });
  it('pas de renouvellement / pas d’abonnement → rien', () => {
    expect(deletionSubscriptionWarning('APP_STORE', false, 'ios')).toBeNull();
    expect(deletionSubscriptionWarning(null, false, 'ios')).toBeNull();
  });
});

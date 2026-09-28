// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services
import { describe, expect, it } from 'vitest';
import { isStaffRole, isoPeriodFr, managementMode, perPeriodFr, formatDateFr } from './subscription-logic';

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

import { describe, expect, it, vi } from 'vitest';

vi.mock('@thrive/shared', () => ({ supabaseClient: {} }));

import {
  annualSavingsPercent,
  formatMoney,
  isSubscriptionActive,
  managementChannel,
  periodLabel,
  yearlyAmount,
  type WebPlan,
} from './billing';

const monthly: WebPlan = { plan: 'mensuel', amount: 3250, currency: 'CAD', interval: 'month', interval_count: 1, name: null };
const annual: WebPlan = { plan: 'annuel', amount: 29900, currency: 'CAD', interval: 'year', interval_count: 1, name: null };

describe('isSubscriptionActive', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  it('actif tant que la date de fin n’est pas passée', () => {
    expect(isSubscriptionActive({ active: true, expires_at: '2026-10-26T00:00:00Z' }, now)).toBe(true);
    expect(isSubscriptionActive({ active: true, expires_at: '2026-09-01T00:00:00Z' }, now)).toBe(false);
  });
  it('sans date de fin (accès offert) → actif', () => {
    expect(isSubscriptionActive({ active: true, expires_at: null }, now)).toBe(true);
  });
  it('inactif ou absent → faux', () => {
    expect(isSubscriptionActive({ active: false, expires_at: null }, now)).toBe(false);
    expect(isSubscriptionActive(null, now)).toBe(false);
  });
});

describe('managementChannel', () => {
  it('route chaque store vers le bon lieu de gestion', () => {
    expect(managementChannel('stripe')).toBe('web');
    expect(managementChannel('APP_STORE')).toBe('app_store');
    expect(managementChannel('play_store')).toBe('play_store');
    expect(managementChannel('promotional')).toBe('offert');
    expect(managementChannel(null)).toBe('autre');
  });
});

describe('prix et économies', () => {
  it('formate en dollars canadiens, à la française', () => {
    expect(formatMoney(3250, 'CAD').replace(/\s/g, ' ')).toBe('32,50 $');
    expect(formatMoney(29900, 'CAD').replace(/\s/g, ' ')).toBe('299 $');
  });
  it('libellés de période', () => {
    expect(periodLabel(monthly)).toBe('mois');
    expect(periodLabel(annual)).toBe('an');
    expect(periodLabel({ interval: 'month', interval_count: 3 })).toBe('3 mois');
  });
  it('ramène au coût annuel', () => {
    expect(yearlyAmount(monthly)).toBe(39000);
    expect(yearlyAmount(annual)).toBe(29900);
  });
  it('calcule l’économie réelle de l’annuel (−23 % à 32,50 $ / 299 $)', () => {
    expect(annualSavingsPercent([monthly, annual])).toBe(23);
    expect(annualSavingsPercent([monthly])).toBeNull();
    expect(annualSavingsPercent([monthly, { ...annual, amount: 50000 }])).toBeNull();
  });
});

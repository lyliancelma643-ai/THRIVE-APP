// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services/trialReminder
import { describe, expect, it } from 'vitest';
import { computeTrialReminderDate, type TrialCustomerInfo } from './trialReminder';

const NOW = new Date('2026-10-01T12:00:00Z');

function info(
  over: Partial<{ periodType: string; expirationDate: string | null; willRenew: boolean }> = {},
  id = 'thrive_moments',
): TrialCustomerInfo {
  return {
    entitlements: {
      active: {
        [id]: { periodType: 'TRIAL', expirationDate: '2026-10-20T15:00:00Z', willRenew: true, ...over },
      },
    },
  };
}

describe('computeTrialReminderDate', () => {
  it('essai normal : fin − 3 jours, à 18 h locale', () => {
    const d = computeTrialReminderDate(info(), NOW)!;
    expect(d).toBeInstanceOf(Date);
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(0);
    const end = new Date('2026-10-20T15:00:00Z');
    const expected = new Date(end);
    expected.setDate(expected.getDate() - 3);
    expected.setHours(18, 0, 0, 0);
    expect(d.getTime()).toBe(expected.getTime());
  });
  it('résilié (willRenew=false) → null', () => {
    expect(computeTrialReminderDate(info({ willRenew: false }), NOW)).toBeNull();
  });
  it('pas en essai (NORMAL / INTRO) → null', () => {
    expect(computeTrialReminderDate(info({ periodType: 'NORMAL' }), NOW)).toBeNull();
    expect(computeTrialReminderDate(info({ periodType: 'INTRO' }), NOW)).toBeNull();
  });
  it('date de rappel passée → null', () => {
    expect(computeTrialReminderDate(info({ expirationDate: '2026-10-03T12:00:00Z' }), NOW)).toBeNull();
    expect(computeTrialReminderDate(info(), new Date('2026-10-19T00:00:00Z'))).toBeNull();
  });
  it('autre entitlement ou aucun → null', () => {
    expect(computeTrialReminderDate(info({}, 'autre'), NOW)).toBeNull();
    expect(computeTrialReminderDate(null, NOW)).toBeNull();
    expect(computeTrialReminderDate(undefined, NOW)).toBeNull();
  });
  it('date de fin absente ou invalide → null', () => {
    expect(computeTrialReminderDate(info({ expirationDate: null }), NOW)).toBeNull();
    expect(computeTrialReminderDate(info({ expirationDate: 'n’importe quoi' }), NOW)).toBeNull();
  });
  it('heure locale : toujours 18 h quel que soit l’instant de fin, et strictement avant la fin', () => {
    for (const exp of ['2026-10-20T00:30:00Z', '2026-10-20T23:59:00Z', '2026-12-31T05:00:00Z']) {
      const d = computeTrialReminderDate(info({ expirationDate: exp }), NOW)!;
      expect(d.getHours()).toBe(18);
      expect(d.getTime()).toBeLessThan(new Date(exp).getTime());
    }
  });
});

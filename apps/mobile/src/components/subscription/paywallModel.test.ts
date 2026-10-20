// Lancer : cd apps/web && npx vitest run --root ../mobile src/components/subscription
import { describe, expect, it } from 'vitest';
import { buildFinePrint, formatShortDateFr } from './paywallModel';

describe('paywall — mention légale', () => {
  it('date courte', () => {
    expect(formatShortDateFr(new Date(2026, 10, 10))).toBe('10 nov. 2026');
  });
  it('essai + annuel : prix facturé, mensuel équivalent, renouvellement, où annuler', () => {
    const t = buildFinePrint({ firstPayment: new Date(2026, 10, 10), price: '299 $', perPeriod: 'par an', perMonth: 'soit 24,92 $ par mois', android: false });
    expect(t).toBe('Gratuit jusqu’au 10 nov. 2026, puis 299 $ par an (soit 24,92 $ par mois). Renouvellement automatique ; annulable dans les réglages de ton compte Apple au moins 24 h avant la fin de la période.');
  });
  it('sans essai, Android', () => {
    const t = buildFinePrint({ firstPayment: null, price: '32,50 $', perPeriod: 'par mois', perMonth: null, android: true });
    expect(t.startsWith('32,50 $ par mois.')).toBe(true);
    expect(t).toContain('Google Play');
  });
});

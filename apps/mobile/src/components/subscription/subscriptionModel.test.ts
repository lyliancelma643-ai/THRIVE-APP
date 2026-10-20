// Lancer : cd apps/web && npx vitest run --root ../mobile src/components/subscription
import { describe, expect, it } from 'vitest';
import { buildSubscriptionModel, trialProgress, type SubscriptionInput } from './subscriptionModel';

const base: SubscriptionInput = {
  isLoading: false, hasAccess: true, isSubscribed: false, isTrial: false, willRenew: false, management: 'none',
  fromProgram: false, endDate: '', packEnd: '', planLine: null, planPrice: null,
  offer: { monthly: '32,50 $', annual: '299 $' }, trialProgress: null, storeName: 'l’App Store',
};

describe('Mon abonnement — états réels', () => {
  it('inclus avec le programme, puis l’option de continuer (prix de l’offering)', () => {
    const m = buildSubscriptionModel({ ...base, fromProgram: true });
    expect(m.status).toBe('Inclus avec ton programme');
    expect(m.detail).toEqual({ label: 'Accès ouvert jusqu’à', value: 'la fin du programme' });
    expect(m.note).toBe('Ensuite, tu pourras continuer à 32,50 $ par mois ou 299 $ par an, via l’App Store.');
    expect(m.programRow).toBe(true);
    expect(m.manage).toBe(false);
  });
  it('sans prix dans l’offering : aucun montant inventé', () => {
    const m = buildSubscriptionModel({ ...base, fromProgram: true, offer: { monthly: null, annual: null } });
    expect(m.note).not.toMatch(/\d/);
  });
  it('essai en cours depuis l’App Store : fin d’essai, avancement, Gérer / Restaurer', () => {
    const m = buildSubscriptionModel({
      ...base, isSubscribed: true, isTrial: true, management: 'native', endDate: '9 novembre 2026',
      planLine: 'Annuel · 299 $ par an', planPrice: '299 $ par an', trialProgress: 0.2,
    });
    expect(m.tag).toEqual({ label: 'Essai gratuit', tone: 'tint' });
    expect(m.detail).toEqual({ label: 'Fin de l’essai', value: '9 novembre 2026', progress: 0.2 });
    expect(m.note).toBe('Puis 299 $ par an, renouvelé automatiquement. Annule au moins 24 h avant pour ne rien payer.');
    expect(m.manage && m.storeRow).toBe(true);
  });
  it('payé ailleurs : neutre, ni Gérer ni Restaurer', () => {
    const m = buildSubscriptionModel({ ...base, isSubscribed: true, management: 'external', endDate: '1 janvier 2027', willRenew: true });
    expect(m.manage).toBe(false);
    expect(m.externalNote).toBe(true);
    expect(m.status).toBe('Actif · renouvellement le 1 janvier 2027.');
  });
  it('aucun abonnement : découvrir', () => {
    const m = buildSubscriptionModel({ ...base, hasAccess: false });
    expect(m.status).toBe('Aucun abonnement actif.');
    expect(m.discover).toBe(true);
  });
  it('avancement de l’essai borné', () => {
    expect(trialProgress('2026-10-10T00:00:00Z', '2026-11-10T00:00:00Z', new Date('2026-10-16T00:00:00Z'))).toBeCloseTo(6 / 31);
    expect(trialProgress(null, '2026-11-10T00:00:00Z')).toBeNull();
    expect(trialProgress('2026-10-10T00:00:00Z', '2026-11-10T00:00:00Z', new Date('2027-01-01'))).toBe(1);
  });
});

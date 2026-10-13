// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services/programPayments
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const openBrowserAsync = vi.fn();
const loadServerAccess = vi.fn();
const storeState: { access: { sourceMaison: string; packEnd: string | null } | null; loadServerAccess: typeof loadServerAccess } = {
  access: null,
  loadServerAccess,
};
const flag = { on: true };

vi.mock('@thrive/shared', () => ({ supabaseClient: { functions: { invoke } } }));
vi.mock('expo-web-browser', () => ({ openBrowserAsync }));
vi.mock('../stores/subscription.store', () => ({ useSubscriptionStore: { getState: () => storeState } }));
vi.mock('../lib/offresFlags', () => ({
  get OFFRES_PROGRAMMES_IN_APP() {
    return flag.on;
  },
}));

import { programErrorMessage, startProgramCheckout, toProgramCheckoutBody } from './programPayments';

const httpError = (code: string) => ({ context: { json: async () => ({ code }) } });

beforeEach(() => {
  vi.clearAllMocks();
  flag.on = true;
  loadServerAccess.mockReset();
  storeState.access = null;
  invoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/c/pay/cs_test_1', id: 'cs_1', order_id: 'o1', quote: {} }, error: null });
  openBrowserAsync.mockResolvedValue({ type: 'cancel' });
});

describe('startProgramCheckout', () => {
  it('drapeau faux : disabled, aucun appel réseau ni navigateur', async () => {
    flag.on = false;
    expect(await startProgramCheckout('groupe', 'une_fois')).toEqual({ status: 'disabled' });
    expect(invoke).not.toHaveBeenCalled();
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it('convertit le pack en MAJUSCULES et envoie exactement { pack, mode }', async () => {
    await startProgramCheckout('individuel', 'deux_versements');
    expect(invoke).toHaveBeenCalledWith('create-program-checkout', {
      body: { pack: 'INDIVIDUEL', mode: 'deux_versements' },
    });
    expect(Object.keys(invoke.mock.calls[0][1].body).sort()).toEqual(['mode', 'pack']);
    expect(toProgramCheckoutBody('complet', 'une_fois')).toEqual({ pack: 'COMPLET', mode: 'une_fois' });
  });

  it('ouvre l’URL Stripe puis relit l’accès : annulation si rien n’est payé', async () => {
    expect(await startProgramCheckout('groupe', 'deux_versements')).toEqual({ status: 'cancelled' });
    expect(openBrowserAsync).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(loadServerAccess).toHaveBeenCalledTimes(1);
  });

  it('paid si access_state montre un pack actif après le retour', async () => {
    loadServerAccess.mockImplementation(async () => {
      storeState.access = { sourceMaison: 'pack', packEnd: null };
    });
    expect(await startProgramCheckout('groupe', 'deux_versements')).toEqual({ status: 'paid' });
  });

  it('opened si le navigateur reste ouvert et que rien n’est encore payé', async () => {
    openBrowserAsync.mockResolvedValue({ type: 'opened' });
    expect(await startProgramCheckout('groupe', 'une_fois')).toEqual({ status: 'opened' });
  });

  it('mappe les codes d’erreur du serveur en messages neutres', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError('pack_active') });
    const r = await startProgramCheckout('groupe', 'une_fois');
    expect(r).toMatchObject({ status: 'error', code: 'pack_active' });
    expect((r as { message: string }).message).toBe(programErrorMessage('pack_active'));
    expect(openBrowserAsync).not.toHaveBeenCalled();

    invoke.mockResolvedValue({ data: null, error: httpError('already_enrolled') });
    expect(await startProgramCheckout('groupe', 'une_fois')).toMatchObject({ status: 'error', code: 'already_enrolled' });

    invoke.mockResolvedValue({ data: null, error: httpError('inconnu_xyz') });
    const g = await startProgramCheckout('groupe', 'une_fois');
    expect(g).toMatchObject({ status: 'error', code: 'inconnu_xyz' });
    expect((g as { message: string }).message).toBe(programErrorMessage(null));
  });

  it('réponse sans URL https ou exception réseau : erreur, jamais d’ouverture', async () => {
    invoke.mockResolvedValue({ data: { url: 'http://evil' }, error: null });
    expect(await startProgramCheckout('groupe', 'une_fois')).toMatchObject({ status: 'error' });
    invoke.mockRejectedValue(new Error('offline'));
    expect(await startProgramCheckout('groupe', 'une_fois')).toMatchObject({ status: 'error', code: 'network' });
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });
});

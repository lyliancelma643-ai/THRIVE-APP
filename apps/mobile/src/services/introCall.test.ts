// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services/introCall
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@thrive/shared', () => ({ supabaseClient: { functions: { invoke } } }));

import {
  introCallErrorResult,
  introCallInputSchema,
  requestIntroCall,
  toIntroCallBody,
} from './introCall';

const SLOT = '2026-10-20T14:30:00-04:00';
const CHILD = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('introCallInputSchema', () => {
  it('accepte vidéo ou téléphone avec un créneau ISO', () => {
    expect(introCallInputSchema.safeParse({ mode: 'video', slot: SLOT }).success).toBe(true);
    expect(introCallInputSchema.safeParse({ mode: 'telephone', slot: '2026-10-20T18:30:00Z' }).success).toBe(true);
  });

  it('refuse un mode inconnu, un créneau non ISO, un enfant non uuid, une note trop longue', () => {
    expect(introCallInputSchema.safeParse({ mode: 'sms', slot: SLOT }).success).toBe(false);
    expect(introCallInputSchema.safeParse({ mode: 'video', slot: 'demain 14 h' }).success).toBe(false);
    expect(introCallInputSchema.safeParse({ mode: 'video', slot: SLOT, childId: 'leo' }).success).toBe(false);
    expect(introCallInputSchema.safeParse({ mode: 'video', slot: SLOT, note: 'x'.repeat(501) }).success).toBe(false);
  });

  it('addToCalendar vaut false par défaut et ne part pas au serveur', () => {
    const p = introCallInputSchema.parse({ mode: 'video', slot: SLOT, childId: CHILD, note: '  Bonjour  ' });
    expect(p.addToCalendar).toBe(false);
    expect(toIntroCallBody(p)).toEqual({ mode: 'video', slot: SLOT, childId: CHILD, note: 'Bonjour' });
    expect(toIntroCallBody(introCallInputSchema.parse({ mode: 'telephone', slot: SLOT, note: '   ' }))).toEqual({
      mode: 'telephone',
      slot: SLOT,
    });
  });
});

describe('introCallErrorResult', () => {
  it('codes connus → message neutre, inconnus → erreur générique', () => {
    expect(introCallErrorResult('invalid_slot').status).toBe('invalid');
    expect(introCallErrorResult('quota_reached').status).toBe('error');
    const unknown = introCallErrorResult('internal');
    expect(unknown).toEqual({ status: 'error', message: expect.any(String) });
    expect(introCallErrorResult(null)).toEqual(unknown);
  });
});

describe('requestIntroCall', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('entrée invalide : aucun appel réseau', async () => {
    const r = await requestIntroCall({ mode: 'video', slot: 'pas une date' });
    expect(r.status).toBe('invalid');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('succès : appelle request-intro-call et renvoie l’id', async () => {
    invoke.mockResolvedValue({ data: { id: 'abc', status: 'demande' }, error: null });
    const r = await requestIntroCall({ mode: 'video', slot: SLOT, addToCalendar: true });
    expect(invoke).toHaveBeenCalledWith('request-intro-call', { body: { mode: 'video', slot: SLOT } });
    expect(r).toEqual({ status: 'requested', id: 'abc' });
  });

  it('erreur HTTP : lit le code renvoyé par la fonction', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ code: 'quota_reached' }) } },
    });
    const r = await requestIntroCall({ mode: 'telephone', slot: SLOT });
    expect(r).toEqual(introCallErrorResult('quota_reached'));
  });

  it('exception réseau : erreur neutre', async () => {
    invoke.mockImplementation(() => Promise.reject(new TypeError('offline')));
    const r = await requestIntroCall({ mode: 'telephone', slot: SLOT });
    expect(r.status).toBe('error');
  });
});

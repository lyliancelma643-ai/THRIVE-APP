import { describe, expect, it, vi } from 'vitest';

vi.mock('@thrive/shared', () => ({ supabaseClient: {} }));

import {
  CLOSE_SESSION_FALLBACK_MESSAGE,
  closeSessionErrorMessage,
  isCloseRpcMissing,
} from './coach';

describe('isCloseRpcMissing', () => {
  it('détecte une RPC absente (PostgREST PGRST202)', () => {
    expect(isCloseRpcMissing({ code: 'PGRST202', message: 'Could not find the function' })).toBe(true);
  });

  it('détecte le message de schéma sans code', () => {
    expect(
      isCloseRpcMissing({
        message: 'Could not find the function public.complete_session_with_report(p_payload, p_session) in the schema cache',
      })
    ).toBe(true);
  });

  it("ne confond pas une erreur interne de la fonction avec une RPC absente", () => {
    expect(isCloseRpcMissing({ code: '42883', message: 'function foo(integer) does not exist' })).toBe(false);
    expect(isCloseRpcMissing({ code: 'P0001', message: 'forbidden' })).toBe(false);
    expect(isCloseRpcMissing(null)).toBe(false);
  });
});

describe('closeSessionErrorMessage', () => {
  it.each([
    ['not_authenticated', 'Ta session a expiré'],
    ['forbidden', "Tu n'as pas le droit"],
    ['session_not_found', "Cette séance n'existe plus"],
    ['session_cancelled', 'Cette séance est annulée'],
    ['message_required', 'Écris un message pour le parent'],
  ])('traduit %s en français', (code, attendu) => {
    expect(closeSessionErrorMessage({ code: 'P0001', message: code })).toContain(attendu);
  });

  it('retombe sur le message générique pour une erreur inconnue, sans texte brut', () => {
    expect(closeSessionErrorMessage({ message: 'TypeError: Failed to fetch' })).toBe(CLOSE_SESSION_FALLBACK_MESSAGE);
    expect(closeSessionErrorMessage(undefined)).toBe(CLOSE_SESSION_FALLBACK_MESSAGE);
  });
});

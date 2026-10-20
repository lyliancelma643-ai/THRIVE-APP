import { describe, expect, it, vi } from 'vitest';
import { fetchServerStyle, mergeStyle, pushServerStyle, type StyleSyncClient } from './styleSync';

describe('mergeStyle', () => {
  it('le serveur l\'emporte et est réécrit localement s\'il diffère', () => {
    expect(mergeStyle('lin', 'veillee')).toEqual({ style: 'veillee', writeLocal: true, pushServer: false });
    expect(mergeStyle(null, 'lin')).toEqual({ style: 'lin', writeLocal: true, pushServer: false });
  });
  it('identique : rien à faire', () => {
    expect(mergeStyle('veillee', 'veillee')).toEqual({ style: 'veillee', writeLocal: false, pushServer: false });
  });
  it('sans valeur serveur, le local est conservé et poussé', () => {
    expect(mergeStyle('lin', null)).toEqual({ style: 'lin', writeLocal: false, pushServer: true });
    expect(mergeStyle('veillee', 'fluo')).toEqual({ style: 'veillee', writeLocal: false, pushServer: true });
  });
  it('anciennes valeurs normalisées au passage (réécrites en local, jamais perdues)', () => {
    expect(mergeStyle('nuit', null)).toEqual({ style: 'veillee', writeLocal: true, pushServer: true });
    expect(mergeStyle('carnet', null)).toEqual({ style: 'lin', writeLocal: true, pushServer: true });
    expect(mergeStyle('natif', 'nuit')).toEqual({ style: 'veillee', writeLocal: true, pushServer: false });
    expect(mergeStyle('veillee', 'nuit')).toEqual({ style: 'veillee', writeLocal: false, pushServer: false });
  });
  it('rien nulle part : défaut de l\'app', () => {
    expect(mergeStyle(null, null)).toEqual({ style: null, writeLocal: false, pushServer: false });
    expect(mergeStyle('zzz', undefined).style).toBeNull();
  });
});

const clientWith = (select: () => unknown, rpc: () => unknown) =>
  ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: select }) }) }),
    rpc,
  }) as unknown as StyleSyncClient;

describe('accès serveur silencieux', () => {
  it('lit la valeur (normalisée), ignore une erreur PostgREST (colonne absente) ou une exception', async () => {
    expect(await fetchServerStyle(clientWith(async () => ({ data: { ui_style: 'veillee' }, error: null }), vi.fn()), 'u')).toBe('veillee');
    expect(await fetchServerStyle(clientWith(async () => ({ data: { ui_style: 'nuit' }, error: null }), vi.fn()), 'u')).toBe('veillee');
    expect(await fetchServerStyle(clientWith(async () => ({ data: { ui_style: 'carnet' }, error: null }), vi.fn()), 'u')).toBe('lin');
    expect(await fetchServerStyle(clientWith(async () => ({ data: { ui_style: 'fluo' }, error: null }), vi.fn()), 'u')).toBeNull();
    expect(await fetchServerStyle(clientWith(async () => ({ data: null, error: { code: '42703' } }), vi.fn()), 'u')).toBeNull();
    expect(await fetchServerStyle(clientWith(async () => { throw new Error('réseau'); }, vi.fn()), 'u')).toBeNull();
  });
  it('l\'écriture n\'échoue jamais et n\'envoie que lin / veillee', async () => {
    const rpc = vi.fn(async () => ({ error: { code: 'PGRST202' } }));
    await expect(pushServerStyle(clientWith(vi.fn(), rpc), 'veillee')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('set_ui_style', { p_style: 'veillee' });
    await expect(pushServerStyle(clientWith(vi.fn(), async () => { throw new Error('x'); }), 'lin')).resolves.toBeUndefined();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fetchServerStyle, mergeStyle, pushServerStyle, type StyleSyncClient } from './styleSync';

describe('mergeStyle', () => {
  it('le serveur l\'emporte et est réécrit localement s\'il diffère', () => {
    expect(mergeStyle('natif', 'nuit')).toEqual({ style: 'nuit', writeLocal: true, pushServer: false });
    expect(mergeStyle(null, 'carnet')).toEqual({ style: 'carnet', writeLocal: true, pushServer: false });
  });
  it('identique : rien à faire', () => {
    expect(mergeStyle('nuit', 'nuit')).toEqual({ style: 'nuit', writeLocal: false, pushServer: false });
  });
  it('sans valeur serveur, le local est conservé et poussé', () => {
    expect(mergeStyle('carnet', null)).toEqual({ style: 'carnet', writeLocal: false, pushServer: true });
    expect(mergeStyle('carnet', 'fluo')).toEqual({ style: 'carnet', writeLocal: false, pushServer: true });
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
  it('lit la valeur, ignore une erreur PostgREST (colonne absente) ou une exception', async () => {
    expect(await fetchServerStyle(clientWith(async () => ({ data: { ui_style: 'nuit' }, error: null }), vi.fn()), 'u')).toBe('nuit');
    expect(await fetchServerStyle(clientWith(async () => ({ data: null, error: { code: '42703' } }), vi.fn()), 'u')).toBeNull();
    expect(await fetchServerStyle(clientWith(async () => { throw new Error('réseau'); }, vi.fn()), 'u')).toBeNull();
  });
  it('l\'écriture n\'échoue jamais', async () => {
    const rpc = vi.fn(async () => ({ error: { code: 'PGRST202' } }));
    await expect(pushServerStyle(clientWith(vi.fn(), rpc), 'nuit')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('set_ui_style', { p_style: 'nuit' });
    await expect(pushServerStyle(clientWith(vi.fn(), async () => { throw new Error('x'); }), 'nuit')).resolves.toBeUndefined();
  });
});

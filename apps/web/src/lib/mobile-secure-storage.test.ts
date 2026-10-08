import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  createChunkedStorage,
  type KeyValueStore,
} from '../../../mobile/src/lib/secure-storage';

// Test du stockage de session mobile (SecureStore simulé, limite 2048 octets).
function fakeStore(limit = 2048) {
  const data = new Map<string, string>();
  const store: KeyValueStore = {
    async getItemAsync(k) { return data.get(k) ?? null; },
    async setItemAsync(k, v) {
      if (v.length > limit) throw new Error('Value too large');
      data.set(k, v);
    },
    async deleteItemAsync(k) { data.delete(k); },
  };
  return { data, store };
}

const KEY = 'sb-kkdcgzvdmipmrgkawnky-auth-token';
const session = (n: number) => JSON.stringify({ access_token: 'x'.repeat(n), refresh_token: 'r'.repeat(40) });

describe('stockage de session mobile (morceaux)', () => {
  it('restitue une session de 6 ko à l’identique, sans dépasser 2048 octets par clé', async () => {
    const { store, data } = fakeStore();
    const s = createChunkedStorage(store);
    const value = session(6000);
    await s.setItem(KEY, value);
    expect(await s.getItem(KEY)).toBe(value);
    for (const v of data.values()) expect(v.length).toBeLessThanOrEqual(2048);
    expect(data.size).toBeGreaterThan(2);
  });

  it('une valeur plus courte supprime les anciens morceaux', async () => {
    const { store, data } = fakeStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session(6000));
    await s.setItem(KEY, session(100));
    expect(await s.getItem(KEY)).toBe(session(100));
    expect(data.size).toBe(2); // un morceau + la clé de version
  });

  it('removeItem efface tout', async () => {
    const { store, data } = fakeStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session(5000));
    await s.removeItem(KEY);
    expect(data.size).toBe(0);
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('un morceau manquant ou une version inconnue donnent null (jamais un jeton tronqué)', async () => {
    const { store, data } = fakeStore();
    const s = createChunkedStorage(store);
    await s.setItem(KEY, session(5000));
    data.delete(`${KEY}.1`);
    expect(await s.getItem(KEY)).toBeNull();
    data.set(`${KEY}.v`, 'v9:2');
    expect(await s.getItem(KEY)).toBeNull();
  });

  it('découpe à CHUNK_SIZE', async () => {
    const { store, data } = fakeStore();
    await createChunkedStorage(store).setItem(KEY, 'a'.repeat(CHUNK_SIZE * 2 + 1));
    expect(data.get(`${KEY}.v`)).toBe('v1:3');
  });
});

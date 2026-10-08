// Stockage de session Supabase pour l'app native : expo-secure-store (Keychain
// iOS / Keystore Android) au lieu d'AsyncStorage (texte clair sur disque).
//
// SecureStore limite chaque valeur à ~2048 octets, alors qu'une session
// Supabase (JWT + refresh + user) en fait 3 à 6 ko : on découpe en morceaux
// `<clé>.<n>`, avec une clé de version `<clé>.v` (format + nombre de morceaux).
// Toute lecture incohérente (morceau manquant, version inconnue) renvoie null :
// l'utilisateur se reconnecte, jamais de jeton tronqué.
//
// Le module ne dépend pas de React Native : `createChunkedStorage` reçoit le
// magasin en paramètre (testable), `secureAuthStorage` branche expo-secure-store.

export const CHUNK_SIZE = 1800; // marge sous la limite de 2048 octets
export const STORAGE_FORMAT = 'v1';

export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface AsyncAuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// SecureStore n'accepte que [A-Za-z0-9._-] : on neutralise le reste.
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function createChunkedStorage(store: KeyValueStore, chunkSize = CHUNK_SIZE): AsyncAuthStorage {
  const meta = (key: string) => `${safe(key)}.v`;
  const part = (key: string, i: number) => `${safe(key)}.${i}`;

  async function removeItem(key: string): Promise<void> {
    const raw = await store.getItemAsync(meta(key));
    const count = raw?.startsWith(`${STORAGE_FORMAT}:`) ? Number(raw.split(':')[1]) : 0;
    for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) await store.deleteItemAsync(part(key, i));
    await store.deleteItemAsync(meta(key));
  }

  return {
    async getItem(key) {
      const raw = await store.getItemAsync(meta(key));
      if (!raw) return null;
      if (!raw.startsWith(`${STORAGE_FORMAT}:`)) return null;
      const count = Number(raw.split(':')[1]);
      if (!Number.isInteger(count) || count < 1 || count > 64) return null;
      let out = '';
      for (let i = 0; i < count; i++) {
        const p = await store.getItemAsync(part(key, i));
        if (p === null) return null; // morceau manquant : session inexploitable
        out += p;
      }
      return out;
    },

    async setItem(key, value) {
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      if (chunks.length === 0) chunks.push('');
      // Anciens morceaux en trop (nouvelle valeur plus courte) supprimés après écriture.
      const previous = await store.getItemAsync(meta(key));
      const prevCount = previous?.startsWith(`${STORAGE_FORMAT}:`) ? Number(previous.split(':')[1]) : 0;
      // Morceaux d'abord, version ensuite : une coupure laisse l'ancienne version lisible.
      for (let i = 0; i < chunks.length; i++) await store.setItemAsync(part(key, i), chunks[i]);
      await store.setItemAsync(meta(key), `${STORAGE_FORMAT}:${chunks.length}`);
      for (let i = chunks.length; i < (Number.isFinite(prevCount) ? prevCount : 0); i++) {
        await store.deleteItemAsync(part(key, i));
      }
    },

    removeItem,
  };
}

/**
 * Adaptateur branché sur expo-secure-store, avec migration unique depuis
 * l'ancien stockage AsyncStorage (les utilisateurs déjà connectés le restent,
 * puis la copie en clair est supprimée).
 */
export function createSecureAuthStorage(legacy?: AsyncAuthStorage): AsyncAuthStorage {
  // Import différé : le module reste importable (tests) sans runtime natif.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store') as {
    getItemAsync(k: string): Promise<string | null>;
    setItemAsync(k: string, v: string, o?: object): Promise<void>;
    deleteItemAsync(k: string): Promise<void>;
    AFTER_FIRST_UNLOCK: number;
  };
  const inner = createChunkedStorage({
    getItemAsync: (k) => SecureStore.getItemAsync(k),
    // Disponible après le premier déverrouillage : le rafraîchissement du jeton
    // en arrière-plan doit fonctionner écran verrouillé.
    setItemAsync: (k, v) => SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
    deleteItemAsync: (k) => SecureStore.deleteItemAsync(k),
  });
  return {
    async getItem(key) {
      const value = await inner.getItem(key);
      if (value !== null || !legacy) return value;
      const old = await legacy.getItem(key);
      if (old === null) return null;
      try {
        await inner.setItem(key, old);
        await legacy.removeItem(key);
      } catch {
        /* migration reportée à la prochaine lecture */
      }
      return old;
    },
    setItem: (k, v) => inner.setItem(k, v),
    async removeItem(key) {
      await inner.removeItem(key);
      if (legacy) await legacy.removeItem(key).catch(() => undefined);
    },
  };
}

import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Stockage de la session Supabase : Keychain (iOS) / Keystore (Android) via
// expo-secure-store. Une session dépasse la limite de ~2 Ko par valeur : on la
// découpe en morceaux. Lu par packages/shared/src/lib/supabase.ts à la création
// du client (globalThis.__THRIVE_AUTH_STORAGE__).

const CHUNK = 1800;
const countKey = (k: string) => `${k}.n`;
const partKey = (k: string, i: number) => `${k}.${i}`;
// Les clés SecureStore n'acceptent que [A-Za-z0-9._-].
const safe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureAuthStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safe(rawKey);
    try {
      const n = Number(await SecureStore.getItemAsync(countKey(key)));
      if (Number.isInteger(n) && n > 0) {
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
          const p = await SecureStore.getItemAsync(partKey(key, i));
          if (p == null) return null; // session tronquée : on repart d'une connexion propre
          parts.push(p);
        }
        return parts.join('');
      }
      // Migration : ancienne session en AsyncStorage (non chiffré) → coffre, puis purge.
      const legacy = await AsyncStorage.getItem(rawKey);
      if (legacy != null) {
        await secureAuthStorage.setItem(rawKey, legacy);
        await AsyncStorage.removeItem(rawKey);
      }
      return legacy;
    } catch {
      return null;
    }
  },
  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safe(rawKey);
    const prev = Number(await SecureStore.getItemAsync(countKey(key)).catch(() => 0)) || 0;
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
    for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(partKey(key, i), parts[i]);
    await SecureStore.setItemAsync(countKey(key), String(parts.length));
    for (let i = parts.length; i < prev; i++) await SecureStore.deleteItemAsync(partKey(key, i)).catch(() => {});
  },
  async removeItem(rawKey: string): Promise<void> {
    const key = safe(rawKey);
    const n = Number(await SecureStore.getItemAsync(countKey(key)).catch(() => 0)) || 0;
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(partKey(key, i)).catch(() => {});
    await SecureStore.deleteItemAsync(countKey(key)).catch(() => {});
    await AsyncStorage.removeItem(rawKey).catch(() => {});
  },
};

(globalThis as { __THRIVE_AUTH_STORAGE__?: unknown }).__THRIVE_AUTH_STORAGE__ = secureAuthStorage;

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureAuthStorage } from './secure-storage';

// Lu par packages/shared/src/lib/supabase.ts à la création du client.
// Session dans le Keychain / Keystore (découpée en morceaux), avec reprise
// des sessions déjà stockées dans AsyncStorage.
(globalThis as { __THRIVE_AUTH_STORAGE__?: unknown }).__THRIVE_AUTH_STORAGE__ =
  createSecureAuthStorage(AsyncStorage);

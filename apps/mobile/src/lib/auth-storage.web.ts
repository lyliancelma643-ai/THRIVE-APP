import AsyncStorage from '@react-native-async-storage/async-storage';

// Rendu web (aperçu Expo) : expo-secure-store n'existe pas dans le navigateur,
// la session va dans le stockage local du navigateur via AsyncStorage.
// iOS / Android continuent d'utiliser auth-storage.ts (Keychain / Keystore).
(globalThis as { __THRIVE_AUTH_STORAGE__?: unknown }).__THRIVE_AUTH_STORAGE__ = AsyncStorage;

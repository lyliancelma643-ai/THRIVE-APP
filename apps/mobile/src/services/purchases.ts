import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// Clés publiques RevenueCat (une par plateforme). Les clés EXPO_PUBLIC_* sont
// embarquées dans le bundle : n'utiliser QUE les clés publiques SDK, jamais la
// clé secrète REST de RevenueCat.
const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
} as const;

let configured = false;

/**
 * Initialise RevenueCat avec la clé de la plateforme courante.
 * À appeler une fois au démarrage (après login pour lier l'appUserID).
 * No-op silencieux si la clé n'est pas fournie (ex. Expo Go / CI) : le module
 * natif n'existe que dans un development build.
 */
export async function initPurchases(appUserID?: string): Promise<boolean> {
  if (configured) return true;

  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
  if (!apiKey) {
    console.warn('[RevenueCat] Clé absente pour', Platform.OS, '— achats désactivés.');
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey, appUserID: appUserID ?? undefined });
    configured = true;
    return true;
  } catch (e) {
    // Module natif indisponible (Expo Go) ou erreur de config : ne pas crasher l'app
    console.warn('[RevenueCat] Initialisation impossible :', e);
    return false;
  }
}

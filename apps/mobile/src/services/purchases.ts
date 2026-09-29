import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { ENTITLEMENT_ID } from './subscription-logic';

// ─────────────────────────────────────────────────────────────────────────────
// Service RevenueCat centralisé (iOS : App Store · Android : Google Play).
//
//   • Clés PUBLIQUES SDK par plateforme (EXPO_PUBLIC_*), jamais la clé secrète.
//   • App User ID = id Supabase : `logIn(userId)` dès que la session existe,
//     `logOut()` à la déconnexion (un autre compte sur le même téléphone ne doit
//     pas hériter de l'abonnement).
//   • No-op silencieux si la clé manque ou si le module natif est absent
//     (Expo Go / CI) : l'app ne plante jamais à cause des achats.
// ─────────────────────────────────────────────────────────────────────────────

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '',
} as const;

let configured = false;
let currentUserId: string | null = null;

export function isPurchasesAvailable(): boolean {
  return configured;
}

/** Configure le SDK une seule fois (au démarrage de l'app). */
export function configurePurchases(): boolean {
  if (configured) return true;
  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : Platform.OS === 'android' ? API_KEYS.android : '';
  if (!apiKey) {
    console.warn('[RevenueCat] Clé absente pour', Platform.OS, '— achats désactivés.');
    return false;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (e) {
    console.warn('[RevenueCat] Initialisation impossible :', e);
    return false;
  }
}

let pendingLogin: { userId: string; promise: Promise<CustomerInfo> } | null = null;

/** À appeler immédiatement après la connexion : lie les achats au compte Supabase. */
export async function loginPurchases(userId: string): Promise<CustomerInfo | null> {
  if (!configurePurchases()) return null;
  if (currentUserId === userId) return Purchases.getCustomerInfo();
  // Plusieurs signaux de connexion peuvent arriver ensemble : un seul logIn.
  if (pendingLogin?.userId === userId) return pendingLogin.promise;
  const promise = Purchases.logIn(userId).then(({ customerInfo }) => {
    currentUserId = userId;
    return customerInfo;
  });
  pendingLogin = { userId, promise };
  try {
    return await promise;
  } finally {
    if (pendingLogin?.promise === promise) pendingLogin = null;
  }
}

/** À appeler à la déconnexion : détache le téléphone du compte. */
export async function logoutPurchases(): Promise<void> {
  if (!configured) return;
  currentUserId = null;
  try {
    // logOut() sur un utilisateur anonyme lève une erreur : on vérifie d'abord.
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch (e) {
    console.warn('[RevenueCat] logOut :', e);
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.getCustomerInfo();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** Ids de produits éligibles à l'essai gratuit (iOS ; Android filtre déjà côté store). */
export async function trialEligibleProductIds(productIds: string[]): Promise<Set<string>> {
  if (!configured || Platform.OS !== 'ios' || productIds.length === 0) return new Set(productIds);
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    return new Set(
      Object.entries(result)
        .filter(([, v]) => v.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE)
        .map(([id]) => id),
    );
  } catch {
    return new Set();
  }
}

export type PurchaseOutcome =
  | { status: 'success'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'success', customerInfo };
  } catch (e) {
    const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { status: 'cancelled' };
    }
    if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pending' };
    return { status: 'error', message: err.message ?? 'Achat impossible pour le moment.' };
  }
}

/** Obligatoire App Store : restaure les achats du compte Apple / Google courant. */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.restorePurchases();
}

/** Ouvre les réglages d'abonnement natifs du téléphone (App Store / Google Play). */
export async function showNativeSubscriptionManagement(): Promise<void> {
  if (!configured) return;
  await Purchases.showManageSubscriptions();
}

export function addCustomerInfoListener(listener: (info: CustomerInfo) => void): () => void {
  if (!configured) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export function activeEntitlement(info: CustomerInfo | null) {
  return info?.entitlements.active[ENTITLEMENT_ID] ?? null;
}

/**
 * @deprecated Conservé pour compatibilité : préférer configurePurchases() +
 * loginPurchases(userId) (voir src/hooks/useRevenueCatIdentity.ts).
 */
export async function initPurchases(appUserID?: string): Promise<boolean> {
  if (!configurePurchases()) return false;
  if (appUserID) await loginPurchases(appUserID).catch(() => null);
  return true;
}

import { Platform } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { selectIsActive, useSubscriptionStore } from '../stores/subscription.store';
import { activeEntitlement } from '../services/purchases';
import { isStaffRole, managementMode, type ManagementMode } from '../services/subscription-logic';

export type EntitlementState = {
  /** Vérification en cours : afficher un chargement, jamais le paywall. */
  isLoading: boolean;
  /** Accès à P3 : abonné `thrive_moments` actif, ou rôle staff. */
  hasAccess: boolean;
  /** Vrai abonnement (hors bypass staff). */
  isSubscribed: boolean;
  isStaff: boolean;
  isTrial: boolean;
  willRenew: boolean;
  expirationDate: string | null;
  store: string | null;
  management: ManagementMode;
  refresh: () => Promise<void>;
};

/**
 * LE point d'entrée unique pour savoir si l'utilisateur a accès au contenu
 * premium P3 (entitlement RevenueCat `thrive_moments`). Toute vue premium de
 * l'app mobile passe par ce hook (ou par <PremiumGate>, qui l'utilise).
 */
export function useEntitlement(): EntitlementState {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const status = useSubscriptionStore((s) => s.status);
  const customerInfo = useSubscriptionStore((s) => s.customerInfo);
  const refresh = useSubscriptionStore((s) => s.refresh);

  const isStaff = isStaffRole(role);
  const ent = activeEntitlement(customerInfo);
  const isSubscribed = selectIsActive({ customerInfo });

  return {
    isLoading: !isStaff && status === 'loading',
    hasAccess: isStaff || isSubscribed,
    isSubscribed,
    isStaff,
    isTrial: ent?.periodType === 'TRIAL',
    willRenew: ent?.willRenew ?? false,
    expirationDate: ent?.expirationDate ?? null,
    store: ent?.store ?? null,
    management: managementMode(ent?.store ?? null, Platform.OS),
    refresh,
  };
}

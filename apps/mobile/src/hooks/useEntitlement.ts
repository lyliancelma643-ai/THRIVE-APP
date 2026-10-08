import { Platform } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { selectIsActive, useSubscriptionStore } from '../stores/subscription.store';
import { activeEntitlement } from '../services/purchases';
import { isStaffRole, managementMode, type ManagementMode } from '../services/subscription-logic';

export type EntitlementState = {
  /** Vérification en cours : afficher un chargement, jamais le paywall. */
  isLoading: boolean;
  /** Accès à P3 : `access_state().p3_access` (source de vérité serveur) ou rôle staff. */
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
  const serverAccess = useSubscriptionStore((s) => s.serverAccess);

  const isStaff = isStaffRole(role);
  const ent = activeEntitlement(customerInfo);
  const isSubscribed = selectIsActive({ customerInfo });

  return {
    isLoading: !isStaff && (status === 'loading' || serverAccess === null),
    // Le serveur décide (abonnement, forçage admin, co-parent). L'état RevenueCat
    // local sert à déclencher la resynchronisation (cf. subscription.store), pas à ouvrir.
    hasAccess: isStaff || serverAccess === true,
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

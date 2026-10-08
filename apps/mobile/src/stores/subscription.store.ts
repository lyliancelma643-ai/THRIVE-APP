import { create } from 'zustand';
import type { CustomerInfo } from 'react-native-purchases';
import { supabaseClient as supabase } from '@thrive/shared';
import { activeEntitlement, getCustomerInfo, isPurchasesAvailable } from '../services/purchases';

// ─────────────────────────────────────────────────────────────────────────────
// État d'abonnement du compte connecté (source : RevenueCat CustomerInfo),
// partagé par toute l'app mobile. Mis à jour :
//   • à la connexion (logIn) et au démarrage ;
//   • en direct par l'écouteur CustomerInfo (achat, renouvellement, expiration,
//     achat fait sur une autre plateforme du même compte) ;
//   • après achat / restauration.
//
// `status` :
//   • 'loading'     : vérification en cours → écran de chargement, jamais de
//                     clignotement « verrouillé → déverrouillé » ;
//   • 'ready'       : état connu ;
//   • 'unavailable' : SDK absent (Expo Go, clé manquante) → accès fermé, sans erreur.
// ─────────────────────────────────────────────────────────────────────────────

type Status = 'loading' | 'ready' | 'unavailable';

type SubscriptionStore = {
  status: Status;
  customerInfo: CustomerInfo | null;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  /**
   * Accès Maison accordé par le serveur, hors achat dans CETTE app :
   * forfait accompagné (coach validé + enfant confirmé) ou abonnement pris sur
   * une autre plateforme (miroir RevenueCat). Apple 3.1.3(b) : un contenu acquis
   * ailleurs est reconnu, sans lien ni mention du paiement externe.
   * null = pas encore lu.
   */
  serverAccess: boolean | null;
  loadServerAccess: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
};

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  status: 'loading',
  customerInfo: null,
  serverAccess: null,

  loadServerAccess: async () => {
    const { data, error } = await supabase.rpc('access_state');
    const state = data as { p3_access?: boolean } | null;
    set({ serverAccess: !error && Boolean(state?.p3_access) });
  },

  setCustomerInfo: (info) =>
    set({ customerInfo: info, status: isPurchasesAvailable() ? 'ready' : 'unavailable' }),

  refresh: async () => {
    if (!isPurchasesAvailable()) {
      set({ status: 'unavailable', customerInfo: null });
      return;
    }
    try {
      const info = await getCustomerInfo();
      set({ customerInfo: info, status: 'ready' });
    } catch {
      // Réseau indisponible : on garde le dernier état connu (cache SDK).
      set((s) => ({ status: s.customerInfo ? 'ready' : 'unavailable' }));
    }
  },

  reset: () => set({ status: 'loading', customerInfo: null, serverAccess: null }),
}));

export function selectIsActive(s: Pick<SubscriptionStore, 'customerInfo'>): boolean {
  return activeEntitlement(s.customerInfo) !== null;
}

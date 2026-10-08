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

// Après un achat / une restauration : le serveur (billing_subscriptions) est la
// source de vérité de access_state(). On le resynchronise depuis RevenueCat
// (edge function billing-sync) puis on relit access_state(). Une seule synchro
// à la fois ; en cas d'échec le webhook finira le travail (relecture au prochain lancement).
let syncing = false;
async function syncServerAfterPurchase(reload: () => Promise<void>): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await supabase.functions.invoke('billing-sync', { body: {} });
  } catch {
    // ignoré : voir ci-dessus
  } finally {
    syncing = false;
  }
  await reload();
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  status: 'loading',
  customerInfo: null,
  serverAccess: null,

  loadServerAccess: async () => {
    const { data, error } = await supabase.rpc('access_state');
    const state = data as { p3_access?: boolean } | null;
    set({ serverAccess: !error && Boolean(state?.p3_access) });
  },

  setCustomerInfo: (info) => {
    set({ customerInfo: info, status: isPurchasesAvailable() ? 'ready' : 'unavailable' });
    // Droit actif côté store mais pas encore reconnu par le serveur → resynchroniser.
    if (selectIsActive({ customerInfo: info }) && get().serverAccess !== true) {
      set({ serverAccess: null }); // « vérification en cours » plutôt que paywall qui clignote
      void syncServerAfterPurchase(get().loadServerAccess);
    }
  },

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

import { useEffect } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  addCustomerInfoListener,
  configurePurchases,
  loginPurchases,
  logoutPurchases,
} from '../services/purchases';
import { useSubscriptionStore } from '../stores/subscription.store';

/**
 * Identité RevenueCat = compte Supabase, en continu (à monter UNE fois, dans
 * le layout racine) :
 *   • session existante au démarrage ou SIGNED_IN → Purchases.logIn(user.id) ;
 *   • SIGNED_OUT → Purchases.logOut() + état d'abonnement remis à zéro.
 * Écoute aussi les mises à jour CustomerInfo (renouvellement, expiration, achat
 * fait ailleurs sur le même compte) pour débloquer / bloquer en direct.
 */
export function useRevenueCatIdentity() {
  useEffect(() => {
    const store = useSubscriptionStore.getState();
    const available = configurePurchases();

    // Accès accordé côté serveur (forfait accompagné, abonnement web) : lu à
    // chaque connexion, que le SDK d'achat soit disponible ou non.
    const syncServerAccess = (userId: string | null) => {
      if (userId) useSubscriptionStore.getState().loadServerAccess();
    };
    supabase.auth.getSession().then(({ data }) => syncServerAccess(data.session?.user.id ?? null));
    const { data: serverSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') useSubscriptionStore.setState({ serverAccess: null });
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') syncServerAccess(session?.user.id ?? null);
    });

    if (!available) {
      store.setCustomerInfo(null);
      return () => serverSub.subscription.unsubscribe();
    }

    const removeListener = addCustomerInfoListener((info) => {
      useSubscriptionStore.getState().setCustomerInfo(info);
    });

    const identify = async (userId: string | null) => {
      if (!userId) {
        await logoutPurchases();
        useSubscriptionStore.getState().reset();
        useSubscriptionStore.getState().setCustomerInfo(null);
        return;
      }
      try {
        const info = await loginPurchases(userId);
        useSubscriptionStore.getState().setCustomerInfo(info);
      } catch {
        await useSubscriptionStore.getState().refresh();
      }
    };

    supabase.auth.getSession().then(({ data }) => identify(data.session?.user.id ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') identify(null);
      else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        identify(session?.user.id ?? null);
      }
    });

    return () => {
      removeListener();
      sub.subscription.unsubscribe();
      serverSub.subscription.unsubscribe();
    };
  }, []);
}

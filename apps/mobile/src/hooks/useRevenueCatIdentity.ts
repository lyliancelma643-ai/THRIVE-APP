import { useEffect } from 'react';
import { AppState } from 'react-native';
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
    // Mise à jour SANS redémarrer (migration 080) : la ligne access_versions du
    // compte change à chaque pack / override / abonnement (temps réel), et
    // l'état est relu à chaque retour au premier plan (échéances, achats faits ailleurs).
    let currentUser: string | null = null;
    let versionChannel: ReturnType<typeof supabase.channel> | null = null;
    const watchVersion = (userId: string | null) => {
      if (versionChannel) void supabase.removeChannel(versionChannel);
      versionChannel = null;
      if (!userId) return;
      versionChannel = supabase
        .channel(`access-version-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'access_versions', filter: `user_id=eq.${userId}` },
          () => void useSubscriptionStore.getState().loadServerAccess()
        )
        .subscribe();
    };
    const syncServerAccess = (userId: string | null) => {
      currentUser = userId;
      watchVersion(userId);
      if (userId) useSubscriptionStore.getState().loadServerAccess();
    };
    supabase.auth.getSession().then(({ data }) => syncServerAccess(data.session?.user.id ?? null));
    const { data: serverSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        currentUser = null;
        watchVersion(null);
        useSubscriptionStore.setState({ serverAccess: null, access: null });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') syncServerAccess(session?.user.id ?? null);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && currentUser) {
        void useSubscriptionStore.getState().loadServerAccess();
        void useSubscriptionStore.getState().refresh();
      }
    });
    const stopServerWatch = () => {
      serverSub.subscription.unsubscribe();
      appState.remove();
      watchVersion(null);
    };

    if (!available) {
      store.setCustomerInfo(null);
      return stopServerWatch;
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
      stopServerWatch();
    };
  }, []);
}

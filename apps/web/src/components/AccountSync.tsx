'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, markDisabledLogout } from '@/stores/auth.store';

/**
 * Watcher global monté dans le layout racine.
 *
 * Écoute en temps réel la ligne `profiles` de l'utilisateur connecté : toute
 * action faite côté admin (changement de rôle, activation/désactivation) se
 * répercute IMMÉDIATEMENT sur SA propre session, sans reconnexion manuelle.
 *   - Compte désactivé (is_active = false) → déconnexion + retour au login.
 *   - Rôle modifié → rafraîchissement de session (nouveau JWT avec le bon
 *     user_metadata.role), puis redirection ; les layouts parent/coach/admin
 *     réorientent alors automatiquement vers le bon espace.
 *
 * Réconciliation : au moment où le canal devient SUBSCRIBED (montage initial
 * ET reconnexion du socket), on relit l'état réel pour rattraper un évènement
 * qui aurait pu être manqué pendant que l'onglet était en arrière-plan/hors-ligne.
 */
export function AccountSync() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const signOut = useAuthStore((s) => s.signOut);

  // Référence toujours à jour du rôle courant, lisible depuis le callback.
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Compte désactivé → on coupe la session (raison mémorisée hors URL).
    const disable = async () => {
      markDisabledLogout();
      await signOut();
      router.replace('/login?reason=disabled');
    };

    // Rôle changé → JWT à jour puis redirection. On ne déconnecte que si la
    // session est RÉELLEMENT invalide (ban), pas sur une erreur réseau passagère.
    const applyRoleChange = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        const { data: { user }, error: getErr } = await supabase.auth.getUser();
        if (getErr || !user) {
          await disable();
          return;
        }
        // Erreur transitoire : autoRefreshToken rattrapera le nouveau rôle.
        return;
      }
      router.replace('/dashboard');
    };

    const evaluate = async (state: { role?: string | null; is_active?: boolean | null }) => {
      if (cancelled) return;
      if (state.is_active === false) {
        await disable();
        return;
      }
      if (state.role && state.role !== roleRef.current) {
        await applyRoleChange();
      }
    };

    // Lecture one-shot de l'état réel (rattrapage).
    const reconcile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single();
      if (data) await evaluate(data);
    };

    const channel = supabase
      .channel(`account-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          void evaluate(payload.new as { role?: string; is_active?: boolean });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reconcile();
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, signOut, router]);

  return null;
}

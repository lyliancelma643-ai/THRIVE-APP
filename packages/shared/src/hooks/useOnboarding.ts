import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useOnboarding
 * Gère l'état d'onboarding d'un utilisateur.
 * - Lit `onboarding_completed` depuis la table `profiles`.
 * - Expose `markOnboardingDone()` pour le mettre à jour en DB.
 * - Utilisé par le guard dans app/_layout.tsx pour rediriger
 *   automatiquement les nouveaux utilisateurs vers leur wizard.
 */

export interface OnboardingState {
  loading: boolean;
  onboardingCompleted: boolean | null;
  markOnboardingDone: () => Promise<void>;
  error: string | null;
}

export function useOnboarding(userId: string | undefined): OnboardingState {
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchOnboardingStatus() {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', userId)
          .single();

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setOnboardingCompleted(false);
        } else {
          // Si la colonne n'existe pas encore (avant migration), on considère non-complété
          setOnboardingCompleted(data?.onboarding_completed ?? false);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setOnboardingCompleted(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchOnboardingStatus();

    return () => { mounted = false; };
  }, [userId]);

  const markOnboardingDone = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;
      setOnboardingCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { loading, onboardingCompleted, markOnboardingDone, error };
}

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { isProgramPack, type ProgramPack } from '../../services/programPayments';
import { useSubscriptionStore } from '../../stores/subscription.store';

/**
 * Programme actif du compte (« Ton programme » sur Y). Lecture seule : relit `pack_actif` dans access_state()
 * (le store n'expose que la source d'accès). Aucun programme actif, ou erreur → null.
 */
export function useCurrentPack(): ProgramPack | null {
  const fromProgram = useSubscriptionStore((s) => s.access?.sourceMaison) === 'pack';
  const [pack, setPack] = useState<ProgramPack | null>(null);
  useEffect(() => {
    if (!fromProgram) {
      setPack(null);
      return;
    }
    let alive = true;
    Promise.resolve(supabase.rpc('access_state'))
      .then(({ data }) => {
        const value = (data as { pack_actif?: unknown } | null)?.pack_actif;
        if (alive) setPack(isProgramPack(value) ? value : null);
      })
      .catch(() => {
        if (alive) setPack(null);
      });
    return () => {
      alive = false;
    };
  }, [fromProgram]);
  return pack;
}

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import type { RewardRow } from './logic';

/**
 * Ligne `p3_rewards` d'un objet (payload figé au moment où il est gagné). Lecture seule, RLS : parent de
 * l'enfant. Absence de ligne = `row: null` : l'écran décide alors via le calcul du carnet (aucune écriture ici).
 */
export function useRewardRow(childId: string | undefined, rewardId: string) {
  const [row, setRow] = useState<RewardRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!childId) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('p3_rewards')
      .select('reward_id, payload, earned_at')
      .eq('child_id', childId)
      .eq('reward_id', rewardId)
      .maybeSingle();
    setRow((data as RewardRow | null) ?? null);
    setLoading(false);
  }, [childId, rewardId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { row, loading, reload: load };
}

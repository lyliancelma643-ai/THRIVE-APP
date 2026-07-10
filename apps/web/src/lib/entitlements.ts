'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  asPack,
  can,
  limit,
  quotaReached,
  type Pack,
  type PlanFeature,
  type PlanLimitKey,
} from './packs';

// ─────────────────────────────────────────────────────────────────────────────
// Droits du forfait courant, exposés à toute l'UI parent (miroir de
// useAccessStore) : une seule source côté client, dérivée de families.pack
// pour la famille de l'enfant sélectionné.
//
// L'UI ne fait que REFLÉTER ces droits — l'enforcement réel est en RLS
// (migration 039) et dans les edge functions. Repli sûr : ESSENTIEL.
// ─────────────────────────────────────────────────────────────────────────────

type PlanStore = {
  pack: Pack;
  familyId: string | null;
  childId: string | null;
  isLoading: boolean;
  refresh: (childId: string | null) => Promise<void>;
};

export const usePlanStore = create<PlanStore>((set) => ({
  pack: 'ESSENTIEL',
  familyId: null,
  childId: null,
  isLoading: true,

  refresh: async (childId) => {
    ensureRealtime();
    if (!childId) {
      // Sans enfant sélectionné : la famille du parent connecté (si elle existe)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ pack: 'ESSENTIEL', familyId: null, childId: null, isLoading: false });
        return;
      }
      const { data } = await supabase
        .from('families')
        .select('id, pack')
        .eq('parent_id', user.id)
        .maybeSingle();
      set({ pack: asPack(data?.pack), familyId: data?.id ?? null, childId: null, isLoading: false });
      return;
    }
    const { data } = await supabase
      .from('children')
      .select('family_id, family:families (id, pack)')
      .eq('id', childId)
      .maybeSingle();
    const rel = (data as any)?.family;
    const fam = Array.isArray(rel) ? rel[0] : rel;
    set({
      pack: asPack(fam?.pack),
      familyId: fam?.id ?? (data as any)?.family_id ?? null,
      childId,
      isLoading: false,
    });
  },
}));

// Un upgrade (webhook Stripe, admin) se reflète en direct dans toute l'UI.
let realtimeStarted = false;
function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel('plan-families')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'families' }, () => {
      const { childId, refresh } = usePlanStore.getState();
      refresh(childId);
    })
    .subscribe();
}

// Hook principal : usePlan(selectedChildId) → { pack, can(), limit(), … }
export function usePlan(childId?: string | null) {
  const store = usePlanStore();

  useEffect(() => {
    store.refresh(childId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return {
    pack: store.pack,
    familyId: store.familyId,
    isLoading: store.isLoading,
    can: (feature: PlanFeature) => can(store.pack, feature),
    limit: (key: PlanLimitKey) => limit(store.pack, key),
    quotaReached: (key: PlanLimitKey, current: number) => quotaReached(store.pack, key, current),
    refresh: () => store.refresh(childId ?? null),
  };
}

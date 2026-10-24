// ─────────────────────────────────────────────────────────────────────────────
// Portage de apps/web/src/hooks/useP3Moments.ts (même requêtes, mêmes dérivés).
//
//   • Lecture en parallèle : moments (tous : compteur cumulatif), récompenses, favoris / mis de côté,
//     refus des 30 derniers jours.
//   • Repli silencieux (R7) : base indisponible → AsyncStorage `thrive.p3.<table>.<childId>` ; le parent ne
//     voit jamais d'erreur ; ce qui a été noté localement est réaffiché (fusion) quand la base revient.
//   • Les moments vécus restent écrits par le mode activité de l'app (components/activite/persist.ts).
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  ageFromBirthDate, bandForAge, dailyStreak, mergeMoments, mergeRewards, momentsCount, momentsPhrase, unlockedWeeks,
  weeklyProgress, weeklyStreak,
  type P3MomentRow, type P3RewardRow, type P3SavedKind, type P3SavedRow, type P3SkipReason, type P3SkipRow,
} from '../lib/p3web';

type Table = 'p3_moments' | 'p3_rewards' | 'p3_saved' | 'p3_skips';

/** Préfixe de l'id du profil « parent seul » (parent sans enfant) : aucune ligne en base, tout reste en local. */
export const PARENT_ONLY_PREFIX = 'parent-';

const localKey = (table: Table, childId: string) => `thrive.p3.${table}.${childId}`;

async function readLocal<T>(table: Table, childId: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(localKey(table, childId));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal<T>(table: Table, childId: string, rows: T[]) {
  try {
    await AsyncStorage.setItem(localKey(table, childId), JSON.stringify(rows));
  } catch {
    // stockage indisponible : l'état reste en mémoire
  }
}

async function appendLocal<T>(table: Table, childId: string, row: T) {
  await writeLocal(table, childId, [...(await readLocal<T>(table, childId)), row]);
}

type State = {
  loading: boolean;
  storage: 'remote' | 'local';
  moments: P3MomentRow[];
  rewards: P3RewardRow[];
  saved: P3SavedRow[];
  skips: P3SkipRow[];
};

const EMPTY: State = { loading: true, storage: 'remote', moments: [], rewards: [], saved: [], skips: [] };

/** Banc d'essai DEV (/__ecran) : données de démonstration par enfant, jamais lues en production. */
export const DEV_P3_FIXTURES = new Map<string, Omit<State, 'loading' | 'storage'>>();

/**
 * Dernier état lu par enfant, partagé par tous les écrans Maison (fiche, catalogue, carnet, mode activité…) : un
 * écran déjà visité s'affiche aussitôt, sans squelette ni attente, puis se met à jour en arrière-plan.
 */
const P3_CACHE = new Map<string, State>();

/** Déconnexion : rien de la famille précédente ne reste en mémoire. */
export function clearP3Cache() {
  P3_CACHE.clear();
}

export function useP3Data(childId: string | null, dateOfBirth: string | null, firstName: string) {
  const [state, setState] = useState<State>(() => (childId && P3_CACHE.get(childId)) || EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [tick, setTick] = useState(0);
  const loadedFor = useRef<string | null>(null);

  /** Relit tout (retour sur l'écran après un moment vécu). */
  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Chaque état prêt (lecture, favori basculé…) alimente le cache commun.
  useEffect(() => {
    if (childId && !state.loading) P3_CACHE.set(childId, state);
  }, [childId, state]);

  useEffect(() => {
    if (!childId) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let alive = true;
    // Un rechargement garde l'écran affiché (pas de squelette) : seul un changement d'enfant le remontre.
    if (loadedFor.current !== childId) setState(P3_CACHE.get(childId) ?? EMPTY);
    loadedFor.current = childId;
    const fixture = __DEV__ ? DEV_P3_FIXTURES.get(childId) : undefined;
    if (fixture) {
      setState({ loading: false, storage: 'local', ...fixture });
      return;
    }
    (async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [localMoments, localRewards, localSaved, localSkipsAll] = await Promise.all([
        readLocal<P3MomentRow>('p3_moments', childId),
        readLocal<P3RewardRow>('p3_rewards', childId),
        readLocal<P3SavedRow>('p3_saved', childId),
        readLocal<P3SkipRow>('p3_skips', childId),
      ]);
      const localSkips = localSkipsAll.filter((s) => s.created_at >= since);
      if (childId.startsWith(PARENT_ONLY_PREFIX)) {
        if (!alive) return;
        setState({
          loading: false, storage: 'local',
          moments: mergeMoments([], localMoments), rewards: mergeRewards([], localRewards), saved: localSaved, skips: localSkips,
        });
        return;
      }
      try {
        const [m, r, s, k] = await Promise.all([
          supabase
            .from('p3_moments')
            .select('activity_id, created_at, duration_chosen, rating, kept_phrase, capture, week, place, outcome')
            .eq('child_id', childId)
            .order('created_at', { ascending: false }),
          supabase.from('p3_rewards').select('reward_id, payload, earned_at').eq('child_id', childId),
          supabase.from('p3_saved').select('activity_id, kind').eq('child_id', childId),
          supabase.from('p3_skips').select('activity_id, reason, created_at').eq('child_id', childId).gte('created_at', since),
        ]);
        if (!alive) return;
        if (m.error) throw m.error;
        setState({
          loading: false,
          storage: 'remote',
          moments: mergeMoments((m.data ?? []) as P3MomentRow[], localMoments),
          rewards: mergeRewards((r.data ?? []) as P3RewardRow[], localRewards),
          saved: s.error ? localSaved : ((s.data ?? []) as P3SavedRow[]),
          skips: [...((k.data ?? []) as P3SkipRow[]), ...localSkips],
        });
      } catch {
        if (!alive) return;
        setState({
          loading: false, storage: 'local',
          moments: mergeMoments([], localMoments), rewards: mergeRewards([], localRewards), saved: localSaved, skips: localSkips,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [childId, tick]);

  /** Tente l'écriture en base ; en cas d'échec, bascule silencieusement en local. */
  const writeRemote = useCallback(async (run: () => PromiseLike<{ error: unknown }>): Promise<boolean> => {
    if (stateRef.current.storage === 'local') return false;
    try {
      const { error } = await run();
      if (!error) return true;
    } catch {
      // repli local
    }
    setState((s) => ({ ...s, storage: 'local' }));
    return false;
  }, []);

  const recordSkip = useCallback(
    async (activityId: string, reason: P3SkipReason) => {
      if (!childId) return;
      const row: P3SkipRow = { activity_id: activityId, reason, created_at: new Date().toISOString() };
      const ok = await writeRemote(() => supabase.from('p3_skips').insert({ child_id: childId, activity_id: activityId, reason }));
      if (!ok) await appendLocal('p3_skips', childId, row);
      setState((s) => ({ ...s, skips: [...s.skips, row] }));
    },
    [childId, writeRemote],
  );

  const toggleSaved = useCallback(
    async (activityId: string, kind: P3SavedKind) => {
      if (!childId) return;
      const has = stateRef.current.saved.some((x) => x.activity_id === activityId && x.kind === kind);
      const next = has
        ? stateRef.current.saved.filter((x) => !(x.activity_id === activityId && x.kind === kind))
        : [...stateRef.current.saved, { activity_id: activityId, kind }];
      setState((s) => ({ ...s, saved: next }));
      const ok = await writeRemote(() =>
        has
          ? supabase.from('p3_saved').delete().eq('child_id', childId).eq('activity_id', activityId).eq('kind', kind)
          : supabase.from('p3_saved').insert({ child_id: childId, activity_id: activityId, kind }),
      );
      if (!ok) await writeLocal('p3_saved', childId, next);
    },
    [childId, writeRemote],
  );

  const derived = useMemo(() => {
    const now = new Date();
    const age = ageFromBirthDate(dateOfBirth, now);
    // Âge inconnu : on sert la tranche 8-11 (comme le web).
    const band = age === null ? ('8-11' as const) : bandForAge(age);
    const moments = state.moments;
    const count = momentsCount(moments);
    const doneIds = new Set(moments.map((m) => m.activity_id));
    return {
      age,
      band,
      count,
      countPhrase: momentsPhrase(count, firstName),
      week: weeklyProgress(moments, now),
      weeklyStreak: weeklyStreak(moments, now),
      dailyStreak: dailyStreak(moments, now),
      doneIds,
      openWeek: unlockedWeeks(doneIds),
      rewards: new Set(state.rewards.map((r) => r.reward_id)),
      rewardRows: state.rewards,
      saved: {
        favoris: new Set(state.saved.filter((s) => s.kind === 'FAVORI').map((s) => s.activity_id)),
        deCote: new Set(state.saved.filter((s) => s.kind === 'DE_COTE').map((s) => s.activity_id)),
      },
      lastKeptPhrase: moments.find((m) => m.kept_phrase?.trim())?.kept_phrase?.trim() ?? null,
      lastDuration: moments[0]?.duration_chosen ?? null,
      carnet: moments.filter((m) => m.kept_phrase?.trim() || m.capture),
      firstMomentAt: moments.length ? moments[moments.length - 1].created_at : null,
    };
  }, [state.moments, state.rewards, state.saved, dateOfBirth, firstName]);

  return {
    loading: state.loading,
    storage: state.storage,
    moments: state.moments,
    skips: state.skips,
    ...derived,
    recordSkip,
    toggleSaved,
    reload,
  };
}

export type P3Data = ReturnType<typeof useP3Data>;

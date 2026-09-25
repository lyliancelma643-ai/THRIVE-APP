'use client';

// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — données d'usage d'un enfant (migration 062).
//
//   • Lecture en parallèle : moments (tous : le compteur est cumulatif),
//     récompenses, favoris / mis de côté, refus des 30 derniers jours.
//   • Repli silencieux (R7) : table absente, garde RLS fermée ou réseau coupé →
//     localStorage `thrive.p3.<table>.<childId>`, console.warn seulement. Le
//     parent ne voit JAMAIS d'erreur ; ce qui a été noté localement est
//     réaffiché (fusion) quand la base redevient disponible.
//   • Lettre scellée (R12) : insert SANS `.select()` ; le texte n'est ni gardé,
//     ni relu, ni journalisé côté client.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  bandForAge,
  dailyStreak,
  momentsCount,
  momentsPhrase,
  newlyEarned,
  unlockedWeeks,
  weeklyProgress,
  weeklyStreak,
  type Duration,
  type Place,
  type RewardId,
} from '@/lib/p3-moments';
import {
  ageFromBirthDate,
  buildRewardPayload,
  mergeMoments,
  mergeRewards,
  type P3Capture,
  type P3Checkin,
  type P3MomentRow,
  type P3Outcome,
  type P3RewardRow,
  type P3SavedKind,
  type P3SavedRow,
  type P3SkipReason,
  type P3SkipRow,
} from '@/lib/p3-moments/app';

type Table = 'p3_moments' | 'p3_rewards' | 'p3_saved' | 'p3_skips';

/** Préfixe de l'id du profil « parent seul » (parent sans enfant) : aucune ligne en base, tout reste en local. */
export const PARENT_ONLY_PREFIX = 'parent-';

const localKey = (table: Table, childId: string) => `thrive.p3.${table}.${childId}`;

function readLocal<T>(table: Table, childId: string): T[] {
  try {
    const raw = window.localStorage.getItem(localKey(table, childId));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(table: Table, childId: string, rows: T[]) {
  try {
    window.localStorage.setItem(localKey(table, childId), JSON.stringify(rows));
  } catch {
    // Stockage plein ou bloqué (navigation privée) : on garde l'état en mémoire.
  }
}

function appendLocal<T>(table: Table, childId: string, row: T) {
  writeLocal(table, childId, [...readLocal<T>(table, childId), row]);
}

export type RecordMomentInput = {
  activityId: string;
  week: number;
  duration_chosen: Duration;
  duration_real_s: number | null;
  place: Place;
  checkin: P3Checkin | null;
  debrief: { kind: string; answer: string }[] | null;
  capture: P3Capture | null;
  kept_phrase: string | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  outcome: P3Outcome | null;
};

type State = {
  loading: boolean;
  storage: 'remote' | 'local';
  moments: P3MomentRow[];
  rewards: P3RewardRow[];
  saved: P3SavedRow[];
  skips: P3SkipRow[];
};

const EMPTY: State = { loading: true, storage: 'remote', moments: [], rewards: [], saved: [], skips: [] };

export function useP3Moments(childId: string | null, dateOfBirth: string | null, firstName: string) {
  const [state, setState] = useState<State>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Date de scellement de la lettre de ce moment-ci (payload de la récompense). */
  const sealedAtRef = useRef<string | null>(null);

  // ── Chargement ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!childId) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let alive = true;
    setState(EMPTY);
    (async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const localMoments = readLocal<P3MomentRow>('p3_moments', childId);
      const localRewards = readLocal<P3RewardRow>('p3_rewards', childId);
      const localSaved = readLocal<P3SavedRow>('p3_saved', childId);
      const localSkips = readLocal<P3SkipRow>('p3_skips', childId).filter((s) => s.created_at >= since);
      if (childId.startsWith(PARENT_ONLY_PREFIX)) {
        setState({
          loading: false,
          storage: 'local',
          moments: mergeMoments([], localMoments),
          rewards: mergeRewards([], localRewards),
          saved: localSaved,
          skips: localSkips,
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
          supabase
            .from('p3_skips')
            .select('activity_id, reason, created_at')
            .eq('child_id', childId)
            .gte('created_at', since),
        ]);
        if (!alive) return;
        if (m.error) throw m.error;
        const savedRemote = (s.data ?? []) as P3SavedRow[];
        setState({
          loading: false,
          storage: 'remote',
          moments: mergeMoments((m.data ?? []) as P3MomentRow[], localMoments),
          rewards: mergeRewards((r.data ?? []) as P3RewardRow[], localRewards),
          saved: s.error ? localSaved : savedRemote,
          skips: [...((k.data ?? []) as P3SkipRow[]), ...localSkips],
        });
      } catch (err) {
        if (!alive) return;
        console.warn('[p3] base indisponible — repli local', err);
        setState({
          loading: false,
          storage: 'local',
          moments: mergeMoments([], localMoments),
          rewards: mergeRewards([], localRewards),
          saved: localSaved,
          skips: localSkips,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [childId]);

  /** Tente l'écriture en base ; en cas d'échec, bascule silencieusement en local. */
  const writeRemote = useCallback(async (run: () => PromiseLike<{ error: unknown }>): Promise<boolean> => {
    if (stateRef.current.storage === 'local') return false;
    try {
      const { error } = await run();
      if (!error) return true;
      console.warn('[p3] écriture refusée — repli local', error);
    } catch (err) {
      console.warn('[p3] écriture impossible — repli local', err);
    }
    setState((s) => ({ ...s, storage: 'local' }));
    return false;
  }, []);

  // ── Écritures ──────────────────────────────────────────────────────────────
  const recordMoment = useCallback(
    async (input: RecordMomentInput): Promise<{ newRewards: RewardId[] }> => {
      if (!childId) return { newRewards: [] };
      const row: P3MomentRow = {
        activity_id: input.activityId,
        created_at: new Date().toISOString(),
        duration_chosen: input.duration_chosen,
        rating: input.rating,
        week: input.week,
        kept_phrase: input.kept_phrase?.trim() || null,
        capture: input.capture,
        place: input.place,
        outcome: input.outcome,
      };
      const ok = await writeRemote(() =>
        supabase.from('p3_moments').insert({
          child_id: childId,
          activity_id: row.activity_id,
          week: row.week,
          duration_chosen: row.duration_chosen,
          duration_real_s: input.duration_real_s,
          place: row.place,
          checkin: input.checkin,
          debrief: input.debrief,
          capture: row.capture,
          kept_phrase: row.kept_phrase,
          rating: row.rating,
          outcome: row.outcome,
        })
      );
      if (!ok) appendLocal('p3_moments', childId, row);

      const moments = mergeMoments([row], stateRef.current.moments);
      const already = stateRef.current.rewards;
      const earnedMap = new Map(already.map((r) => [r.reward_id, r.payload] as const));
      const ids = newlyEarned({
        alreadyEarned: new Set(already.map((r) => r.reward_id)),
        doneIds: new Set(moments.map((m) => m.activity_id)),
        momentsTotal: momentsCount(moments),
        subscriptionMonths: 0, // Facturation hors périmètre : le Book n'est jamais débloqué ici.
      });

      const newRows: P3RewardRow[] = [];
      for (const id of ids) {
        const payload = buildRewardPayload(id, moments, { earned: earnedMap, sealedAt: sealedAtRef.current });
        earnedMap.set(id, payload);
        const reward: P3RewardRow = { reward_id: id, payload, earned_at: new Date().toISOString() };
        const saved = await writeRemote(() =>
          supabase.from('p3_rewards').insert({ child_id: childId, reward_id: id, payload })
        );
        if (!saved) appendLocal('p3_rewards', childId, reward);
        newRows.push(reward);
      }
      sealedAtRef.current = null;
      setState((s) => ({ ...s, moments, rewards: mergeRewards(s.rewards, newRows) }));
      return { newRewards: ids };
    },
    [childId, writeRemote]
  );

  const recordSkip = useCallback(
    async (activityId: string, reason: P3SkipReason) => {
      if (!childId) return;
      const row: P3SkipRow = { activity_id: activityId, reason, created_at: new Date().toISOString() };
      const ok = await writeRemote(() =>
        supabase.from('p3_skips').insert({ child_id: childId, activity_id: activityId, reason })
      );
      if (!ok) appendLocal('p3_skips', childId, row);
      setState((s) => ({ ...s, skips: [...s.skips, row] }));
    },
    [childId, writeRemote]
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
          : supabase.from('p3_saved').insert({ child_id: childId, activity_id: activityId, kind })
      );
      if (!ok) writeLocal('p3_saved', childId, next);
    },
    [childId, writeRemote]
  );

  /**
   * Scelle la lettre (R12) : insert sans select — la RLS la rend illisible
   * avant un an, même pour son auteur. Le texte n'est jamais conservé ici :
   * si la base est indisponible, rien n'est stocké et l'écran propose l'enveloppe papier.
   */
  const sealLetter = useCallback(
    async (author: 'ENFANT' | 'PARENT', body: string): Promise<{ ok: boolean; sealedAt: Date | null }> => {
      if (!childId || !body.trim()) return { ok: false, sealedAt: null };
      const ok = await writeRemote(() =>
        supabase.from('p3_letters').insert({ child_id: childId, author, body })
      );
      if (!ok) return { ok: false, sealedAt: null };
      const sealedAt = new Date();
      sealedAtRef.current = sealedAt.toISOString();
      return { ok: true, sealedAt };
    },
    [childId, writeRemote]
  );

  // ── Dérivés ────────────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const now = new Date();
    const age = ageFromBirthDate(dateOfBirth, now);
    // Âge inconnu : on sert la tranche 8-11 (comme le parcours Fitness sans profil).
    const band = age === null ? '8-11' : bandForAge(age);
    const moments = state.moments;
    const count = momentsCount(moments);
    const doneIds = new Set(moments.map((m) => m.activity_id));
    const lastDuration = moments[0]?.duration_chosen ?? null;
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
      lastDuration,
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
    recordMoment,
    recordSkip,
    toggleSaved,
    sealLetter,
  };
}

export type P3Data = ReturnType<typeof useP3Moments>;

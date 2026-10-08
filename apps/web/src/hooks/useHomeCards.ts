'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Données du module « À la maison » pour l'enfant sélectionné.
//
//   • Séances « qui ont eu lieu » : séances coach COMPLETED (table sessions)
//     + séances 20 minutes terminées par le parent (video_session_runs).
//   • Moments : table home_card_moments (migration 061).
//
// Repli : tant que la migration 061 n'est pas appliquée (table absente), les
// moments sont gardés dans le navigateur. Aucune erreur n'est jamais montrée au
// parent (brief §0.7 : aucun état d'échec dans l'app).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  isCardUnlocked,
  latestSession,
  resolveDecks,
  type HomeCard,
} from '@/lib/home-cards';

export type MomentOutcome = 'YES' | 'NOT_REALLY';
export type HomeCardMoment = { card_id: string; outcome: MomentOutcome; created_at: string };

const localKey = (childId: string) => `thrive.homeCards.moments.${childId}`;

function readLocal(childId: string): HomeCardMoment[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(childId)) ?? '[]') as HomeCardMoment[];
  } catch {
    return [];
  }
}

function writeLocal(childId: string, moments: HomeCardMoment[]) {
  try {
    localStorage.setItem(localKey(childId), JSON.stringify(moments));
  } catch {
    /* navigation privée : le moment reste affiché pour la session */
  }
}

type SessionRow = {
  session_number: number | null;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
};
type RunRow = {
  started_at: string | null;
  completed_at: string | null;
  video_sessions: { session_number: number } | { session_number: number }[] | null;
};

export function useHomeCards(childId: string | null, dateOfBirth: string | null) {
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<Map<number, string>>(new Map());
  const [programStart, setProgramStart] = useState<Date | null>(null);
  const [moments, setMoments] = useState<HomeCardMoment[]>([]);
  const [storage, setStorage] = useState<'db' | 'local'>('db');

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [sessionsRes, runsRes, momentsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('session_number, status, scheduled_at, completed_at')
          .eq('child_id', childId),
        supabase
          .from('video_session_runs')
          .select('started_at, completed_at, video_sessions(session_number)')
          .eq('child_id', childId),
        supabase
          .from('home_card_moments')
          .select('card_id, outcome, created_at')
          .eq('child_id', childId)
          .order('created_at'),
      ]);
      if (cancelled) return;

      const done = new Map<number, string>();
      const markDone = (n: number | null | undefined, at: string | null) => {
        if (!n || !at) return;
        const prev = done.get(n);
        if (!prev || at < prev) done.set(n, at); // la séance « a eu lieu » à sa première validation
      };
      const starts: string[] = [];

      for (const s of (sessionsRes.data ?? []) as SessionRow[]) {
        if (s.status !== 'CANCELLED') starts.push(...[s.scheduled_at, s.completed_at].filter(Boolean) as string[]);
        if (s.status === 'COMPLETED') markDone(s.session_number, s.completed_at ?? s.scheduled_at);
      }
      for (const r of (runsRes.data ?? []) as unknown as RunRow[]) {
        const vs = Array.isArray(r.video_sessions) ? r.video_sessions[0] : r.video_sessions;
        if (r.started_at) starts.push(r.started_at);
        if (r.completed_at) markDone(vs?.session_number, r.completed_at);
      }

      setCompletions(done);
      setProgramStart(starts.length ? new Date(starts.sort()[0]) : null);

      if (momentsRes.error) {
        setStorage('local');
        setMoments(readLocal(childId));
      } else {
        setStorage('db');
        setMoments((momentsRes.data ?? []) as HomeCardMoment[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const unlockedSessions = useMemo(() => new Set(completions.keys()), [completions]);

  const { deck, bonusDeck } = useMemo(
    () => resolveDecks({ dateOfBirth, programStart, now: new Date(), unlockedSessions }),
    [dateOfBirth, programStart, unlockedSessions],
  );

  const recordMoment = useCallback(
    async (cardId: string, outcome: MomentOutcome) => {
      if (!childId) return;
      const moment: HomeCardMoment = { card_id: cardId, outcome, created_at: new Date().toISOString() };
      const nextMoments = [...moments, moment];
      setMoments(nextMoments);

      if (storage === 'db') {
        const { error } = await supabase
          .from('home_card_moments')
          .insert({ child_id: childId, card_id: cardId, outcome });
        if (!error) return;
        console.warn('[home-cards] enregistrement local (base indisponible)', error.message);
        setStorage('local');
        writeLocal(childId, [...readLocal(childId), moment]);
        return;
      }
      writeLocal(childId, nextMoments);
    },
    [childId, moments, storage],
  );

  return {
    loading,
    deck,
    bonusDeck,
    completions,
    unlockedSessions,
    latest: latestSession(completions),
    moments,
    /** Compteur de fierté : seuls les « Oui » comptent (brief §0.7). */
    momentsCount: moments.filter((m) => m.outcome === 'YES').length,
    doneCardIds: new Set(moments.filter((m) => m.outcome === 'YES').map((m) => m.card_id)),
    storage,
    isUnlocked: (card: HomeCard) => isCardUnlocked(card, unlockedSessions, bonusDeck),
    recordMoment,
  };
}


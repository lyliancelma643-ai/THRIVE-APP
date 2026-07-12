'use client';

// Couche données du bilan — TanStack Query.
// Mêmes requêtes que l'ancien load() de page.tsx, mais : résultat en cache
// (navigation aller-retour instantanée), requêtes dédoublonnées, et le
// realtime ne re-charge plus tout lui-même — il invalide la query.
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  DocMeta,
  EmotionLog,
  NextStep,
  LsssMoment,
  fetchDocuments,
  fetchEmotionLogs,
  fetchGaugeSummary,
  fetchLsssProgression,
  fetchPermaProgression,
  fetchNextSteps,
} from '@/lib/bilan';
import type { CoachInfo, ParentIdentity } from './bilan-html';

export type BilanData = {
  coach: CoachInfo;
  completed: number;
  identity: ParentIdentity;
  statusByNum: Record<number, string>;
  gauge: { global: number; sample_size: number; by_skill: Record<string, number> } | null;
  lsssPoints: { moment: LsssMoment; value: number }[];
  permaPoints: { session_number: number; value: number; pillars: Record<string, number> }[];
  nextSteps: NextStep[];
  emotions: EmotionLog[];
  docs: DocMeta[];
  pendingLsss: { token: string | null; moment: string | null } | null;
  pendingPerma: { token: string | null; session_number: number | null } | null;
};

async function loadBilanData(childId: string): Promise<BilanData> {
  const [sessionsRes, assignmentRes, identityRes, progRes, pendRes, pendPermaRes] =
    await Promise.all([
      supabase.from('sessions').select('status, session_number').eq('child_id', childId),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', childId)
        .eq('is_active', true)
        .limit(1),
      supabase
        .from('athlete_identity')
        .select(
          'sport, position, club, sport_story, strengths, season_dream, smart_goal, life_skill_goal, my_actions, toolbox, focus_word, letter, program_pct_override, certificate_ready'
        )
        .eq('child_id', childId)
        .maybeSingle(),
      fetchLsssProgression(childId),
      supabase
        .from('questionnaires')
        .select('access_token, moment, status')
        .eq('child_id', childId)
        .eq('kind', 'LSSS')
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('questionnaires')
        .select('access_token, session_number, status')
        .eq('child_id', childId)
        .eq('kind', 'PERMA')
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  const sessions = (sessionsRes.data ?? []) as { status: string; session_number: number | null }[];
  const statusByNum: Record<number, string> = {};
  for (const s of sessions) if (s.session_number != null) statusByNum[s.session_number] = s.status;

  const assignment = (assignmentRes.data ?? [])[0] as any;
  const coachProfile = Array.isArray(assignment?.profiles)
    ? assignment.profiles[0]
    : assignment?.profiles;

  const pend = (pendRes.data ?? [])[0] as any;
  const pendPerma = (pendPermaRes.data ?? [])[0] as any;

  const [g, perma, ns, em, dc] = await Promise.all([
    fetchGaugeSummary(childId),
    fetchPermaProgression(childId),
    fetchNextSteps(childId),
    fetchEmotionLogs(childId),
    fetchDocuments(childId),
  ]);

  return {
    coach: (coachProfile as CoachInfo) ?? null,
    completed: sessions.filter((s) => s.status === 'COMPLETED').length,
    identity: (identityRes.data as ParentIdentity) ?? null,
    statusByNum,
    gauge:
      g && g.sample_size > 0
        ? { global: g.global, sample_size: g.sample_size, by_skill: g.by_skill ?? {} }
        : null,
    lsssPoints: (progRes ?? []).map((p) => ({ moment: p.moment, value: p.value })),
    permaPoints: (perma ?? []).map((p) => ({
      session_number: p.session_number,
      value: p.value,
      pillars: (p.pillars ?? {}) as Record<string, number>,
    })),
    nextSteps: ns,
    emotions: em,
    docs: dc,
    pendingLsss: pend ? { token: pend.access_token ?? null, moment: pend.moment ?? null } : null,
    pendingPerma: pendPerma
      ? { token: pendPerma.access_token ?? null, session_number: pendPerma.session_number ?? null }
      : null,
  };
}

const REALTIME_TABLES = [
  'athlete_identity',
  'sessions',
  'athlete_next_steps',
  'emotion_logs',
  'athlete_documents',
  'questionnaires',
] as const;

export function useBilanData(childId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bilan', childId],
    queryFn: () => loadBilanData(childId as string),
    enabled: Boolean(childId),
  });

  // Mise à jour en direct quand le coach/admin modifie le dossier : on
  // invalide la query, React Query re-charge (et dédoublonne les rafales).
  useEffect(() => {
    if (!childId) return;
    const f = `child_id=eq.${childId}`;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['bilan', childId] });
    let channel = supabase.channel(`bilan-${childId}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: f },
        invalidate
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);

  return query;
}

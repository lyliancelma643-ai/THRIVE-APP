// Couche données du Bilan : portage de apps/web/src/app/parent/(hub)/bilans/useBilanData.ts (mêmes requêtes,
// même invalidation en temps réel quand le coach modifie le dossier) + forfait de la famille (usePlan du web).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { can, type Pack, type PlanFeature } from '../../../../../web/src/lib/packs';
import { useSubscriptionStore } from '../../../stores/subscription.store';
import type { CoachInfo, ParentIdentity } from '../../../../../web/src/app/parent/(hub)/bilans/bilan-html';

export type LsssMoment = 'BASELINE' | 'MID' | 'FINAL';
export type NextStep = { id: string; label: string; status: string; due_date: string | null; sort_order: number };
export type EmotionLog = { id: string; emotion: string; created_at: string };
export type DocMeta = { id: string; kind: 'CONTRACT' | 'LETTER' | 'CERTIFICATE' | 'OTHER'; title: string | null; storage_path: string; parent_visible: boolean };

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
  const [sessionsRes, assignmentRes, identityRes, progRes, pendRes, pendPermaRes] = await Promise.all([
    supabase.from('sessions').select('status, session_number').eq('child_id', childId),
    supabase.from('coach_assignments').select('coach_id, profiles:coach_id (first_name, last_name)').eq('child_id', childId).eq('is_active', true).limit(1),
    supabase
      .from('athlete_identity')
      .select(
        'sport, position, club, sport_story, strengths, season_dream, smart_goal, life_skill_goal, my_actions, toolbox, focus_word, letter, program_pct_override, certificate_ready',
      )
      .eq('child_id', childId)
      .maybeSingle(),
    supabase.rpc('lsss_progression', { p_child: childId }),
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
  if (sessionsRes.error) throw sessionsRes.error;

  const sessions = (sessionsRes.data ?? []) as { status: string; session_number: number | null }[];
  const statusByNum: Record<number, string> = {};
  for (const s of sessions) if (s.session_number != null) statusByNum[s.session_number] = s.status;

  const assignment = (assignmentRes.data ?? [])[0] as { profiles?: CoachInfo | CoachInfo[] } | undefined;
  const coachProfile = Array.isArray(assignment?.profiles) ? assignment?.profiles[0] : assignment?.profiles;
  const pend = (pendRes.data ?? [])[0] as { access_token?: string; moment?: string } | undefined;
  const pendPerma = (pendPermaRes.data ?? [])[0] as { access_token?: string; session_number?: number } | undefined;

  const [g, perma, ns, em, dc] = await Promise.all([
    supabase.rpc('gauge_summary', { p_child_id: childId }),
    supabase.rpc('perma_progression', { p_child: childId }),
    supabase.from('athlete_next_steps').select('*').eq('child_id', childId).order('sort_order'),
    supabase.from('emotion_logs').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
    supabase.from('athlete_documents').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
  ]);
  const gauge = g.data as { global: number; sample_size: number; by_skill?: Record<string, number> } | null;

  return {
    coach: (coachProfile as CoachInfo) ?? null,
    completed: sessions.filter((s) => s.status === 'COMPLETED').length,
    identity: (identityRes.data as ParentIdentity) ?? null,
    statusByNum,
    gauge: gauge && gauge.sample_size > 0 ? { global: gauge.global, sample_size: gauge.sample_size, by_skill: gauge.by_skill ?? {} } : null,
    lsssPoints: ((progRes.data ?? []) as { moment: LsssMoment; value: number }[]).map((p) => ({ moment: p.moment, value: p.value })),
    permaPoints: ((perma.data ?? []) as { session_number: number; value: number; pillars?: Record<string, number> }[]).map((p) => ({
      session_number: p.session_number,
      value: p.value,
      pillars: p.pillars ?? {},
    })),
    nextSteps: (ns.data ?? []) as NextStep[],
    emotions: (em.data ?? []) as EmotionLog[],
    docs: (dc.data ?? []) as DocMeta[],
    pendingLsss: pend ? { token: pend.access_token ?? null, moment: pend.moment ?? null } : null,
    pendingPerma: pendPerma ? { token: pendPerma.access_token ?? null, session_number: pendPerma.session_number ?? null } : null,
  };
}

const REALTIME_TABLES = ['athlete_identity', 'sessions', 'athlete_next_steps', 'emotion_logs', 'athlete_documents', 'questionnaires'] as const;

/** Données du Bilan d'un enfant ; gardées en mémoire par enfant (retour instantané), relues en direct. */
const cache = new Map<string, BilanData>();

/** Banc d'essai DEV (/__ecran) : dossier de démonstration par enfant, jamais lu en production. */
export const DEV_BILAN_FIXTURES = new Map<string, BilanData>();

export function useBilanData(childId: string | null) {
  const [data, setData] = useState<BilanData | null>(childId ? cache.get(childId) ?? null : null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const d = (__DEV__ && DEV_BILAN_FIXTURES.get(childId)) || (await loadBilanData(childId));
      cache.set(childId, d);
      if (alive.current) {
        setData(d);
        setError(false);
      }
    } catch {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    alive.current = true;
    setData(childId ? cache.get(childId) ?? null : null);
    void reload();
    if (!childId) return;
    const f = `child_id=eq.${childId}`;
    // Une rafale de changements (bilan, questionnaire, séance…) ne déclenche qu'UNE relecture.
    let t: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void reload(), 400);
    };
    let channel = supabase.channel(`bilan-${childId}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: f }, soon);
    }
    channel.subscribe();
    return () => {
      alive.current = false;
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [childId, reload]);

  return { data, error, loading, reload };
}

/**
 * Forfait de la famille : niveau de détail calculé par access_state() (le plus haut entre families.pack et le forfait
 * actif de pack_enrollments). Pilote les sections analytiques (aperçu si fermé). `loaded` = access_state() lu.
 */
export function usePack(_childId: string | null): { pack: Pack; loaded: boolean; can: (f: PlanFeature) => boolean } {
  const access = useSubscriptionStore((s) => s.access);
  const pack = (access?.detailLevel ?? 'ESSENTIEL') as Pack;
  return { pack, loaded: access !== null, can: (f) => can(pack, f) };
}

/** Couleur du passeport (préréglages de lib/avatar.ts du web). */
const ACCENTS: Record<string, string> = { sun: '#F9EB50', amber: '#F6B45A', teal: '#A7C4BC', sky: '#6EC1E4', coral: '#F58A7E', violet: '#B79CE4' };
export function accentHex(key: string | null | undefined): string {
  return (key && ACCENTS[key]) || '#F9EB50';
}

/** Photo de l'enfant : chemin du bucket privé child-avatars → URL signée (les anciennes URL http passent telles quelles). */
export async function resolveAvatarUrl(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const { data } = await supabase.storage.from('child-avatars').createSignedUrl(raw, 3600);
  return data?.signedUrl ?? null;
}

/** % de complétion du programme (auto ou forcé par le coach). */
export function programPct(completed: number, total = 13, override?: number | null): number {
  if (override != null) return Math.max(0, Math.min(100, override));
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

/** URL signée d'un document (bucket privé athlete-documents). */
export async function signedDocUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data } = await supabase.storage.from('athlete-documents').createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

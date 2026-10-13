import { supabaseClient as supabase } from '@thrive/shared';
import { EMPTY_RAW_EXTRAS, type RawExtras } from './bilanPage';

// Lectures complémentaires de la page Bilan (G), sur les MÊMES tables et colonnes que le web
// (`useBilanData.ts`, RLS famille) : statut de chaque séance, histoire sportive, actions, lettre, certificat,
// dernière émotion, documents visibles, questionnaire de bien-être en attente. Lecture seule.

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function fetchBilanExtras(childId: string): Promise<RawExtras> {
  const [sess, idt, emo, docs, pend] = await Promise.all([
    supabase.from('sessions').select('session_number, status, scheduled_at').eq('child_id', childId),
    supabase
      .from('athlete_identity')
      .select('sport_story, my_actions, letter, program_pct_override, certificate_ready')
      .eq('child_id', childId)
      .maybeSingle(),
    supabase.from('emotion_logs').select('emotion').eq('child_id', childId).order('created_at', { ascending: false }).limit(1),
    supabase.from('athlete_documents').select('id, kind, parent_visible').eq('child_id', childId).eq('parent_visible', true),
    supabase
      .from('questionnaires')
      .select('access_token, session_number')
      .eq('child_id', childId)
      .eq('kind', 'PERMA')
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(1),
  ]);
  const a = (idt.data ?? {}) as Record<string, unknown>;
  const p = ((pend.data ?? []) as { access_token: string | null; session_number: number | null }[])[0];
  const pct = a.program_pct_override;
  return {
    sessions: ((sess.data ?? []) as RawExtras['sessions']).filter((s) => typeof s.status === 'string'),
    identity: {
      sport_story: str(a.sport_story),
      my_actions: Array.isArray(a.my_actions) ? (a.my_actions as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [],
      letter: str(a.letter),
      program_pct_override: typeof pct === 'number' ? pct : null,
      certificate_ready: a.certificate_ready === true,
    },
    latestEmotion: str(((emo.data ?? []) as { emotion?: unknown }[])[0]?.emotion),
    docs: ((docs.data ?? []) as { id: string; kind: string; parent_visible: boolean }[]),
    pendingWellbeing: p ? { token: p.access_token ?? null, sessionNumber: p.session_number ?? null } : null,
  };
}

export { EMPTY_RAW_EXTRAS };

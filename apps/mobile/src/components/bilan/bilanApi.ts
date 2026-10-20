import { supabaseClient as supabase } from '@thrive/shared';
import { isAccentKey, type Gauge, type Identity, type LsssPoint, type PermaPoint } from './bilanData';

export async function fetchInsights(childId: string): Promise<{ lsss: LsssPoint[]; perma: PermaPoint[]; gauge: Gauge | null }> {
  const [l, p, g] = await Promise.all([
    supabase.rpc('lsss_progression', { p_child: childId }),
    supabase.rpc('perma_progression', { p_child: childId }),
    supabase.rpc('gauge_summary', { p_child_id: childId }),
  ]);
  const gauge = g.data as Gauge | null;
  return {
    lsss: ((l.data ?? []) as LsssPoint[]),
    perma: ((p.data ?? []) as PermaPoint[]),
    gauge: gauge && typeof gauge.global === 'number' && gauge.sample_size > 0 ? gauge : null,
  };
}

export async function fetchIdentity(childId: string): Promise<Identity> {
  const { data } = await supabase.from('children').select('nickname, jersey_number, accent_color').eq('id', childId).maybeSingle();
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    nickname: typeof r.nickname === 'string' ? r.nickname : null,
    jersey_number: typeof r.jersey_number === 'number' ? r.jersey_number : null,
    accent_color: isAccentKey(r.accent_color) ? r.accent_color : null,
  };
}

export async function saveIdentity(childId: string, v: Identity): Promise<boolean> {
  const { error } = await supabase
    .from('children')
    .update({ nickname: v.nickname, jersey_number: v.jersey_number, accent_color: v.accent_color } as never)
    .eq('id', childId);
  return !error;
}

// ── Passeport : carte d'identité, photo, repères de départ, outils du coach ───
// Mêmes tables que le web (RLS famille) ; lecture seule, sauf identité (saveIdentity).

export type PassportCard = {
  sport: string | null;
  position: string | null;
  club: string | null;
  strengths: string[];
  seasonDream: string | null;
  smartGoal: string | null;
  lifeSkillGoal: string | null;
  focusWord: string | null;
  toolbox: { tool: string; context: string | null }[];
  lastName: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
};

const AVATAR_BUCKET = 'child-avatars';

/** Photo de l'enfant : bucket PRIVÉ `child-avatars`, `avatar_url` = chemin storage → URL signée (1 h). */
export async function resolveAvatarUrl(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(raw, 3600);
  return data?.signedUrl ?? null;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function fetchPassportCard(childId: string): Promise<PassportCard> {
  const [idt, kid] = await Promise.all([
    supabase
      .from('athlete_identity')
      .select('sport, position, club, strengths, season_dream, smart_goal, life_skill_goal, focus_word, toolbox')
      .eq('child_id', childId)
      .maybeSingle(),
    supabase.from('children').select('last_name, date_of_birth, avatar_url').eq('id', childId).maybeSingle(),
  ]);
  const a = (idt.data ?? {}) as Record<string, unknown>;
  const k = (kid.data ?? {}) as Record<string, unknown>;
  const toolbox = Array.isArray(a.toolbox)
    ? (a.toolbox as unknown[])
        .map((t) => (t && typeof t === 'object' ? { tool: str((t as Record<string, unknown>).tool), context: str((t as Record<string, unknown>).context) } : null))
        .filter((t): t is { tool: string; context: string | null } => !!t && !!t.tool)
    : [];
  return {
    sport: str(a.sport),
    position: str(a.position),
    club: str(a.club),
    strengths: strs(a.strengths),
    seasonDream: str(a.season_dream),
    smartGoal: str(a.smart_goal),
    lifeSkillGoal: str(a.life_skill_goal),
    focusWord: str(a.focus_word),
    toolbox,
    lastName: str(k.last_name),
    dateOfBirth: str(k.date_of_birth),
    avatarUrl: await resolveAvatarUrl(str(k.avatar_url)),
  };
}

/** Repère de départ par compétence : première note LSSS de chaque compétence (null si un seul questionnaire). */
export async function fetchSkillBaselines(childId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('skill_scores')
    .select('skill_key, value, source, source_id, created_at')
    .eq('child_id', childId)
    .eq('source', 'QUESTIONNAIRE_LSSS')
    .order('created_at', { ascending: true });
  const rows = (data ?? []) as { skill_key: string; value: number; source_id: string | null }[];
  const sources = new Set(rows.map((r) => r.source_id));
  if (sources.size < 2) return {};
  const first: Record<string, number> = {};
  for (const r of rows) if (!(r.skill_key in first)) first[r.skill_key] = Math.round(Number(r.value));
  return first;
}

export type NextStepRow = { id: string; label: string; status: 'todo' | 'doing' | 'done'; due_date: string | null };
export type DocRow = { id: string; title: string; storage_path: string };

export async function fetchNextSteps(childId: string): Promise<NextStepRow[]> {
  const { data } = await supabase.from('athlete_next_steps').select('id, label, status, due_date').eq('child_id', childId).order('sort_order');
  return ((data ?? []) as NextStepRow[]).filter((s) => s.status === 'todo' || s.status === 'doing' || s.status === 'done');
}

/** Documents visibles par le parent (RLS) : contrat de confiance, lettre à soi-même… */
export async function fetchDocuments(childId: string): Promise<DocRow[]> {
  const { data } = await supabase
    .from('athlete_documents')
    .select('id, title, file_name, storage_path, parent_visible')
    .eq('child_id', childId)
    .eq('parent_visible', true)
    .order('created_at', { ascending: false });
  return ((data ?? []) as { id: string; title: string | null; file_name: string | null; storage_path: string }[]).map((d) => ({
    id: d.id,
    title: d.title || d.file_name || 'Document',
    storage_path: d.storage_path,
  }));
}

export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('athlete-documents').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// ── Bilan du coach (T) : RPC session_report, filtrée côté serveur selon l'accès ─

export type SessionReportData = {
  premium: boolean;
  message: string | null;
  bilan: [string, string][];
  observations: [string, number][];
};

export async function fetchSessionReport(sessionId: string): Promise<SessionReportData | null> {
  const { data } = await supabase.rpc('session_report', { p_session: sessionId });
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const premium = d.premium === true;
  const bilan = d.bilan && typeof d.bilan === 'object' ? Object.entries(d.bilan as Record<string, unknown>).map(([k, v]) => [k, String(v)] as [string, string]) : [];
  const obs = d.observations && typeof d.observations === 'object'
    ? Object.entries(d.observations as Record<string, unknown>).map(([k, v]) => [k, Number(v)] as [string, number]).filter(([, v]) => Number.isFinite(v))
    : [];
  return { premium, message: str(d.message), bilan: premium ? bilan : [], observations: premium ? obs : [] };
}

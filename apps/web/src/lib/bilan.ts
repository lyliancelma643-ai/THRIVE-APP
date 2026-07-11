// Couche partagée du « Bilan » (coach / admin / parent).
// Types + accès Supabase pour les outils du dossier athlète : objectifs,
// prochaines étapes, émotions, routine, documents PDF, complétude, LSSS.

import { supabaseClient as supabase } from '@thrive/shared';

export const DOC_BUCKET = 'athlete-documents';

export type ObjectiveKind = 'TECHNIQUE' | 'LIFE_SKILL';
export type ObjectiveStatus = 'not_started' | 'in_progress' | 'achieved';

export type Objective = {
  id: string;
  child_id: string;
  kind: ObjectiveKind;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ObjectiveStatus;
  progress: number;
  sort_order: number;
};

export type NextStepStatus = 'todo' | 'doing' | 'done';
export type NextStep = {
  id: string;
  child_id: string;
  label: string;
  due_date: string | null;
  status: NextStepStatus;
  sort_order: number;
};

export type EmotionLog = {
  id: string;
  child_id: string;
  emotion: string;
  intensity: number | null;
  context: string | null;
  session_number: number | null;
  created_at: string;
};

export type FocusHistory = {
  id: string;
  word: string;
  note: string | null;
  is_current: boolean;
  created_at: string;
};

export type DocKind = 'CONTRACT' | 'LETTER' | 'CERTIFICATE' | 'OTHER';
export type DocMeta = {
  id: string;
  child_id: string;
  kind: DocKind;
  title: string | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  parent_visible: boolean;
  created_at: string;
};

export type CompletenessItem = { key: string; label: string; ok: boolean };
export type Completeness = {
  pct: number;
  done: number;
  total: number;
  sessions_completed: number;
  total_sessions: number;
  missing: string[];
  items: CompletenessItem[];
};

export type DossierRow = {
  child_id: string;
  first_name: string;
  last_name: string | null;
  coach_id: string | null;
  coach_name: string | null;
  admin_id: string | null;
  admin_name: string | null;
  pct: number;
  missing_count: number;
  sessions_completed: number;
  total_sessions: number;
  pending_lsss: boolean;
  updated_at: string | null;
};

export type LsssMoment = 'BASELINE' | 'MID' | 'FINAL';

export const LSSS_MOMENT_LABEL: Record<LsssMoment, string> = {
  BASELINE: 'Départ (S1)',
  MID: 'Mi-parcours (S7)',
  FINAL: 'Bilan final (S13)',
};

// ── Bien-être EPOCH (Kern et al. 2016), mesuré à chaque séance ──────────────
// 5 dimensions validées pour les 10–18 ans. (Nommage technique « perma_* »
// conservé pour le sous-système ; le contenu et les libellés sont EPOCH.)
export type PermaPillar =
  | 'engagement' | 'perseverance' | 'optimism' | 'connectedness' | 'happiness';

export const PERMA_PILLAR_LABEL: Record<PermaPillar, string> = {
  engagement: 'Engagement',
  perseverance: 'Persévérance',
  optimism: 'Optimisme',
  connectedness: 'Connexion aux autres',
  happiness: 'Bonheur',
};

export const PERMA_PILLAR_ORDER: PermaPillar[] = [
  'engagement', 'perseverance', 'optimism', 'connectedness', 'happiness',
];

export type PermaPoint = {
  session_number: number;
  created_at: string | null;
  value: number;
  pillars: Partial<Record<PermaPillar, number>>;
};

// ── Séances ────────────────────────────────────────────────────────────────
export type SessionStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | 'POSTPONED';

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; tone: string }> = {
  SCHEDULED:   { label: 'À venir',    tone: 'bg-navy-50 text-navy-600' },
  IN_PROGRESS: { label: 'En cours',   tone: 'bg-sun/30 text-navy-800' },
  COMPLETED:   { label: 'Complétée',  tone: 'bg-emerald-100 text-emerald-700' },
  MISSED:      { label: 'Manquée',    tone: 'bg-red-100 text-red-700' },
  POSTPONED:   { label: 'Reportée',   tone: 'bg-amber-100 text-amber-700' },
  CANCELLED:   { label: 'Annulée',    tone: 'bg-gray-100 text-gray-500' },
};

// ── Fetchers ─────────────────────────────────────────────────────────────────
export async function fetchObjectives(childId: string): Promise<Objective[]> {
  const { data } = await supabase
    .from('athlete_objectives')
    .select('*')
    .eq('child_id', childId)
    .order('sort_order');
  return (data ?? []) as Objective[];
}

export async function fetchNextSteps(childId: string): Promise<NextStep[]> {
  const { data } = await supabase
    .from('athlete_next_steps')
    .select('*')
    .eq('child_id', childId)
    .order('sort_order');
  return (data ?? []) as NextStep[];
}

export async function fetchEmotionLogs(childId: string): Promise<EmotionLog[]> {
  const { data } = await supabase
    .from('emotion_logs')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  return (data ?? []) as EmotionLog[];
}

export async function fetchFocusHistory(childId: string): Promise<FocusHistory[]> {
  const { data } = await supabase
    .from('focus_word_history')
    .select('id, word, note, is_current, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  return (data ?? []) as FocusHistory[];
}

export async function fetchDocuments(childId: string): Promise<DocMeta[]> {
  const { data } = await supabase
    .from('athlete_documents')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  return (data ?? []) as DocMeta[];
}

export async function fetchCompleteness(childId: string): Promise<Completeness | null> {
  const { data, error } = await supabase.rpc('dossier_completeness', { p_child: childId });
  if (error || !data) return null;
  return data as Completeness;
}

export async function fetchDossiers(): Promise<DossierRow[]> {
  const { data, error } = await supabase.rpc('list_dossiers');
  if (error || !data) return [];
  return data as DossierRow[];
}

export async function fetchLsssProgression(
  childId: string
): Promise<{ moment: LsssMoment; created_at: string; value: number }[]> {
  const { data } = await supabase.rpc('lsss_progression', { p_child: childId });
  return (data ?? []) as { moment: LsssMoment; created_at: string; value: number }[];
}

export async function fetchGaugeSummary(
  childId: string
): Promise<{ global: number; sample_size: number; by_skill: Record<string, number> } | null> {
  const { data } = await supabase.rpc('gauge_summary', { p_child_id: childId });
  return (data as any) ?? null;
}

export async function fetchPermaProgression(childId: string): Promise<PermaPoint[]> {
  const { data } = await supabase.rpc('perma_progression', { p_child: childId });
  return (data ?? []) as PermaPoint[];
}

// ── Documents : upload / signed url / delete ─────────────────────────────────
function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function uploadDocument(opts: {
  childId: string;
  kind: DocKind;
  file: File;
  title?: string;
  parentVisible: boolean;
  uploadedBy?: string;
}): Promise<{ error?: string }> {
  const { childId, kind, file, title, parentVisible, uploadedBy } = opts;
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const path = `${childId}/${kind}/${rand}-${safeName(file.name)}`;

  const up = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
  if (up.error) return { error: up.error.message };

  const ins = await supabase.from('athlete_documents').insert({
    child_id: childId,
    kind,
    title: title ?? null,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/pdf',
    size_bytes: file.size,
    parent_visible: parentVisible,
    uploaded_by: uploadedBy ?? null,
  });
  if (ins.error) {
    // rollback du fichier pour éviter un objet orphelin
    await supabase.storage.from(DOC_BUCKET).remove([path]);
    return { error: ins.error.message };
  }
  return {};
}

export async function signedDocUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function deleteDocument(doc: DocMeta): Promise<{ error?: string }> {
  const del = await supabase.from('athlete_documents').delete().eq('id', doc.id);
  if (del.error) return { error: del.error.message };
  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path]);
  return {};
}

// ── LSSS : envoi par le coach ────────────────────────────────────────────────
export async function sendLsss(
  childId: string,
  moment: LsssMoment
): Promise<{ token?: string; path?: string; error?: string }> {
  const { data, error } = await supabase.rpc('lsss_send', { p_child: childId, p_moment: moment });
  if (error) return { error: error.message };
  return { token: (data as any)?.token, path: (data as any)?.path };
}

// ── PERMA : envoi par le coach (une séance donnée, langue au choix) ──────────
export async function sendPerma(
  childId: string,
  sessionNumber: number,
  lang: 'fr' | 'en' = 'fr'
): Promise<{ token?: string; path?: string; error?: string }> {
  const { data, error } = await supabase.rpc('perma_send', {
    p_child: childId,
    p_session: sessionNumber,
    p_lang: lang,
  });
  if (error) return { error: error.message };
  return { token: (data as any)?.token, path: (data as any)?.path };
}

// ── % de complétion du programme (auto ou override coach) ────────────────────
export function programPct(completed: number, total = 13, override?: number | null): number {
  if (override != null) return Math.max(0, Math.min(100, override));
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function fmtBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

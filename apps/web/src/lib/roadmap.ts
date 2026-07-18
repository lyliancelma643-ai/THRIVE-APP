import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap v2 — types, référentiels et helpers partagés par les vues
// (organisation, calendrier, tableau de bord, chat, détail de tâche).
// Les droits sont appliqués par la RLS + triggers (migration 037) ; l'UI ne
// fait que refléter : Super Admin = contrôle total ; Admin = créer, se saisir,
// avancer SES tâches, signaler un problème, commenter, joindre.
// ─────────────────────────────────────────────────────────────────────────────

export type Horizon = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
export type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY';
export type Category =
  | 'COACHING' | 'CONTENU' | 'DEVELOPPEMENT' | 'PRATIQUE'
  | 'URGENT' | 'MARKETING' | 'ADMINISTRATIF' | 'GENERAL';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  horizon: Horizon;
  status: Status;
  deadline: string | null;
  assignee: string | null;
  category: Category;
  priority: Priority;
  recurrence: Recurrence;
  problem: string | null;
  problem_by: string | null;
  problem_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author: string;
  body: string;
  mentions: string[];
  created_at: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  kind: 'LINK' | 'FILE';
  url: string;
  label: string;
  created_by: string;
  created_at: string;
};

export type TaskHistoryEntry = {
  id: string;
  task_id: string | null;
  task_title: string;
  actor: string | null;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'attached';
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  channel: string;
  author: string;
  body: string;
  mentions: string[];
  created_at: string;
};

export type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

// ── Référentiels ──────────────────────────────────────────────────────────────

export const HORIZONS: { key: Horizon; label: string; hint: string }[] = [
  { key: 'WEEK', label: 'Cette semaine', hint: '≤ 7 jours' },
  { key: 'MONTH', label: 'Ce mois-ci', hint: '≤ 1 mois' },
  { key: 'QUARTER', label: '3 mois', hint: '≤ 3 mois' },
  { key: 'YEAR', label: 'Année', hint: 'long terme' },
];

export const CATEGORIES: Record<Category, { label: string; dot: string; chip: string }> = {
  URGENT:        { label: 'Urgent',         dot: 'bg-red-500',     chip: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  COACHING:      { label: 'Coaching',       dot: 'bg-navy-500',    chip: 'bg-navy-100 text-navy-700 dark:bg-navy-500/25 dark:text-navy-100' },
  CONTENU:       { label: 'Contenu',        dot: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  DEVELOPPEMENT: { label: 'Développement',  dot: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  PRATIQUE:      { label: 'Pratique',       dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  MARKETING:     { label: 'Marketing',      dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  ADMINISTRATIF: { label: 'Administratif',  dot: 'bg-slate-500',   chip: 'bg-slate-200 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300' },
  GENERAL:       { label: 'Général',        dot: 'bg-sage-dark',   chip: 'bg-sage-light text-navy-800 dark:bg-sage/20 dark:text-sage-light' },
};

export const PRIORITIES: Record<Priority, { label: string; chip: string; weight: number }> = {
  HIGH:   { label: 'Très important',        chip: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', weight: 0 },
  MEDIUM: { label: 'Moyennement important', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', weight: 1 },
  LOW:    { label: 'Pas important',         chip: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400', weight: 2 },
};

// Tâches récurrentes : à la complétion, un trigger (migration 054) crée la
// prochaine occurrence avec l'échéance décalée de l'intervalle.
export const RECURRENCES: Record<Recurrence, { label: string; short: string }> = {
  NONE:      { label: 'Pas de récurrence',     short: '' },
  DAILY:     { label: 'Chaque jour',           short: 'jour' },
  WEEKLY:    { label: 'Chaque semaine',        short: 'semaine' },
  BIWEEKLY:  { label: 'Toutes les 2 semaines', short: '2 sem.' },
  MONTHLY:   { label: 'Chaque mois',           short: 'mois' },
  BIMONTHLY: { label: 'Tous les 2 mois',       short: '2 mois' },
  QUARTERLY: { label: 'Tous les 3 mois',       short: '3 mois' },
};

export const STATUSES: Record<Status, { label: string; chip: string; bar: string }> = {
  TODO:        { label: 'À faire',    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/25 dark:text-slate-300', bar: 'bg-slate-400' },
  IN_PROGRESS: { label: 'En cours',   chip: 'bg-sun/70 text-navy-900 dark:bg-sun/30 dark:text-sun',                 bar: 'bg-sun-dark' },
  IN_REVIEW:   { label: 'En révision', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',        bar: 'bg-sky-500' },
  BLOCKED:     { label: 'Bloquée',    chip: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',         bar: 'bg-red-500' },
  DONE:        { label: 'Terminée',   chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', bar: 'bg-emerald-500' },
};

export const CHAT_CHANNELS: { key: string; label: string }[] = [
  { key: 'GENERAL', label: '# général' },
  ...Object.entries(CATEGORIES)
    .filter(([k]) => k !== 'GENERAL')
    .map(([k, v]) => ({ key: k, label: `# ${v.label.toLowerCase()}` })),
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function fullName(p?: AdminProfile | null): string {
  if (!p) return '—';
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sans nom';
}

export function isOverdue(t: Task): boolean {
  return !!t.deadline && t.status !== 'DONE' && new Date(t.deadline + 'T23:59:59') < new Date();
}

export function fmtDate(d: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  if (!d) return '—';
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-CA', opts);
}

export function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Miroir client du trigger de classement automatique (aperçu instantané)
export function horizonFromDeadline(deadline: string | null, fallback: Horizon): Horizon {
  if (!deadline) return fallback;
  const days = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - Date.now()) / 86400000);
  if (days <= 7) return 'WEEK';
  if (days <= 31) return 'MONTH';
  if (days <= 92) return 'QUARTER';
  return 'YEAR';
}

export function detectLinkLabel(url: string): string {
  try {
    const h = new URL(url).hostname;
    if (h.includes('docs.google')) return 'Google Docs';
    if (h.includes('drive.google')) return 'Google Drive';
    if (h.includes('dropbox')) return 'Dropbox';
    if (h.includes('notion')) return 'Notion';
    if (h.includes('figma')) return 'Figma';
    return h.replace('www.', '');
  } catch {
    return 'Lien';
  }
}

export const HISTORY_FIELD_LABELS: Record<string, string> = {
  title: 'le titre',
  description: 'la description',
  status: 'le statut',
  priority: 'la priorité',
  category: 'le groupe',
  deadline: "l'échéance",
  assignee: "l'attribution",
  recurrence: 'la récurrence',
  problem: 'le problème',
};

export function describeHistory(h: TaskHistoryEntry, admins: Record<string, AdminProfile>): string {
  const val = (field: string | null, v: string | null) => {
    if (v === null || v === '') return '—';
    if (field === 'status') return STATUSES[v as Status]?.label ?? v;
    if (field === 'priority') return PRIORITIES[v as Priority]?.label ?? v;
    if (field === 'category') return CATEGORIES[v as Category]?.label ?? v;
    if (field === 'recurrence') return RECURRENCES[v as Recurrence]?.label ?? v;
    if (field === 'assignee') return admins[v] ? fullName(admins[v]) : 'personne';
    if (field === 'deadline') return fmtDate(v);
    return v;
  };
  switch (h.action) {
    case 'created':
      return 'a créé la tâche';
    case 'deleted':
      return 'a supprimé la tâche';
    case 'commented':
      return `a commenté : « ${h.new_value ?? ''} »`;
    case 'attached':
      return `a joint « ${h.new_value ?? ''} »`;
    default:
      return `a modifié ${HISTORY_FIELD_LABELS[h.field ?? ''] ?? h.field} : ${val(h.field, h.old_value)} → ${val(h.field, h.new_value)}`;
  }
}

// ── Data access ───────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const { data } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at');
  return (data ?? []) as Task[];
}

export async function fetchAdmins(): Promise<AdminProfile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .in('role', ['ADMIN', 'SUPER_ADMIN'])
    .eq('is_active', true)
    .order('first_name');
  return (data ?? []) as AdminProfile[];
}

export async function fetchActivity(limit = 40): Promise<TaskHistoryEntry[]> {
  const { data } = await supabase
    .from('admin_task_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as TaskHistoryEntry[];
}

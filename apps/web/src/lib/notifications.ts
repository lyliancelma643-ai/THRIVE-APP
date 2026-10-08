import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Notifications administrateur — accès données + routage du clic.
//
// La base (migration 060) fait le gros du travail : le distributeur
// private.notify_admins fabrique une notification par admin actif, honore les
// préférences (public.admin_notification_prefs) et pose toujours data.path.
// Ce module ne fait que lire, marquer lu et rendre l'affichage cohérent.
// ─────────────────────────────────────────────────────────────────────────────

export type NotifCategory =
  | 'tasks' | 'messages' | 'mentions' | 'accounts' | 'billing' | 'activity' | 'system';

export const NOTIF_CATEGORIES: {
  key: NotifCategory; label: string; hint: string; emoji: string;
}[] = [
  { key: 'tasks',    label: 'Roadmap & tâches', emoji: '✅',
    hint: 'Création, attribution, tâche terminée, problème signalé, commentaire.' },
  { key: 'messages', label: 'Messages',         emoji: '💬',
    hint: 'Chat d’équipe de la roadmap et messages support envoyés par les parents.' },
  { key: 'mentions', label: 'Mentions',         emoji: '📣',
    hint: 'Quand quelqu’un vous mentionne dans un commentaire ou dans le chat.' },
  { key: 'accounts', label: 'Inscriptions & comptes', emoji: '👤',
    hint: 'Nouveau parent ou coach, enfant à confirmer, liste d’attente, suppression de compte.' },
  { key: 'billing',  label: 'Abonnements',      emoji: '💳',
    hint: 'Forfait souscrit, renouvelé, expiré.' },
  { key: 'activity', label: 'Activité produit', emoji: '📈',
    hint: 'Questionnaire complété, coach assigné à un athlète.' },
  { key: 'system',   label: 'Système & annonces', emoji: '🔔',
    hint: 'Envois manuels d’un administrateur et messages de service.' },
];

export const ALL_CATEGORIES: NotifCategory[] = NOTIF_CATEGORIES.map((c) => c.key);

export type NotifData = {
  path?: string;
  event?: string;
  category?: NotifCategory;
  actor_id?: string;
  task_id?: string;
  conversation_id?: string;
  child_id?: string;
} & Record<string, unknown>;

export type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: NotifData | null;
  is_read: boolean;
  created_at: string;
};

/** Famille d'évènement d'une notification (pour l'icône et les filtres). */
export function notifCategory(n: Notif): NotifCategory {
  const c = n.data?.category;
  if (c && ALL_CATEGORIES.includes(c)) return c;
  switch (n.type) {
    case 'MESSAGE':
    case 'MESSAGE_RECEIVED':
      return 'messages';
    case 'TASK_UPDATE':
      return 'tasks';
    case 'DOSSIER_INCOMPLET':
      return 'accounts';
    default:
      return 'system';
  }
}

export function notifEmoji(n: Notif): string {
  const cat = notifCategory(n);
  return NOTIF_CATEGORIES.find((c) => c.key === cat)?.emoji ?? '🔔';
}

/**
 * Destination du clic. data.path est posé par la base pour tout ce qui vient du
 * distributeur ; le reste retombe sur un routage par type — la cloche ne doit
 * jamais être un cul-de-sac.
 */
export function adminNotifTarget(n: Notif): string {
  const d = n.data ?? {};
  if (typeof d.path === 'string' && d.path.startsWith('/')) return d.path;
  if (typeof d.task_id === 'string') return `/admin/roadmap?task=${d.task_id}`;
  switch (n.type) {
    case 'MESSAGE':
    case 'MESSAGE_RECEIVED':
      return typeof d.conversation_id === 'string'
        ? `/admin/messages?c=${d.conversation_id}`
        : '/admin/messages';
    case 'TASK_UPDATE':
      return '/admin/roadmap';
    case 'DOSSIER_INCOMPLET':
      return typeof d.child_id === 'string' ? `/admin/dossiers/${d.child_id}` : '/admin/dossiers';
    default:
      return '/admin/notifications';
  }
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

// ── Lecture / écriture ──────────────────────────────────────────────────────

export async function fetchMyNotifications(userId: string, limit = 50): Promise<Notif[]> {
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Notif[];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id);
}

// ── Préférences ─────────────────────────────────────────────────────────────

export type NotifPrefs = {
  enabled: boolean;
  categories: NotifCategory[];
  includeSelf: boolean;
};

/** Sans ligne en base, tout est actif : un nouvel admin est informé d'emblée. */
export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  categories: ALL_CATEGORIES,
  includeSelf: false,
};

export async function fetchNotifPrefs(userId: string): Promise<NotifPrefs> {
  const { data } = await supabase
    .from('admin_notification_prefs')
    .select('enabled, categories, include_self')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return DEFAULT_PREFS;
  const row = data as { enabled: boolean; categories: string[] | null; include_self: boolean };
  return {
    enabled: row.enabled,
    categories: (row.categories ?? ALL_CATEGORIES).filter((c): c is NotifCategory =>
      ALL_CATEGORIES.includes(c as NotifCategory)),
    includeSelf: row.include_self,
  };
}

export async function saveNotifPrefs(userId: string, prefs: NotifPrefs): Promise<string | null> {
  const { error } = await supabase.from('admin_notification_prefs').upsert(
    {
      user_id: userId,
      enabled: prefs.enabled,
      categories: prefs.categories,
      include_self: prefs.includeSelf,
    },
    { onConflict: 'user_id' },
  );
  return error?.message ?? null;
}

/** Notification de test pour soi-même : valide la cloche ET le push du poste. */
export async function sendTestNotification(): Promise<string | null> {
  const { error } = await supabase.rpc('admin_notification_test');
  return error?.message ?? null;
}

/** Envoi manuel : la RLS interdit d'insérer pour autrui, on passe par la RPC. */
export async function sendManualNotification(input: {
  title: string;
  body?: string;
  userId?: string;
  path?: string;
  audience: 'USER' | 'ADMINS' | 'SUPER_ADMINS';
}): Promise<string | null> {
  const { error } = await supabase.rpc('admin_send_notification', {
    p_title: input.title,
    p_body: input.body ?? null,
    p_user: input.userId ?? null,
    p_path: input.path ?? null,
    p_audience: input.audience,
  });
  return error?.message ?? null;
}

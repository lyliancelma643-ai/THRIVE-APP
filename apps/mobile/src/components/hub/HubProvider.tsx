import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { mobileTargetForPath } from '../bilan/notificationRoute';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useChildStore } from '../../stores/child.store';

/**
 * État partagé de l'en-tête de l'espace parent (une seule souscription pour les trois onglets) :
 * notifications (20 dernières, temps réel, comme la cloche du web), messages non lus (RPC list_my_conversations)
 * et chargement de la liste des enfants. Rafraîchi au retour au premier plan.
 */
export type HubNotif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

type HubCtx = {
  notifications: HubNotif[];
  unreadNotifications: number;
  unreadMessages: number;
  markRead: (ids: string[]) => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<HubCtx>({
  notifications: [],
  unreadNotifications: 0,
  unreadMessages: 0,
  markRead: async () => {},
  refresh: () => {},
});

export function HubProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const loadChildren = useChildStore((s) => s.loadChildren);
  const [notifications, setNotifications] = useState<HubNotif[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadNotifs = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, data, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as HubNotif[]);
  }, [userId]);

  const loadMessages = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('list_my_conversations', { p_scope: 'mine' });
    if (error) return;
    setUnreadMessages(((data ?? []) as { unread_count?: number }[]).reduce((n, c) => n + (c.unread_count ?? 0), 0));
  }, [userId]);

  const refresh = useCallback(() => {
    void loadNotifs();
    void loadMessages();
  }, [loadNotifs, loadMessages]);

  useEffect(() => {
    if (!userId) return;
    void loadChildren(userId);
    refresh();
    // Temps réel : nouvelle notification, nouvel enfant (ajouté par le parent ou l'admin), nouveau message.
    const ch = supabase
      .channel(`hub-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => loadNotifs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => loadChildren(userId))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages())
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      supabase.removeChannel(ch);
      sub.remove();
    };
  }, [userId, loadChildren, loadNotifs, loadMessages, refresh]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setNotifications((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', ids);
  }, []);

  const value = useMemo<HubCtx>(
    () => ({
      notifications,
      unreadNotifications: notifications.filter((n) => !n.is_read).length,
      unreadMessages,
      markRead,
      refresh,
    }),
    [notifications, unreadMessages, markRead, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHub(): HubCtx {
  return useContext(Ctx);
}

/**
 * Destination d'une notification (copie de `notifTarget` de NotificationsBell.tsx du web) : data.path posé par la
 * base en priorité, sinon déduction par type / sous-type — le toucher est TOUJOURS actif.
 */
export function notifWebPath(n: HubNotif): string {
  const d = (n.data ?? {}) as Record<string, unknown>;
  if (typeof d.path === 'string' && d.path.startsWith('/')) return d.path;
  const focus = (key: string) => `/parent/bilans?${typeof d.child_id === 'string' ? `child=${d.child_id}&` : ''}focus=${key}`;
  switch (n.type) {
    case 'QUESTIONNAIRE_PENDING':
      return typeof d.token === 'string' ? `/q/${d.token}` : '/parent/bilans';
    case 'QUESTIONNAIRE_COMPLETED':
      return focus(d.kind === 'LSSS' ? 'competences' : 'perma');
    case 'REPORT_READY':
      return focus('parcours');
    case 'PROGRESS_UPDATE': {
      if (d.subtype === 'milestone') {
        const s = Number(d.session_number);
        return focus(s >= 13 ? 'certificat' : s >= 7 ? 'competences' : 'programme');
      }
      if (d.subtype === 'thrive_moment') return focus('parcours');
      return focus('programme');
    }
    case 'PROGRAM_UPDATED':
      return d.subtype === 'renewal_window' ? '/parent/upgrade' : '/parent/bilans';
    case 'MESSAGE':
    case 'MESSAGE_RECEIVED':
      return typeof d.conversation_id === 'string' ? `/parent/messages?c=${d.conversation_id}` : '/parent/messages';
    case 'SESSION':
    case 'SESSION_REMINDER':
      return '/parent/my-sessions';
    default:
      return '/parent/bilans';
  }
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';

/** Questionnaires ouverts en ce moment (pour ne pas en empiler deux). */
let questionnaireOpen = false;

/**
 * Ouvre la destination d'une notification : un questionnaire (/q/<jeton>, page publique du web) dans une feuille
 * Safari intégrée à l'app, sinon l'écran de l'app correspondant. Sans destination connue : l'écran des notifications.
 */
export function openNotificationTarget(router: { push: (href: never) => void }, path: string): Promise<void> {
  const q = /^\/q\/([^/?#]+)/.exec(path) ?? /^https?:\/\/[^/]+\/q\/([^/?#]+)/.exec(path);
  if (q) {
    if (questionnaireOpen) return Promise.resolve();
    questionnaireOpen = true;
    return WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/q/${q[1]}`, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'done',
      controlsColor: '#004E7A',
    })
      .then(() => undefined, () => undefined)
      .finally(() => {
        questionnaireOpen = false;
      });
  }
  const t = mobileTargetForPath(path);
  if (t) router.push({ pathname: t.pathname, params: t.params } as never);
  return Promise.resolve();
}

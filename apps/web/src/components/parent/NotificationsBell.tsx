'use client';

// Cloche de notifications du header parent : badge non-lus + panneau déroulant.
// Alimentée par public.notifications (RLS : chacun voit les siennes) et mise à
// jour en temps réel à l'insertion (ex. « Météo du bien-être à compléter »
// envoyée par le coach en fin de séance). Un clic marque lue et navigue vers
// la destination (data.path, sinon routage par type — voir notifTarget).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMenuKeyboard } from '@/hooks/useMenuKeyboard';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { Icon } from '@/components/ui';

type NotifData = {
  path?: string;
  token?: string;
  child_id?: string;
  conversation_id?: string;
  kind?: string;
  subtype?: string;
  session_number?: number | string;
} & Record<string, unknown>;

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: NotifData | null;
  is_read: boolean;
  created_at: string;
};

// Destination du clic : data.path posé par la base (trigger mig. 053) en
// priorité, sinon déduction par type/sous-type — même table de routage que
// private.notification_default_path, pour que le clic soit TOUJOURS actif.
function notifTarget(n: Notif): string {
  const d = n.data ?? {};
  if (typeof d.path === 'string' && d.path.startsWith('/')) return d.path;
  const focus = (key: string) =>
    `/parent/bilans?${typeof d.child_id === 'string' ? `child=${d.child_id}&` : ''}focus=${key}`;
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
      return focus('programme'); // streak & autres jalons d'engagement
    }
    case 'PROGRAM_UPDATED':
      return d.subtype === 'renewal_window' ? '/parent/upgrade' : '/parent/bilans';
    case 'MESSAGE':
    case 'MESSAGE_RECEIVED':
      // Ouvre le BON fil (coach ou support) plutôt que la liste — cf. migration 056.
      return typeof d.conversation_id === 'string'
        ? `/parent/messages?c=${d.conversation_id}`
        : '/parent/messages';
    case 'SESSION':
    case 'SESSION_REMINDER':
      return '/parent/my-sessions';
    default:
      return '/parent/bilans';
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

export function NotificationsBell() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closePanel = useCallback(() => setOpen(false), []);
  useMenuKeyboard(listRef, triggerRef, open, closePanel);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, data, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notif[]);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Temps réel : nouvelle notification → badge immédiat
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, load]);

  // Fermeture au clic hors du panneau
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setItems((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', ids);
  };

  const openNotif = async (n: Notif) => {
    setOpen(false);
    if (!n.is_read) await markRead([n.id]);
    router.push(notifTarget(n));
  };

  if (!user?.id) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={unread ? `Notifications — ${unread} non lue(s)` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="relative nc-iconbtn select-none cursor-pointer"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-navy-900 text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={listRef}
          role="region"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] md:absolute md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-[380px] max-h-[70dvh] overflow-y-auto overscroll-contain rounded-row bg-night-surface ring-1 ring-line shadow-[0_18px_50px_rgba(0,10,20,0.55)] z-popover animate-menu-in origin-top-right"
          style={{ background: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="nc-eyebrow">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markRead(items.filter((n) => !n.is_read).map((n) => n.id))}
                className="min-h-[44px] -my-2 -mr-2 px-2 text-xs text-accent-ink font-semibold cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-faint">Aucune notification pour le moment.</p>
          ) : (
            <ul className="pb-2">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotif(n)}
                    className="w-full text-left px-4 py-3 min-h-[56px] hover:bg-surface-sub transition-colors cursor-pointer"
                  >
                    <span className="flex items-start gap-2.5">
                      {/* Pastille « non lu » : place réservée pour garder l'alignement. */}
                      <span aria-hidden className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? '' : 'bg-accent'}`} />
                      {!n.is_read && <span className="sr-only">Non lue : </span>}
                      <span className="min-w-0">
                        <span className={`block text-sm truncate ${n.is_read ? 'font-medium text-body' : 'font-semibold text-ink'}`}>{n.title}</span>
                        {n.body && (
                          <span className="block text-xs text-soft line-clamp-2">{n.body}</span>
                        )}
                        <span className="block text-[11px] text-faint mt-0.5 tabular-nums">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

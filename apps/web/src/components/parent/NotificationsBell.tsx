'use client';

// Cloche de notifications du header parent : badge non-lus + panneau déroulant.
// Alimentée par public.notifications (RLS : chacun voit les siennes) et mise à
// jour en temps réel à l'insertion (ex. « Météo du bien-être à compléter »
// envoyée par le coach en fin de séance). Un clic ouvre le lien porté par la
// notification (data.path, ex. /q/<token>) et la marque lue.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { path?: string } | null;
  is_read: boolean;
  created_at: string;
};

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
    const path = n.data?.path;
    if (path && path.startsWith('/')) router.push(path);
    else if (n.type === 'QUESTIONNAIRE_COMPLETED') router.push('/parent/bilans');
  };

  if (!user?.id) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={unread ? `Notifications — ${unread} non lue(s)` : 'Notifications'}
        onClick={() => setOpen((o) => !o)}
        className="relative w-11 h-11 rounded-full glass-navy hover:bg-white/10 flex items-center justify-center text-lg text-white/75 hover:text-white transition-colors select-none cursor-pointer"
      >
        ◉
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] md:absolute md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-[360px] max-h-[70vh] overflow-y-auto rounded-2xl glass-navy shadow-[0_18px_50px_rgba(0,10,20,0.55)] z-50"
          style={{ background: 'rgba(3, 26, 40, 0.96)' }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-white/45">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markRead(items.filter((n) => !n.is_read).map((n) => n.id))}
                className="text-[11px] text-sun font-semibold cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-white/50">Aucune notification pour le moment.</p>
          ) : (
            <ul className="pb-2">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotif(n)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer ${
                      n.is_read ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-sun shrink-0" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white truncate">{n.title}</span>
                        {n.body && (
                          <span className="block text-xs text-white/60 line-clamp-2">{n.body}</span>
                        )}
                        <span className="block text-[10px] text-white/35 mt-0.5">
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

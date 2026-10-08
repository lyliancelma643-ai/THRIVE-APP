'use client';

// Cloche du header admin : pastille de non-lus + panneau déroulant.
// Purement présentationnelle — les données viennent du layout (un seul
// abonnement temps réel pour toute la zone admin, cf. useAdminNotifications).
// Un clic marque la notification lue et emmène sur sa destination (data.path,
// posé en base par le distributeur de la migration 060).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { adminNotifTarget, notifEmoji, timeAgo, type Notif } from '@/lib/notifications';
import type { AdminNotifications } from '@/hooks/useAdminNotifications';

type Props = {
  notifications: AdminNotifications;
  /** topbar = barre mobile (panneau plein largeur) ; sidebar = menu de gauche. */
  placement?: 'topbar' | 'sidebar';
  className?: string;
};

export function AdminNotificationsBell({ notifications, placement = 'topbar', className = '' }: Props) {
  const router = useRouter();
  const { items, unread, markRead, markAllRead } = notifications;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const openNotif = async (n: Notif) => {
    setOpen(false);
    if (!n.is_read) await markRead([n.id]);
    router.push(adminNotifTarget(n));
  };

  const panelPosition =
    placement === 'sidebar'
      ? 'fixed left-3 right-3 top-20 lg:absolute lg:inset-auto lg:left-full lg:top-0 lg:ml-3 lg:w-[380px]'
      : 'fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+56px)] sm:absolute sm:inset-auto sm:right-0 sm:left-auto sm:top-[calc(100%+10px)] sm:w-[380px]';

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        aria-label={unread ? `Notifications — ${unread} non lue(s)` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-navy-800 transition-colors cursor-pointer"
      >
        <Icon name="bell" className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${panelPosition} z-50 max-h-[70vh] overflow-y-auto rounded-2xl bg-white text-navy-900 shadow-[0_18px_50px_rgba(2,12,27,0.35)] ring-1 ring-black/5`}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 sticky top-0 bg-white">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-[11px] font-semibold text-navy-600 hover:text-navy-800 cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-gray-400">Aucune notification pour le moment.</p>
          ) : (
            <ul className="pb-1">
              {items.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotif(n)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer ${
                      n.is_read ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="flex items-start gap-2.5">
                      <span className="text-base leading-5 shrink-0" aria-hidden>{notifEmoji(n)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{n.title}</span>
                        {n.body && <span className="block text-xs text-gray-500 line-clamp-2">{n.body}</span>}
                        <span className="block text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-sun shrink-0" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 px-4 py-2.5 sticky bottom-0 bg-white">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-navy-600 hover:text-navy-800"
            >
              Tout voir et régler mes alertes →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

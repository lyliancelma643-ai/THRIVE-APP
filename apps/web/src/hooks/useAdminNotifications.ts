'use client';

// Source unique des notifications de l'administrateur connecté : la cloche du
// header, la pastille du menu et la page /admin/notifications lisent toutes
// ce hook. Temps réel sur public.notifications (RLS : chacun voit les siennes)
// + rafraîchissement au retour sur l'onglet, pour qu'un évènement reçu pendant
// la mise en veille n'échappe pas au compteur.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  Notif,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/lib/notifications';

export type AdminNotifications = {
  items: Notif[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
};

// channelKey : deux instances du hook (header + page) ne doivent pas rejoindre
// le MÊME topic temps réel sur la même connexion — Phoenix refuse le doublon.
export function useAdminNotifications(
  userId: string | undefined,
  limit = 50,
  channelKey = 'header',
): AdminNotifications {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setItems(await fetchMyNotifications(userId, limit));
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`admin-notifs-${channelKey}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, channelKey]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    // Optimiste : la pastille tombe tout de suite, le temps réel confirmera.
    setItems((xs) => xs.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await markNotificationsRead(ids);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setItems((xs) => xs.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(userId);
  }, [userId]);

  return {
    items,
    unread: items.filter((n) => !n.is_read).length,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabaseClient as supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 'MESSAGE' | 'SESSION' | 'BADGE' | 'PROGRAM' | 'SYSTEM';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenerRef = useRef<Notifications.Subscription | null>(null);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    const notifs = data ?? [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as AppNotification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    listenerRef.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      console.log('[THRIVE] Notification tap:', data);
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (listenerRef.current) listenerRef.current.remove();
    };
  }, [fetch]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    setNotifications((prev) =>
      prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase.from('notifications').delete().eq('id', notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetch,
  };
}

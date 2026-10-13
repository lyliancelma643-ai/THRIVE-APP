import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
// Import par sous-chemin : useNotifications dépend d'Expo, exclu de l'index partagé
import { useNotifications, type AppNotification } from '@thrive/shared/hooks/useNotifications';
import { OfflineState } from '../../components/OfflineState';
import { NotificationsView, type NotifItem } from '../../components/bilan/NotificationsView';
import { mobileTargetForPath } from '../../components/bilan/notificationRoute';

// V — Notifications du parent, groupées (Aujourd'hui · Cette semaine · Plus tôt). Un toucher marque la notification
// comme lue puis mène à la bonne page / carte (data.path du serveur, ?focus=…) ; appui long = supprimer.
// Rangée « Notifications push » : reflète le réglage du système (le changer ouvre les réglages de l'appareil).

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [push, setPush] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    Notifications.getPermissionsAsync()
      .then((p) => alive && setPush(p.status === 'granted'))
      .catch(() => alive && setPush(null));
    return () => {
      alive = false;
    };
  }, []);

  const open = (n: NotifItem) => {
    const full = notifications.find((x) => x.id === n.id) as AppNotification | undefined;
    if (!n.is_read) markAsRead(n.id);
    const target = mobileTargetForPath(full?.data?.path);
    if (target) router.push({ pathname: target.pathname, params: target.params } as never);
  };

  if (isLoading) return <ActivityIndicator accessibilityLabel="Chargement des notifications" style={{ marginTop: 96 }} />;
  if (error && notifications.length === 0) return <OfflineState onRetry={refetch} />;

  return (
    <NotificationsView
      items={notifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, created_at: n.created_at, is_read: n.is_read }))}
      unreadCount={unreadCount}
      pushEnabled={push}
      onTogglePush={() => Linking.openSettings()}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'))}
      onReadAll={markAllAsRead}
      onOpen={open}
      onDelete={(n) => deleteNotification(n.id)}
      onRefresh={refetch}
    />
  );
}

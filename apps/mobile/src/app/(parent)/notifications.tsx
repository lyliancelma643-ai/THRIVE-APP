import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Import par sous-chemin : useNotifications dépend d'Expo, exclu de l'index partagé
import { useNotifications, type AppNotification } from '@thrive/shared/hooks/useNotifications';
import { OfflineState } from '../../components/OfflineState';
import { GlassButton, SPACING, ThemedText, useTheme } from '../../design';
import { ScreenScaffold } from '../../components/bilan/ScreenScaffold';
import { dayLabel, groupByDay } from '../../components/bilan/bilanData';
import { mobileTargetForPath } from '../../components/bilan/notificationRoute';

// V — Notifications du parent, groupées par jour. Un toucher marque la notification
// comme lue puis mène à la bonne page / carte (data.path du serveur, ?focus=…) ;
// appui long = supprimer.

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  MESSAGE: 'chatbubble-ellipses',
  SESSION: 'calendar',
  BADGE: 'ribbon',
  PROGRAM: 'sparkles',
  SYSTEM: 'notifications',
};

export default function ParentNotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const open = (n: AppNotification) => {
    if (!n.is_read) markAsRead(n.id);
    const target = mobileTargetForPath(n.data?.path);
    if (target) router.push({ pathname: target.pathname, params: target.params } as never);
  };

  const hour = (s: string) => new Date(s).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

  const renderNotif = (n: AppNotification, last: boolean) => (
    <Pressable
      key={n.id}
      onPress={() => open(n)}
      onLongPress={() => deleteNotification(n.id)}
      accessibilityRole="button"
      accessibilityLabel={`${n.is_read ? '' : 'Non lue : '}${n.title}`}
      accessibilityHint="Appuyez pour ouvrir, appui long pour supprimer"
      style={{
        minHeight: SPACING.rowMin, flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.space3,
        paddingHorizontal: SPACING.space4, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.separator,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={TYPE_ICON[n.type] ?? TYPE_ICON.SYSTEM} size={18} color={colors.label2} />
      </View>
      <View style={{ flex: 1, marginHorizontal: SPACING.space3 }}>
        <ThemedText variant="subheadline" numberOfLines={1} style={{ fontWeight: n.is_read ? '400' : '700' }}>{n.title}</ThemedText>
        {n.body ? <ThemedText variant="footnote" color="label2" numberOfLines={2}>{n.body}</ThemedText> : null}
      </View>
      <ThemedText variant="caption1" color="label2">{hour(n.created_at)}</ThemedText>
      {!n.is_read && <View accessibilityElementsHidden style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tint, marginLeft: SPACING.space2 }} />}
    </Pressable>
  );

  return (
    <ScreenScaffold
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined}
      header={
        unreadCount > 0 ? (
          <View style={{ marginTop: SPACING.space3, alignItems: 'flex-start' }}>
            <GlassButton label="Tout lire" accessibilityLabel="Tout marquer comme lu" onPress={markAllAsRead} />
          </View>
        ) : null
      }
    >
      {isLoading ? (
        <ActivityIndicator accessibilityLabel="Chargement des notifications" />
      ) : error && notifications.length === 0 ? (
        <OfflineState onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SPACING.space8 }}>
          <Ionicons name="notifications-outline" size={44} color={colors.label2} />
          <ThemedText variant="headline" style={{ marginTop: SPACING.space3 }}>Aucune notification</ThemedText>
          <ThemedText variant="subheadline" color="label2">Vous êtes à jour.</ThemedText>
        </View>
      ) : (
        groupByDay(notifications).map((g) => (
          <View key={g.day} style={{ marginBottom: SPACING.space4 }}>
            <ThemedText variant="footnote" color="label2" accessibilityRole="header" style={{ marginBottom: SPACING.space2, marginLeft: SPACING.space2, textTransform: 'capitalize' }}>
              {dayLabel(g.day)}
            </ThemedText>
            <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: 16, overflow: 'hidden' }}>
              {g.items.map((n, i) => renderNotif(n, i === g.items.length - 1))}
            </View>
          </View>
        ))
      )}
    </ScreenScaffold>
  );
}

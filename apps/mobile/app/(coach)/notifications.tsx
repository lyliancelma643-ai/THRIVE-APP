import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNotifications, type AppNotification } from '@thrive/shared/src/hooks/useNotifications';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  MESSAGE: { icon: '💬', color: '#3B82F6' },
  SESSION: { icon: '📅', color: '#10B981' },
  BADGE: { icon: '🏅', color: '#F59E0B' },
  PROGRAM: { icon: '🏆', color: '#8B5CF6' },
  SYSTEM: { icon: '🔔', color: '#6B7280' },
};

export default function NotificationsScreen() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'maintenant';
    if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  };

  const renderNotif = (notif: AppNotification) => {
    const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.SYSTEM;
    return (
      <TouchableOpacity
        key={notif.id}
        style={[styles.row, !notif.is_read && styles.rowUnread]}
        onPress={() => markAsRead(notif.id)}
        onLongPress={() => deleteNotification(notif.id)}
      >
        <View style={[styles.iconWrap, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, !notif.is_read && styles.titleBold]} numberOfLines={1}>
              {notif.title}
            </Text>
            <Text style={styles.time}>{formatTime(notif.created_at)}</Text>
          </View>
          {notif.body && (
            <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
          )}
        </View>
        {!notif.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={markAllAsRead}>
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🔔</Text>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySub}>Vous êtes à jour !</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {notifications.filter((n) => !n.is_read).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Non lues</Text>
              {notifications.filter((n) => !n.is_read).map(renderNotif)}
            </>
          )}
          {notifications.filter((n) => n.is_read).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Lues</Text>
              {notifications.filter((n) => n.is_read).map(renderNotif)}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#fff', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  unreadLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  readAllBtn: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  readAllText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  rowUnread: { backgroundColor: '#FFFBEB' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  titleBold: { fontWeight: '700', color: '#111' },
  time: { fontSize: 11, color: '#9CA3AF' },
  body: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
});

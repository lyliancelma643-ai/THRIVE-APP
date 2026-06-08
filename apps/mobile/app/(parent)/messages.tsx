import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@thrive/shared';

export default function ParentMessagesScreen() {
  const router = useRouter();
  const { conversations, isLoading, refetch } = useConversations();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'maintenant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  };

  const getInitials = (f: string, l: string) => `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes messages</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.emptySub}>Votre coach vous contactera ici</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.row, conv.unread_count > 0 && styles.rowUnread]}
              onPress={() => router.push(
                `/(parent)/chat/${conv.id}?receiverId=${conv.other.id}&name=${conv.other.first_name} ${conv.other.last_name}`
              )}
            >
              <View style={[styles.avatar, conv.unread_count > 0 && styles.avatarUnread]}>
                <Text style={styles.avatarText}>{getInitials(conv.other.first_name, conv.other.last_name)}</Text>
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, conv.unread_count > 0 && styles.nameBold]}>
                    {conv.other.first_name} {conv.other.last_name}
                  </Text>
                  <Text style={styles.time}>{formatTime(conv.last_message_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.lastMsg, conv.unread_count > 0 && styles.lastMsgBold]} numberOfLines={1}>
                    {conv.last_message ?? 'Nouvelle conversation'}
                  </Text>
                  {conv.unread_count > 0 && (
                    <View style={styles.dot}>
                      <Text style={styles.dotText}>{conv.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 28, fontWeight: '700' },
  unreadBadge: { backgroundColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowUnread: { backgroundColor: '#FFFBEB' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarUnread: { backgroundColor: '#000' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontWeight: '500', fontSize: 15, color: '#374151' },
  nameBold: { fontWeight: '700', color: '#111' },
  time: { fontSize: 12, color: '#9CA3AF' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: '#9CA3AF', flex: 1, marginRight: 8 },
  lastMsgBold: { color: '#374151', fontWeight: '600' },
  dot: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

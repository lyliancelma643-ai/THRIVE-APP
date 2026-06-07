import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@thrive/shared';

export default function CoachInboxScreen() {
  const router = useRouter();
  const { conversations, isLoading, refetch } = useConversations();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = conversations.filter((c) => {
    const name = `${c.other.first_name} ${c.other.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'maintenant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages 💬</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une conversation..."
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text style={styles.emptyText}>
            {search ? 'Aucun résultat' : 'Aucun message'}
          </Text>
          <Text style={styles.emptySubtext}>
            {!search && 'Les conversations avec les familles apparaîtront ici'}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filtered.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={styles.row}
              onPress={() => router.push(`/(coach)/chat/${conv.id}?receiverId=${conv.participant_1 === conv.other.id ? conv.participant_1 : conv.participant_2}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(conv.other.first_name, conv.other.last_name)}
                </Text>
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{conv.other.first_name} {conv.other.last_name}</Text>
                  <Text style={styles.time}>{formatTime(conv.last_message_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {conv.last_message ?? 'Nouvelle conversation'}
                  </Text>
                  {conv.unread_count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{conv.unread_count}</Text>
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
  header: { backgroundColor: '#fff', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { fontSize: 14, marginRight: 6, color: '#9CA3AF' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontWeight: '700', fontSize: 15, color: '#111' },
  time: { fontSize: 12, color: '#9CA3AF' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: '#6B7280', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#000', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

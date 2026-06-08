import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChildBadges, useBadges } from '@thrive/shared';

export default function ChildBadgesScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { childBadges, isLoading } = useChildBadges(childId);
  const { badges: allBadges, isLoading: badgesLoading } = useBadges();
  const [tab, setTab] = useState<'earned' | 'all'>('earned');

  const earnedIds = new Set(childBadges.map((cb) => cb.badge_id));

  if (isLoading || badgesLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges 🏅</Text>
        <Text style={styles.subtitle}>{childBadges.length} badge{childBadges.length > 1 ? 's' : ''} obtenus</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'earned' && styles.tabActive]}
          onPress={() => setTab('earned')}
        >
          <Text style={[styles.tabText, tab === 'earned' && styles.tabTextActive]}>Obtenus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>Tous les badges</Text>
        </TouchableOpacity>
      </View>

      {tab === 'earned' ? (
        childBadges.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🌟</Text>
            <Text style={styles.emptyText}>Aucun badge encore</Text>
            <Text style={styles.emptySubtext}>Continue ta progression pour débloquer des badges !</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {childBadges.map((cb) => (
              <View key={cb.id} style={[styles.badgeCard, { borderColor: cb.badge?.color ?? '#FFD700' }]}>
                <Text style={styles.badgeIcon}>{cb.badge?.icon ?? '🏅'}</Text>
                <Text style={styles.badgeName}>{cb.badge?.name}</Text>
                <Text style={styles.badgeDate}>
                  {new Date(cb.earned_at).toLocaleDateString('fr-CA')}
                </Text>
              </View>
            ))}
          </View>
        )
      ) : (
        <View style={styles.grid}>
          {allBadges.map((badge) => {
            const owned = earnedIds.has(badge.id);
            return (
              <View key={badge.id} style={[styles.badgeCard, !owned && styles.badgeCardLocked, { borderColor: owned ? badge.color : '#E5E7EB' }]}>
                <Text style={[styles.badgeIcon, !owned && { opacity: 0.3 }]}>{badge.icon}</Text>
                <Text style={[styles.badgeName, !owned && { color: '#9CA3AF' }]}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
                {owned && <Text style={styles.ownedBadge}>✅ Obtenu</Text>}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontWeight: '600', color: '#9CA3AF', fontSize: 14 },
  tabTextActive: { color: '#000' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  badgeCard: { width: '45%', margin: '2.5%', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2 },
  badgeCardLocked: { backgroundColor: '#F9FAFB' },
  badgeIcon: { fontSize: 36, marginBottom: 8 },
  badgeName: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: '#111' },
  badgeDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  badgeDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  ownedBadge: { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 6 },
});

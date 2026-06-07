import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAnalytics } from '@thrive/shared';

export default function CoachAnalyticsScreen() {
  const { coachPerformance, childProgress, monthlyActivity, isLoading } = useAnalytics();
  const [tab, setTab] = useState<'sessions' | 'children'>('sessions');

  const totalCompleted = childProgress.reduce((s, c) => s + c.completed_sessions, 0);
  const totalBadges = childProgress.reduce((s, c) => s + c.badges_count, 0);
  const lastMonths = monthlyActivity.slice(-3);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes rapports 📊</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* KPIs personnels */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{totalCompleted}</Text>
              <Text style={styles.kpiLabel}>Séances complétées</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{childProgress.length}</Text>
              <Text style={styles.kpiLabel}>Enfants suivis</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{totalBadges}</Text>
              <Text style={styles.kpiLabel}>Badges attribués</Text>
            </View>
          </View>

          {/* Activité 3 derniers mois */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            {lastMonths.map((m) => (
              <View key={m.month} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{m.month}</Text>
                <View style={styles.monthStats}>
                  <Text style={styles.monthStat}>📅 {m.sessions} séances</Text>
                  <Text style={styles.monthStat}>💬 {m.messages} messages</Text>
                  <Text style={styles.monthStat}>🏅 {m.badges} badges</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Onglets */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'sessions' && styles.tabActive]}
              onPress={() => setTab('sessions')}
            >
              <Text style={[styles.tabText, tab === 'sessions' && styles.tabTextActive]}>Séances</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'children' && styles.tabActive]}
              onPress={() => setTab('children')}
            >
              <Text style={[styles.tabText, tab === 'children' && styles.tabTextActive]}>Enfants</Text>
            </TouchableOpacity>
          </View>

          {/* Liste enfants */}
          {tab === 'children' && childProgress.map((child) => (
            <View key={child.child_id} style={styles.childRow}>
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{child.first_name[0]}</Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.first_name} {child.last_name}</Text>
                <Text style={styles.childSub}>
                  {child.completed_sessions}/{child.total_sessions} séances · {child.badges_count} badges
                </Text>
              </View>
              {/* Barre progression */}
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${child.total_sessions > 0 ? Math.round(child.completed_sessions / child.total_sessions * 100) : 0}%` as any },
                    ]}
                  />
                </View>
                <Text style={styles.progressPct}>
                  {child.total_sessions > 0 ? Math.round(child.completed_sessions / child.total_sessions * 100) : 0}%
                </Text>
              </View>
            </View>
          ))}

          {/* Liste séances par mois */}
          {tab === 'sessions' && monthlyActivity.map((m) => (
            <View key={m.month} style={styles.childRow}>
              <View style={[styles.childAvatar, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.childAvatarText, { color: '#374151' }]}>
                  {m.month.slice(5, 7)}
                </Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{m.month}</Text>
                <Text style={styles.childSub}>{m.sessions} séances · {m.badges} badges</Text>
              </View>
              <Text style={styles.sessionCount}>{m.sessions}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 28, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', padding: 16, gap: 10 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#111' },
  kpiLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  monthRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  monthLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  monthStats: { flexDirection: 'row', gap: 12 },
  monthStat: { fontSize: 12, color: '#6B7280' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#111', fontWeight: '700' },
  childRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  childAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  childInfo: { flex: 1 },
  childName: { fontWeight: '600', fontSize: 14, color: '#111' },
  childSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack: { width: 60, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  progressPct: { fontSize: 11, color: '#6B7280', width: 28 },
  sessionCount: { fontSize: 18, fontWeight: '700', color: '#111' },
});

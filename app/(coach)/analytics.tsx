import React, { useState } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator,
  SafeAreaView, StyleSheet, TouchableOpacity,
} from 'react-native'
import { useAuth } from '../../packages/shared/src/hooks/useAuth'
import { useAnalytics } from '../../packages/shared/src/hooks/useAnalytics'

export default function CoachAnalyticsScreen() {
  const { user } = useAuth()
  const { kpis, monthlyActivity, childProgress, loading, error, refresh } = useAnalytics()

  const myProgress = childProgress.filter((cp) => cp.coach_name === user?.user_metadata?.full_name)

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 80 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes Statistiques</Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>↻ Actualiser</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* KPIs rapides */}
        <View style={styles.kpiGrid}>
          {[
            { label: 'Séances totales', value: kpis?.total_sessions ?? 0, color: '#6366F1' },
            { label: 'Séances complétées', value: kpis?.completed_sessions ?? 0, color: '#10B981' },
            { label: 'Taux complétion', value: `${kpis?.completion_rate_pct ?? 0}%`, color: '#F59E0B' },
            { label: 'Badges attribués', value: kpis?.total_badges_awarded ?? 0, color: '#EC4899' },
          ].map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, { borderTopColor: kpi.color }]}>
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Activité mensuelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activité (3 derniers mois)</Text>
          {monthlyActivity.slice(-3).map((m) => (
            <View key={m.month} style={styles.activityRow}>
              <Text style={styles.activityMonth}>
                {new Date(m.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.activityStats}>
                <Text style={styles.activityStat}>📅 {m.sessions_count} séances</Text>
                <Text style={styles.activityStat}>🏅 {m.badges_awarded} badges</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Progression enfants */}
        {myProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progression de mes enfants</Text>
            {myProgress.map((child) => (
              <View key={child.child_id} style={styles.childCard}>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.first_name} {child.last_name}</Text>
                  <Text style={styles.childMeta}>{child.age} ans • {child.total_badges} 🏅</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${child.total_sessions > 0
                          ? Math.min(100, (child.completed_sessions / child.total_sessions) * 100)
                          : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPct}>
                  {child.total_sessions > 0
                    ? Math.round((child.completed_sessions / child.total_sessions) * 100)
                    : 0}% ({child.completed_sessions}/{child.total_sessions})
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  refreshBtn: { padding: 8 },
  refreshText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },
  errorBanner: { margin: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontSize: 13, color: '#EF4444' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  kpiCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  kpiValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  activityRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  activityMonth: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, textTransform: 'capitalize' },
  activityStats: { flexDirection: 'row', gap: 16 },
  activityStat: { fontSize: 13, color: '#6B7280' },
  childCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  childInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  childName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  childMeta: { fontSize: 13, color: '#6B7280' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  progressPct: { fontSize: 12, color: '#6B7280', textAlign: 'right' },
})

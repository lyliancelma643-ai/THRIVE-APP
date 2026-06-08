import React from 'react'
import {
  View, Text, FlatList, Switch, ActivityIndicator,
  SafeAreaView, StyleSheet,
} from 'react-native'
import { useAuth } from '../../packages/shared/src/hooks/useAuth'
import { useNotifications, type NotificationLog } from '../../packages/shared/src/hooks/useNotifications'

const TYPE_LABELS: Record<string, string> = {
  message: '💬 Message',
  badge: '🏅 Badge',
  session: '📅 Séance',
  manual: '📢 Info',
}

export default function ParentNotificationsScreen() {
  const { user } = useAuth()
  const { notifications, prefs, loading, updatePrefs } = useNotifications(user?.id || '')

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Restez informé de la progression</Text>
      </View>

      <View style={styles.prefsCard}>
        <Text style={styles.prefsTitle}>Mes préférences</Text>
        {([
          { key: 'messages', label: '💬 Messages', desc: 'Messages de votre coach' },
          { key: 'badges', label: '🏅 Badges', desc: 'Badges obtenus par votre enfant' },
          { key: 'sessions', label: '📅 Séances', desc: 'Rappels de séances' },
        ] as const).map(({ key, label, desc }) => (
          <View key={key} style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Text style={styles.prefDesc}>{desc}</Text>
            </View>
            <Switch
              value={prefs[key]}
              onValueChange={(val) => updatePrefs({ [key]: val })}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={prefs[key] ? '#10B981' : '#9CA3AF'}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Historique</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>Aucune notification pour le moment</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: { item: NotificationLog }) => (
            <View style={styles.notifCard}>
              <View style={styles.notifRow}>
                <Text style={styles.notifType}>{TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.notifDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  prefsCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  prefsTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  prefInfo: { flex: 1, marginRight: 12 },
  prefLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  prefDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', paddingHorizontal: 16, paddingBottom: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6B7280' },
  notifCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  notifType: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  notifDate: { fontSize: 11, color: '#9CA3AF' },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
})

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarClock, ChevronRight, FileText,
  MessageCircle, Play, Star, TrendingUp,
} from 'lucide-react-native';

const CHILDREN = [
  { id: '1', name: 'Emma', age: 12, progress: 7, totalSessions: 13, score: 82, lastSession: 'Lundi' },
  { id: '2', name: 'Lucas', age: 14, progress: 3, totalSessions: 13, score: 68, lastSession: 'Mercredi' },
];

const NEXT_SESSION = {
  child: 'Emma',
  date: 'Jeudi 12 juin',
  time: '16h00',
  coach: 'Coach Sarah',
  type: 'Séance 1:1',
};

export default function ParentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, Marie 👋</Text>
          <Text style={styles.headerSub}>Espace parent</Text>
        </View>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => router.push('/(parent)/messages')}
        >
          <MessageCircle color="#c5a059" size={22} />
          <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Prochaine séance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochaine séance 1:1</Text>
          <View style={styles.nextSessionCard}>
            <View style={styles.nextSessionLeft}>
              <CalendarClock color="#c5a059" size={20} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.nextSessionChild}>{NEXT_SESSION.child}</Text>
                <Text style={styles.nextSessionDate}>{NEXT_SESSION.date} · {NEXT_SESSION.time}</Text>
                <Text style={styles.nextSessionCoach}>{NEXT_SESSION.coach}</Text>
              </View>
            </View>
            <View style={styles.nextSessionBadge}>
              <Text style={styles.nextSessionBadgeText}>{NEXT_SESSION.type}</Text>
            </View>
          </View>
        </View>

        {/* Mes enfants */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Mes enfants</Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/children')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {CHILDREN.map(child => (
            <TouchableOpacity
              key={child.id}
              style={styles.childCard}
              onPress={() => router.push({ pathname: '/(parent)/child-detail', params: { id: child.id } })}
              activeOpacity={0.8}
            >
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{child.name[0]}</Text>
              </View>
              <View style={styles.childInfo}>
                <View style={styles.childTop}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childAge}>{child.age} ans</Text>
                </View>
                {/* Barre de progression */}
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(child.progress / child.totalSessions) * 100}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>
                    {child.progress}/{child.totalSessions} séances
                  </Text>
                </View>
                <View style={styles.childBottom}>
                  <View style={styles.scorePill}>
                    <Star color="#c5a059" size={11} />
                    <Text style={styles.scoreText}>Score {child.score}</Text>
                  </View>
                  <Text style={styles.lastSession}>Dernière : {child.lastSession}</Text>
                </View>
              </View>
              <ChevronRight color="#cfd5e5" size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Accès rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapides</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(parent)/reports')}
            >
              <FileText color="#5aa8c5" size={22} />
              <Text style={styles.quickLabel}>Bilans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(parent)/sessions-20min')}
            >
              <Play color="#5ac57a" size={22} />
              <Text style={styles.quickLabel}>Séances 20 min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(parent)/program')}
            >
              <TrendingUp color="#c5a059" size={22} />
              <Text style={styles.quickLabel}>Programme</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(parent)/messages')}
            >
              <MessageCircle color="#c5997a" size={22} />
              <Text style={styles.quickLabel}>Messages</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const C = {
  bg: '#1b263b',
  surface: '#151c2b',
  elevated: '#1f2d42',
  accent: '#c5a059',
  blue: '#5aa8c5',
  green: '#5ac57a',
  textPrimary: '#ffffff',
  textMuted: '#cfd5e5',
  textFaint: '#7a8aaa',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.surface,
  },
  greeting: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  headerSub: { color: C.blue, fontSize: 13, marginTop: 2 },
  msgBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#e05252', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: C.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  seeAll: { color: C.accent, fontSize: 13 },
  // Next session
  nextSessionCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.accent + '33',
  },
  nextSessionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nextSessionChild: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  nextSessionDate: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  nextSessionCoach: { color: C.textFaint, fontSize: 12, marginTop: 2 },
  nextSessionBadge: { backgroundColor: C.accent + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  nextSessionBadgeText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  // Child card
  childCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: C.elevated,
  },
  childAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent + '33', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  childAvatarText: { color: C.accent, fontSize: 18, fontWeight: '800' },
  childInfo: { flex: 1 },
  childTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  childName: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  childAge: { color: C.textFaint, fontSize: 13 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  progressTrack: { flex: 1, height: 5, backgroundColor: C.elevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  progressLabel: { color: C.textFaint, fontSize: 11 },
  childBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  scoreText: { color: C.accent, fontSize: 11, fontWeight: '600' },
  lastSession: { color: C.textFaint, fontSize: 11 },
  // Quick grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: 14,
    padding: 18, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.elevated,
  },
  quickLabel: { color: C.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

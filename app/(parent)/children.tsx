import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Search, Star, Award } from 'lucide-react-native';

const CHILDREN = [
  { id: '1', name: 'Emma', age: 12, progress: 7, totalSessions: 13, score: 82, pack: 'Performance', lastSession: 'Lun 2 juin', coach: 'Coach Sarah' },
  { id: '2', name: 'Lucas', age: 14, progress: 3, totalSessions: 13, score: 68, pack: 'Découverte', lastSession: 'Mer 4 juin', coach: 'Coach Alex' },
];

const C = {
  bg: '#1b263b', surface: '#151c2b', elevated: '#1f2d42',
  accent: '#c5a059', blue: '#5aa8c5',
  textPrimary: '#ffffff', textMuted: '#cfd5e5', textFaint: '#7a8aaa',
};

export default function ChildrenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = CHILDREN.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes enfants</Text>
        <Text style={styles.sub}>{CHILDREN.length} enfant{CHILDREN.length > 1 ? 's' : ''} suivi{CHILDREN.length > 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchRow}>
        <Search color={C.textFaint} size={16} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={C.textFaint}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {filtered.map(child => (
          <TouchableOpacity
            key={child.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/(parent)/child-detail', params: { id: child.id } })}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{child.name[0]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.name}>{child.name}</Text>
                <Text style={styles.meta}>{child.age} ans · {child.coach}</Text>
                <View style={styles.packBadge}>
                  <Award color={C.accent} size={11} />
                  <Text style={styles.packText}>{child.pack}</Text>
                </View>
              </View>
              <ChevronRight color={C.textFaint} size={18} />
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(child.progress / child.totalSessions) * 100}%` as any }]} />
              </View>
              <Text style={styles.progressLabel}>{child.progress}/{child.totalSessions} séances</Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.scorePill}>
                <Star color={C.accent} size={11} />
                <Text style={styles.scoreText}>Score global {child.score}/100</Text>
              </View>
              <Text style={styles.lastSession}>Dernière : {child.lastSession}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.surface },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '800' },
  sub: { color: C.textFaint, fontSize: 13, marginTop: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, marginHorizontal: 20, marginVertical: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.elevated,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.accent + '33', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.accent, fontSize: 20, fontWeight: '800' },
  name: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  meta: { color: C.textFaint, fontSize: 12, marginTop: 2 },
  packBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent + '18', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    marginTop: 5, alignSelf: 'flex-start',
  },
  packText: { color: C.accent, fontSize: 11, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: C.elevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  progressLabel: { color: C.textFaint, fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accent + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  scoreText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  lastSession: { color: C.textFaint, fontSize: 12 },
});

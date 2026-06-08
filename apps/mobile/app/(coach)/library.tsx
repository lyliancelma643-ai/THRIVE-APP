import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';

type ContentType = 'article' | 'video' | 'conseil';
type ContentCategory = 'nutrition' | 'entrainement' | 'mental' | 'recuperation' | 'parents' | 'technique';

interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  category: ContentCategory;
  type: ContentType;
  read_time_minutes: number;
  views: number;
  pinned: boolean;
  created_at: string;
}

const MOCK_ITEMS: ContentItem[] = [
  { id: '1', title: 'Optimiser la récupération après l\'effort', excerpt: 'Les meilleures stratégies pour récupérer rapidement après une séance intense.', category: 'recuperation', type: 'article', read_time_minutes: 5, views: 142, pinned: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '2', title: 'Nutrition pré-entraînement', excerpt: 'Quoi manger et quand avant une séance pour maximiser vos performances.', category: 'nutrition', type: 'conseil', read_time_minutes: 3, views: 89, pinned: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '3', title: 'Technique de course à pied', excerpt: 'Analyse biomécanique de la foulée et exercices correctifs.', category: 'technique', type: 'video', read_time_minutes: 8, views: 55, pinned: false, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: '4', title: 'Gestion du stress pré-compétition', excerpt: 'Techniques mentales éprouvées pour rester calme sous pression.', category: 'mental', type: 'article', read_time_minutes: 4, views: 67, pinned: false, created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
];

const CATEGORIES = [
  { value: 'all', label: 'Tout', emoji: '📚' },
  { value: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { value: 'entrainement', label: 'Training', emoji: '🏋️' },
  { value: 'mental', label: 'Mental', emoji: '🧠' },
  { value: 'recuperation', label: 'Récup', emoji: '😴' },
  { value: 'technique', label: 'Technique', emoji: '🎯' },
];

const TYPE_CONFIG: Record<ContentType, { label: string; color: string; bg: string; icon: string }> = {
  article: { label: 'Article', color: '#93c5fd', bg: 'rgba(59,130,246,0.15)', icon: '📰' },
  video: { label: 'Vidéo', color: '#fcd34d', bg: 'rgba(245,158,11,0.15)', icon: '🎥' },
  conseil: { label: 'Conseil', color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)', icon: '💡' },
};

export default function CoachLibrary() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const filtered = MOCK_ITEMS.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (selectedItem) {
    return (
      <View style={styles.container}>
        <View style={styles.readerHeader}>
          <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.backBtn}>
            <Text style={styles.backIcon}>← Retour</Text>
          </TouchableOpacity>
          <View style={[styles.typePill, { backgroundColor: TYPE_CONFIG[selectedItem.type].bg }]}>
            <Text style={[styles.typePillText, { color: TYPE_CONFIG[selectedItem.type].color }]}>
              {TYPE_CONFIG[selectedItem.type].icon} {TYPE_CONFIG[selectedItem.type].label}
            </Text>
          </View>
        </View>
        <ScrollView style={styles.reader} contentContainerStyle={styles.readerContent}>
          <Text style={styles.readerTitle}>{selectedItem.title}</Text>
          <View style={styles.readerMeta}>
            <Text style={styles.readerMetaText}>⏱ {selectedItem.read_time_minutes} min de lecture</Text>
            <Text style={styles.readerMetaText}>👁 {selectedItem.views} vues</Text>
          </View>
          <View style={styles.readerDivider} />
          <Text style={styles.readerExcerpt}>{selectedItem.excerpt}</Text>
          <Text style={styles.readerBody}>
            {/* Placeholder pour le contenu complet */}
            Ce contenu sera chargé depuis la base de données Supabase lors de la consultation.{`\n\n`}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.{`\n\n`}
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothèque</Text>
        <Text style={styles.subtitle}>{MOCK_ITEMS.length} ressources disponibles</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher une ressource..."
          placeholderTextColor="#4b5563"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              activeCategory === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => setActiveCategory(cat.value)}
          >
            <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === cat.value && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Aucune ressource trouvée</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)} activeOpacity={0.75}>
            {item.pinned && (
              <View style={styles.pinnedBar}>
                <Text style={styles.pinnedText}>📌 Épinglé</Text>
              </View>
            )}
            <View style={styles.cardTop}>
              <View style={[styles.typePill, { backgroundColor: TYPE_CONFIG[item.type].bg }]}>
                <Text style={[styles.typePillText, { color: TYPE_CONFIG[item.type].color }]}>
                  {TYPE_CONFIG[item.type].icon} {TYPE_CONFIG[item.type].label}
                </Text>
              </View>
              <Text style={styles.cardMeta}>⏱ {item.read_time_minutes} min</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardExcerpt} numberOfLines={2}>{item.excerpt}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.cardViews}>👁 {item.views}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  categoriesScroll: { flexGrow: 0 },
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12, flexDirection: 'row' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  categoryChipActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1' },
  categoryChipEmoji: { fontSize: 14 },
  categoryChipText: { color: '#94a3b8', fontSize: 13 },
  categoryChipTextActive: { color: '#a5b4fc', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#475569', fontSize: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  pinnedBar: { backgroundColor: 'rgba(99,102,241,0.12)', marginHorizontal: -16, marginTop: -16, marginBottom: 12, padding: '6px 16px' as any, paddingHorizontal: 16, paddingVertical: 6 },
  pinnedText: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typePillText: { fontSize: 12, fontWeight: '600' },
  cardMeta: { color: '#475569', fontSize: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginBottom: 6, lineHeight: 22 },
  cardExcerpt: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { color: '#334155', fontSize: 12 },
  cardViews: { color: '#334155', fontSize: 12 },
  readerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { paddingVertical: 8 },
  backIcon: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  reader: { flex: 1 },
  readerContent: { padding: 24 },
  readerTitle: { fontSize: 22, fontWeight: '700', color: '#f8fafc', lineHeight: 30, marginBottom: 12 },
  readerMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  readerMetaText: { color: '#475569', fontSize: 13 },
  readerDivider: { height: 1, backgroundColor: '#1e293b', marginBottom: 20 },
  readerExcerpt: { color: '#94a3b8', fontSize: 16, fontStyle: 'italic', lineHeight: 24, marginBottom: 20 },
  readerBody: { color: '#cbd5e1', fontSize: 15, lineHeight: 26 },
});

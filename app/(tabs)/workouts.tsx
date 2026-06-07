import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { SessionCard } from '../../components/SessionCard';
import { Search } from 'lucide-react-native';

const CATEGORIES = ["Force", "Vitesse", "Endurance", "Mobilité", "Récupération"];
const DURATIONS = ["-10 min", "10-20 min", "20-30 min"];
const LEVELS = ["Débutant", "Intermédiaire", "Avancé"];

const MOCK_SESSIONS = Array.from({ length: 12 }).map((_, i) => ({
  id: `lib-${i}`,
  title: `Séance ${i + 1}`,
  duration: 15 + (i % 3) * 5,
  level: LEVELS[i % 3],
  type: CATEGORIES[i % 5],
  thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&w=800&q=80`
}));

export default function WorkoutsScreen() {
  const { width } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState<string>("Force");
  const numColumns = width > 1024 ? 4 : width > 768 ? 3 : 2;

  return (
    <View className="flex-1 bg-primary-background">
      <GlobalHeader />
      <ScrollView className="flex-1" stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-6 pt-10 pb-6">
          <Text className="text-white font-display text-4xl font-bold mb-2">Toutes les séances</Text>
          <Text className="text-text-muted text-base mb-6">Filtre par type, durée, niveau.</Text>
          
          <View className="flex-row items-center bg-surface-elevated rounded-full px-4 py-3 border border-surface-highlight">
            <Search color="#8f9779" size={20} />
            <TextInput 
              placeholder="Rechercher une séance..."
              placeholderTextColor="#8f9779"
              className="flex-1 ml-3 text-white font-body text-base"
            />
          </View>
        </View>

        {/* Filters Sticky Row */}
        <View className="bg-primary-background/95 py-3 border-b border-surface-elevated z-10">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
            {CATEGORIES.map(cat => (
              <Pressable 
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full ${activeCategory === cat ? 'bg-primary-accent' : 'bg-content-background border border-surface-highlight'}`}
              >
                <Text className={`font-semibold text-sm ${activeCategory === cat ? 'text-primary-background' : 'text-text-muted'}`}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Grid */}
        <View className="px-6 pt-6 flex-row flex-wrap justify-between">
          {MOCK_SESSIONS.filter(s => s.type === activeCategory || activeCategory === '').map(session => (
            <View key={session.id} style={{ width: `${100 / numColumns}%`, padding: 8 }}>
              <SessionCard {...session} />
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

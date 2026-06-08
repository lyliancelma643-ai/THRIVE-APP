import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp, FileText, Play, BookOpen } from 'lucide-react-native';

const TABS = ['Progrès', 'Séances 13', 'Séances 20 min', 'Journal'] as const;
type Tab = typeof TABS[number];

const SKILL_SCORES = [
  { label: 'Confiance', score: 78, color: '#c5a059' },
  { label: 'Émotions', score: 65, color: '#6c8ebf' },
  { label: 'Demande aide', score: 54, color: '#8f9779' },
  { label: 'Leadership', score: 82, color: '#e8a87c' },
];

const SESSIONS_13 = [
  { number: 1, title: 'Bilan initial', date: '10 mai', status: 'completed' },
  { number: 2, title: 'Confiance en soi', date: '17 mai', status: 'completed' },
  { number: 3, title: 'Régulation émotions', date: '24 mai', status: 'completed' },
  { number: 4, title: 'Leadership', date: '11 juin', status: 'planned' },
  { number: 5, title: 'Communication', date: '18 juin', status: 'planned' },
];

export default function ChildDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('Progrès');

  const childName = id === '1' ? 'Emma' : 'Lucas';
  const avatarColor = id === '1' ? '#c5a059' : '#6c8ebf';

  return (
    <View className="flex-1 bg-primary-background">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Mes enfants</Text>
        </Pressable>
        <View className="flex-row items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: avatarColor + '33' }}
          >
            <Text className="font-display text-3xl font-bold" style={{ color: avatarColor }}>
              {childName[0]}
            </Text>
          </View>
          <View>
            <Text className="text-white font-display text-2xl font-bold">{childName}</Text>
            <Text className="text-text-muted text-sm">{id === '1' ? '12-14 ans · Pack AVANCÉ' : '8-11 ans · Pack ESSENTIAL'}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-surface-elevated">
        <View className="flex-row px-4">
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="px-4 py-3 mr-2"
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-primary-accent' : 'text-text-muted'
                }`}
              >
                {tab}
              </Text>
              {activeTab === tab && (
                <View className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary-accent rounded-full" />
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>

        {activeTab === 'Progrès' && (
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-4">Scores par compétence</Text>
            {SKILL_SCORES.map((skill) => (
              <View key={skill.label} className="mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold">{skill.label}</Text>
                  <Text style={{ color: skill.color }} className="font-bold">{skill.score} / 100</Text>
                </View>
                <View className="h-3 bg-surface-elevated rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${skill.score}%`, backgroundColor: skill.color }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Séances 13' && (
          <View>
            {SESSIONS_13.map((s) => (
              <Pressable
                key={s.number}
                onPress={() => s.status === 'completed' && router.push({ pathname: '/(parent)/report-detail', params: { id: `r${s.number}` } })}
                className={`flex-row items-center p-4 rounded-2xl mb-3 ${
                  s.status === 'completed' ? 'bg-surface-elevated' : 'bg-surface-elevated/50'
                }`}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-4"
                  style={{
                    backgroundColor: s.status === 'completed' ? '#c5a05933' : '#1e2a3a',
                  }}
                >
                  {s.status === 'completed' ? (
                    <FileText color="#c5a059" size={18} />
                  ) : (
                    <Text className="text-text-muted text-xs font-bold">S{s.number}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${
                    s.status === 'completed' ? 'text-white' : 'text-text-muted'
                  }`}>
                    Séance {s.number} — {s.title}
                  </Text>
                  <Text className="text-text-muted text-xs">{s.date}</Text>
                </View>
                {s.status === 'completed' && (
                  <View className="px-2 py-1 rounded-full bg-success/20">
                    <Text className="text-success text-xs font-bold">Bilan dispo</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === 'Séances 20 min' && (
          <View>
            <Pressable
              onPress={() => router.push('/(parent)/sessions-20min')}
              className="bg-primary-accent/10 border border-primary-accent/30 rounded-2xl p-5 items-center mb-4"
            >
              <Play color="#c5a059" size={32} className="mb-2" />
              <Text className="text-white font-display text-lg font-bold mb-1">Lancer une séance 20 min</Text>
              <Text className="text-text-muted text-sm text-center">Choisissez une séance adaptée à l'âge et aux objectifs d'Emma.</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'Journal' && (
          <View>
            {[{ date: '05 juin', type: 'Séance 1:1', title: 'Régulation émotionnelle', icon: FileText }, { date: '28 mai', type: 'Séance 20 min', title: 'Confiance — Pack confiance', icon: Play }].map((entry, i) => (
              <View key={i} className="flex-row mb-4">
                <View className="w-px bg-surface-highlight mx-5 mt-2" />
                <View className="bg-surface-elevated rounded-2xl p-4 flex-1 -ml-px">
                  <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-1">{entry.type}</Text>
                  <Text className="text-white font-semibold text-base">{entry.title}</Text>
                  <Text className="text-text-muted text-xs mt-1">{entry.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

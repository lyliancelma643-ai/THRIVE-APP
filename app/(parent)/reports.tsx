import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, TrendingUp, Lock } from 'lucide-react-native';

type Report = {
  id: string;
  childName: string;
  sessionNumber: number;
  sessionTitle: string;
  date: string;
  score: number;
  detailLevel: 1 | 2 | 3;
  isNew: boolean;
};

const MOCK_REPORTS: Report[] = [
  { id: 'r3', childName: 'Emma', sessionNumber: 3, sessionTitle: 'Régulation émotionnelle', date: '05 juin 2026', score: 78, detailLevel: 2, isNew: true },
  { id: 'r2', childName: 'Emma', sessionNumber: 2, sessionTitle: 'Confiance en soi', date: '24 mai 2026', score: 71, detailLevel: 2, isNew: false },
  { id: 'r1', childName: 'Emma', sessionNumber: 1, sessionTitle: 'Bilan initial', date: '10 mai 2026', score: 65, detailLevel: 2, isNew: false },
  { id: 'r0', childName: 'Lucas', sessionNumber: 1, sessionTitle: 'Bilan initial', date: '01 juin 2026', score: 58, detailLevel: 1, isNew: false },
];

const DETAIL_LABEL: Record<number, string> = { 1: 'Essential', 2: 'Avancé', 3: 'Performance' };

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'tous' | 'emma' | 'lucas'>('tous');

  const filtered = MOCK_REPORTS.filter((r) =>
    filter === 'tous' || r.childName.toLowerCase() === filter
  );

  return (
    <View className="flex-1 bg-primary-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Accueil</Text>
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold">Bilans</Text>
        <Text className="text-text-muted text-sm">Rapports de chaque séance 1:1</Text>
      </View>

      {/* Filtres */}
      <View className="flex-row px-6 py-3 gap-x-2 border-b border-surface-elevated">
        {(['tous', 'emma', 'lucas'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={`px-4 py-2 rounded-full ${
              filter === f ? 'bg-primary-accent' : 'bg-surface-elevated'
            }`}
          >
            <Text className={`text-sm font-semibold capitalize ${
              filter === f ? 'text-surface-background' : 'text-text-muted'
            }`}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {filtered.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => router.push({ pathname: '/(parent)/report-detail', params: { id: report.id } })}
            className="bg-surface-elevated rounded-2xl p-5 mb-4 active:bg-surface-highlight"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-3">
                <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest">
                  {report.childName} · Séance {report.sessionNumber}
                </Text>
                <Text className="text-white font-display text-lg font-bold mt-1">{report.sessionTitle}</Text>
                <Text className="text-text-muted text-xs">{report.date}</Text>
              </View>
              {report.isNew && (
                <View className="bg-primary-accent px-2 py-1 rounded-full">
                  <Text className="text-surface-background text-xs font-bold">Nouveau</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <TrendingUp color="#c5a059" size={16} />
                <Text className="text-primary-accent text-sm ml-2">{report.score} / 100</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-text-muted text-xs mr-2">Niveau {DETAIL_LABEL[report.detailLevel]}</Text>
                <ChevronRight color="#8f9779" size={18} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

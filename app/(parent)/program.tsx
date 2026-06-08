import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Calendar } from 'lucide-react-native';

type ProgramSession = {
  number: number;
  title: string;
  scheduledAt: string;
  status: 'completed' | 'planned' | 'cancelled';
  hasReport: boolean;
};

const SESSIONS: ProgramSession[] = [
  { number: 1, title: 'Bilan initial & objectifs', scheduledAt: '10 mai 2026', status: 'completed', hasReport: true },
  { number: 2, title: 'Confiance en soi', scheduledAt: '17 mai 2026', status: 'completed', hasReport: true },
  { number: 3, title: 'Régulation émotionnelle', scheduledAt: '24 mai 2026', status: 'completed', hasReport: true },
  { number: 4, title: 'Leadership & prise de décision', scheduledAt: '11 juin 2026', status: 'planned', hasReport: false },
  { number: 5, title: 'Communication', scheduledAt: '18 juin 2026', status: 'planned', hasReport: false },
  { number: 6, title: 'Gestion de l\'échec', scheduledAt: '25 juin 2026', status: 'planned', hasReport: false },
  { number: 7, title: 'Bilan intermédiaire (S7)', scheduledAt: '02 juil. 2026', status: 'planned', hasReport: false },
  { number: 8, title: 'Demande d\'aide', scheduledAt: '09 juil. 2026', status: 'planned', hasReport: false },
  { number: 9, title: 'Motivation intrinsèque', scheduledAt: '16 juil. 2026', status: 'planned', hasReport: false },
  { number: 10, title: 'Gestion pression', scheduledAt: '23 juil. 2026', status: 'planned', hasReport: false },
  { number: 11, title: 'Relations coéquipiers', scheduledAt: '30 juil. 2026', status: 'planned', hasReport: false },
  { number: 12, title: 'Transfert vie quotidienne', scheduledAt: '06 août 2026', status: 'planned', hasReport: false },
  { number: 13, title: 'Bilan final & célébration', scheduledAt: '13 août 2026', status: 'planned', hasReport: false },
];

export default function ProgramScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const done = SESSIONS.filter((s) => s.status === 'completed').length;

  return (
    <View className="flex-1 bg-primary-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Accueil</Text>
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold">Programme 13 séances</Text>
        <Text className="text-text-muted text-sm">Emma · Pack AVANCÉ · Coach Sarah</Text>
      </View>

      {/* Barre de progression */}
      <View className="px-6 py-4 border-b border-surface-elevated">
        <View className="flex-row justify-between mb-2">
          <Text className="text-text-muted text-sm">{done} / 13 séances complétées</Text>
          <Text className="text-primary-accent text-sm font-bold">{Math.round((done / 13) * 100)}%</Text>
        </View>
        <View className="h-3 bg-surface-elevated rounded-full overflow-hidden">
          <View
            className="h-full bg-primary-accent rounded-full"
            style={{ width: `${(done / 13) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {SESSIONS.map((s, i) => (
          <View key={s.number} className="flex-row">
            {/* Timeline */}
            <View className="items-center mr-4">
              {s.status === 'completed' ? (
                <CheckCircle2 color="#c5a059" size={24} fill="#c5a05922" />
              ) : (
                <Circle color={i === done ? '#6c8ebf' : '#2e3a4e'} size={24} />
              )}
              {i < SESSIONS.length - 1 && (
                <View className={`w-0.5 flex-1 mt-1 mb-1 min-h-[32px] ${
                  s.status === 'completed' ? 'bg-primary-accent/40' : 'bg-surface-elevated'
                }`} />
              )}
            </View>

            {/* Carte */}
            <Pressable
              onPress={() => s.hasReport && router.push({ pathname: '/(parent)/report-detail', params: { id: `r${s.number}` } })}
              className={`flex-1 rounded-2xl p-4 mb-2 ${
                s.status === 'completed'
                  ? 'bg-surface-elevated'
                  : i === done
                  ? 'border border-blue-400/30 bg-blue-950/20'
                  : 'bg-surface-elevated/30'
              }`}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest">S{s.number}</Text>
                  <Text className={`font-display text-base font-bold mt-0.5 ${
                    s.status === 'completed' ? 'text-white' : i === done ? 'text-blue-300' : 'text-text-muted'
                  }`}>{s.title}</Text>
                  <View className="flex-row items-center mt-1">
                    <Calendar color="#8f9779" size={12} />
                    <Text className="text-text-muted text-xs ml-1">{s.scheduledAt}</Text>
                  </View>
                </View>
                {s.hasReport && <ChevronRight color="#8f9779" size={18} />}
                {i === done && !s.hasReport && (
                  <View className="bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded-full">
                    <Text className="text-blue-300 text-xs font-bold">Prochaine</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

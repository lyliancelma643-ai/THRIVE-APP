import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Heart, Home, MessageCircle } from 'lucide-react-native';

export default function ReportDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Mock data unique pour ce bilan
  const report = {
    childName: 'Emma',
    sessionNumber: 3,
    sessionTitle: 'Régulation émotionnelle',
    date: '05 juin 2026',
    coach: 'Sarah Moreau',
    lifeSkill: 'Régulation émotionnelle',
    score: 78,
    rpe: 7,
    performanceSummary:
      'Emma a démontré une capacité remarquable à identifier ses émotions avant et pendant l'effort. Elle a su utiliser les outils de respiration proposés lors des moments de tension.',
    forces: ['Gestion du stress pre-compétition', 'Communication avec l\'entraîneur', 'Régulation par la respiration'],
    homeRecommendations:
      'Pratiquer 2 minutes de respiration carrée chaque soir avant de dormir. Tenir un petit journal des émotions après chaque entraînement.',
    coachMessage:
      'Emma a fait un travail remarquable aujourd'hui. Sa progression sur la régulation émotionnelle est réelle et mesurable. Elle est sur une très belle trajectoire !',
    transferNotes: 'Applicable à la gestion du stress scolaire et dans les relations avec les pairs.',
  };

  return (
    <View className="flex-1 bg-primary-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Bilans</Text>
        </Pressable>
        <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest">
          {report.childName} · Séance {report.sessionNumber}
        </Text>
        <Text className="text-white font-display text-2xl font-bold mt-1">{report.sessionTitle}</Text>
        <Text className="text-text-muted text-sm">{report.date} · Coach {report.coach}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>

        {/* Score + RPE */}
        <View className="flex-row gap-x-3 mb-6">
          <View className="flex-1 bg-surface-elevated rounded-2xl p-4 items-center">
            <Text className="text-text-muted text-xs uppercase tracking-widest mb-2">Score global</Text>
            <Text className="text-primary-accent font-display text-4xl font-bold">{report.score}</Text>
            <Text className="text-text-muted text-xs">/ 100</Text>
          </View>
          <View className="flex-1 bg-surface-elevated rounded-2xl p-4 items-center">
            <Text className="text-text-muted text-xs uppercase tracking-widest mb-2">Effort perçu</Text>
            <Text className="text-white font-display text-4xl font-bold">{report.rpe}</Text>
            <Text className="text-text-muted text-xs">/ 10</Text>
          </View>
        </View>

        {/* Résumé */}
        <Section title="Résumé de la séance" icon={Star}>
          <Text className="text-text-muted leading-relaxed">{report.performanceSummary}</Text>
        </Section>

        {/* Forces */}
        <Section title="Forces identifiées" icon={Heart}>
          {report.forces.map((f, i) => (
            <View key={i} className="flex-row items-center mb-2">
              <View className="w-2 h-2 rounded-full bg-primary-accent mr-3" />
              <Text className="text-white font-semibold">{f}</Text>
            </View>
          ))}
        </Section>

        {/* Message du coach */}
        <Section title="Message du coach" icon={MessageCircle}>
          <View className="bg-primary-accent/10 border-l-4 border-primary-accent rounded-r-xl p-4">
            <Text className="text-white italic leading-relaxed">"{report.coachMessage}"</Text>
            <Text className="text-primary-accent text-sm font-semibold mt-2">— Coach {report.coach}</Text>
          </View>
        </Section>

        {/* Recommandations */}
        <Section title="À pratiquer à la maison" icon={Home}>
          <Text className="text-text-muted leading-relaxed">{report.homeRecommendations}</Text>
          <Text className="text-text-muted text-xs mt-3 italic">{report.transferNotes}</Text>
        </Section>

      </ScrollView>
    </View>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View className="bg-surface-elevated rounded-2xl p-5 mb-4">
      <View className="flex-row items-center mb-3">
        <Icon color="#c5a059" size={18} />
        <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest ml-2">{title}</Text>
      </View>
      {children}
    </View>
  );
}

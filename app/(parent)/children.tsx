import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, ChevronRight, TrendingUp } from 'lucide-react-native';

type Child = {
  id: string;
  firstName: string;
  birthDate: string;
  ageGroup: '8-11' | '12-14' | '15-17';
  globalScore: number;
  pack: string;
  sessionsDone: number;
  sessionsTotal: number;
  avatarColor: string;
};

const MOCK_CHILDREN: Child[] = [
  {
    id: '1',
    firstName: 'Emma',
    birthDate: '2012-03-14',
    ageGroup: '12-14',
    globalScore: 72,
    pack: 'AVANCÉ',
    sessionsDone: 3,
    sessionsTotal: 13,
    avatarColor: '#c5a059',
  },
  {
    id: '2',
    firstName: 'Lucas',
    birthDate: '2016-07-22',
    ageGroup: '8-11',
    globalScore: 58,
    pack: 'ESSENTIAL',
    sessionsDone: 1,
    sessionsTotal: 13,
    avatarColor: '#6c8ebf',
  },
];

const PACK_COLOR: Record<string, string> = {
  ESSENTIAL: '#8f9779',
  AVANCÉ: '#c5a059',
  PERFORMANCE: '#e8a87c',
};

export default function ChildrenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-primary-background">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 flex-row items-center border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mr-4">
          <ChevronLeft color="#c5a059" size={28} />
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold flex-1">Mes enfants</Text>
        <Pressable
          onPress={() => router.push('/(parent)/add-child')}
          className="w-9 h-9 rounded-full bg-primary-accent items-center justify-center"
        >
          <Plus color="#1b263b" size={20} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {MOCK_CHILDREN.map((child) => (
          <Pressable
            key={child.id}
            onPress={() => router.push({ pathname: '/(parent)/child-detail', params: { id: child.id } })}
            className="bg-surface-elevated rounded-2xl p-5 mb-4 active:bg-surface-highlight"
          >
            <View className="flex-row items-center mb-4">
              {/* Avatar */}
              <View
                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: child.avatarColor + '33' }}
              >
                <Text className="font-display text-2xl font-bold" style={{ color: child.avatarColor }}>
                  {child.firstName[0]}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-display text-xl font-bold">{child.firstName}</Text>
                <Text className="text-text-muted text-sm">{child.ageGroup} ans</Text>
              </View>
              {/* Pack badge */}
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: (PACK_COLOR[child.pack] ?? '#8f9779') + '22' }}
              >
                <Text className="text-xs font-bold" style={{ color: PACK_COLOR[child.pack] ?? '#8f9779' }}>
                  {child.pack}
                </Text>
              </View>
            </View>

            {/* Progression séances */}
            <View className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-muted text-xs">Programme 13 séances</Text>
                <Text className="text-text-muted text-xs">{child.sessionsDone} / {child.sessionsTotal}</Text>
              </View>
              <View className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-primary-accent"
                  style={{ width: `${(child.sessionsDone / child.sessionsTotal) * 100}%` }}
                />
              </View>
            </View>

            {/* Score global */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <TrendingUp color="#c5a059" size={16} />
                <Text className="text-primary-accent text-sm ml-2">Score global : {child.globalScore} / 100</Text>
              </View>
              <ChevronRight color="#8f9779" size={20} />
            </View>
          </Pressable>
        ))}

        {/* CTA Ajouter enfant */}
        <Pressable
          onPress={() => router.push('/(parent)/add-child')}
          className="border border-dashed border-surface-highlight rounded-2xl p-5 items-center"
        >
          <Plus color="#8f9779" size={28} className="mb-2" />
          <Text className="text-text-muted font-semibold text-base">Ajouter un enfant</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

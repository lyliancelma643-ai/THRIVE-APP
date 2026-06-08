import React from 'react';
import { ScrollView, View, Text, Pressable, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronRight, Play, Calendar, MessageCircle, TrendingUp } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Child = {
  id: string;
  firstName: string;
  ageGroup: string;
  globalScore: number;
  avatarColor: string;
};

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_CHILDREN: Child[] = [
  { id: '1', firstName: 'Emma', ageGroup: '12-14', globalScore: 72, avatarColor: '#c5a059' },
  { id: '2', firstName: 'Lucas', ageGroup: '8-11', globalScore: 58, avatarColor: '#6c8ebf' },
];

export default function ParentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-primary-background">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 pb-4 flex-row justify-between items-center border-b border-surface-elevated"
      >
        <View>
          <Text className="text-text-muted text-sm font-body">Bonjour,</Text>
          <Text className="text-white font-display text-2xl font-bold">Espace Parent</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(parent)/messages')}
          className="w-10 h-10 rounded-full bg-surface-elevated items-center justify-center"
        >
          <Bell color="#c5a059" size={20} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Prochaine séance 1:1 */}
        <View className="mx-6 mt-6">
          <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Prochaine séance 1:1</Text>
          <Pressable
            onPress={() => router.push('/(parent)/program')}
            className="bg-surface-elevated rounded-2xl overflow-hidden"
          >
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1551958219-acbc595d3a50?auto=format&fit=crop&w=800&q=80' }}
              className="h-36"
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(27,38,59,0.95)']}
                className="flex-1 justify-end p-4"
              >
                <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-1">Séance 4 / 13</Text>
                <Text className="text-white font-display text-lg font-bold">Confiance & Leadership</Text>
                <Text className="text-text-muted text-sm">Mercredi 11 juin · 16h00 · Coach Sarah</Text>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        </View>

        {/* Mes enfants */}
        <View className="mx-6 mt-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-display text-xl font-bold">Mes enfants</Text>
            <Pressable onPress={() => router.push('/(parent)/children')}>
              <Text className="text-primary-accent text-sm font-semibold">Voir tout</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-x-3">
            {MOCK_CHILDREN.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => router.push({ pathname: '/(parent)/child-detail', params: { id: child.id } })}
                className="flex-1 bg-surface-elevated rounded-2xl p-4 items-center"
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: child.avatarColor + '33' }}
                >
                  <Text className="font-display text-2xl font-bold" style={{ color: child.avatarColor }}>
                    {child.firstName[0]}
                  </Text>
                </View>
                <Text className="text-white font-semibold text-base">{child.firstName}</Text>
                <Text className="text-text-muted text-xs mb-3">{child.ageGroup} ans</Text>
                {/* Jauge globale */}
                <View className="w-full h-2 bg-surface-highlight rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${child.globalScore}%`, backgroundColor: child.avatarColor }}
                  />
                </View>
                <Text className="text-text-muted text-xs mt-1">{child.globalScore} / 100</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Dernier bilan */}
        <View className="mx-6 mt-8">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-display text-xl font-bold">Dernier bilan</Text>
            <Pressable onPress={() => router.push('/(parent)/reports')}>
              <Text className="text-primary-accent text-sm font-semibold">Tous les bilans</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/(parent)/report-detail', params: { id: 'r1' } })}
            className="bg-surface-elevated rounded-2xl p-4"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest">Emma · Séance 3</Text>
              <Text className="text-text-muted text-xs">05 juin 2026</Text>
            </View>
            <Text className="text-white font-semibold text-base mb-1">Régulation émotionnelle</Text>
            <Text className="text-text-muted text-sm mb-3" numberOfLines={2}>
              Emma a montré une belle progression dans la gestion du stress avant compétition.
            </Text>
            <View className="flex-row items-center">
              <TrendingUp color="#c5a059" size={16} />
              <Text className="text-primary-accent text-sm ml-2">Score : 78 / 100</Text>
              <ChevronRight color="#8f9779" size={16} className="ml-auto" />
            </View>
          </Pressable>
        </View>

        {/* Accès rapide */}
        <View className="mx-6 mt-8">
          <Text className="text-white font-display text-xl font-bold mb-3">Accès rapide</Text>
          <View className="flex-row gap-x-3">
            <QuickAction
              icon={Play}
              label="Séance 20 min"
              color="#c5a059"
              onPress={() => router.push('/(parent)/sessions-20min')}
            />
            <QuickAction
              icon={Calendar}
              label="Programme"
              color="#6c8ebf"
              onPress={() => router.push('/(parent)/program')}
            />
            <QuickAction
              icon={MessageCircle}
              label="Messages"
              color="#8f9779"
              onPress={() => router.push('/(parent)/messages')}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function QuickAction({ icon: Icon, label, color, onPress }: {
  icon: any; label: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-surface-elevated rounded-2xl p-4 items-center gap-y-2 active:bg-surface-highlight"
    >
      <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: color + '22' }}>
        <Icon color={color} size={20} />
      </View>
      <Text className="text-white text-xs font-semibold text-center">{label}</Text>
    </Pressable>
  );
}

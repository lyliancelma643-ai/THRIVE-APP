import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Play, Clock, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Session = {
  id: string;
  title: string;
  theme: string;
  ageGroup: string;
  duration: number;
  thumbnailUrl: string;
  isLocked: boolean;
};

const THEMES = ['Tous', 'Confiance', 'Émotions', 'Leadership', 'Communication', 'Aide'] as const;

const MOCK_SESSIONS: Session[] = [
  { id: 's1', title: 'Confiance avant la compétition', theme: 'Confiance', ageGroup: '12-14', duration: 18, thumbnailUrl: 'https://images.unsplash.com/photo-1551958219-acbc595d3a50?auto=format&fit=crop&w=800&q=80', isLocked: false },
  { id: 's2', title: 'Gérer ses émotions sous pression', theme: 'Émotions', ageGroup: '12-14', duration: 20, thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80', isLocked: false },
  { id: 's3', title: 'Prendre sa place dans l\'équipe', theme: 'Leadership', ageGroup: '12-14', duration: 15, thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80', isLocked: false },
  { id: 's4', title: 'Demander de l\'aide', theme: 'Aide', ageGroup: '8-11', duration: 12, thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', isLocked: true },
  { id: 's5', title: 'Communiquer avec son entraîneur', theme: 'Communication', ageGroup: '12-14', duration: 20, thumbnailUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80', isLocked: true },
];

export default function Sessions20MinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTheme, setActiveTheme] = useState<string>('Tous');

  const filtered = activeTheme === 'Tous'
    ? MOCK_SESSIONS
    : MOCK_SESSIONS.filter((s) => s.theme === activeTheme);

  return (
    <View className="flex-1 bg-primary-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Accueil</Text>
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold">Séances 20 minutes</Text>
        <Text className="text-text-muted text-sm">Séances interactives parent–enfant</Text>
      </View>

      {/* Filtres thèmes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-surface-elevated">
        <View className="flex-row px-4 py-3 gap-x-2">
          {THEMES.map((theme) => (
            <Pressable
              key={theme}
              onPress={() => setActiveTheme(theme)}
              className={`px-4 py-2 rounded-full ${
                activeTheme === theme ? 'bg-primary-accent' : 'bg-surface-elevated'
              }`}
            >
              <Text className={`text-sm font-semibold ${
                activeTheme === theme ? 'text-surface-background' : 'text-text-muted'
              }`}>{theme}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {filtered.map((session) => (
          <Pressable
            key={session.id}
            onPress={() => !session.isLocked && router.push({ pathname: '/player/[id]', params: { id: session.id } })}
            className="rounded-2xl overflow-hidden mb-4"
          >
            <ImageBackground
              source={{ uri: session.thumbnailUrl }}
              className="h-48"
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(27,38,59,0.1)', 'rgba(27,38,59,0.92)']}
                className="flex-1 justify-between p-4"
              >
                {/* Badge thème */}
                <View className="flex-row justify-between items-start">
                  <View className="bg-primary-accent/20 border border-primary-accent/40 px-3 py-1 rounded-full">
                    <Text className="text-primary-accent text-xs font-bold">{session.theme}</Text>
                  </View>
                  {session.isLocked ? (
                    <View className="bg-surface-elevated/80 px-3 py-1 rounded-full flex-row items-center">
                      <Lock color="#8f9779" size={12} />
                      <Text className="text-text-muted text-xs ml-1">Premium</Text>
                    </View>
                  ) : null}
                </View>

                {/* Info bas */}
                <View className="flex-row justify-between items-end">
                  <View className="flex-1 pr-4">
                    <Text className="text-text-muted text-xs mb-1">{session.ageGroup} ans</Text>
                    <Text className="text-white font-display text-lg font-bold">{session.title}</Text>
                    <View className="flex-row items-center mt-1">
                      <Clock color="#8f9779" size={12} />
                      <Text className="text-text-muted text-xs ml-1">{session.duration} min</Text>
                    </View>
                  </View>
                  {!session.isLocked && (
                    <View className="w-12 h-12 rounded-full bg-primary-accent items-center justify-center">
                      <Play color="#1b263b" size={20} fill="#1b263b" />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

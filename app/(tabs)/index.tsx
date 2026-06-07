import React from 'react';
import { ScrollView, View, Text, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { SessionCard } from '../../components/SessionCard';
import { Button } from '../../components/Button';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const MOCK_SESSIONS = [
    { id: '1', title: 'Cardio HIIT', duration: 20, level: 'Intermédiaire', type: 'Endurance', thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80' },
    { id: '2', title: 'Force Explosive', duration: 30, level: 'Avancé', type: 'Force', thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80' },
    { id: '3', title: 'Mobilité Active', duration: 15, level: 'Débutant', type: 'Mobilité', thumbnailUrl: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80' },
  ];

  return (
    <View className="flex-1 bg-primary-background">
      <GlobalHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View className="h-[45vh] lg:h-[55vh] relative w-full bg-surface-elevated">
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1600&q=80' }}
            className="flex-1"
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(27, 38, 59, 0.4)', 'rgba(27, 38, 59, 1)']}
              className="absolute inset-0 justify-between p-6 pt-12"
            >
              <View className="flex-row justify-between items-start mt-8">
                <Text className="text-white font-display text-2xl font-bold tracking-wider">THRIVE</Text>
                <Text className="text-text-muted font-body text-sm">Bonjour Lylian</Text>
              </View>

              <View className="flex-row justify-between items-end mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-primary-accent font-semibold text-sm mb-2 uppercase tracking-widest">Reprendre ta séance</Text>
                  <Text className="text-white font-display text-3xl font-bold mb-2">Force Bas du Corps</Text>
                  <Text className="text-text-muted text-sm">15 min restantes • Avancé • Coach Alex</Text>
                </View>
                <Button 
                  icon={Play}
                  label="Reprendre"
                  onPress={() => router.push('/player/hero-session')}
                />
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Content Sections */}
        <View className="px-6 pt-8 gap-y-10">
          
          {/* Program Section */}
          <View>
            <View className="flex-row justify-between items-end mb-4">
              <View>
                <Text className="text-white font-display text-2xl font-bold mb-1">Programme 13 séances</Text>
                <Text className="text-text-muted">Poursuis ton parcours structuré.</Text>
              </View>
              <Button variant="text_link" label="Voir le programme" onPress={() => router.push('/program')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              <SessionCard {...MOCK_SESSIONS[0]} isProgram />
              <SessionCard {...MOCK_SESSIONS[1]} isProgram />
            </ScrollView>
          </View>

          {/* Recommended Section */}
          <View>
            <View className="mb-4">
              <Text className="text-white font-display text-2xl font-bold mb-1">Recommandé pour toi</Text>
              <Text className="text-text-muted">Basé sur tes séances récentes.</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {MOCK_SESSIONS.map(session => (
                <SessionCard key={`rec-${session.id}`} {...session} />
              ))}
            </ScrollView>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

import React from 'react';
import { View, Text, ScrollView, ImageBackground, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, X, Clock, Flame, Dumbbell } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-primary-background">
      <ScrollView className="flex-1" bounces={false}>
        
        {/* Header Image */}
        <View className="h-96 relative w-full bg-surface-elevated">
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80' }}
            className="flex-1"
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(27, 38, 59, 0.2)', 'rgba(27, 38, 59, 1)']}
              className="absolute inset-0 justify-end p-6"
            >
              <Text className="text-white font-display text-4xl font-bold mb-2">Cardio HIIT {id}</Text>
              <Text className="text-text-muted text-base">Séance Intense • 20 min • Coach Sarah</Text>
            </LinearGradient>
            
            {/* Close Button */}
            <Pressable 
              onPress={() => router.back()}
              style={{ top: insets.top || 16 }}
              className="absolute right-4 w-10 h-10 rounded-full bg-black/40 items-center justify-center backdrop-blur-md"
            >
              <X color="#ffffff" size={24} />
            </Pressable>
          </ImageBackground>
        </View>

        {/* Content */}
        <View className="px-6 py-8">
          
          <View className="flex-row items-center gap-4 mb-8">
            <Button 
              label="C'est parti" 
              icon={Play}
              onPress={() => router.push(`/player/${id}`)}
              className="flex-1"
            />
            <Button 
              label="Aperçu"
              variant="secondary"
              onPress={() => {}}
            />
          </View>

          <Text className="text-text-muted text-base leading-relaxed mb-8">
            Entraînement par intervalles à haute intensité conçu pour booster votre métabolisme et améliorer votre endurance cardiovasculaire. Cette séance sollicitera tout votre corps sans nécessiter de matériel.
          </Text>

          <View className="flex-row justify-between mb-10 bg-surface-elevated p-4 rounded-2xl border border-surface-highlight/30">
            <View className="items-center flex-1 border-r border-surface-highlight/50">
              <Clock color="#c5a059" size={24} className="mb-2" />
              <Text className="text-white font-semibold">20 min</Text>
              <Text className="text-text-muted text-xs uppercase tracking-wider">Durée</Text>
            </View>
            <View className="items-center flex-1 border-r border-surface-highlight/50">
              <Flame color="#ff4b4b" size={24} className="mb-2" />
              <Text className="text-white font-semibold">Haute</Text>
              <Text className="text-text-muted text-xs uppercase tracking-wider">Intensité</Text>
            </View>
            <View className="items-center flex-1">
              <Dumbbell color="#8f9779" size={24} className="mb-2" />
              <Text className="text-white font-semibold">Aucun</Text>
              <Text className="text-text-muted text-xs uppercase tracking-wider">Matériel</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SessionCardProps {
  id: string;
  title: string;
  duration: number; // in minutes
  level: string;
  type: string;
  thumbnailUrl?: string;
  isProgram?: boolean;
}

export function SessionCard({ id, title, duration, level, type, thumbnailUrl, isProgram }: SessionCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/session/${id}`);
  };

  return (
    <Pressable 
      onPress={handlePress}
      className="rounded-2xl overflow-hidden bg-surface-elevated w-72 mr-4"
    >
      {({ pressed }) => (
        <View className={`transform transition-transform ${pressed ? 'scale-95 opacity-90' : 'scale-100'}`}>
          <View className="aspect-video relative bg-content-background">
            {thumbnailUrl ? (
              <Image 
                source={{ uri: thumbnailUrl }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              // Placeholder if no image
              <View className="w-full h-full items-center justify-center bg-content-background opacity-50" />
            )}
            
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              className="absolute inset-0 justify-end p-3"
            >
              <View className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded-md">
                <Text className="text-white text-xs font-semibold">{duration} min</Text>
              </View>

              <View className="absolute inset-0 items-center justify-center">
                <View className="w-12 h-12 rounded-full bg-black/40 items-center justify-center border border-white/20">
                  <Play color="#ffffff" size={24} fill="#ffffff" />
                </View>
              </View>
            </LinearGradient>
          </View>
          
          <View className="p-4">
            <Text className="text-white font-semibold text-base mb-1" numberOfLines={1}>{title}</Text>
            <Text className="text-text-muted text-sm mb-3">{type} • {level}</Text>
            
            <View className="flex-row gap-2">
              <View className="bg-secondary-accent/20 px-2.5 py-1 rounded-full">
                <Text className="text-secondary-accent text-xs font-medium">{type}</Text>
              </View>
              {isProgram && (
                <View className="bg-primary-accent/20 px-2.5 py-1 rounded-full">
                  <Text className="text-primary-accent text-xs font-medium">Programme</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

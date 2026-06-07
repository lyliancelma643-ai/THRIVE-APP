import React from 'react';
import { View, Text, useWindowDimensions, Image } from 'react-native';
import { Search, UserCircle, Play } from 'lucide-react-native';
import { Button } from './Button';
import { useRouter } from 'expo-router';

export function GlobalHeader() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();

  if (!isDesktop) return null; // Header only visible on tablet/desktop (we assume tablet is >= 1024 for simplicity here, or we can adjust)

  return (
    <View className="h-16 flex-row items-center justify-between px-8 bg-primary-background/90 border-b border-surface-elevated z-50">
      {/* Left Content */}
      <View className="flex-row items-center gap-3">
        <Text className="font-display text-2xl font-bold tracking-widest text-white">THRIVE</Text>
        <Text className="font-body text-sm font-semibold text-primary-accent tracking-wider mt-1">SPORT+</Text>
      </View>

      {/* Right Content */}
      <View className="flex-row items-center gap-4">
        <Button 
          variant="secondary"
          label="Reprendre"
          icon={Play}
          size="sm"
          onPress={() => router.push('/player/1')}
        />
        <Button 
          variant="icon"
          icon={Search}
          onPress={() => {}}
        />
        <Button 
          variant="icon"
          icon={UserCircle}
          onPress={() => router.push('/profile')}
        />
      </View>
    </View>
  );
}

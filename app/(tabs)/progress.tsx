import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { ProgressRing } from '../../components/ProgressRing';

export default function ProgressScreen() {
  return (
    <View className="flex-1 bg-primary-background">
      <GlobalHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-6 pt-10 pb-6">
          <Text className="text-white font-display text-4xl font-bold mb-2">Ta progression</Text>
          <Text className="text-text-muted text-base">Résumé de tes dernières séances.</Text>
        </View>

        {/* Rings Section */}
        <View className="mx-6 my-4 bg-surface-elevated rounded-3xl p-8 items-center">
          <View className="relative w-64 h-64 items-center justify-center">
            {/* Outer Ring: Séances complétées */}
            <View className="absolute">
              <ProgressRing progress={0.75} size={240} strokeWidth={18} color="#c5a059" trackColor="rgba(197,160,89,0.15)" />
            </View>
            {/* Middle Ring: Minutes actives */}
            <View className="absolute">
              <ProgressRing progress={0.6} size={180} strokeWidth={18} color="#8f9779" trackColor="rgba(143,151,121,0.15)" />
            </View>
            {/* Inner Ring: Fréquence */}
            <View className="absolute">
              <ProgressRing progress={0.4} size={120} strokeWidth={18} color="#ffffff" trackColor="rgba(255,255,255,0.15)" />
            </View>
          </View>
          
          <View className="mt-8 flex-row justify-between w-full">
            <View className="items-center">
              <Text className="text-primary-accent font-bold text-xl mb-1">75%</Text>
              <Text className="text-text-muted text-xs">Séances</Text>
            </View>
            <View className="items-center">
              <Text className="text-secondary-accent font-bold text-xl mb-1">120</Text>
              <Text className="text-text-muted text-xs">Minutes</Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-bold text-xl mb-1">3/5</Text>
              <Text className="text-text-muted text-xs">Jours</Text>
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6 py-4">
          <View className="bg-surface-elevated p-5 rounded-2xl w-48 mr-4">
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">Meilleure série</Text>
            <Text className="text-white font-display text-3xl font-bold">5 Jours</Text>
          </View>
          <View className="bg-surface-elevated p-5 rounded-2xl w-48 mr-4">
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">Temps cumulé</Text>
            <Text className="text-white font-display text-3xl font-bold">8h 45m</Text>
          </View>
          <View className="bg-surface-elevated p-5 rounded-2xl w-48 mr-6">
            <Text className="text-text-muted text-xs uppercase tracking-wider mb-2">Total Séances</Text>
            <Text className="text-white font-display text-3xl font-bold">24</Text>
          </View>
        </ScrollView>

      </ScrollView>
    </View>
  );
}

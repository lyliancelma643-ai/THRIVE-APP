import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = { message?: string; onRetry?: () => void };

/** État « Pas de connexion » avec bouton Réessayer, pour les écrans qui chargent des données. */
export function OfflineState({ message, onRetry }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16 bg-gray-50" accessibilityRole="alert">
      <Text className="text-4xl mb-3">📡</Text>
      <Text className="text-lg font-bold mb-2 text-center">Pas de connexion</Text>
      <Text className="text-gray-500 text-sm text-center mb-6">
        {message ?? 'Impossible de charger les données. Vérifiez votre connexion internet puis réessayez.'}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          className="bg-black rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

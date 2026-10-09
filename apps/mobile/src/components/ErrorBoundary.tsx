import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';

/** Écran de secours exporté par chaque _layout (convention expo-router). */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 bg-gray-50" accessibilityRole="alert">
      <Text className="text-4xl mb-3">⚠️</Text>
      <Text className="text-lg font-bold mb-2 text-center">Un problème est survenu</Text>
      <Text className="text-gray-500 text-sm text-center mb-6">
        Cet écran n’a pas pu s’afficher. Réessayez ; si le problème continue, redémarrez l’application.
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Réessayer"
        className="bg-black rounded-xl px-6 py-3"
      >
        <Text className="text-white font-semibold">Réessayer</Text>
      </Pressable>
    </View>
  );
}

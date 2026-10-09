import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

type Props = { message?: string; onRetry?: () => unknown };

/**
 * État « Pas de connexion » avec bouton Réessayer, pour les écrans qui chargent des données.
 * `onRetry` peut renvoyer une promesse : le bouton passe alors en « Nouvelle tentative… »
 * (désactivé) jusqu'à la fin, pour éviter les appuis répétés sans retour visuel.
 */
export function OfflineState({ message, onRetry }: Props) {
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // L'écran parent garde l'état d'erreur ; rien à faire ici.
    } finally {
      if (mounted.current) setRetrying(false);
    }
  }, [onRetry, retrying]);

  return (
    <View className="flex-1 items-center justify-center px-8 py-16 bg-gray-50" accessibilityRole="alert">
      <Text className="text-4xl mb-3" accessibilityElementsHidden importantForAccessibility="no">📡</Text>
      <Text className="text-lg font-bold mb-2 text-center" accessibilityRole="header">Pas de connexion</Text>
      <Text className="text-gray-500 text-sm text-center mb-6">
        {message ?? 'Impossible de charger les données. Vérifiez votre connexion internet puis réessayez.'}
      </Text>
      {onRetry && (
        <Pressable
          onPress={handleRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          accessibilityHint="Relance le chargement des données"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          hitSlop={8}
          className={`bg-black rounded-xl px-6 py-3 flex-row items-center ${retrying ? 'opacity-60' : ''}`}
        >
          {retrying && <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />}
          <Text className="text-white font-semibold">{retrying ? 'Nouvelle tentative…' : 'Réessayer'}</Text>
        </Pressable>
      )}
    </View>
  );
}

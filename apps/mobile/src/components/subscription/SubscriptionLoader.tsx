import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import { ThemedText, useTheme } from '../../design';

/**
 * Écran de chargement pendant que RevenueCat vérifie l'abonnement : fond du style de l'app et apparition en fondu,
 * pour éviter tout clignotement « verrouillé → déverrouillé » au lancement.
 */
export function SubscriptionLoader({ label = 'Un instant…' }: { label?: string }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Petit délai : si la vérification est instantanée (cache SDK), rien n'apparaît.
    const anim = Animated.timing(opacity, { toValue: 1, duration: 250, delay: 180, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <Animated.View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, opacity }}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText variant="callout" color="label2">{label}</ThemedText>
      </Animated.View>
    </View>
  );
}

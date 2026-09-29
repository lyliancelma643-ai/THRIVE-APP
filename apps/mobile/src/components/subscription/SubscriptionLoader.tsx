import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';
import { C } from './theme';

/**
 * Écran de chargement pendant que RevenueCat vérifie l'abonnement : fond
 * identique à l'app et apparition en fondu, pour éviter tout clignotement
 * « verrouillé → déverrouillé » au lancement.
 */
export function SubscriptionLoader({ label = 'Un instant…' }: { label?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Petit délai : si la vérification est instantanée (cache SDK), rien n'apparaît.
    const anim = Animated.timing(opacity, { toValue: 1, duration: 250, delay: 180, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
  label: { color: C.muted, fontSize: 15 },
});

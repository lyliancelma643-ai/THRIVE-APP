import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, useTheme } from '../design';

// Avertissement santé (Apple 1.4.1) et ressources d'aide, affichés dans l'app.
// Mêmes ressources que la page web « Quand consulter ». Habillé aux tokens du style courant.
const RESOURCES = [
  { label: 'Info-Social 811 (option 2)', tel: '811' },
  { label: '9-8-8 · ligne d’aide en cas de crise de suicide', tel: '988' },
  { label: 'Jeunesse, J’écoute · 1 800 668-6868', tel: '18006686868' },
  { label: 'Urgence · 9-1-1', tel: '911' },
];

export function HealthNotice() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bgGrouped2,
        borderRadius: RADIUS.card,
        padding: SPACING.space4,
        marginBottom: SPACING.space4,
        gap: SPACING.space1,
      }}
    >
      <ThemedText variant="headline">Quand consulter</ThemedText>
      <ThemedText variant="foot" color="label2" style={{ marginBottom: SPACING.space2 }}>
        THRIVE est un programme éducatif. Il ne remplace pas un avis médical, psychologique ou
        psychosocial. Arrêtez toute activité en cas de douleur ou de malaise.
      </ThemedText>
      {RESOURCES.map((r) => (
        <Pressable
          key={r.tel}
          onPress={() => Linking.openURL(`tel:${r.tel}`)}
          accessibilityRole="link"
          accessibilityLabel={`Appeler ${r.label}`}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <ThemedText variant="sub" style={{ color: colors.tint, textDecorationLine: 'underline' }}>
            {r.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

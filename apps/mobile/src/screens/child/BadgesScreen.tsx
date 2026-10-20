import React from 'react';
import { View } from 'react-native';
import { SPACING, ThemedText, useTheme } from '../../design';

// [À COMPLÉTER] contenu : écran sans route, laissé neutre (aucune donnée de démo).
export default function BadgesScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.space4, backgroundColor: colors.bgGrouped }}>
      <ThemedText variant="title2" style={{ color: colors.label }} accessibilityRole="header">Mes badges</ThemedText>
    </View>
  );
}

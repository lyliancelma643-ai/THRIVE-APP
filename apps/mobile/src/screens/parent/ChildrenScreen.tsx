import React from 'react';
import { View } from 'react-native';
import { ThemedText, useTheme } from '../../design';

export default function ChildrenScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgGrouped }}>
      <ThemedText variant="title1">Mes enfants</ThemedText>
    </View>
  );
}

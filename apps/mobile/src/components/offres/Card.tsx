import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { RADIUS, SPACING, useTheme } from '../../design';

/** Carte pleine (pas de verre : le verre est réservé aux barres et aux pieds d'action). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, style: styleKey } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgGrouped2,
          borderRadius: styleKey === 'carnet' ? RADIUS.cardCarnet : RADIUS.card,
          padding: SPACING.space4,
          gap: SPACING.space2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { SPACING } from './tokens';

export type CapsuleProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Contenu libre à la place du libellé. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Capsule de verre posée sur une image (ex. « Recommandé pour … ce soir »). */
export function Capsule({ label, icon, children, style }: CapsuleProps) {
  const { colors } = useTheme();
  return (
    <GlassSurface strong style={style}>
      <View
        accessible
        accessibilityLabel={label}
        style={{
          minHeight: SPACING.touchMin - 8, flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: SPACING.space3, paddingVertical: SPACING.space1 + 2, gap: SPACING.space1 + 2,
        }}
      >
        {icon ? <Ionicons name={icon} size={14} color={colors.label} /> : null}
        {children ?? <ThemedText variant="footnote" style={{ fontWeight: '600' }}>{label}</ThemedText>}
      </View>
    </GlassSurface>
  );
}

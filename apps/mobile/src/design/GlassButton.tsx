import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { SPACING } from './tokens';

export type GlassButtonProps = {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Action validante (OK, Terminé) : une seule teintée par barre. */
  tinted?: boolean;
  disabled?: boolean;
  /** Obligatoire pour un bouton icône seule. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Bouton de barre en Liquid Glass : capsule 44 pt, neutre ou teinté. */
export function GlassButton({ label, icon, onPress, tinted, disabled, accessibilityLabel, style }: GlassButtonProps) {
  const { colors } = useTheme();
  const ink = tinted ? colors.tintInk : colors.label;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <GlassSurface interactive tintColor={tinted ? colors.tint : undefined} style={{ minHeight: SPACING.touchMin, minWidth: SPACING.touchMin }}>
        <View
          style={{
            minHeight: SPACING.touchMin,
            minWidth: SPACING.touchMin,
            paddingHorizontal: label ? SPACING.space4 : 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.space1 + 2,
          }}
        >
          {icon ? <Ionicons name={icon} size={20} color={ink} /> : null}
          {label ? (
            <ThemedText variant="headline" style={{ color: ink }}>
              {label}
            </ThemedText>
          ) : null}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

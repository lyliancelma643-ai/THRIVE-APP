import { ActivityIndicator, Pressable } from 'react-native';
import { SPACING, ThemedText, useTheme } from '../../design';

/** Bouton d'action plein (jaune « accent » par défaut, ou noir pour Apple Pay). */
export function Primary({
  label,
  onPress,
  disabled,
  busy,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'accent' | 'dark';
}) {
  const { colors } = useTheme();
  const bg = tone === 'dark' ? colors.label : colors.accent;
  const fg = tone === 'dark' ? colors.bgGrouped : colors.accentInk;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 26,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.space4,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {busy ? <ActivityIndicator color={fg} /> : <ThemedText variant="headline" style={{ color: fg }}>{label}</ThemedText>}
    </Pressable>
  );
}

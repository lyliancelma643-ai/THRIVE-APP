import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { SPACING } from './tokens';

export type PillTone = 'neutral' | 'tint' | 'accent' | 'ok';

export type PillProps = {
  label: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
};

/** Petite pastille d'information (durée, lieu, « Bientôt »). Non interactive. */
export function Pill({ label, tone = 'neutral', style }: PillProps) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.fill3, fg: colors.label },
    tint: { bg: colors.tint, fg: colors.tintInk },
    accent: { bg: colors.accent, fg: colors.accentInk },
    ok: { bg: colors.fill3, fg: colors.ok },
  }[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        { alignSelf: 'flex-start', paddingHorizontal: SPACING.space3, paddingVertical: SPACING.space1 + 1, borderRadius: 9999, backgroundColor: map.bg },
        style,
      ]}
    >
      <ThemedText variant="caption1" style={{ color: map.fg, fontWeight: '600' }}>{label}</ThemedText>
    </View>
  );
}

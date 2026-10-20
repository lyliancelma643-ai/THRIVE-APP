import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { ColorTokens } from './tokens';

export type ProgressBarProps = {
  /** 0 à 1. */
  value: number;
  /** Token de la barre (défaut `tint`). */
  color?: keyof ColorTokens;
  accessibilityLabel?: string;
  /** Texte lu par VoiceOver (ex. « 7 sur 13 »). */
  valueText?: string;
  style?: StyleProp<ViewStyle>;
};

/** `.bar-p` : piste 6 pt `fill`, remplissage `tint`, rayon 3. */
export function ProgressBar({ value, color = 'tint', accessibilityLabel, valueText, style }: ProgressBarProps) {
  const { colors } = useTheme();
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100), text: valueText }}
      style={[{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: 3, backgroundColor: colors[color] }} />
    </View>
  );
}

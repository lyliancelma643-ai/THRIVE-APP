import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../design';

type Props = {
  /** 0 à 1. */
  value: number;
  accessibilityLabel?: string;
  /** Texte lu par VoiceOver (ex. « 1 sur 2 »). */
  valueText?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.bar-p` des maquettes V4/V5 : piste 6 pt `fill`, remplissage en dégradé horizontal (Lin : sauge → marine ;
 * Veillée : sauge claire → émail). Même rôle accessible que `ProgressBar` du design (barre de progression).
 */
export function StepBar({ value, accessibilityLabel, valueText, style }: Props) {
  const { colors, styleKey } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const from = styleKey === 'lin' ? colors.sageInk : colors.sage;
  const to = styleKey === 'lin' ? colors.navy600 : colors.sun;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100), text: valueText }}
      style={[{ height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: 3, overflow: 'hidden' }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={`step${uid}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#step${uid})`} />
        </Svg>
      </View>
    </View>
  );
}

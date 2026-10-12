import { useEffect } from 'react';
import { View, type TextStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { ThemedText, useTheme, type ColorTokens, type TextStyleName } from '../../design';

export const SLOGAN_A = 'Grandir par le sport, réussir pour la vie.';
export const SLOGAN_B = 'Moins de temps, plus de bons moments.';
/** Cycle complet : 4,5 s par slogan. */
export const SLOGAN_CYCLE_MS = 9000;

type Props = {
  variant?: TextStyleName;
  color?: keyof ColorTokens;
  /** Couleur des deux traits indicateurs (token). */
  dotColor?: keyof ColorTokens;
  align?: 'left' | 'center';
  textStyle?: TextStyle;
};

// Même découpage que la maquette (sloganDuo) : 0-44 % premier slogan, 50-94 % second.
const T = [0, 0.44, 0.5, 0.94, 1];

/**
 * Deux slogans qui se relaient (fondu + glissement vertical, ~9 s).
 * « Réduire les animations » : seul le premier est affiché, sans animation.
 * Le flou de la maquette n'a pas d'équivalent fiable en RN : fondu + glissement seulement.
 */
export function SloganDuo({ variant = 'title1', color = 'label', dotColor = 'accent', align = 'left', textStyle }: Props) {
  const { reduceMotion, colors } = useTheme();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: SLOGAN_CYCLE_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [reduceMotion, p]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, T, [1, 1, 0, 0, 1]),
    transform: [{ translateY: interpolate(p.value, T, [0, 0, -10, -10, 0]) }],
  }));
  const bStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, T, [0, 0, 1, 1, 0]),
    transform: [{ translateY: interpolate(p.value, T, [10, 10, 0, 0, 10]) }],
  }));
  const dotA = useAnimatedStyle(() => ({
    width: interpolate(p.value, T, [22, 22, 6, 6, 22]),
    opacity: interpolate(p.value, T, [1, 1, 0.35, 0.35, 1]),
  }));
  const dotB = useAnimatedStyle(() => ({
    width: interpolate(p.value, T, [6, 6, 22, 22, 6]),
    opacity: interpolate(p.value, T, [0.35, 0.35, 1, 1, 0.35]),
  }));

  const ta = align === 'center' ? 'center' : 'left';
  const text = (s: string) => (
    <ThemedText variant={variant} color={color} style={[{ textAlign: ta }, textStyle]}>{s}</ThemedText>
  );

  if (reduceMotion) {
    return <View accessibilityLabel={SLOGAN_A}>{text(SLOGAN_A)}</View>;
  }

  return (
    <View accessible accessibilityLabel={`${SLOGAN_A} ${SLOGAN_B}`}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Animated.View style={aStyle}>{text(SLOGAN_A)}</Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, bStyle]}>{text(SLOGAN_B)}</Animated.View>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: 6, marginTop: 14, justifyContent: align === 'center' ? 'center' : 'flex-start' }}
      >
        <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: colors[dotColor] }, dotA]} />
        <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: colors[dotColor] }, dotB]} />
      </View>
    </View>
  );
}

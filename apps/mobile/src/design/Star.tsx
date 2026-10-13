import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Icon } from './icons';
import { starSpec } from './materialSpecs';
import { useTheme } from './ThemeProvider';
import { Texture } from './Texture';

export type StarProps = {
  /** `.star-on` (émail jaune) ou `.star-off` (creux sombre). */
  on?: boolean;
  /** Diamètre du disque (défaut 40). */
  size?: number;
  /** Lue par VoiceOver ; sans libellé, l'étoile est décorative (cachée). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Étoile de la semaine. Allumée : émail jaune avec halo (`--star-glow`) — c'est un geste soleil, donc jamais
 * en même temps qu'un autre émail sur l'écran. Éteinte : creux sombre. Pas d'animation.
 */
export function Star({ on = false, size = 40, accessibilityLabel, style }: StarProps) {
  const { styleKey } = useTheme();
  const spec = starSpec(styleKey, on);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glyph = Math.round(size * 0.55);
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        on ? { shadowColor: spec.glow ?? undefined, shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 12 }, elevation: 6 } : null,
        style,
      ]}
    >
      {on && spec.stops ? (
        <>
          <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`star${uid}`} cx="34" cy="26" r="80" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={spec.stops[0]} />
                <Stop offset="0.5" stopColor={spec.stops[1]} />
                <Stop offset="1" stopColor={spec.stops[2]} />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill={`url(#star${uid})`} />
          </Svg>
          <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}>
            <Texture name="enamel" />
          </View>
        </>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: size / 2, backgroundColor: spec.fill, borderTopWidth: 2, borderColor: 'transparent', borderTopColor: 'rgba(0,0,0,0.35)' },
          ]}
        />
      )}
      <Icon name="star" size={glyph} color={spec.ink} filled={on} strokeWidth={1.85} />
    </View>
  );
}

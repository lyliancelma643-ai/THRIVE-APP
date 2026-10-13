import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type RadialGlowProps = {
  /** Couleur au centre (opacité comprise) : le dégradé s'efface en transparent à 70 %. */
  color: string;
  height: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * `radial-gradient(120% 90% at 50% 0%, <color>, transparent 70%)` : lueur elliptique posée en haut d'une scène
 * (P · Prêt avec …). Occupe toute la largeur du parent, `height` pt.
 */
export function RadialGlow({ color, height, style }: RadialGlowProps) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="0%" rx="120%" ry="90%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

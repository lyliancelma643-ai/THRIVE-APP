import { useId, useState } from 'react';
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
  const [w, setW] = useState(0);
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ position: 'absolute', top: 0, left: 0, right: 0, height }, style]}>
      {w > 0 ? (
      <Svg width={w} height={height}>
        <Defs>
          <RadialGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={0}
            r={1}
            gradientTransform={`translate(${w / 2} 0) scale(${1.2 * w} ${0.9 * height})`}
          >
            <Stop offset="0" stopColor={color} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={height} fill={`url(#${id})`} />
      </Svg>
      ) : null}
    </View>
  );
}

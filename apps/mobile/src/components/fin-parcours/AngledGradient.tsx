import { useId, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export type AngledGradientProps = {
  from: string;
  to: string;
  /** Angle CSS (`linear-gradient(160deg, …)`) : 0 = vers le haut, 90 = vers la droite, 180 = vers le bas. */
  angle?: number;
  style?: StyleProp<ViewStyle>;
};

/** Fond en dégradé linéaire à angle CSS, mesuré sur la boîte réelle (ligne de dégradé de longueur |w·sin| + |h·cos|). */
export function AngledGradient({ from, to, angle = 160, style }: AngledGradientProps) {
  const id = `grad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(size.w * dx) + Math.abs(size.h * dy);
  const cx = size.w / 2;
  const cy = size.h / 2;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[StyleSheet.absoluteFill, style]}
    >
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              x1={cx - (dx * len) / 2}
              y1={cy - (dy * len) / 2}
              x2={cx + (dx * len) / 2}
              y2={cy + (dy * len) / 2}
            >
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

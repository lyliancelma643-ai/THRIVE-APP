import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useTheme } from '../../design';

type Props = { values: number[]; min: number; max: number; height?: number; width?: number; label: string };

/** Courbe simple (SVG) : sert à la courbe LSSS et à la courbe de bien-être. */
export function Curve({ values, min, max, height = 72, width = 320, label }: Props) {
  const { colors } = useTheme();
  if (values.length === 0) return null;
  const pad = 6;
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1);
    const y = height - pad - ((Math.min(max, Math.max(min, v)) - min) / span) * (height - 2 * pad);
    return { x, y };
  });
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {pts.length > 1 ? (
          <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.tint} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.tint} />
        ))}
      </Svg>
    </View>
  );
}

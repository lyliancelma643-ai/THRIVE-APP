import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, type ColorTokens } from '../../design';

type RingProps = {
  size: number;
  stroke: number;
  /** 0 à 1. */
  value: number;
  /** Token de l'arc (défaut `tint`). */
  color?: keyof ColorTokens;
  /** Contenu centré (le chiffre). */
  children?: ReactNode;
  accessibilityLabel?: string;
};

/** Anneau de progression du canevas : piste `fill`, arc arrondi qui part de midi (G 78/9, S 64/8, T 58/7). */
export function Ring({ size, stroke, value, color = 'tint', children, accessibilityLabel }: RingProps) {
  const { colors } = useTheme();
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.fill} strokeWidth={stroke} />
        {p > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors[color]} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      ) : null}
    </View>
  );
}

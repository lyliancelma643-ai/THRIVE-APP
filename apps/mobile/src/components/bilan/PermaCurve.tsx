import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { ThemedText, useTheme } from '../../design';
import { curveGeometry } from './bilanData';

type Props = {
  /** Une valeur 0–100 par point, dans l'ordre. */
  values: number[];
  labels: string[];
  height?: number;
  accessibilityLabel: string;
};

/** Courbe simple (PERMA par séance, LSSS par moment) : lignes de repère 50/70/90, points annotés. */
export function ValueCurve({ values, labels, height = 150, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const [w, setW] = useState(300);
  if (values.length === 0) return null;
  const g = curveGeometry(values, w, height);
  const yFor = (v: number) => height - 26 - ((v - g.min) / (g.max - g.min)) * (height - 46);
  const d = g.points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return (
    <View onLayout={(e) => setW(Math.max(200, e.nativeEvent.layout.width))} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        {[50, 70, 90].map((l) => (
          <React.Fragment key={l}>
            <Line x1={0} x2={w} y1={yFor(l)} y2={yFor(l)} stroke={colors.separator} strokeDasharray="2 4" />
            <SvgText x={w} y={yFor(l) - 4} textAnchor="end" fontSize={11} fill={colors.label2}>{l}</SvgText>
          </React.Fragment>
        ))}
        {values.length > 1 ? <Path d={d} fill="none" stroke={colors.tint} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {g.points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={6} fill={colors.tint} stroke={colors.bgGrouped2} strokeWidth={2.5} />
            <SvgText x={p.x} y={p.y - 12} textAnchor="middle" fontSize={13} fontWeight="600" fill={colors.label}>{p.value}</SvgText>
            <SvgText x={p.x} y={height - 6} textAnchor={i === 0 && values.length > 1 ? 'start' : i === values.length - 1 && values.length > 1 ? 'end' : 'middle'} fontSize={12} fill={colors.label2}>
              {labels[i] ?? ''}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

export function CurveCaption({ children }: { children: string }) {
  return <ThemedText variant="footnote" color="label2" style={{ marginTop: 8 }}>{children}</ThemedText>;
}

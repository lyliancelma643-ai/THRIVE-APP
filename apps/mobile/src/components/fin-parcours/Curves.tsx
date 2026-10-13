import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { FONT_FAMILIES, useTheme } from '../../design';
import {
  LSSS_CHART, WELLBEING_CHART, lsssPlot, wellbeingPlot,
  type LsssPoint, type WellbeingPoint,
} from './logic';

const MOMENT_LABEL = { BASELINE: 'Départ', MID: 'Mi-parcours', FINAL: 'Final' } as const;
const ANCHOR = { BASELINE: 'start', MID: 'middle', FINAL: 'end' } as const;

function useSvgFonts() {
  const { fontsLoaded } = useTheme();
  return {
    regular: fontsLoaded ? FONT_FAMILIES.sans[400] : undefined,
    semibold: fontsLoaded ? FONT_FAMILIES.sans[600] : undefined,
  };
}

/**
 * Courbe LSSS (Z · « La courbe se referme ») : repères pointillés 50 · 70 · 90, trait `tint` de 3 pt, un point par
 * moment (Départ, Mi-parcours, Final) avec sa valeur au-dessus et son libellé en bas. SVG 338 × 150 comme le canevas.
 */
export function LsssChart({ points, label }: { points: LsssPoint[]; label: string }) {
  const { colors } = useTheme();
  const f = useSvgFonts();
  const plot = lsssPlot(points);
  if (plot.points.length === 0) return null;
  const { width, height, labelY } = LSSS_CHART;
  const d = plot.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {plot.ticks.map((t) => (
          <React.Fragment key={t.value}>
            <Line x1={0} x2={width} y1={t.y} y2={t.y} stroke={colors.separator} strokeDasharray="2 4" />
            <SvgText x={width} y={t.y - 4} textAnchor="end" fontSize={11} fill={colors.label3} fontFamily={f.regular}>
              {String(t.value)}
            </SvgText>
          </React.Fragment>
        ))}
        {plot.points.length > 1 ? <Path d={d} fill="none" stroke={colors.tint} strokeWidth={3} strokeLinecap="round" /> : null}
        {plot.points.map((p) => (
          <React.Fragment key={p.moment}>
            <Circle cx={p.x} cy={p.y} r={6} fill={colors.tint} stroke={colors.bgGrouped2} strokeWidth={2.5} />
            <SvgText x={p.x} y={p.y - 13} textAnchor="middle" fontSize={13} fontWeight="600" fill={colors.label} fontFamily={f.semibold}>
              {String(p.value)}
            </SvgText>
            <SvgText x={p.x} y={labelY} textAnchor={ANCHOR[p.moment]} fontSize={12} fill={colors.label2} fontFamily={f.regular}>
              {MOMENT_LABEL[p.moment]}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

/**
 * Bien-être sur 13 séances : zone `tint` à 12 %, trait de 2,4 pt, un point par séance, le dernier plein.
 * SVG 338 × 64 comme le canevas.
 */
export function WellbeingSpark({ points, label }: { points: WellbeingPoint[]; label: string }) {
  const { colors } = useTheme();
  const plot = wellbeingPlot(points);
  if (plot.length === 0) return null;
  const { width, height } = WELLBEING_CHART;
  const line = plot.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const first = plot[0];
  const last = plot[plot.length - 1];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }}>
        <Path d={`${line} L${last.x.toFixed(1)} ${height} L${first.x.toFixed(1)} ${height}Z`} fill={colors.tint} opacity={0.12} />
        <Path d={line} fill="none" stroke={colors.tint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {plot.map((p, i) =>
          i === plot.length - 1 ? (
            <Circle key={p.session} cx={p.x} cy={p.y} r={4} fill={colors.tint} stroke={colors.tint} strokeWidth={2} />
          ) : (
            <Circle key={p.session} cx={p.x} cy={p.y} r={2.4} fill={colors.bgGrouped2} stroke={colors.tint} strokeWidth={2} />
          ),
        )}
      </Svg>
    </View>
  );
}

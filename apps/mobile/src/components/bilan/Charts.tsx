import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { resolveTextStyle, useTheme } from '../../design';
import { LSSS_MOMENT_LABEL, LSSS_MOMENT_ORDER, TOTAL_SESSIONS, type LsssPoint, type PermaPoint } from './bilanData';

/** Mini courbe du bien-être (G) : aire `tint` à 12 %, trait 2,4, points évidés, dernier point plein (140 × 40). */
export function Sparkline({ values, width = 140, height = 40 }: { values: number[]; width?: number; height?: number }) {
  const { colors } = useTheme();
  if (values.length === 0) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 0.8);
  const x = (i: number) => (values.length === 1 ? width / 2 : 4 + (i * (width - 8)) / (values.length - 1));
  const y = (v: number) => height - 10 - ((v - lo) / span) * (height - 22);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height}Z`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.length > 1 ? <Path d={area} fill={colors.tint} opacity={0.12} /> : null}
      {values.length > 1 ? <Path d={line} fill="none" stroke={colors.tint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {pts.map(([px, py], i) => {
        const last = i === pts.length - 1;
        return <Circle key={i} cx={px} cy={py} r={last ? 4 : 2.4} fill={last ? colors.tint : colors.bgGrouped2} stroke={colors.tint} strokeWidth={2} />;
      })}
    </Svg>
  );
}

const SLOT_X = [24, 169, 314] as const; // départ, mi-parcours, final (viewBox 338 de large)
const yFor = (v: number) => Math.max(8, Math.min(122, 100 - (v - 50) * 2));

/**
 * Courbe LSSS de l'écran H : Départ → Mi-parcours → Final sur trois emplacements fixes, repères pointillés 50/70/90,
 * valeur au-dessus de chaque point. Le prochain moment à venir est un cercle pointillé relié en pointillés.
 */
export function LsssCurve({ points }: { points: LsssPoint[] }) {
  const { colors, fontsLoaded } = useTheme();
  const fontFamily = resolveTextStyle('sub', fontsLoaded).fontFamily;
  const H = 150;
  const slots = LSSS_MOMENT_ORDER.map((m, i) => ({ m, i, p: points.find((q) => q.moment === m) ?? null }));
  const lastIdx = slots.reduce((acc, s) => (s.p ? s.i : acc), -1);
  const next = lastIdx >= 0 && lastIdx < 2 ? slots[lastIdx + 1] : null;
  const filled = slots.filter((s) => s.p);
  const label = (s: (typeof slots)[number]) => LSSS_MOMENT_LABEL[s.m];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Courbe des compétences de vie : ${filled.map((s) => `${label(s)} ${s.p!.value}`).join(', ')}`}
    >
      <Svg width="100%" height={H} viewBox={`0 0 338 ${H}`}>
        {[50, 70, 90].map((l) => (
          <React.Fragment key={l}>
            <Line x1={0} x2={338} y1={yFor(l)} y2={yFor(l)} stroke={colors.separator} strokeDasharray="2 4" />
            <SvgText fontFamily={fontFamily} x={338} y={yFor(l) - 4} textAnchor="end" fontSize={11} fill={colors.label3}>{String(l)}</SvgText>
          </React.Fragment>
        ))}
        {filled.length > 1 ? (
          <Path d={filled.map((s, i) => `${i ? 'L' : 'M'}${SLOT_X[s.i]} ${yFor(s.p!.value)}`).join(' ')} fill="none" stroke={colors.sageText} strokeWidth={3} strokeLinecap="round" />
        ) : null}
        {next && filled.length > 0 ? (
          <>
            <Path
              d={`M${SLOT_X[lastIdx]} ${yFor(slots[lastIdx].p!.value)} L${SLOT_X[next.i]} ${yFor(slots[lastIdx].p!.value) - 12}`}
              stroke={colors.label3} strokeWidth={2} strokeDasharray="3 5" fill="none"
            />
            <Circle cx={SLOT_X[next.i]} cy={yFor(slots[lastIdx].p!.value) - 12} r={5.5} fill="none" stroke={colors.label3} strokeWidth={2} strokeDasharray="2 2.5" />
          </>
        ) : null}
        {slots.map((s) => (
          <React.Fragment key={s.m}>
            {s.p ? (
              <>
                <Circle cx={SLOT_X[s.i]} cy={yFor(s.p.value)} r={6} fill={colors.sageText} stroke={colors.bgGrouped2} strokeWidth={2.5} />
                <SvgText fontFamily={fontFamily} x={SLOT_X[s.i]} y={yFor(s.p.value) - 13} textAnchor="middle" fontSize={13} fontWeight="600" fill={colors.label}>{String(s.p.value)}</SvgText>
              </>
            ) : null}
            <SvgText fontFamily={fontFamily} x={SLOT_X[s.i]} y={144} textAnchor={s.i === 0 ? 'start' : s.i === 2 ? 'end' : 'middle'} fontSize={12} fill={colors.label2}>{label(s)}</SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

/** x d'une séance sur l'axe S1 → S13 (viewBox 338 de large, marges 14). */
export const wellbeingX = (session: number): number => 14 + ((Math.max(1, Math.min(TOTAL_SESSIONS, session)) - 1) / (TOTAL_SESSIONS - 1)) * 310;
/** y d'une valeur 0–100 (viewBox de 130 de haut). */
export const wellbeingY = (v: number): number => 10 + ((100 - Math.max(0, Math.min(100, v))) / 100) * 96;

/**
 * Courbe du bien-être (G) : une mesure par séance sur l'axe S1 → S13, repères Élevé / Moyen / Bas, dernier point plein.
 * Les valeurs viennent de `perma_progression` (0–100) ; rien n'est recalculé ici.
 */
export function WellbeingCurve({ points }: { points: PermaPoint[] }) {
  const { colors, fontsLoaded } = useTheme();
  const fontFamily = resolveTextStyle('cap', fontsLoaded).fontFamily;
  const pts = [...points].sort((a, b) => a.session_number - b.session_number);
  const H = 130;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${wellbeingX(p.session_number).toFixed(1)} ${wellbeingY(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const summary = pts.map((p) => `séance ${p.session_number} : ${Math.round(p.value)}`).join(', ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Courbe du bien-être : ${summary}`}>
      <Svg width="100%" height={H} viewBox={`0 0 338 ${H}`}>
        {[20, 58, 96].map((y) => (
          <Line key={y} x1={0} x2={338} y1={y} y2={y} stroke={colors.separator} strokeDasharray="2 4" />
        ))}
        {pts.length > 1 && last ? (
          <Path
            d={`${d} L${wellbeingX(last.session_number).toFixed(1)} ${H - 20} L${wellbeingX(pts[0].session_number).toFixed(1)} ${H - 20}Z`}
            fill={colors.sage} opacity={0.16}
          />
        ) : null}
        {pts.length > 1 ? <Path d={d} fill="none" stroke={colors.sageText} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          return <Circle key={p.session_number} cx={wellbeingX(p.session_number)} cy={wellbeingY(p.value)} r={isLast ? 6.5 : 3} fill={isLast ? colors.tint : colors.bgGrouped2} stroke={isLast ? colors.bgGrouped2 : colors.sageText} strokeWidth={isLast ? 2.5 : 2} />;
        })}
        {last ? (
          <SvgText
            fontFamily={fontFamily} x={Math.min(wellbeingX(last.session_number), 300)} y={Math.max(wellbeingY(last.value) - 12, 12)}
            textAnchor="middle" fontSize={12} fontWeight="600" fill={colors.label}
          >{`S${last.session_number} · ${Math.round(last.value)}`}</SvgText>
        ) : null}
        {[1, 3, 5, 7, 9, 11, 13].map((s) => (
          <SvgText key={s} fontFamily={fontFamily} x={wellbeingX(s)} y={H - 6} textAnchor="middle" fontSize={11} fill={colors.label3}>{`S${s}`}</SvgText>
        ))}
      </Svg>
    </View>
  );
}

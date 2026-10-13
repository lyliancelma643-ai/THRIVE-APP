// Logique pure de la fin de parcours (testable sans React Native).

export type LsssPoint = { moment: 'BASELINE' | 'MID' | 'FINAL'; created_at: string; value: number };
export type WellbeingPoint = { session_number: number; value: number };

/** Le parcours est « terminé » quand le bilan final LSSS existe. */
export function hasFinalPoint(points: LsssPoint[]): boolean {
  return points.some((p) => p.moment === 'FINAL');
}

/** Écart entre le dernier point et le départ ; null s'il manque l'un des deux. */
export function lsssDelta(points: LsssPoint[]): number | null {
  const base = points.find((p) => p.moment === 'BASELINE');
  const last = [...points].reverse().find((p) => p.moment !== 'BASELINE');
  if (!base || !last) return null;
  return Math.round(last.value - base.value);
}

/** Points de bien-être ordonnés par séance, bornés aux 13 séances du parcours. */
export function wellbeingSeries(points: WellbeingPoint[]): WellbeingPoint[] {
  return [...points]
    .filter((p) => p.session_number >= 1 && p.session_number <= 13)
    .sort((a, b) => a.session_number - b.session_number);
}

export function shareMessage(firstName: string): string {
  return `${firstName} a terminé le parcours THRIVE des 13 séances.`;
}

// — Tracé des courbes (repère du canevas : SVG 338 × 150 pour la courbe LSSS, 338 × 64 pour le bien-être) —

export const LSSS_CHART = { width: 338, height: 150, labelY: 144, xs: { BASELINE: 24, MID: 169, FINAL: 314 } as const };
export const LSSS_TICKS = [50, 70, 90] as const;
const LSSS_TOP = 26;
const LSSS_BOTTOM = 118;

/**
 * Échelle verticale de la courbe LSSS. Dans le repère du canevas, 2 pt par point (50 → 100, 70 → 60, 90 → 20) ; quand une
 * valeur sort de [41 ; 87], l'échelle s'adapte pour que les points et leurs étiquettes restent dans le cadre.
 */
export function lsssScale(values: number[]): { y: (v: number) => number; ticks: { value: number; y: number }[] } {
  const lo = Math.min(41, ...values);
  const hi = Math.max(87, ...values);
  const fits = lo === 41 && hi === 87;
  const y = (v: number) => (fits ? 200 - 2 * v : LSSS_BOTTOM - ((v - lo) / (hi - lo)) * (LSSS_BOTTOM - LSSS_TOP));
  const ticks = LSSS_TICKS.filter((t) => y(t) >= 8 && y(t) <= 134).map((t) => ({ value: t, y: y(t) }));
  return { y, ticks };
}

export type LsssPlotPoint = { moment: LsssPoint['moment']; value: number; x: number; y: number };

/** Un point par moment du parcours (départ, mi-parcours, final), à l'abscisse fixe du canevas. */
export function lsssPlot(points: LsssPoint[]): { points: LsssPlotPoint[]; ticks: { value: number; y: number }[] } {
  const order: LsssPoint['moment'][] = ['BASELINE', 'MID', 'FINAL'];
  const found = order
    .map((m) => points.find((p) => p.moment === m))
    .filter((p): p is LsssPoint => !!p);
  const scale = lsssScale(found.map((p) => Math.round(p.value)));
  return {
    points: found.map((p) => ({ moment: p.moment, value: Math.round(p.value), x: LSSS_CHART.xs[p.moment], y: scale.y(Math.round(p.value)) })),
    ticks: scale.ticks,
  };
}

export const WELLBEING_CHART = { width: 338, height: 64, left: 4, right: 334, step: 330 / 12 };

/** Points du bien-être : une abscisse par séance (1 à 13), ordonnée 52 (valeur 1) à 12 (valeur 5). */
export function wellbeingPlot(points: WellbeingPoint[]): { x: number; y: number; session: number }[] {
  return wellbeingSeries(points).map((p) => {
    const v = Math.min(5, Math.max(1, p.value));
    return { session: p.session_number, x: WELLBEING_CHART.left + (p.session_number - 1) * WELLBEING_CHART.step, y: 12 + (5 - v) * 10 };
  });
}

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

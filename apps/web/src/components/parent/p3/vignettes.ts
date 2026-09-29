// Vignettes mascotte des fiches (brief du 28/09/2026 : une vignette par activité).
// Les fichiers vivent dans public/p3/vignettes/<ID>.webp, découpés tels quels des
// planches fournies (pixels inchangés, WebP sans perte). Une activité absente de
// la liste garde l'affiche composée par pilier, le temps que sa vignette arrive.

const WITH_VIGNETTE = new Set<string>([
  'ACT-0101', 'ACT-0104', 'ACT-0102', 'ACT-0103',
  'ACT-0201', 'ACT-0202', 'ACT-0204', 'ACT-0203',
  'ACT-0301', 'ACT-0302', 'ACT-0304', 'ACT-0305', 'ACT-0303',
  'ACT-0401', 'ACT-0404', 'ACT-0402', 'ACT-0403',
  'ACT-0501', 'ACT-0502', 'ACT-0504', 'ACT-0503',
  'ACT-0601', 'ACT-0602', 'ACT-0604', 'ACT-0603',
  // En attente : ACT-0704 (no 28)
  'ACT-0701', 'ACT-0702', 'ACT-0703',
  'ACT-0801', 'ACT-0804', 'ACT-0802', 'ACT-0803',
  'ACT-0901', 'ACT-0902', 'ACT-0903',
  'ACT-1001', 'ACT-1004', 'ACT-1002', 'ACT-1003',
  'ACT-1101', 'ACT-1102', 'ACT-1104', 'ACT-1103', 'ACT-1105',
  'ACT-1201', 'ACT-1202', 'ACT-1204', 'ACT-1203',
  'ACT-1301', 'ACT-1302', 'ACT-1303',
  'BON-01',
]);

/** Chemin de la vignette de l'activité, ou null si elle n'en a pas encore. */
export function vignetteSrc(activityId: string): string | null {
  return WITH_VIGNETTE.has(activityId) ? `/p3/vignettes/${activityId}.webp` : null;
}

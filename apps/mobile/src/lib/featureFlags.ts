// Drapeaux de fonctionnalités de l'app mobile.

/** Interprète une valeur d'environnement ; tout sauf « true » / « 1 » vaut faux. */
export function parseFlag(value: string | undefined | null, fallback = false): boolean {
  if (value == null || value === '') return fallback;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1';
}

/** Séances vidéo de 20 minutes : fermées tant que le contenu n'est pas prêt (écran « En construction »). */
export const VIDEO_SESSIONS_ENABLED: boolean = parseFlag(process.env.EXPO_PUBLIC_VIDEO_SESSIONS_ENABLED, false);

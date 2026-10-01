// Après un déploiement, une PWA restée ouverte référence encore les fichiers JS
// de la version précédente : la navigation vers un écran pas encore chargé
// échoue (ChunkLoadError). « Réessayer » rejouerait le même échec : seule une
// recharge complète récupère la nouvelle version. On ne recharge qu'une fois
// par minute pour ne jamais boucler si l'erreur a une autre cause.

const KEY = 'thrive-stale-build-reload';

export function isStaleBuildError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  return /Loading (CSS )?chunk \S+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error.message ?? ''
  );
}

/** Recharge la page si aucune recharge automatique n'a eu lieu dans la dernière minute. */
export function reloadOnceForNewBuild(now = Date.now()): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
    if (now - last < 60_000) return false;
    window.sessionStorage.setItem(KEY, String(now));
  } catch {
    /* stockage indisponible : on recharge quand même, une seule fois par rendu */
  }
  window.location.reload();
  return true;
}

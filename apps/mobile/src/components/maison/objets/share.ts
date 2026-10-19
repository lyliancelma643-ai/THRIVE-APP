// Imprimer / Enregistrer en image / Partager (N2–N4). Logique PURE avec dépendances injectées : les modules
// natifs (expo-print, expo-sharing, react-native-view-shot) vivent dans `nativeShare.ts`, jamais importés ici,
// pour que le comportement de repli se teste sans environnement natif.

export type ObjectShareDeps = {
  /** Ouvre la feuille d'impression système avec le HTML de la carte. */
  print: (html: string) => Promise<void>;
  /** Dessine la carte à l'écran et renvoie l'URI d'un fichier PNG temporaire. */
  capture: () => Promise<string>;
  /** `Sharing.isAvailableAsync()` ; peut être absent (module non fourni par la plateforme) : alors faux. */
  isSharingAvailable?: () => Promise<boolean>;
  /** Ouvre la feuille de partage système sur le fichier (elle propose « Enregistrer l'image »). */
  share: (uri: string, dialogTitle: string) => Promise<void>;
};

/** `done` : l'action demandée a eu lieu ; `printed` : repli sur l'impression ; `failed` : rien n'a pu se faire (discret). */
export type ShareOutcome = 'done' | 'printed' | 'failed';

async function sharingAvailable(deps: ObjectShareDeps): Promise<boolean> {
  try {
    return typeof deps.isSharingAvailable === 'function' ? !!(await deps.isSharingAvailable()) : false;
  } catch {
    return false;
  }
}

/** Imprimer : jamais d'exception. Annuler la feuille système n'est pas une erreur. */
export async function printObject(html: string | null, deps: ObjectShareDeps): Promise<ShareOutcome> {
  if (!html) return 'failed';
  try {
    await deps.print(html);
    return 'done';
  } catch {
    return 'failed';
  }
}

/**
 * Enregistrer en image / Partager : capture de la carte puis feuille de partage système.
 * Sans partage disponible (ou capture impossible) : repli sur l'impression seule, sans message d'erreur.
 */
export async function shareObjectImage(html: string | null, dialogTitle: string, deps: ObjectShareDeps): Promise<ShareOutcome> {
  if (await sharingAvailable(deps)) {
    try {
      const uri = await deps.capture();
      await deps.share(uri, dialogTitle);
      return 'done';
    } catch {
      // La capture ou la feuille a échoué : on retombe sur l'impression ci-dessous.
    }
  }
  const printed = await printObject(html, deps);
  return printed === 'done' ? 'printed' : 'failed';
}

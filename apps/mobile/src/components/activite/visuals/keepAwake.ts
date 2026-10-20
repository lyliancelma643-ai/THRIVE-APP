import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// E1 · L'écran reste allumé pendant tout le mode activité (le téléphone est posé, tendu à l'enfant, ou sert de minuteur) et
// redevient normal à la sortie de la route. Étiquette propre au mode activité : elle ne relâche pas un autre verrou.
export const ACTIVITY_KEEP_AWAKE_TAG = 'thrive-mode-activite';

export type KeepAwakeApi = {
  activate: (tag: string) => Promise<unknown> | void;
  deactivate: (tag: string) => Promise<unknown> | void;
};

const native: KeepAwakeApi = { activate: activateKeepAwakeAsync, deactivate: deactivateKeepAwake };

/** Active le verrou et rend la fonction qui le relâche. Une erreur native n'interrompt jamais l'activité. */
export function holdScreenAwake(api: KeepAwakeApi = native, tag: string = ACTIVITY_KEEP_AWAKE_TAG): () => void {
  const swallow = (r: Promise<unknown> | void) => {
    if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => undefined);
  };
  try {
    swallow(api.activate(tag));
  } catch {
    /* écran non verrouillable : l'activité continue */
  }
  return () => {
    try {
      swallow(api.deactivate(tag));
    } catch {
      /* rien à relâcher */
    }
  };
}

/** Effet de focus : verrou pris à la prise de focus, rendu à la perte de focus et au démontage. Fonction stable (pas de useCallback). */
export function activityFocusEffect(): () => void {
  return holdScreenAwake();
}

/**
 * À appeler une fois dans la route du mode activité. Le moment est un onglet (Tabs) : quitter l'écran change d'onglet SANS le
 * démonter, donc le verrou suit le FOCUS (useFocusEffect), pas le montage.
 */
export function useActivityKeepAwake(): void {
  useFocusEffect(activityFocusEffect);
}

/** Clé de réinitialisation du flot : change à chaque nouvelle entrée (retour de focus) ou quand les paramètres du moment changent. */
export function flowResetKey(entry: number, params: Array<string | undefined>): string {
  return [entry, ...params.map((p) => p ?? '')].join('|');
}

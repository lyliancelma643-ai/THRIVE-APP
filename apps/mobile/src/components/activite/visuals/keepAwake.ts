import { useEffect } from 'react';
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

/** À appeler une fois dans la route du mode activité. */
export function useActivityKeepAwake(): void {
  useEffect(() => holdScreenAwake(), []);
}

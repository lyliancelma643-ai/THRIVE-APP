import type { ReactElement } from 'react';
import type { ParentRoute } from '../design';

/**
 * Un écran du canevas Claude Design rendu avec des données de démonstration (DEV uniquement).
 * `id` = lettre du canevas (A, B, K, K2, D2, Y2…). `render` reçoit le style courant et doit renvoyer la VUE
 * présentationnelle de l'écran (la même que celle utilisée par la route réelle), alimentée par des fixtures.
 * `tab` : onglet actif de la barre flottante à afficher sous l'écran (null = pas de barre, ex. feuilles, auth).
 */
export type GalleryScreen = {
  id: string;
  title: string;
  tab: ParentRoute | null;
  render: () => ReactElement;
};

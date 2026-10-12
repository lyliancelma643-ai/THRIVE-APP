import type { StyleKey } from './tokens';

/** Routes de l'espace parent. Les six restent joignables ; seules trois sont dans la barre. */
export type ParentRoute = 'dashboard' | 'maison' | 'bilans' | 'seances' | 'messages' | 'profile';

export type TabIconName = 'home' | 'stats-chart' | 'calendar' | 'chatbubbles' | 'moon' | 'search' | 'book';

export type TabSpec = { route: ParentRoute; label: string; icon: TabIconName };

export type TabLayout = {
  tabs: readonly [TabSpec, TabSpec, TabSpec];
  /** Onglet Prominent : rond détaché, teinté. */
  prominent: TabSpec;
};

/**
 * Barre d'onglets du parent par style (GO3 §3.1).
 * Carnet : l'onglet Prominent « Rechercher » n'a pas d'écran dédié (aucune route de recherche) ;
 * il renvoie vers `maison`, la route existante la plus proche.
 */
export const TAB_LAYOUTS: Record<StyleKey, TabLayout> = {
  natif: {
    tabs: [
      { route: 'maison', label: 'Maison', icon: 'home' },
      { route: 'bilans', label: 'Bilan', icon: 'stats-chart' },
      { route: 'seances', label: 'Mes séances', icon: 'calendar' },
    ],
    prominent: { route: 'messages', label: 'Coach', icon: 'chatbubbles' },
  },
  nuit: {
    tabs: [
      { route: 'maison', label: 'Maison', icon: 'home' },
      { route: 'bilans', label: 'Bilan', icon: 'stats-chart' },
      { route: 'seances', label: 'Mes séances', icon: 'calendar' },
    ],
    prominent: { route: 'maison', label: 'Ce soir', icon: 'moon' },
  },
  carnet: {
    tabs: [
      { route: 'maison', label: 'Ce soir', icon: 'moon' },
      { route: 'bilans', label: 'Bilan', icon: 'stats-chart' },
      { route: 'seances', label: 'Mes séances', icon: 'calendar' },
    ],
    prominent: { route: 'maison', label: 'Rechercher', icon: 'search' },
  },
};

/** Routes sorties de la barre (`href: null`) mais toujours joignables par router.push. */
export const HIDDEN_FROM_BAR: readonly ParentRoute[] = ['dashboard', 'messages', 'profile'];

export function tabLayoutFor(style: StyleKey): TabLayout {
  return TAB_LAYOUTS[style];
}

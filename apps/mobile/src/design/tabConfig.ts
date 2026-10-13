import type { IconName } from './icons';
import type { StyleKey } from './tokens';

/** Routes de l'espace parent. Les six restent joignables ; seules trois sont dans la barre. */
export type ParentRoute = 'dashboard' | 'maison' | 'bilans' | 'seances' | 'messages' | 'profile';

export type TabSpec = { route: ParentRoute; label: string; glyph: IconName };

/**
 * Teinte de l'onglet Prominent (V1/V2/V3 du canevas) :
 * `auto` = teinté seulement quand sa route est active (Natif : Coach) ; `tinted` = toujours (Nuit calme : « Ce soir ») ;
 * `glass` = jamais, verre neutre (Carnet : « Rechercher »).
 */
export type ProminentTone = 'auto' | 'tinted' | 'glass';

export type TabLayout = {
  tabs: readonly [TabSpec, TabSpec, TabSpec];
  /** Onglet Prominent : rond détaché, icône seule. */
  prominent: TabSpec & { tone: ProminentTone };
};

/**
 * Barre d'onglets du parent par style, relevée sur les écrans K, G, S, U du canevas (V1/V2/V3) :
 * - Natif : Maison (maison) · Bilan (étincelles) · Mes séances (calendrier) + Coach (bulle, route messages).
 * - Nuit calme : mêmes trois onglets + « Ce soir » (lecture) en Prominent, toujours teinté (soleil).
 * - Carnet : Ce soir (lune) · Bilan (carte d'identité) · Mes séances + « Rechercher » (loupe) en Prominent verre neutre.
 * Carnet : l'onglet Prominent « Rechercher » n'a pas d'écran dédié (aucune route de recherche) ;
 * il renvoie vers `maison`, la route existante la plus proche. Idem « Ce soir » en Nuit calme.
 */
export const TAB_LAYOUTS: Record<StyleKey, TabLayout> = {
  natif: {
    tabs: [
      { route: 'maison', label: 'Maison', glyph: 'home' },
      { route: 'bilans', label: 'Bilan', glyph: 'sparkles' },
      { route: 'seances', label: 'Mes séances', glyph: 'calendar' },
    ],
    prominent: { route: 'messages', label: 'Coach', glyph: 'chat', tone: 'auto' },
  },
  nuit: {
    tabs: [
      { route: 'maison', label: 'Maison', glyph: 'home' },
      { route: 'bilans', label: 'Bilan', glyph: 'sparkles' },
      { route: 'seances', label: 'Mes séances', glyph: 'calendar' },
    ],
    prominent: { route: 'maison', label: 'Ce soir', glyph: 'play', tone: 'tinted' },
  },
  carnet: {
    tabs: [
      { route: 'maison', label: 'Ce soir', glyph: 'moon' },
      { route: 'bilans', label: 'Bilan', glyph: 'idCard' },
      { route: 'seances', label: 'Mes séances', glyph: 'calendar' },
    ],
    prominent: { route: 'maison', label: 'Rechercher', glyph: 'search', tone: 'glass' },
  },
};

/** Routes sorties de la barre (`href: null`) mais toujours joignables par router.push. */
export const HIDDEN_FROM_BAR: readonly ParentRoute[] = ['dashboard', 'messages', 'profile'];

export function tabLayoutFor(style: StyleKey): TabLayout {
  return TAB_LAYOUTS[style];
}

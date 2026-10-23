import type { IconName } from './icons';
import { normalizeStyle } from './styleMigration';
import type { StyleKey } from './tokens';

/** Routes de l'espace parent. Les six restent joignables ; seules trois sont dans la barre. */
export type ParentRoute = 'dashboard' | 'maison' | 'bilans' | 'seances' | 'messages' | 'profile';

export type TabSpec = { route: ParentRoute; label: string; glyph: IconName };

/**
 * Teinte de l'onglet Prominent (V4/V5 du canevas) : `felt` dans les deux styles
 * (`.tabbar .prom` : feutre marine #004E7A le jour, feutre #0B3C59 cerclé la nuit). Jamais de jaune :
 * le soleil est réservé au geste principal de l'écran.
 */
export type ProminentTone = 'felt';

export type TabLayout = {
  tabs: readonly [TabSpec, TabSpec, TabSpec];
  /** Onglet Prominent : rond détaché, icône seule (le libellé ne sert qu'à VoiceOver). */
  prominent: TabSpec & { tone: ProminentTone };
};

const MAIN_TABS = [
  { route: 'maison', label: 'Maison', glyph: 'home' },
  { route: 'bilans', label: 'Bilan', glyph: 'sparkles' },
  { route: 'seances', label: 'Mes séances', glyph: 'calendar' },
] as const satisfies readonly TabSpec[];

/**
 * Barre d'onglets du parent (identique dans les deux styles) : Maison · Bilan · Mes séances, plus le rond détaché
 * « Messages » (bulle, route `messages`) qui mène directement aux fils du coach et du Support THRIVE.
 * Le libellé du rond n'est lu que par VoiceOver ; une pastille y montre les messages non lus.
 */
export const TAB_LAYOUTS: Record<StyleKey, TabLayout> = {
  lin: {
    tabs: MAIN_TABS,
    prominent: { route: 'messages', label: 'Messages : coach et support', glyph: 'chat', tone: 'felt' },
  },
  veillee: {
    tabs: MAIN_TABS,
    prominent: { route: 'messages', label: 'Messages : coach et support', glyph: 'chat', tone: 'felt' },
  },
};

/** Routes sorties de la barre (`href: null`) mais toujours joignables par router.push. */
export const HIDDEN_FROM_BAR: readonly ParentRoute[] = ['dashboard', 'messages', 'profile'];

/** Accepte aussi une ancienne valeur de style (migration) ; défaut Lin. */
export function tabLayoutFor(style: unknown): TabLayout {
  return TAB_LAYOUTS[normalizeStyle(style)];
}

/**
 * Onglet de la barre à mettre en évidence pour la route active : aucun quand c'est la route du Prominent
 * seule (Coach), sinon la route elle-même. Un Prominent qui partage la route de Maison (Ce soir) laisse
 * Maison actif.
 */
export function activeTabKey(layout: TabLayout, activeRoute: string | undefined): string {
  if (!activeRoute) return '';
  const inBar = layout.tabs.some((t) => t.route === activeRoute);
  return inBar ? activeRoute : '';
}

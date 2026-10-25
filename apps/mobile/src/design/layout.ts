import { useWindowDimensions as useRNWindowDimensions } from 'react-native';

/**
 * Mise en page adaptative iPhone / iPad (détection automatique, orientation comprise).
 *
 * Sur iPad (11″ : 834 × 1194 pt, 13″ : 1032 × 1366 pt), les écrans de contenu (Maison, Bilan, Séances…) occupent TOUTE la largeur — en-tête, barre
 * d'onglets et fond d'un bord à l'autre — avec un contenu centré de 1180 pt au plus ; les formulaires restent en colonne de 720 pt
 * sur le MÊME fond (aucune bande d'une autre couleur). Les grilles gagnent une colonne dès 700 pt. Sur iPhone rien ne change (largeur < 700).
 */
export const MAX_COLUMN = 1180;
/** Écrans de formulaire / liste groupée (compte, enfants, connexion…) : colonne plus étroite. */
export const FORM_COLUMN = 720;
export const TABLET_MIN = 700;

/** Remplace `useWindowDimensions` : la largeur rendue est celle de la colonne, pas celle de l'écran. */
export function useWindowDimensions() {
  const win = useRNWindowDimensions();
  return { ...win, width: Math.min(win.width, MAX_COLUMN), screenWidth: win.width };
}

export function useLayout() {
  const win = useRNWindowDimensions();
  const width = Math.min(win.width, MAX_COLUMN);
  return {
    width,
    height: win.height,
    screenWidth: win.width,
    isTablet: win.width >= TABLET_MIN,
    /** iPad : assez large pour deux colonnes de blocs côte à côte. */
    wide: win.width >= 800,
    landscape: win.width > win.height,
    /** Marge de chaque côté de la colonne (0 sur iPhone) : les calques plein écran (feuilles, menus) s'y alignent. */
    inset: Math.max(0, (win.width - width) / 2),
    /** Marge de chaque côté d'une feuille / d'une fenêtre modale (largeur 680 pt au plus sur iPad). */
    sheetInset: Math.max(0, (win.width - 680) / 2),
    /** Colonnes des grilles de fiches : 2 sur iPhone, 3 sur iPad. */
    columns: width >= 1000 ? 4 : width >= TABLET_MIN ? 3 : 2,
  };
}

/** Largeur en % d'une cellule de grille de `columns` colonnes (gouttières de ≈ 3,6 %). */
export const cellWidth = (columns: number) => `${(100 - (columns - 1) * 3.6) / columns}%` as `${number}%`;

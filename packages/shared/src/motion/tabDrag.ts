/**
 * Navigation pendant le glissé de la goutte (barre d'onglets flottante).
 *
 * Avant : chaque onglet survolé déclenchait aussitôt `navigate` — un glissé Bilan → Maison → Séances enchaînait 3
 * changements d'onglet en ~150 ms. Chaque passage focalisait puis quittait l'écran traversé (transition « shift »
 * interrompue, écran détaché par react-native-screens juste après son premier montage : carte du Bilan mesurée à
 * 0 px, entrées animées jamais jouées, page de chargement lancée hors écran) → page blanche au retour.
 *
 * Maintenant : un onglet survolé n'est ouvert que si la goutte s'y attarde `dwell` ms ; au lâcher, l'onglet sous la
 * goutte est ouvert tout de suite. Jamais deux fois de suite le même onglet, jamais l'onglet déjà ouvert.
 */
export type TabDragNavOptions = {
  /** Temps de survol avant d'ouvrir l'onglet traversé (plus long que la transition « shift » de 150 ms). */
  dwell?: number;
  onNavigate: (index: number) => void;
};

export const TAB_DRAG_DWELL_MS = 220;

export function createTabDragNav(opts: TabDragNavOptions) {
  const dwell = opts.dwell ?? TAB_DRAG_DWELL_MS;
  let active = false;
  let committed = -1;
  let hovered = -1;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const commit = (idx: number) => {
    clear();
    if (idx < 0 || idx === committed) return;
    committed = idx;
    opts.onNavigate(idx);
  };

  return {
    /** Le doigt soulève la goutte sur l'onglet `current` (celui déjà ouvert). */
    begin(current: number) {
      clear();
      active = true;
      committed = current;
      hovered = current;
    },
    /** La goutte passe au-dessus de l'onglet `idx`. */
    hover(idx: number) {
      if (!active || idx === hovered) return;
      hovered = idx;
      clear();
      if (idx === committed) return;
      timer = setTimeout(() => {
        timer = null;
        if (active && hovered === idx) commit(idx);
      }, dwell);
    },
    /** Lâcher (ou geste interrompu) : l'onglet sous la goutte est ouvert. */
    release(idx: number) {
      if (!active) return;
      active = false;
      hovered = idx;
      commit(idx);
    },
    /** L'onglet ouvert a changé par ailleurs (toucher, lien) : sert de référence pour ne pas le rouvrir. */
    sync(current: number) {
      if (!active) committed = current;
    },
    isActive: () => active,
    committed: () => committed,
    dispose() {
      clear();
      active = false;
    },
  };
}

export type TabDragNav = ReturnType<typeof createTabDragNav>;

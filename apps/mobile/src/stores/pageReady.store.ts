import { useEffect } from 'react';
import { create } from 'zustand';

export type TabKey = 'maison' | 'bilan' | 'seances';

/**
 * Préparation des trois onglets : chaque page signale ses étapes réelles (dossier lu, carte affichée…), et la page de
 * chargement de l'onglet (TabGate) ne s'efface qu'une fois toutes faites. `revealed` : l'onglet a déjà été montré
 * une fois dans la session — sa page de chargement ne revient plus (remis à zéro à la déconnexion).
 */
type PageReadyState = {
  marks: Record<TabKey, string[]>;
  revealed: Record<TabKey, boolean>;
  mark: (tab: TabKey, key: string) => void;
  reveal: (tab: TabKey) => void;
  reset: () => void;
};

const EMPTY = () => ({ marks: { maison: [], bilan: [], seances: [] }, revealed: { maison: false, bilan: false, seances: false } });

export const usePageReadyStore = create<PageReadyState>((set) => ({
  ...EMPTY(),
  mark: (tab, key) =>
    set((s) => (s.marks[tab].includes(key) ? s : { marks: { ...s.marks, [tab]: [...s.marks[tab], key] } })),
  reveal: (tab) => set((s) => (s.revealed[tab] ? s : { revealed: { ...s.revealed, [tab]: true } })),
  reset: () => set(EMPTY()),
}));

/** Signale l'étape `key` de l'onglet `tab` dès que `done` devient vrai. */
export function usePageStage(tab: TabKey, key: string, done: boolean) {
  useEffect(() => {
    if (done) usePageReadyStore.getState().mark(tab, key);
  }, [tab, key, done]);
}

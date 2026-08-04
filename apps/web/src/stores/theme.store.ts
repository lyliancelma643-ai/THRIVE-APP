'use client';

// Ambiance de l'espace parent : « Nuit calme » (défaut) ou « Jour clair ».
//
// L'attribut est posé sur <html> — et non sur un conteneur — pour que les
// fenêtres rendues en portail (document.body) héritent des mêmes tokens que le
// reste de l'écran. Le choix est mémorisé d'une visite à l'autre.
//
// Le script anti-clignotement de app/layout.tsx applique la même clé AVANT le
// premier rendu : aucun éclair de nuit avant de passer au jour.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Ambiance = 'night' | 'day';

export const THEME_STORAGE_KEY = 'thrive-ambiance';

type ThemeStore = {
  ambiance: Ambiance;
  setAmbiance: (a: Ambiance) => void;
  toggle: () => void;
};

function apply(ambiance: Ambiance) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = ambiance;
  // Barre système du navigateur / PWA accordée au fond de page.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', ambiance === 'day' ? '#F2EFE9' : '#06161E');
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ambiance: 'night',
      setAmbiance: (ambiance) => {
        apply(ambiance);
        set({ ambiance });
      },
      toggle: () => get().setAmbiance(get().ambiance === 'night' ? 'day' : 'night'),
    }),
    {
      name: THEME_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.ambiance);
      },
    }
  )
);

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Mémoire de défilement des écrans Maison, le temps de la session de l'onglet.
//
// Geste « retour » (bouton, balayage de bord iOS / Android) : on retrouve la page
// exactement où on l'avait laissée — hauteur de la page ET position de chaque
// rangée. Une arrivée normale (onglet, lien) repart du haut, comme avant.
// Les données arrivent après un squelette : le Router ne peut pas restaurer seul.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type RefObject } from 'react';

const memory = new Map<string, unknown>();
let lastPop = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    lastPop = Date.now();
  });
}

/** Vrai si l'écran se monte suite à un retour / avance dans l'historique. */
export function cameBack(): boolean {
  return Date.now() - lastPop < 4000;
}

/** Hauteur de page : restaurée au retour, remise en haut sinon. */
export function usePageScrollMemory(key: string) {
  useEffect(() => {
    const saved = memory.get(key);
    if (cameBack() && typeof saved === 'number') {
      // Deux images : le temps que les rangées aient pris leur hauteur.
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' })));
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    const onScroll = () => memory.set(key, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key]);
}

/** Position horizontale d'une rangée : restaurée au retour. Renvoie le gestionnaire onScroll. */
export function useRowScrollMemory(key: string, ref: RefObject<HTMLElement | null>) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = memory.get(key);
    if (ref.current && cameBack() && typeof saved === 'number') ref.current.scrollLeft = saved;
  }, [key, ref]);
  return () => {
    if (ref.current) memory.set(key, ref.current.scrollLeft);
  };
}

/** Un choix d'écran (âge, filtre, ordre) gardé pendant la session de l'onglet. */
export function recall<T>(key: string, fallback: T): T {
  return memory.has(key) ? (memory.get(key) as T) : fallback;
}
export function remember<T>(key: string, value: T) {
  memory.set(key, value);
}

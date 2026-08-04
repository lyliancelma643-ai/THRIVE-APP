'use client';

// Bascule d'ambiance — le rond soleil/lune du header, à côté de l'avatar.
// Un seul jeu de tokens change (globals.css) : le marine devient papier crème,
// le jaune reste l'accent d'action, le texte marine reprend le contraste.
// Le contenu ne bouge pas d'un pixel.

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/stores/theme.store';

export function AmbianceToggle() {
  const { ambiance, toggle } = useThemeStore();
  // Le store est hydraté depuis localStorage après le premier rendu : tant
  // qu'on n'en est pas là, on n'affiche aucune icône plutôt qu'une fausse.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const isNight = ambiance === 'night';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isNight ? 'Passer à l’ambiance Jour clair' : 'Passer à l’ambiance Nuit calme'}
      title="Changer d’ambiance"
      className="nc-iconbtn select-none cursor-pointer"
      style={{ background: 'var(--surface-sub)' }}
    >
      {!ready ? (
        <span className="w-5 h-5" aria-hidden />
      ) : isNight ? (
        // En nuit, on propose le soleil (la destination, pas l'état courant)
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3.2v1.6M12 19.2v1.6M3.2 12h1.6M19.2 12h1.6M5.8 5.8l1.1 1.1M17.1 17.1l1.1 1.1M18.2 5.8l-1.1 1.1M6.9 17.1l-1.1 1.1" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

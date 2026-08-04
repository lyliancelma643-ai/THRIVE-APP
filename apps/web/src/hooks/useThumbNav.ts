'use client';

// Navigation au pouce — on passe de Bilan à Mes séances à Fitness en glissant,
// sans viser la barre d'onglets.
//
// Règles reprises du prototype de design :
//   • le contenu suit le doigt en direct (aucune latence, aucun seuil aveugle) ;
//   • au-delà de 56 px on change d'onglet, en dessous ça revient en place ;
//   • aux deux extrémités, la course est freinée à 25 % — la butée se sent ;
//   • le défilement vertical reste prioritaire : dès que le geste part vers le
//     haut ou le bas, on lâche la main (et `touch-action: pan-y` sur l'élément) ;
//   • l'écran entrant glisse de 30 px DANS LE SENS DU GESTE, jamais l'inverse.

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export const SWIPE_THRESHOLD = 56;
const EDGE_RESISTANCE = 0.25;
/** En deçà, on considère que le doigt n'a pas encore choisi sa direction. */
const DIRECTION_LOCK = 10;

export type ThumbNav = {
  /** Décalage courant du contenu, en pixels (0 au repos). */
  dragX: number;
  /** `true` pendant le geste : le conteneur ne doit alors PAS animer sa position. */
  dragging: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: (e: ReactPointerEvent) => void;
  };
};

export function useThumbNav({
  index,
  count,
  onChange,
  enabled = true,
}: {
  index: number;
  count: number;
  /** `direction` vaut +1 (vers la gauche, onglet suivant) ou -1. */
  onChange: (nextIndex: number, direction: 1 | -1) => void;
  enabled?: boolean;
}): ThumbNav {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'none' | 'x' | 'y'>('none');

  const reset = useCallback(() => {
    start.current = null;
    axis.current = 'none';
    setDragging(false);
    setDragX(0);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled) return;
      // Souris : on laisse la sélection de texte et les clics tranquilles.
      if (e.pointerType === 'mouse') return;
      start.current = { x: e.clientX, y: e.clientY };
      axis.current = 'none';
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const origin = start.current;
      if (!origin) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;

      if (axis.current === 'none') {
        if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return;
        // Le défilement vertical gagne toujours l'arbitrage.
        axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis.current === 'y') {
          start.current = null;
          return;
        }
        setDragging(true);
      }

      // Résistance aux extrémités : on sent qu'il n'y a rien après.
      const pastStart = dx > 0 && index === 0;
      const pastEnd = dx < 0 && index === count - 1;
      setDragX(pastStart || pastEnd ? dx * EDGE_RESISTANCE : dx);
    },
    [index, count]
  );

  const onPointerUp = useCallback(() => {
    const wasDragging = axis.current === 'x';
    const dx = dragX;
    reset();
    if (!wasDragging || Math.abs(dx) < SWIPE_THRESHOLD) return;

    const direction: 1 | -1 = dx < 0 ? 1 : -1; // glisser vers la gauche = onglet suivant
    const next = index + direction;
    if (next < 0 || next > count - 1) return;
    onChange(next, direction);
  }, [dragX, index, count, onChange, reset]);

  return {
    dragX,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
    },
  };
}

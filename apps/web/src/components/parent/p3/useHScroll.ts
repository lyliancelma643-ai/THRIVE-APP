'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Rangée qui défile au doigt (affiches, filtres, raccourcis), sans effet de bord.
//
//   • Au début d'une rangée, un balayage vers la droite n'a plus rien à faire
//     défiler : le navigateur le passait à la page, et Chrome Android le prenait
//     pour un « retour ». On ne lui confie donc que les sens où la rangée peut
//     encore défiler (`touch-action: pan-right` au début, `pan-left` à la fin).
//     Navigateurs qui ne connaissent pas ces valeurs (iOS) : l'affectation est
//     ignorée et rien ne change.
//   • Les gestes nés dans la rangée ne remontent pas à la navigation au pouce du
//     layout (changement d'onglet) : faire défiler des activités ne fait jamais
//     quitter Maison.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useRowScrollMemory } from './scrollMemory';

const stop = (e: PointerEvent) => e.stopPropagation();

export function useHScroll(memoryKey?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const save = useRowScrollMemory(memoryKey ?? '', ref);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft < 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
    const action = start && end ? 'pan-y' : start ? 'pan-right pan-y' : end ? 'pan-left pan-y' : 'pan-x pan-y';
    el.style.touchAction = `${action} pinch-zoom`;
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(measure) : null;
    if (ro && el) ro.observe(el);
    return () => ro?.disconnect();
  }, [measure]);

  return {
    ref,
    edges,
    props: {
      ref,
      onScroll: () => {
        if (memoryKey) save();
        measure();
      },
      onPointerDown: stop,
      onPointerMove: stop,
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Rangée qui défile au doigt, à la souris et au clavier, sans effet de bord.
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
//   • Souris : on peut attraper la rangée et la faire glisser ; un glisser ne
//     déclenche jamais le lien sous le curseur, et ne sélectionne pas de texte.
//   • Clavier : la rangée est focusable, ← / → la font défiler nativement.
//   • `progress` / `ratio` alimentent l'indicateur de position.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useRowScrollMemory } from './scrollMemory';

const DRAG_THRESHOLD = 6;

export function useHScroll(memoryKey?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const save = useRowScrollMemory(memoryKey ?? '', ref);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [pos, setPos] = useState({ progress: 0, ratio: 1 });
  const drag = useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const start = el.scrollLeft < 4;
    const end = el.scrollLeft >= max - 4;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
    const progress = max > 0 ? el.scrollLeft / max : 0;
    const ratio = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
    setPos((p) => (Math.abs(p.progress - progress) < 0.005 && p.ratio === ratio ? p : { progress, ratio }));
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

  // Un glisser à la souris ne doit jamais ouvrir la fiche sous le curseur.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (drag.current?.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
      drag.current = null;
    };
    el.addEventListener('click', onClick, true);
    return () => el.removeEventListener('click', onClick, true);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const d = drag.current;
    const el = ref.current;
    if (!d || !el || e.pointerType !== 'mouse') return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      el.setPointerCapture?.(d.id);
      // L'accroche est suspendue pendant le glisser, puis rétablie : la rangée
      // se cale alors sur la vignette la plus proche.
      el.style.scrollSnapType = 'none';
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }
    el.scrollLeft = d.left - dx;
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = ref.current;
    if (!el || !drag.current?.moved) {
      if (drag.current && !drag.current.moved) drag.current = null;
      return;
    }
    el.releasePointerCapture?.(drag.current.id);
    el.style.scrollSnapType = '';
    el.style.cursor = '';
    el.style.userSelect = '';
    // `moved` reste vrai jusqu'au clic synthétique qui suit, qu'on neutralise.
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  const page = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  }, []);

  return {
    ref,
    edges,
    progress: pos.progress,
    ratio: pos.ratio,
    page,
    props: {
      ref,
      onScroll: () => {
        if (memoryKey) save();
        measure();
      },
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}

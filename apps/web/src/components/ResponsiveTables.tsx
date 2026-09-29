'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Tableaux lisibles sur téléphone, sans toucher à leurs données.
//
// Monté une fois dans les coques coach et admin : chaque <table> de la zone
// reçoit, pour chaque cellule, le libellé de sa colonne (data-label). Sous
// 768 px, la feuille de style (.rt-scope, globals.css) affiche alors chaque
// ligne comme une carte « libellé : valeur » au lieu d'un tableau qui déborde.
// Au-delà, le conteneur défilant du tableau devient une région focusable
// (défilement au clavier) avec un nom accessible.
// Un MutationObserver suit les rechargements (filtres, temps réel).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type RefObject } from 'react';

function label(root: HTMLElement) {
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const heads = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim() ?? '');
    if (!heads.length) continue;
    table.classList.add('rt-table');
    for (const tr of Array.from(table.querySelectorAll('tbody tr'))) {
      Array.from(tr.children).forEach((td, i) => {
        const text = heads[i] ?? '';
        if ((td as HTMLElement).dataset.label !== text) (td as HTMLElement).dataset.label = text;
      });
    }
    for (const th of Array.from(table.querySelectorAll('thead th'))) if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
    const scroller = table.parentElement;
    if (scroller && /(auto|scroll)/.test(getComputedStyle(scroller).overflowX) && !scroller.hasAttribute('tabindex')) {
      scroller.setAttribute('tabindex', '0');
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', table.getAttribute('aria-label') ?? 'Tableau défilant');
    }
  }
}

export function useResponsiveTables(ref: RefObject<HTMLElement | null>, ready = true) {
  useEffect(() => {
    const root = ref.current;
    if (!ready || !root) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => label(root));
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [ref, ready]);
}

'use client';

import { useEffect, type RefObject } from 'react';

// Menus déroulants de l'en-tête : à l'ouverture le focus va sur la première
// entrée, ↑ / ↓ / Début / Fin circulent entre les entrées, Échap et Tab
// referment le menu et rendent le focus au bouton qui l'a ouvert.
export function useMenuKeyboard(
  menuRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!open) return;
    const items = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    const raf = requestAnimationFrame(() => items()[0]?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape' || e.key === 'Tab') {
        if (e.key === 'Escape') e.preventDefault();
        close();
        triggerRef.current?.focus({ preventScroll: true });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menuRef, triggerRef, close]);
}

'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Sorties uniformes pour toute fenêtre modale / panneau overlay.
 *
 * Branche la touche Échap sur la fermeture et (optionnellement) verrouille le
 * scroll du corps pendant l'affichage. Combiné au bouton ✕/Annuler et au clic
 * sur le fond, cela garantit AU MOINS 3 moyens de sortir chaque fenêtre, sans
 * que l'utilisateur ne se retrouve jamais piégé.
 *
 * Avec `containerRef` (fenêtres modales) : le focus entre dans la fenêtre à
 * l'ouverture, Tab / Maj+Tab restent à l'intérieur, et le focus revient sur
 * l'élément d'origine à la fermeture.
 *
 * Verrouillage du scroll « iOS-safe » : `overflow: hidden` seul ne suffit pas
 * sur Safari iOS (le fond défile encore) ; on fige le corps à sa position
 * courante puis on la restaure, sans saut de page. Compteur partagé : deux
 * fenêtres empilées (fiche + explication) ne se marchent pas dessus.
 *
 * @param onClose       fermeture de la fenêtre
 * @param active        la fenêtre est-elle affichée (défaut true)
 * @param lockScroll    verrouiller le scroll du body (défaut true ; false pour
 *                      un panneau latéral qui n'occupe pas tout l'écran)
 * @param containerRef  élément de la fenêtre (piège du focus)
 */
let locks = 0;
let savedScrollY = 0;
let savedStyle = '';

function lockBody() {
  if (locks++ > 0) return;
  savedScrollY = window.scrollY;
  const b = document.body;
  savedStyle = b.getAttribute('style') ?? '';
  const gap = window.innerWidth - document.documentElement.clientWidth;
  b.style.position = 'fixed';
  b.style.top = `-${savedScrollY}px`;
  b.style.left = '0';
  b.style.right = '0';
  b.style.width = '100%';
  b.style.overflow = 'hidden';
  if (gap > 0) b.style.paddingRight = `${gap}px`;
}

function unlockBody() {
  if (--locks > 0) return;
  locks = 0;
  const b = document.body;
  if (savedStyle) b.setAttribute('style', savedStyle);
  else b.removeAttribute('style');
  window.scrollTo({ top: savedScrollY, behavior: 'instant' });
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalDismiss(
  onClose: () => void,
  active = true,
  lockScroll = true,
  containerRef?: RefObject<HTMLElement | null>
) {
  // Dernière version de onClose sans ré-abonner les écouteurs à chaque rendu.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Seule la fenêtre au premier plan réagit (fenêtres empilées).
        const el = containerRef?.current;
        if (el && !isTopmost(el)) return;
        close.current();
        return;
      }
      if (e.key === 'Tab' && containerRef?.current) {
        const el = containerRef.current;
        if (!isTopmost(el)) return;
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null || n === document.activeElement
        );
        if (items.length === 0) {
          e.preventDefault();
          el.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    const opener = document.activeElement as HTMLElement | null;
    const el = containerRef?.current;
    if (el) {
      el.dataset.modalLayer = String(Date.now());
      // Le focus entre dans la fenêtre (sans faire défiler son contenu).
      requestAnimationFrame(() => {
        if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
      });
    }

    if (lockScroll) lockBody();

    return () => {
      document.removeEventListener('keydown', onKey);
      if (lockScroll) unlockBody();
      if (el && opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lockScroll]);
}

/** La fenêtre la plus récemment ouverte est celle qui reçoit Échap et Tab. */
function isTopmost(el: HTMLElement): boolean {
  const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-layer]'));
  const top = layers.sort((a, b) => Number(b.dataset.modalLayer) - Number(a.dataset.modalLayer))[0];
  return !top || top === el;
}

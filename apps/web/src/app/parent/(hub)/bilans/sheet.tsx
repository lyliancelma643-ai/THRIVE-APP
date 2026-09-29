'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Fenêtre commune du Bilan (fiche détaillée, fiche d'explication, passeport).
// Modale centrée sur iPad / ordinateur, feuille du bas sur téléphone (≤ 680 px).
//
//   • Ouverture ET fermeture animées (la sortie est plus vive que l'entrée).
//   • Téléphone : la feuille se ferme en la glissant vers le bas depuis la
//     poignée ou tout en haut de son contenu ; elle suit le doigt.
//   • Focus : il entre dans la fenêtre, reste piégé dedans (Tab), revient sur
//     la carte d'origine à la fermeture ; Échap ferme (useModalDismiss).
//   • Scroll de l'arrière-plan verrouillé sans saut de page (iOS compris).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useModalDismiss } from '@/lib/useModalDismiss';

const EXIT_MS = 180;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function BilanSheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : EXIT_MS);
  }, [onClose]);

  useModalDismiss(requestClose, true, true, sheetRef);
  useSheetDrag(sheetRef, requestClose);

  return (
    <div
      className={`b-modal-ov${closing ? ' b-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={requestClose}
    >
      <div ref={sheetRef} className="b-modal" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <span className="b-grip" aria-hidden />
        <button type="button" onClick={requestClose} aria-label="Fermer" className="b-close">
          <Icon name="close" className="w-[18px] h-[18px]" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Glisser vers le bas pour fermer — téléphone uniquement (feuille du bas). */
function useSheetDrag(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia('(max-width: 680px)');
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (!mq.matches || e.touches.length !== 1) return;
      // Seulement quand le contenu est tout en haut : sinon c'est un défilement.
      if (el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      startT = Date.now();
      dy = 0;
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        el.style.transform = '';
        return;
      }
      e.preventDefault();
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      const fast = dy > 40 && dy / Math.max(Date.now() - startT, 1) > 0.6;
      el.style.transition = '';
      if (dy > 110 || fast) {
        el.style.setProperty('--b-from', `${dy}px`);
        el.style.transform = '';
        onClose();
      } else {
        el.style.transform = '';
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [ref, onClose]);
}

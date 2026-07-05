'use client';

import { useEffect } from 'react';

/**
 * Sorties uniformes pour toute fenêtre modale / panneau overlay.
 *
 * Branche la touche Échap sur la fermeture et (optionnellement) verrouille le
 * scroll du corps pendant l'affichage. Combiné au bouton ✕/Annuler et au clic
 * sur le fond, cela garantit AU MOINS 3 moyens de sortir chaque fenêtre, sans
 * que l'utilisateur ne se retrouve jamais piégé.
 *
 * @param onClose     fermeture de la fenêtre
 * @param active      la fenêtre est-elle affichée (défaut true) — laisse le hook
 *                    s'appeler inconditionnellement en haut d'un composant qui
 *                    rend la modale par intermittence
 * @param lockScroll  verrouiller le scroll du body (défaut true ; passer false
 *                    pour un panneau latéral qui n'occupe pas tout l'écran)
 */
export function useModalDismiss(
  onClose: () => void,
  active = true,
  lockScroll = true,
) {
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    let prevOverflow: string | undefined;
    if (lockScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevOverflow !== undefined) document.body.style.overflow = prevOverflow;
    };
  }, [onClose, active, lockScroll]);
}

import React from 'react';

// Bloc de chargement « en vague » : l'opacité respire 0,45 → 1 → 0,45 (1 400 ms), décalée de
// 80 ms par élément (`index`, plafonné à 8). Aucun dégradé. `prefers-reduced-motion` : aplat fixe
// (voir globals.css).
export function Skeleton({ className = '', index = 0 }: { className?: string; index?: number }) {
  const delay = Math.min(Math.max(index, 0), 8) * 80;
  return <div className={`animate-wave rounded-2xl bg-navy-100/60 ${className}`} style={{ animationDelay: `${delay}ms` }} aria-hidden />;
}

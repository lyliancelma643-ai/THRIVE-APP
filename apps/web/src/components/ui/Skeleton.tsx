import React from 'react';

// Bloc de chargement (pulse). `animate-pulse` est neutralisé par
// prefers-reduced-motion (globals.css).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-navy-100/60 ${className}`} aria-hidden />;
}

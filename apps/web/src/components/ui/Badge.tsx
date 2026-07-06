import React from 'react';

// Pastille de statut/rôle. Tons alignés sur la charte (navy/sage/sun) plus les
// sémantiques succès/alerte/erreur.
type Tone = 'navy' | 'sage' | 'sun' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  navy: 'bg-navy-100 text-navy-700',
  sage: 'bg-sage-light text-navy-800',
  sun: 'bg-sun/30 text-navy-800',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-navy-50 text-navy-500',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

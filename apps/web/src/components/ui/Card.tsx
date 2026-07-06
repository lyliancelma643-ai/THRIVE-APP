import React from 'react';

// Carte de marque : rayon et ombre pris sur les tokens (shadow-card), fond
// blanc. `interactive` ajoute l'élévation au survol (liens/CTA).
export function Card({
  interactive = false,
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      {...rest}
      className={`rounded-2xl bg-white shadow-card ${
        interactive ? 'transition-shadow hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Rangée défilante partagée (affiches Maison, séances vidéo) — façon Fitness+.
//
//   • Au doigt : défilement natif avec accroche (scroll-snap), inertie native,
//     jamais de blocage du défilement vertical (voir useHScroll).
//   • À la souris : glisser, flèches précédent / suivant au survol.
//   • Au clavier : la rangée est une région focusable, ← / → la font défiler.
//   • Indicateur de position synchronisé (décoratif : la région porte le nom).
//   • La rangée déborde jusqu'aux bords de l'écran sur téléphone, le titre reste
//     aligné sur la gouttière de la page.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useHScroll } from './p3/useHScroll';

export function Rail({
  id,
  title,
  subtitle,
  more,
  arrowTopClass,
  headerless = false,
  children,
}: {
  /** Clé stable (mémoire de position au retour). */
  id?: string;
  title: string;
  subtitle?: string;
  more?: { href: string; label: string };
  /** Hauteur des flèches : milieu de la vignette (ex. `top-[76px] md:top-[88px]`). */
  arrowTopClass: string;
  /** Sans en-tête visible : le titre est déjà porté par un sélecteur au-dessus. */
  headerless?: boolean;
  children: ReactNode;
}) {
  const { edges, props, page, progress, ratio } = useHScroll(id ? `row:${id}` : undefined);
  const scrollable = !(edges.start && edges.end);

  return (
    <section className={`${headerless ? 'mt-4' : 'mt-9'} animate-om-up group/row`} aria-label={title}>
      {/* Titre et lien sur la même ligne ; le sous-titre prend toute la largeur
          (sur téléphone, le lien ne comprime plus le titre sur deux lignes). */}
      {!headerless && (
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 font-display text-[20px] md:text-[22px] font-semibold text-ink leading-[1.2] text-balance">{title}</h2>
            {more && (
              <Link href={more.href} className="shrink-0 -my-[10px] inline-flex items-center gap-1 min-h-[44px] text-[14px] font-semibold text-accent-ink">
                {more.label}
                <Icon name="chevron-right" className="w-4 h-4" />
              </Link>
            )}
          </div>
          {subtitle && <p className="text-[14px] text-soft mt-1 text-pretty max-w-prose">{subtitle}</p>}
        </div>
      )}
      <div className="relative">
        {/* `scroll-pl-5` : sans lui, l'accroche cale la première vignette sur le bord et mange la gouttière. */}
        <div
          {...props}
          role="region"
          aria-label={`${title} — faire défiler avec les flèches du clavier`}
          tabIndex={scrollable ? 0 : -1}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide overscroll-x-contain snap-x snap-mandatory scroll-pl-5 md:scroll-pl-0 -mx-5 px-5 md:mx-0 md:px-0 pb-1 rounded-tile [@media(hover:hover)_and_(pointer:fine)]:cursor-grab"
        >
          {children}
        </div>
        {/* Flèches : seulement avec une souris (les écrans tactiles défilent au doigt). */}
        {(['prev', 'next'] as const).map((k) => {
          const hidden = k === 'prev' ? edges.start : edges.end;
          return (
            <button
              key={k}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => page(k === 'prev' ? -1 : 1)}
              className={`hidden [@media(hover:hover)_and_(pointer:fine)]:grid place-items-center absolute ${arrowTopClass} -translate-y-1/2 z-10 ${
                k === 'prev' ? '-left-4' : '-right-4'
              } w-11 h-11 rounded-full bg-night-surface shadow-[0_6px_20px_rgba(0,10,20,0.35)] ring-1 ring-line2 text-ink transition-opacity duration-fast ${
                hidden ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/row:opacity-100'
              }`}
            >
              <Icon name="chevron-right" className={`w-5 h-5 ${k === 'prev' ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
        {/* Indicateur de position : une barre fine qui suit le défilement. */}
        {scrollable && (
          <div aria-hidden className="mt-3 h-[3px] w-24 rounded-full bg-track overflow-hidden">
            <div
              className="h-full rounded-full bg-[color:var(--text3)]"
              style={{
                width: `${Math.max(ratio * 100, 12)}%`,
                transform: `translateX(${progress * (100 / Math.max(ratio, 0.12) - 100)}%)`,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

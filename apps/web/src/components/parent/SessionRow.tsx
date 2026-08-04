'use client';

import { VideoSession } from '@/lib/catalog';
import { SessionCard } from './SessionCard';

type Props = {
  title: string;
  subtitle?: string;
  sessions: VideoSession[];
  completedIds?: Set<string>;
};

export function SessionRow({ title, subtitle, sessions, completedIds }: Props) {
  if (sessions.length === 0) return null;

  return (
    // Le carrousel déborde jusqu'aux bords de l'écran (marge négative), le titre
    // reste aligné sur la gouttière de 20 px du reste de la page.
    <section className="mt-9 animate-om-up" style={{ ['--om-d' as string]: '0.16s' }}>
      <div className="mb-3.5">
        <h2 className="font-display text-[22px] font-semibold text-night-ink">{title}</h2>
        {subtitle && (
          <p className="text-sm text-soft mt-0.5">{subtitle}</p>
        )}
      </div>
      {/* `scroll-pl-5` est indispensable : sans lui, l'accroche (snap-start) cale
          la première vignette sur le bord du conteneur et mange la gouttière. */}
      <div className="flex gap-3.5 overflow-x-auto scrollbar-hide overscroll-x-contain snap-x scroll-pl-5 md:scroll-pl-0 -mx-5 px-5 md:mx-0 md:px-0 pb-1">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} completed={completedIds?.has(s.id)} />
        ))}
      </div>
    </section>
  );
}

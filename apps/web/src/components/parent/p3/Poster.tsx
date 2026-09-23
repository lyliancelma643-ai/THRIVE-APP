'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Maison façon plateforme de streaming : affiches, vignettes et rangées.
//
// Même grammaire que les séances vidéo (SessionRow / SessionCard) : carrousel
// qui déborde jusqu'aux bords, accroche snap-start, texte SOUS la vignette.
// Les fiches n'ont pas d'image : l'affiche est une composition par pilier
// (une couleur, l'icône du pilier, le numéro de semaine). Comme une image, elle
// reste sombre dans les deux ambiances — le texte posé dessus est donc blanc.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import type { P3Activity, PillarCode } from '@/lib/p3-moments';
import { PILLAR_PLAIN } from '@/lib/p3-moments/guide';
import { PILLAR_ICON } from './pieces';

/** Une teinte par pilier : c'est elle qui fait reconnaître une famille d'un coup d'œil. */
const PILLAR_HUE: Record<PillarCode, string> = {
  P1: '#2dd4bf',
  P2: '#f5b83d',
  P3: '#b69cff',
  P4: '#5fa8ff',
  P5: '#ff7eb6',
  P6: '#4ade9c',
  P7: '#ff9557',
  P8: '#8f9bff',
};

export function PosterArt({ activity, big = false, done = false }: { activity: P3Activity; big?: boolean; done?: boolean }) {
  const hue = PILLAR_HUE[activity.pillar_main];
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(120% 90% at 85% 10%, ${hue}66 0%, ${hue}22 38%, transparent 70%), linear-gradient(160deg, #0f3346 0%, #06161e 100%)`,
      }}
    >
      <span
        className={`absolute ${big ? 'w-[46%] aspect-square -right-[4%] top-[4%]' : 'w-[62%] aspect-square -right-[12%] -bottom-[6%]'}`}
        style={{ color: hue, opacity: big ? 0.35 : 0.5 }}
      >
        <Icon name={PILLAR_ICON[activity.pillar_main]} className="w-full h-full" strokeWidth={1.2} />
      </span>
      {!big && (
        <span className="absolute top-2.5 left-3 font-display text-[30px] font-semibold leading-none text-white/90">
          {activity.week}
        </span>
      )}
      {done && (
        <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sage text-navy-900 flex items-center justify-center">
          <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} />
        </span>
      )}
    </div>
  );
}

function durationsLabel(a: P3Activity): string {
  return `${Math.min(...a.durations)}–${Math.max(...a.durations)} min`;
}

export function PosterCard({
  activity,
  href,
  done,
  line,
  wide = false,
}: {
  activity: P3Activity;
  href: string;
  done: boolean;
  /** Ligne libre sous le titre (ex. la phrase d'amorce pour la tranche d'âge). */
  line?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Link href={href} className={`${wide ? 'w-full' : 'w-[152px] md:w-[176px] shrink-0 snap-start'} group select-none`}>
      <div className="relative aspect-[3/4] rounded-[16px] overflow-hidden bg-night-surface ring-1 ring-white/5">
        <PosterArt activity={activity} done={done} />
        <span className="absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
          <span className="w-11 h-11 rounded-full bg-accent text-navy-900 flex items-center justify-center">
            <Icon name="play" className="w-4 h-4" />
          </span>
        </span>
      </div>
      <p className="mt-2.5 text-[12px] font-semibold text-sage">
        Semaine {activity.week} · {durationsLabel(activity)}
      </p>
      <p className="text-[15px] font-semibold leading-[1.3] text-ink line-clamp-2">{activity.title}</p>
      <p className="mt-0.5 text-[12px] text-faint line-clamp-1">{PILLAR_PLAIN[activity.pillar_main]}</p>
      {line && <p className="mt-1.5 text-[13px] leading-[1.4] text-soft line-clamp-3">{line}</p>}
    </Link>
  );
}

export function PosterRow({
  title,
  subtitle,
  items,
  hrefOf,
  isDone,
  more,
}: {
  title: string;
  subtitle: string;
  items: P3Activity[];
  hrefOf: (a: P3Activity) => string;
  isDone: (a: P3Activity) => boolean;
  more?: { href: string; label: string };
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-9 animate-om-up">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] md:text-[22px] font-semibold text-ink leading-[1.2]">{title}</h2>
          <p className="text-[14px] text-soft mt-0.5">{subtitle}</p>
        </div>
        {more && (
          <Link href={more.href} className="shrink-0 inline-flex items-center gap-1 min-h-[44px] text-[14px] font-semibold text-accent-ink">
            {more.label}
            <Icon name="chevron-right" className="w-4 h-4" />
          </Link>
        )}
      </div>
      {/* `scroll-pl-5` : sans lui, l'accroche cale la première vignette sur le bord et mange la gouttière. */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain snap-x scroll-pl-5 md:scroll-pl-0 -mx-5 px-5 md:mx-0 md:px-0 pb-1">
        {items.map((a) => (
          <PosterCard key={a.id} activity={a} href={hrefOf(a)} done={isDone(a)} />
        ))}
      </div>
    </section>
  );
}

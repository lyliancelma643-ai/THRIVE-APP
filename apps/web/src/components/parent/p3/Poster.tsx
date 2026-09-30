'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Maison façon plateforme de streaming : affiches, vignettes et rangées.
//
// Même grammaire que les séances vidéo (SessionRow / SessionCard) : carrousel
// qui déborde jusqu'aux bords, accroche snap-start, texte SOUS la vignette.
// Chaque fiche a sa vignette mascotte (voir vignettes.ts). Tant qu'elle manque,
// l'affiche est une composition par pilier (une couleur, l'icône du pilier, le
// numéro de semaine), sombre dans les deux ambiances : le texte dessus est blanc.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import type { P3Activity, PillarCode } from '@/lib/p3-moments';
import { PILLAR_PLAIN } from '@/lib/p3-moments/guide';
import { PILLAR_ICON } from './pieces';
import { Rail } from '../Rail';
import { vignetteSrc } from './vignettes';

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

/**
 * La vignette mascotte, entière : jamais recadrée (la planche n'est pas toujours
 * carrée). Les marges éventuelles sont comblées par la même image, floutée.
 */
export function Vignette({ src, className = '', priority = false }: { src: string; className?: string; priority?: boolean }) {
  // Hors écran : chargement différé ; affiche principale : prioritaire.
  const loading = priority ? 'eager' : 'lazy';
  return (
    <div aria-hidden className={`relative overflow-hidden bg-[#f3efe6] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={512} height={512} loading={loading} decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={512}
        height={512}
        loading={loading}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        draggable={false}
        className="relative w-full h-full object-contain"
      />
    </div>
  );
}

export function PosterArt({
  activity,
  big = false,
  done = false,
  hideMotifOnPhone = false,
}: {
  activity: P3Activity;
  big?: boolean;
  done?: boolean;
  /** Masque le grand pictogramme du pilier sous 768 px (hero avec vignette). */
  hideMotifOnPhone?: boolean;
}) {
  const hue = PILLAR_HUE[activity.pillar_main];
  const src = big ? null : vignetteSrc(activity.id);
  if (src)
    return (
      <div aria-hidden className="absolute inset-0">
        <Vignette src={src} className="w-full h-full" />
        {done && (
          <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sage text-navy-900 flex items-center justify-center">
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} />
          </span>
        )}
      </div>
    );
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(120% 90% at 85% 10%, ${hue}66 0%, ${hue}22 38%, transparent 70%), linear-gradient(160deg, #0f3346 0%, #06161e 100%)`,
      }}
    >
      <span
        className={`absolute ${big ? 'w-[46%] aspect-square -right-[4%] top-[4%]' : 'w-[62%] aspect-square -right-[12%] -bottom-[6%]'} ${hideMotifOnPhone ? 'max-md:hidden' : ''}`}
        style={{ color: hue, opacity: big ? 0.35 : 0.5 }}
      >
        <Icon name={PILLAR_ICON[activity.pillar_main]} className="w-full h-full" strokeWidth={1.2} />
      </span>
      {!big && (
        <span className="absolute top-2.5 left-3 font-display text-[30px] font-semibold leading-none text-white/90">
          {activity.week ?? '★'}
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
    // Toucher : la vignette s'enfonce légèrement sous le doigt ; pas de menu d'aperçu
    // iOS au appui long ni de « fantôme » de lien quand on tire à la souris.
    <Link
      href={href}
      draggable={false}
      className={`${wide ? 'w-full' : 'w-[152px] md:w-[176px] lg:w-[200px] shrink-0 snap-start'} group select-none [-webkit-touch-callout:none] rounded-tile`}
    >
      <div className="relative aspect-square rounded-[16px] overflow-hidden bg-night-surface ring-1 ring-white/5 transition-transform duration-150 group-active:scale-[0.97] motion-reduce:transition-none">
        <PosterArt activity={activity} done={done} />
        {activity.programme === 'complement' && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[rgba(6,22,30,0.82)] text-[11px] font-semibold text-white">
            Plus loin
          </span>
        )}
        <span className="absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
          <span className="w-11 h-11 rounded-full bg-accent text-navy-900 flex items-center justify-center">
            <Icon name="play" className="w-4 h-4" />
          </span>
        </span>
      </div>
      <p className="mt-2.5 text-[12px] font-semibold text-sage-ink truncate">
        {activity.week === null ? 'Bonus' : `Semaine ${activity.week}`} · {durationsLabel(activity)}
      </p>
      <p className="text-[15px] font-semibold leading-[1.3] text-ink line-clamp-2">{activity.title}</p>
      <p className="mt-0.5 text-[12px] text-faint line-clamp-1">{PILLAR_PLAIN[activity.pillar_main]}</p>
      {line && <p className="mt-1.5 text-[13px] leading-[1.4] text-soft line-clamp-3">{line}</p>}
    </Link>
  );
}

export function PosterRow({
  id,
  title,
  subtitle,
  items,
  hrefOf,
  isDone,
  more,
  headerless,
}: {
  /** Clé stable de la rangée : sert à retrouver sa position au retour. */
  id: string;
  title: string;
  subtitle: string;
  items: P3Activity[];
  hrefOf: (a: P3Activity) => string;
  isDone: (a: P3Activity) => boolean;
  more?: { href: string; label: string };
  headerless?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Rail id={id} title={title} subtitle={subtitle} more={more} headerless={headerless} arrowTopClass="top-[76px] md:top-[88px] lg:top-[100px]">
      {items.map((a) => (
        <PosterCard key={a.id} activity={a} href={hrefOf(a)} done={isDone(a)} />
      ))}
    </Rail>
  );
}

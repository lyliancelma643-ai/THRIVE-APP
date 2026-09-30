'use client';

// L'arche de l'affiche : un disque animé propre à l'activité (ActivityScene), la
// mascotte posée devant en multiplication, le tout dans une forme de fenêtre.
import type { CSSProperties } from 'react';
import { ActivityScene } from './scenes';
import { vignetteSrc } from './vignettes';

// Illustrations au fond sombre : pas de multiplication, la scène se pose par-dessus.
const DARK = new Set(['ACT-0304', 'ACT-0901']);

export function Arch({ activityId, className = '' }: { activityId: string; className?: string }) {
  const src = vignetteSrc(activityId);
  const dark = DARK.has(activityId);
  return (
    <div aria-hidden className={`maison-arch aspect-[312/348] ${className}`}>
      {!dark && <ActivityScene id={activityId} className="absolute left-[12.8%] top-[11.5%] w-[74.4%] aspect-square" />}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={512}
          height={512}
          draggable={false}
          decoding="async"
          fetchPriority="high"
          className={`${dark ? 'maison-mascot-dark' : 'maison-mascot'} sc sc-float absolute bottom-0 left-[6%] w-[88%] aspect-square object-contain`}
          style={{ '--t': '7s' } as CSSProperties}
        />
      )}
      {dark && <ActivityScene id={activityId} bare className="absolute left-[6%] bottom-0 w-[88%] aspect-square" />}
    </div>
  );
}

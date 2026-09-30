'use client';

// L'arche de l'affiche : la vignette de l'activité, seule, dans une forme de
// fenêtre. Aucune forme ajoutée par-dessus : l'illustration telle quelle.
import { vignetteSrc } from './vignettes';

export function Arch({ activityId, className = '' }: { activityId: string; className?: string }) {
  const src = vignetteSrc(activityId);
  return (
    <div aria-hidden className={`maison-arch aspect-[312/348] ${className}`}>
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
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { THRESH } from '@thrive/shared';
import { Icon } from '@/components/ui';

export type UploadProgressProps = {
  /** Aperçu de la photo (URL locale). */
  src: string | null;
  /** Progression RÉELLE d'envoi (0..1) ; `null` : envoi sans progression, barre indéterminée et aucun chiffre. */
  progress: number | null;
  done: boolean;
  childName?: string | null;
  onCancel?: () => void;
};

/** La photo « se développe » à mesure de l'envoi. Jamais de pourcentage inventé. */
export function UploadProgress({ src, progress, done, childName, onCancel }: UploadProgressProps) {
  const p = done ? 1 : progress ?? 0;
  const [long, setLong] = useState(false);
  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setLong(true), THRESH.slowMessage);
    return () => window.clearTimeout(id);
  }, [done]);
  return (
    <div className="space-y-3.5">
      <div className="relative h-[180px] overflow-hidden rounded-[18px] bg-night-surface">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" style={{ transform: `scale(${1 + 0.05 * (1 - p)})`, transition: 'transform var(--dur-base) var(--ease-out)' }} />
        )}
        <div className="pointer-events-none absolute inset-0 bg-night-surface" style={{ opacity: 1 - p, transition: 'opacity var(--dur-base) var(--ease-out)' }} />
      </div>
      <div className="flex items-baseline justify-between" aria-live="polite">
        <p className="text-[17px] leading-[22px] font-semibold text-ink">{done ? 'Photo enregistrée' : progress === null ? 'Envoi de la photo…' : 'Envoi de la photo'}</p>
        {(progress !== null || done) && <p className="text-[22px] leading-7 font-bold text-ink tabular-nums">{Math.round(p * 100)} %</p>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress === null && !done ? undefined : Math.round(p * 100)}>
        {progress === null && !done ? (
          <div className="mo-anim h-full w-1/3 rounded-full bg-accent-ink" style={{ animation: 'st-slide 1400ms var(--ease-in-out) infinite' }} />
        ) : (
          <div className="h-full w-full origin-left rounded-full bg-accent-ink" style={{ transform: `scaleX(${p})`, transition: 'transform var(--dur-bar) var(--ease-out)' }} />
        )}
      </div>
      {long && !done && <p className="text-[14px] leading-5 text-soft">Un peu long. L’envoi continue, tu peux passer à la suite.</p>}
      {done ? (
        <span className="animate-pop inline-flex min-h-9 items-center gap-2 rounded-full bg-chip px-3.5 text-[14px] font-semibold text-ink">
          <Icon name="check" className="h-4 w-4 text-sage-ink" strokeWidth={2.6} />
          {childName ? `Gardée dans le carnet de ${childName}` : 'Gardée dans le carnet'}
        </span>
      ) : (
        onCancel && (
          <button onClick={onCancel} className="min-h-11 text-[14px] font-semibold text-soft">
            Annuler l’envoi
          </button>
        )
      )}
    </div>
  );
}

'use client';

// Les réglages du soir (durée, lieu) tiennent dans une seule puce ; elle ouvre une
// feuille du bas (téléphone) ou une fenêtre (grand écran). Même logique qu'avant :
// ces deux choix règlent l'affiche et les liens de toutes les rangées.

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui';
import { useModalDismiss } from '@/lib/useModalDismiss';
import { DurationPills, PillGroup } from './pieces';
import type { Duration } from '@/lib/p3-moments';

type Place = { value: string; label: string };

export function TonightSettings({
  duration,
  durations,
  onDuration,
  place,
  places,
  onPlace,
}: {
  duration: Duration;
  durations: readonly Duration[];
  onDuration: (d: Duration) => void;
  place: string;
  places: Place[];
  onPlace: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useModalDismiss(() => setOpen(false), open, true, ref);
  const placeLabel = places.find((p) => p.value === place)?.label ?? '';

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Régler la durée et le lieu : ${duration} minutes, ${placeLabel}`}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-11 px-[18px] rounded-full border border-line2 bg-chip text-ink text-[14px] font-semibold whitespace-nowrap"
      >
        <Icon name="settings" className="w-[18px] h-[18px]" />
        {duration} min · {placeLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-modal flex items-end md:items-center justify-center bg-black/55 animate-om-fade"
          role="dialog"
          aria-modal="true"
          aria-label="Régler la soirée"
          onClick={() => setOpen(false)}
        >
          <div
            ref={ref}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md rounded-t-[28px] md:rounded-[28px] bg-night-surface border border-line2 p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(0,10,20,0.5)] animate-om-up"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-[26px] font-medium text-ink leading-[1.15]">Ce soir</h2>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="nc-iconbtn">
                <Icon name="close" className="w-[18px] h-[18px]" />
              </button>
            </div>
            <p className="nc-eyebrow mt-5 mb-2">Combien de temps</p>
            <DurationPills value={duration} available={durations} onChange={onDuration} />
            <p className="nc-eyebrow mt-5 mb-2">Où</p>
            <PillGroup label="Lieu" value={place} options={places} onChange={onPlace} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="maison-launch mt-7 w-full h-14 rounded-full text-accent-on font-bold text-[17px]"
            >
              C’est réglé
            </button>
          </div>
        </div>
      )}
    </>
  );
}

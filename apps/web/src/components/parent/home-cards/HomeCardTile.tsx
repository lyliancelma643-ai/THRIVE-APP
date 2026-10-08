import Link from 'next/link';
import type { HomeCard } from '@/lib/home-cards';
import { Icon } from '@/components/ui';
import { InlineMd } from './InlineMd';

/** L'onglet Fitness EST le système de cartes. */
export const HOME_CARDS_PATH = '/parent/fitness';
export const cardHref = (id: string) => `${HOME_CARDS_PATH}/carte/${id.toLowerCase()}`;

export function materialsLabel(materials: string): string {
  return materials === 'aucun' ? 'Aucun matériel' : materials;
}

// Rangée de carte ouverte : titre, durée, matériel. « Faite » est une simple
// coche discrète — jamais un score ni une série.
// `nested` : tuile posée dans un volet déjà sur surface → simple contour.
export function HomeCardTile({ card, done, nested }: { card: HomeCard; done?: boolean; nested?: boolean }) {
  return (
    <Link
      href={cardHref(card.id)}
      className={`${nested ? 'nc-row-idle' : 'nc-row'} flex items-center gap-3.5 px-4 py-3.5 active:scale-[0.99] transition-transform select-none`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] font-semibold leading-snug text-night-ink">
          <InlineMd text={card.title} />
        </p>
        <p className="text-[13px] text-soft mt-0.5 truncate">
          Séance {card.session} · {card.duration_min} min · {materialsLabel(card.materials)}
        </p>
      </div>
      {done && (
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-sage">
          <Icon name="check" className="w-4 h-4" />
          Faite
        </span>
      )}
      <span aria-hidden className="shrink-0 text-faint text-lg leading-none">›</span>
    </Link>
  );
}

export function JokerTile({ nested }: { nested?: boolean }) {
  return (
    <Link
      href={cardHref('joker')}
      className={`${nested ? 'nc-row-idle' : 'nc-row'} flex items-center gap-3.5 px-4 py-3.5 active:scale-[0.99] transition-transform select-none`}
    >
      <span className="w-10 h-10 rounded-xl bg-surface-sub grid place-items-center text-accent-ink shrink-0">
        <Icon name="star" className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] font-semibold leading-snug text-night-ink">La carte joker</p>
        <p className="text-[13px] text-soft mt-0.5">Pour les soirs où ça ne va pas · 5 min</p>
      </div>
      <span aria-hidden className="shrink-0 text-faint text-lg leading-none">›</span>
    </Link>
  );
}

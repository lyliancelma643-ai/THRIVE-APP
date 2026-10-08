'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Le paquet de la semaine, en vraies cartes : on les fait défiler au pouce,
// la carte du centre est pleine, ses voisines reculent. Toucher = ouvrir.
// Le défilement horizontal appartient au carrousel (data-no-thumbnav) : il ne
// déclenche jamais le changement d'onglet.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { HomeCard } from '@/lib/home-cards';
import { JOKER } from '@/lib/home-cards/guide';
import { Icon } from '@/components/ui';
import { cardHref, materialsLabel } from './HomeCardTile';
import { InlineMd, capitalize } from './InlineMd';

export function DeckCarousel({
  cards,
  doneIds,
  withJoker = true,
}: {
  cards: HomeCard[];
  doneIds: ReadonlySet<string>;
  withJoker?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = cards.length + (withJoker ? 1 : 0);

  // La carte active = celle dont le centre est le plus proche du centre visible
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((child, i) => {
          const c = child as HTMLElement;
          const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setActive(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const goTo = (i: number) => {
    const el = scroller.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: 'smooth' });
  };

  return (
    <div>
      <div
        ref={scroller}
        data-no-thumbnav
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory overscroll-x-contain -mx-5 px-[11vw] md:mx-0 md:px-0 pb-1"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {cards.map((card, i) => (
          <Link
            key={card.id}
            href={cardHref(card.id)}
            data-active={active === i}
            className="hc-deck-card snap-center shrink-0 w-[78vw] max-w-[320px] aspect-[4/5] max-h-[400px] rounded-[28px] bg-night-surface flex flex-col p-5 select-none"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">
                Séance {card.session}
              </span>
              <span className="text-[13px] font-semibold text-accent-ink">{card.duration_min} min</span>
            </div>
            <p className="font-display text-[27px] font-semibold text-night-ink leading-[1.12] mt-4">
              <InlineMd text={card.title} />
            </p>
            <p className="text-[15px] leading-[1.45] text-body mt-3 line-clamp-4">
              <InlineMd text={capitalize(card.objective)} />
            </p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <span className="text-[13px] text-soft min-w-0 truncate">{materialsLabel(card.materials)}</span>
              {doneIds.has(card.id) && (
                <span className="ml-auto rotate-[-8deg] border-2 border-sage text-sage rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wider shrink-0">
                  Faite
                </span>
              )}
              <span className="w-10 h-10 rounded-full bg-accent text-accent-on grid place-items-center shrink-0">
                <Icon name="play" className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}

        {withJoker && (
          <Link
            href={cardHref('joker')}
            data-active={active === cards.length}
            className="hc-deck-card snap-center shrink-0 w-[78vw] max-w-[320px] aspect-[4/5] max-h-[400px] rounded-[28px] flex flex-col p-5 select-none border border-accent-line"
            style={{ background: 'var(--lock-bg)' }}
          >
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent-ink">Joker</span>
            <p className="font-display text-[27px] font-semibold text-night-ink leading-[1.12] mt-4">{JOKER.title}</p>
            <p className="text-[15px] leading-[1.45] text-body mt-3">
              Il y a des soirs où ça ne va pas. Il rentre fermé, fâché, ou il ne veut rien faire.
            </p>
            <p className="mt-auto font-display text-[17px] leading-snug text-night-ink">{JOKER.script}</p>
          </Link>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-3" role="tablist" aria-label="Cartes">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={active === i}
              aria-label={`Carte ${i + 1} sur ${count}`}
              onClick={() => goTo(i)}
              className="h-6 grid place-items-center"
            >
              <span
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: active === i ? 18 : 6,
                  background: active === i ? 'var(--accent-ink)' : 'var(--line2)',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

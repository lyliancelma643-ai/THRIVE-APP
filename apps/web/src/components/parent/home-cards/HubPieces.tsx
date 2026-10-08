'use client';

// Pièces interactives de l'écran Fitness « À la maison » : le chemin des 13
// séances, les filtres « Ce soir, j'ai… », « Quand ça ne va pas », et le
// compteur de moments qui monte doucement.

import { useEffect, useState } from 'react';
import {
  QUICK_FILTERS,
  SESSION_COUNT,
  cardsOfDeck,
  cardsOfSession,
  filterCards,
  getCard,
  sessionLabel,
  type Deck,
  type HomeCard,
  type QuickFilter,
} from '@/lib/home-cards';
import { HARD_NIGHTS } from '@/lib/home-cards/guide';
import { Icon } from '@/components/ui';
import { HomeCardTile, JokerTile } from './HomeCardTile';

type CardState = {
  unlockedSessions: ReadonlySet<number>;
  doneCardIds: ReadonlySet<string>;
  isUnlocked: (card: HomeCard) => boolean;
};

// ── Compteur : le chiffre monte jusqu'à sa valeur (jamais un score affiché seul)
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const from = 0;
    const start = performance.now();
    const duration = Math.min(900, 180 + value * 90);
    let frame = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="tabular-nums">{shown}</span>;
}

// ── « Ce soir, j'ai… » ────────────────────────────────────────────────────────
export function TonightFilters({ deck, state }: { deck: Deck; state: CardState }) {
  const [filter, setFilter] = useState<QuickFilter | null>(null);
  const open = cardsOfDeck(deck).filter(state.isUnlocked);
  if (open.length === 0) return null;
  const results = filter ? filterCards(open, filter) : [];

  return (
    <section className="mt-10">
      <h2 className="font-display text-[22px] font-semibold text-night-ink">Ce soir, j&apos;ai…</h2>
      <div
        data-no-thumbnav
        role="group"
        aria-label="Filtrer les cartes"
        className="flex gap-2 overflow-x-auto scrollbar-hide overscroll-x-contain -mx-5 px-5 md:mx-0 md:px-0 mt-3"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {QUICK_FILTERS.map((f) => {
          const n = filterCards(open, f.id).length;
          return (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              disabled={n === 0}
              onClick={() => setFilter((cur) => (cur === f.id ? null : f.id))}
              className="nc-pill shrink-0 select-none disabled:opacity-40"
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {filter && (
        <div key={filter} className="mt-3 space-y-2 hc-expand">
          {results.map((c) => (
            <HomeCardTile key={c.id} card={c} done={state.doneCardIds.has(c.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Le chemin des 13 séances ──────────────────────────────────────────────────
export function SessionPath({ deck, state, latest }: { deck: Deck; state: CardState; latest: number | null }) {
  const [openSession, setOpenSession] = useState<number | null>(null);

  return (
    <section className="mt-10">
      <h2 className="font-display text-[22px] font-semibold text-night-ink">Le chemin</h2>
      <p className="text-[14px] leading-[1.5] text-soft mt-1">
        Chaque carte s&apos;ouvre après sa séance et reste ouverte pour toujours.
      </p>

      <ol className="mt-4 relative">
        {Array.from({ length: SESSION_COUNT }, (_, i) => i + 1).map((n) => {
          const unlocked = state.unlockedSessions.has(n);
          const cards = cardsOfSession(deck, n);
          const done = cards.filter((c) => state.doneCardIds.has(c.id)).length;
          const isLatest = latest === n;
          const expanded = openSession === n;
          const last = n === SESSION_COUNT;

          return (
            <li key={n} className="relative pl-12">
              {/* Rail : plein jusqu'à la dernière séance ouverte */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 bottom-0 w-0.5"
                  style={{ background: unlocked && state.unlockedSessions.has(n + 1) ? 'var(--accent)' : 'var(--line)' }}
                />
              )}
              <span
                aria-hidden
                className={`absolute left-0 top-1.5 w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold ${
                  isLatest ? 'animate-om-ring' : ''
                }`}
                style={
                  unlocked
                    ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                    : { border: '1.5px solid var(--line2)', color: 'var(--text4)' }
                }
              >
                {unlocked && done === cards.length ? <Icon name="check" className="w-4 h-4" /> : n}
              </span>

              <button
                disabled={!unlocked}
                aria-expanded={unlocked ? expanded : undefined}
                onClick={() => setOpenSession((cur) => (cur === n ? null : n))}
                className="w-full text-left pb-5 pt-1.5 flex items-start justify-between gap-3 disabled:cursor-default"
              >
                <span className="min-w-0">
                  <span className={`block text-[15px] font-semibold ${unlocked ? 'text-night-ink' : 'text-faint'}`}>
                    {sessionLabel(deck, n)}
                  </span>
                  <span className="block text-[13px] text-soft mt-0.5">
                    {unlocked
                      ? `Séance ${n} · ${cards.length} cartes${done ? ` · ${done} faite${done > 1 ? 's' : ''}` : ''}`
                      : `Séance ${n} · s'ouvre après la séance`}
                  </span>
                </span>
                {unlocked && (
                  <span
                    aria-hidden
                    className={`text-faint text-lg leading-none mt-1 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  >
                    ›
                  </span>
                )}
              </button>

              {expanded && (
                <div className="space-y-2 pb-5 -mt-2 hc-expand">
                  {cards.map((c) => (
                    <HomeCardTile key={c.id} card={c} done={state.doneCardIds.has(c.id)} nested />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Quand ça ne va pas ────────────────────────────────────────────────────────
const NOTHING_TONIGHT = 'Il ne veut rien faire ce soir';

export function HardNightsPicker({ deck, state, intro }: { deck: Deck; state: CardState; intro: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const situations = [...HARD_NIGHTS.map((h) => h.situation), NOTHING_TONIGHT];
  const entry = HARD_NIGHTS.find((h) => h.situation === picked);

  return (
    <section className="mt-10">
      <h2 className="font-display text-[22px] font-semibold text-night-ink">Quand ça ne va pas</h2>
      <p className="text-[14px] leading-[1.5] text-soft mt-1">{intro}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {situations.map((s) => (
          <button
            key={s}
            aria-pressed={picked === s}
            onClick={() => setPicked((cur) => (cur === s ? null : s))}
            className="nc-pill select-none !h-auto min-h-[40px] py-2 !whitespace-normal text-left"
          >
            {s}
          </button>
        ))}
      </div>

      {picked && (
        <div key={picked} className="mt-3 space-y-2 hc-expand">
          {picked === NOTHING_TONIGHT ? (
            <JokerTile />
          ) : (
            entry?.cards[deck].map((id) => {
              const card = getCard(id)!;
              return state.isUnlocked(card) ? (
                <HomeCardTile key={id} card={card} done={state.doneCardIds.has(id)} />
              ) : (
                <div
                  key={id}
                  className="border border-dashed border-line rounded-[18px] flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <span className="text-[14px] text-soft">Une carte de la séance {card.session}</span>
                  <span className="text-xs text-faint shrink-0">après la séance</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

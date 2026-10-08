'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Fitness — « À la maison ». Après chaque séance, 2 ou 3 cartes de moins
// de 20 minutes à vivre avec son enfant (fichier maître, brief §0.4 à §0.7).
// Le parent ne voit que le paquet de son enfant. Les séances vidéo 20 minutes
// restent accessibles en bas de l'écran (/parent/fitness/videos).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useChildStore } from '@/stores/child.store';
import { useHomeCards } from '@/hooks/useHomeCards';
import {
  DECKS,
  NUDGE_TEXT,
  cardsOfDeck,
  cardsOfSession,
  isNudgeWindow,
  sessionLabel,
} from '@/lib/home-cards';
import { HARD_NIGHTS_INTRO, RULES, WELCOME } from '@/lib/home-cards/guide';
import { LockedBanner } from '@/components/parent/AccessGate';
import { FitnessGate } from '@/components/parent/home-cards/FitnessGate';
import { DeckCarousel } from '@/components/parent/home-cards/DeckCarousel';
import { HomeCardTile, JokerTile } from '@/components/parent/home-cards/HomeCardTile';
import { CountUp, HardNightsPicker, SessionPath, TonightFilters } from '@/components/parent/home-cards/HubPieces';
import { InlineMd } from '@/components/parent/home-cards/InlineMd';
import { Icon } from '@/components/ui';

const WELCOME_KEY = 'thrive.homeCards.welcomeSeen';

export default function FitnessPage() {
  return (
    <FitnessGate
      whenLocked={
        <div className="max-w-2xl mx-auto">
          <LockedBanner />
          <p className="nc-eyebrow mb-2">Déjà disponible</p>
          <JokerTile />
        </div>
      }
    >
      <HomeCardsHub />
    </FitnessGate>
  );
}

function HomeCardsHub() {
  const { children, selectedChildId, isLoading: childrenLoading } = useChildStore();
  const child = children.find((c) => c.id === selectedChildId) ?? null;
  const home = useHomeCards(child?.id ?? null, child?.date_of_birth ?? null);

  const [welcomeSeen, setWelcomeSeen] = useState(true);
  useEffect(() => {
    try {
      setWelcomeSeen(localStorage.getItem(WELCOME_KEY) === '1');
    } catch {
      setWelcomeSeen(false);
    }
  }, []);
  const dismissWelcome = () => {
    setWelcomeSeen(true);
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* stockage indisponible : l'accueil reviendra, sans conséquence */
    }
  };

  if (childrenLoading || home.loading) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-20 rounded-[22px] bg-night-surface animate-pulse" />
        <div className="h-[400px] rounded-[28px] bg-night-surface animate-pulse" />
      </div>
    );
  }

  const deck = home.deck;
  const latest = home.latest;
  const nudge = latest && isNudgeWindow(latest.at, new Date());
  const weekCards = deck && latest ? cardsOfSession(deck, latest.session) : [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête : ce qui s'est passé en séance, et ce qu'on en fait ce soir */}
      <header className="animate-om-up">
        <p className="nc-eyebrow">À la maison{child ? ` · ${child.first_name}` : ''}</p>
        <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-1.5">
          {nudge ? NUDGE_TEXT : latest && deck ? `Après la séance ${latest.session}` : 'Les cartes à la maison'}
        </h1>
        <p className="text-[15px] leading-[1.5] text-soft mt-1.5">
          {latest && deck
            ? `${child?.first_name ?? 'Votre enfant'} a travaillé « ${sessionLabel(deck, latest.session).toLowerCase()} » avec son coach. Voici de quoi faire durer ça.`
            : 'Ce qui se travaille à l’entraînement reste à l’entraînement — sauf si ça se rejoue à la maison.'}
        </p>
        {home.momentsCount > 0 && (
          <p className="text-[15px] text-body mt-3">
            <span className="font-display text-[20px] font-semibold text-accent-ink">
              <CountUp value={home.momentsCount} />
            </span>{' '}
            {home.momentsCount > 1 ? 'moments' : 'moment'} avec votre enfant depuis le début du programme.
          </p>
        )}
      </header>

      {!welcomeSeen && (
        <section className="nc-card mt-6 animate-om-up" style={{ ['--om-d' as string]: '0.08s' }}>
          <p className="nc-eyebrow">{WELCOME.title}</p>
          <div className="mt-2 space-y-2.5 text-[15px] leading-[1.55] text-body">
            {WELCOME.paragraphs.map((p) => (
              <p key={p}>
                <InlineMd text={p} />
              </p>
            ))}
          </div>
          <button
            onClick={dismissWelcome}
            className="mt-5 h-12 px-6 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 transition-transform"
          >
            C&apos;est parti
          </button>
        </section>
      )}

      {!child ? (
        <p className="nc-row-idle px-4 py-5 mt-6 text-[15px] text-soft">
          Choisissez un enfant dans le sélecteur en haut de l&apos;écran pour voir ses cartes.
        </p>
      ) : !deck ? (
        <div className="mt-6 space-y-3">
          <p className="nc-row-idle px-4 py-5 text-[15px] leading-[1.5] text-soft">
            Les cartes sont triées par âge. Ajoutez la date de naissance de {child.first_name} dans son profil
            pour recevoir celles qui lui correspondent.
          </p>
          <JokerTile />
        </div>
      ) : (
        <>
          {/* Le paquet de la semaine */}
          <section className="mt-7 animate-om-up" style={{ ['--om-d' as string]: '0.12s' }}>
            {latest ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <p className="nc-eyebrow">Cette semaine · {weekCards.length} cartes</p>
                  <p className="text-[13px] text-faint">Une seule suffit</p>
                </div>
                <DeckCarousel cards={weekCards} doneIds={home.doneCardIds} />
              </>
            ) : (
              <>
                <p className="nc-row-idle px-4 py-4 text-[15px] leading-[1.5] text-soft">
                  Les premières cartes apparaîtront ici dès que la séance 1 aura eu lieu. Une carte faite avant
                  sa séance perd son effet.
                </p>
                <p className="nc-eyebrow mt-6 mb-2">Déjà disponible</p>
                <JokerTile />
              </>
            )}
          </section>

          <TonightFilters deck={deck} state={home} />
          <HardNightsPicker deck={deck} state={home} intro={HARD_NIGHTS_INTRO} />
          <SessionPath deck={deck} state={home} latest={latest?.session ?? null} />

          {home.bonusDeck && (
            <section className="mt-10">
              <p className="nc-eyebrow mb-1">En bonus</p>
              <h2 className="font-display text-[22px] font-semibold text-night-ink">{DECKS[home.bonusDeck].tagline}</h2>
              <p className="text-[14px] text-soft mt-1">
                Le programme est terminé et votre enfant a grandi : le paquet suivant est à vous.
              </p>
              <div className="mt-3 space-y-2">
                {cardsOfDeck(home.bonusDeck).map((c) => (
                  <HomeCardTile key={c.id} card={c} done={home.doneCardIds.has(c.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Le guide : les 3 règles en vitrine, le reste à une page */}
      <Link href="/parent/fitness/guide" className="nc-card block mt-10 active:scale-[0.99] transition-transform">
        <div className="flex items-center justify-between gap-3">
          <p className="nc-eyebrow">Le guide · 2 minutes</p>
          <span aria-hidden className="text-faint text-lg leading-none">›</span>
        </div>
        <p className="font-display text-[20px] font-semibold text-night-ink mt-1.5">Les 3 seules règles</p>
        <ol className="mt-2 space-y-1 text-[15px] text-body">
          {RULES.map((r, i) => (
            <li key={r.title}>
              {i + 1}. {r.title}
            </li>
          ))}
        </ol>
      </Link>

      <Link
        href="/parent/fitness/videos"
        className="mt-3 nc-row-idle flex items-center gap-3 px-4 py-3.5 active:scale-[0.99] transition-transform"
      >
        <Icon name="play" className="w-4 h-4 text-soft" />
        <span className="text-[15px] text-body flex-1">Les séances vidéo 20 minutes</span>
        <span aria-hidden className="text-faint text-lg leading-none">›</span>
      </Link>

      {process.env.NODE_ENV === 'development' && home.storage === 'local' && (
        <p className="text-xs text-faint mt-6 border border-dashed border-line2 rounded-xl px-3 py-2">
          Revue locale : la migration 061 n&apos;est pas appliquée, les moments sont gardés dans ce navigateur.
        </p>
      )}
    </div>
  );
}

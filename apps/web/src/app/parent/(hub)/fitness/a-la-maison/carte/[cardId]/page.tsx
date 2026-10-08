'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Une carte = deux écrans (brief §0.4), puis le mécanisme de fierté (§0.7).
//
//   1. « Est-ce que je fais ça ce soir ? » — tient sans défilement.
//   2. « Je le fais, là, maintenant » — étapes à cocher, le script en grand.
//   3. « Ça s'est passé ? » — Oui / Pas vraiment. Aucun état d'échec.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChildStore } from '@/stores/child.store';
import { useHomeCards, type MomentOutcome } from '@/hooks/useHomeCards';
import { JOKER_ID, getCard, sessionLabel, suggestNext } from '@/lib/home-cards';
import { FitnessGate } from '@/components/parent/home-cards/FitnessGate';
import {
  JokerScreen,
  Notice,
  PrideNotReally,
  PrideYes,
  ScreenCheck,
  ScreenNow,
  ScreenTonight,
} from '@/components/parent/home-cards/CardScreens';

type Step = 'intro' | 'do' | 'check' | 'yes' | 'not';

export default function HomeCardPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const id = String(cardId);
  // La carte joker reste ouverte pendant que le compte se prépare
  return (
    <FitnessGate whenLocked={id === JOKER_ID ? <CardScreen key={id} cardId={id} /> : undefined}>
      {/* key : passer d’une carte à la suivante repart de l’écran 1 */}
      <CardScreen key={id} cardId={id} />
    </FitnessGate>
  );
}

function CardScreen({ cardId }: { cardId: string }) {
  const { children, selectedChildId, isLoading: childrenLoading } = useChildStore();
  const child = children.find((c) => c.id === selectedChildId) ?? null;
  const home = useHomeCards(child?.id ?? null, child?.date_of_birth ?? null);
  const [step, setStep] = useState<Step>('intro');

  // Chaque écran commence en haut (jamais d'arrivée au milieu d'un écran)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  if (childrenLoading || home.loading) {
    return <div className="h-[60vh] rounded-[28px] bg-night-surface animate-pulse" aria-hidden />;
  }

  const finish = (outcome: MomentOutcome, id: string) => {
    void home.recordMoment(id, outcome);
    setStep(outcome === 'YES' ? 'yes' : 'not');
  };

  if (cardId === JOKER_ID) {
    if (step === 'yes') return <PrideYes card={null} count={home.momentsCount} next={null} />;
    return <JokerScreen onDone={() => finish('YES', 'JOKER')} />;
  }

  const card = getCard(cardId);
  // Le parent ne voit jamais les autres paquets : une carte hors paquet n'existe pas pour lui.
  const inDeck = card && (card.deck === home.deck || card.deck === home.bonusDeck);
  if (!card || !inDeck) {
    return (
      <Notice title="Cette carte n'est pas disponible" body="Retrouvez les cartes de votre enfant dans « À la maison »." />
    );
  }
  if (!home.isUnlocked(card)) {
    return (
      <Notice
        title={`Cette carte s'ouvre après la séance ${card.session}`}
        body={`${sessionLabel(card.deck, card.session)}. Faite avant la séance, une carte perd son effet : elle apparaîtra dès que la séance aura eu lieu.`}
      />
    );
  }

  const next = suggestNext({
    deck: card.deck,
    currentId: card.id,
    unlockedSessions: home.unlockedSessions,
    doneIds: home.doneCardIds,
  });

  switch (step) {
    case 'intro':
      return <ScreenTonight key={card.id} card={card} onGo={() => setStep('do')} />;
    case 'do':
      return <ScreenNow card={card} onBack={() => setStep('intro')} onDone={() => setStep('check')} />;
    case 'check':
      return (
        <ScreenCheck
          card={card}
          onYes={() => finish('YES', card.id)}
          onNotReally={() => finish('NOT_REALLY', card.id)}
        />
      );
    case 'yes':
      return <PrideYes card={card} count={home.momentsCount} next={next} />;
    case 'not':
      return <PrideNotReally onRetry={() => setStep('intro')} next={next} />;
  }
}

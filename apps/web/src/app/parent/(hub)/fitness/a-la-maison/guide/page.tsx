'use client';

// Le guide parent des cartes « À la maison » : règles, fonctionnement, thèmes,
// paquet de l'enfant (et seulement le sien), avertissement.

import Link from 'next/link';
import { useChildStore } from '@/stores/child.store';
import { useHomeCards } from '@/hooks/useHomeCards';
import { DISCLAIMER } from '@/lib/home-cards/guide';
import { FitnessGate } from '@/components/parent/home-cards/FitnessGate';
import { Guide } from '@/components/parent/home-cards/HomeCardsSections';
import { InlineMd } from '@/components/parent/home-cards/InlineMd';

export default function HomeCardsGuidePage() {
  return (
    <FitnessGate whenLocked={<GuideContent />}>
      <GuideContent />
    </FitnessGate>
  );
}

function GuideContent() {
  const { children, selectedChildId } = useChildStore();
  const child = children.find((c) => c.id === selectedChildId) ?? null;
  const home = useHomeCards(child?.id ?? null, child?.date_of_birth ?? null);

  return (
    <div className="max-w-2xl mx-auto animate-om-up">
      <Link href="/parent/fitness/a-la-maison" className="flex w-fit items-center gap-1 h-11 text-sm font-semibold text-soft">
        ‹ À la maison
      </Link>
      <Guide deck={home.loading ? null : home.deck} />
      <p className="text-xs leading-[1.55] text-faint mt-10">
        <InlineMd text={DISCLAIMER} />
      </p>
      <p className="text-xs text-faint mt-2">Thrive Sport Positive — Montréal</p>
    </div>
  );
}

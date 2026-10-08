'use client';

import { useEffect, type ReactNode } from 'react';
import { isFitnessOpen, useAccessStore } from '@/lib/access';
import { FitnessConstructionNotice, LockedBanner } from '@/components/parent/AccessGate';

// Même garde que l'onglet Fitness (flag serveur + activation du compte), pour
// toutes les pages de cartes. `whenLocked` : ce qui reste offert pendant que le
// compte se prépare — la carte joker est disponible dès l'inscription (§0.5).
export function FitnessGate({ children, whenLocked }: { children: ReactNode; whenLocked?: ReactNode }) {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) {
    return <div className="h-40 rounded-[22px] bg-night-surface animate-pulse" aria-hidden />;
  }
  if (!isFitnessOpen(access)) return <FitnessConstructionNotice />;
  if (!access.unlocked) {
    return whenLocked === undefined ? <LockedBanner /> : <>{whenLocked}</>;
  }
  return <>{children}</>;
}

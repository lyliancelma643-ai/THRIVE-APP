'use client';

import { useEffect, type ReactNode } from 'react';
import { isFitnessOpen, useAccessStore } from '@/lib/access';
import { FitnessConstructionNotice } from '@/components/parent/AccessGate';
import { P3Paywall } from '@/components/parent/p3/P3Paywall';

// Garde des cartes « À la maison » : flag serveur + section Maison
// (access_state, même règle que la RLS de home_card_moments — migration 080).
// `whenLocked` : ce qui reste offert sans Maison — la carte joker est
// disponible dès l'inscription (§0.5).
export function FitnessGate({ children, whenLocked }: { children: ReactNode; whenLocked?: ReactNode }) {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) {
    return <div className="h-40 rounded-[22px] bg-night-surface animate-pulse" aria-hidden />;
  }
  if (!isFitnessOpen(access)) return <FitnessConstructionNotice />;
  if (!access.p3Access) {
    return whenLocked === undefined ? <P3Paywall /> : <>{whenLocked}</>;
  }
  return <>{children}</>;
}

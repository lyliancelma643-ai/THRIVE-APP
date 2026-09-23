'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Cadre commun des écrans P3 « Maison » (sous-page de l'onglet Fitness).
//
//   1. Garde d'accès : EXACTEMENT celle de l'onglet Fitness (flag serveur
//      `fitness_enabled` + compte activé) — P3 vit dans Fitness et s'ouvre avec lui.
//      La persistance en base dépend en plus du flag `p3_enabled` (migration 062) ;
//      tant qu'il est OFF, le hook bascule en local sans rien montrer.
//   2. Enfant sélectionné (store) et âge : moins de 8 ans → message neutre (R6).
//   3. Données (useP3Moments) + squelette de chargement. Aucun état d'échec (R7).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useAccessStore } from '@/lib/access';
import { useChildStore } from '@/stores/child.store';
import { FitnessConstructionNotice, LockedBanner } from '@/components/parent/AccessGate';
import { useP3Moments, type P3Data } from '@/hooks/useP3Moments';
import type { AgeBand } from '@/lib/p3-moments';
import type { ChildProfile } from '@/lib/catalog';
import { P3Skeleton } from './pieces';

export type P3Ctx = {
  child: ChildProfile;
  firstName: string;
  age: number | null;
  band: AgeBand;
  data: P3Data;
};

export const UNDER_8_MESSAGE =
  'Le programme Maison est conçu pour les 8–17 ans. Une version pour les plus jeunes est en préparation.';

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-xl mx-auto text-center py-16 md:py-24 animate-om-up">
      <p className="text-[17px] leading-[1.6] text-body text-pretty">{children}</p>
    </div>
  );
}

function P3Inner({ children }: { children: (ctx: P3Ctx) => ReactNode }) {
  const { children: kids, selectedChildId, isLoading } = useChildStore();
  const child = kids.find((c) => c.id === selectedChildId) ?? null;
  const firstName = child?.first_name ?? 'votre enfant';
  const data = useP3Moments(child?.id ?? null, child?.date_of_birth ?? null, firstName);

  if (!child) {
    if (isLoading) return <P3Skeleton />;
    return (
      <Notice>
        Choisissez d&apos;abord l&apos;enfant avec qui vivre ces moments.{' '}
        <Link href="/parent/select-profile" className="font-semibold text-accent-ink underline">
          Gérer les profils
        </Link>
      </Notice>
    );
  }
  if (data.loading) return <P3Skeleton />;
  // R6 : moins de 8 ans → aucune fiche servie.
  if (!data.band) return <Notice>{UNDER_8_MESSAGE}</Notice>;

  return <>{children({ child, firstName, age: data.age, band: data.band, data })}</>;
}

export function P3Frame({ children }: { children: (ctx: P3Ctx) => ReactNode }) {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) return <P3Skeleton />;
  if (!access.fitnessEnabled) return <FitnessConstructionNotice />;
  if (!access.unlocked) return <LockedBanner />;
  return <P3Inner>{children}</P3Inner>;
}

/** « Pour Léa, 9 ans » — le prénom remplace « votre enfant » dans les titres d'écran. */
export function forChild(ctx: Pick<P3Ctx, 'firstName' | 'age'>): string {
  return ctx.age === null ? `Pour ${ctx.firstName}` : `Pour ${ctx.firstName}, ${ctx.age} ans`;
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Cadre commun des écrans P3 « Maison » (l'onglet qui remplace Fitness).
//
//   1. Garde d'accès : flag serveur `p3_enabled` (app_settings, migration 062)
//      + compte activé — la même condition que la RLS des tables p3_*.
//      Indépendant de `fitness_enabled`, qui ne garde plus que les séances vidéo
//      (/parent/fitness/seances).
//   2. Enfant sélectionné (store) et âge : moins de 8 ans → message neutre (R6).
//   3. Données (useP3Moments) + squelette de chargement. Aucun état d'échec (R7).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
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

/**
 * Flag serveur `p3_enabled`. Lecture directe d'app_settings (lisible par tout
 * compte connecté) : pas besoin de modifier access_state(). Même repli que
 * l'état d'accès : table illisible → ouvert, la RLS reste l'autorité.
 */
function useP3Enabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('enabled')
        .eq('key', 'p3_enabled')
        .maybeSingle();
      if (!alive) return;
      setEnabled(error ? true : data?.enabled === true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

/**
 * Filet de sécurité des rangées d'affiches : au bout d'un carrousel, un
 * balayage horizontal (pavé tactile surtout) peut « déborder » sur la page et
 * être pris pour un retour arrière. Au doigt, c'est useHScroll qui l'évite ;
 * ici on coupe aussi la navigation par débordement de la racine, sur les
 * écrans Maison seulement. Le geste de bord système (iOS, Android) reste intact.
 */
function useNoHorizontalOverscrollNav() {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overscrollBehaviorX;
    root.style.overscrollBehaviorX = 'none';
    return () => {
      root.style.overscrollBehaviorX = before;
    };
  }, []);
}

export function P3Frame({ children }: { children: (ctx: P3Ctx) => ReactNode }) {
  const { access, isLoading, refresh } = useAccessStore();
  const p3Enabled = useP3Enabled();
  useNoHorizontalOverscrollNav();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access || p3Enabled === null) return <P3Skeleton />;
  if (!p3Enabled) return <FitnessConstructionNotice />;
  if (!access.unlocked) return <LockedBanner />;
  return <P3Inner>{children}</P3Inner>;
}

/** « Pour Léa, 9 ans » — le prénom remplace « votre enfant » dans les titres d'écran. */
export function forChild(ctx: Pick<P3Ctx, 'firstName' | 'age'>): string {
  return ctx.age === null ? `Pour ${ctx.firstName}` : `Pour ${ctx.firstName}, ${ctx.age} ans`;
}

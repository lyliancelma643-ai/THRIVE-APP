import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChildren, useFamily, supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '../stores/auth.store';
import { ageFromBirthDate, bandForAge, p3Pool, type Duration, type Moment } from '../lib/p3';
import { insertMoment, maisonMomentPayload } from '../components/activite/persist';

export type MaisonMoment = Moment & {
  week: number | null;
  outcome: 'ACCROCHE' | 'MOYEN' | 'PAS_CE_SOIR' | null;
  kept_phrase: string | null;
};

/** Moments vécus d'un enfant (table p3_moments, RLS : parent de l'enfant abonné). */
export function useMaison(childId: string | undefined) {
  const [moments, setMoments] = useState<MaisonMoment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId) {
      setMoments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: e } = await supabase
      .from('p3_moments')
      .select('activity_id, created_at, duration_chosen, rating, week, outcome, kept_phrase')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    setError(e ? 'Impossible de charger vos moments pour l’instant.' : null);
    setMoments((data as MaisonMoment[] | null) ?? []);
    setIsLoading(false);
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  return { moments, isLoading, error, reload: load };
}

/**
 * Contexte commun aux écrans Maison (accueil, parcours, carnet) : enfant choisi, tranche d'âge,
 * moments vécus et fiches faites. `initialChildId` vient des paramètres de route.
 */
export function useMaisonContext(initialChildId?: string) {
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(initialChildId ?? null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const { moments, isLoading, error, reload } = useMaison(child?.id);
  const age = ageFromBirthDate(child?.date_of_birth);
  const band = age === null ? null : bandForAge(age);
  const doneIds = useMemo(() => new Set(moments.map((m) => m.activity_id)), [moments]);
  const pool = useMemo(() => p3Pool(), []);
  return {
    children, child, selectChild: setSelectedId, childrenLoading,
    moments, isLoading, error, reload, band, doneIds, pool,
  };
}

export async function recordMoment(input: {
  childId: string;
  activityId: string;
  week: number;
  duration: Duration;
  outcome: 'ACCROCHE' | 'MOYEN' | 'PAS_CE_SOIR';
  keptPhrase?: string;
}) {
  // Un seul écrivain de p3_moments : components/activite/persist.ts. Mêmes colonnes et mêmes valeurs qu'avant (lieu « maison »,
  // aucune durée réelle, aucun check-in, débrief, capture ni note) ; insert sans relecture, le texte gardé n'est ni relu ni journalisé.
  await insertMoment(input.childId, maisonMomentPayload(input));
}

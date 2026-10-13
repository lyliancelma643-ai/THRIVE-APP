import React, { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { ParcoursView } from '../../components/maison/ParcoursView';
import { buildParcours } from '../../components/maison/logic';
import { buildParcoursVM, filterForParcours, PARCOURS_FILTERS } from '../../components/maison/models';

// K2 « Tout le parcours » : les 13 semaines et toutes leurs activités. Verrou neutre pour les semaines pas encore
// ouvertes (jamais « en retard »). Le filtre `filtre` (accueil : « Quand il dit non », « Rien à préparer »…) liste
// les fiches de la tranche d'âge de l'enfant. Le rendu vit dans ParcoursView.

function ParcoursContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string; filtre?: string }>();
  const ctx = useMaisonContext(params.childId);
  const { child, band, doneIds, pool, error, moments, reload } = ctx;
  const filtre = params.filtre && PARCOURS_FILTERS[params.filtre] ? params.filtre : undefined;

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const vm = useMemo(
    () =>
      buildParcoursVM({
        weeks: buildParcours(pool, doneIds),
        bonus: pool.filter((a) => a.week === null),
        poolSize: pool.length,
        doneIds,
        filter: filtre,
        filtered: filtre ? filterForParcours(pool, filtre, band, doneIds) : [],
      }),
    [pool, doneIds, filtre, band],
  );

  if (ctx.childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  const open = (id: string) => {
    if (!child || !band) return;
    router.push({ pathname: '/(parent)/activite/[activityId]', params: { activityId: id, childId: child.id, band } });
  };

  return <ParcoursView vm={vm} onBack={() => router.back()} onOpen={open} />;
}

export default function ParcoursScreen() {
  return (
    <PremiumGate>
      <ParcoursContent />
    </PremiumGate>
  );
}

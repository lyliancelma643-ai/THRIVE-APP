import React, { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { PageNonView, type SoftVM } from '../../components/aide/PageNonView';
import { ageBlocks, softActivity } from '../../components/aide/logic';
import { durationsText, PARCOURS_FILTERS } from '../../components/maison/models';
import { materialsLabel } from '../../components/maison/helpers';
import { vignetteIdFor } from '../../lib/vignettes';

// K4 « Quand il dit non » : page dédiée (PAGE_NON). La tranche d'âge de l'enfant d'abord, puis une fiche anti-refus
// (pickTonight avec 2 refus, comme le web). La liste filtrée de Maison reste joignable depuis le bas de la page.

function QuandIlDitNonContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const ctx = useMaisonContext(params.childId);
  const { child, band, moments, pool, error, reload } = ctx;

  const blocks = useMemo(() => ageBlocks(band), [band]);
  const soft = useMemo<SoftVM | null>(() => {
    const a = softActivity({ firstName: child?.first_name ?? '', band, moments, pool });
    return a ? { id: a.id, vignetteId: vignetteIdFor(a), title: a.title, detail: `${durationsText(a)} · ${materialsLabel(a)}` } : null;
  }, [child?.first_name, band, moments, pool]);

  if (ctx.childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  return (
    <PageNonView
      blocks={blocks}
      soft={soft}
      listLabel={PARCOURS_FILTERS.refus.subtitle}
      onBack={() => router.back()}
      onOpenSoft={(id) => {
        if (!child || !band) return;
        router.push({ pathname: '/(parent)/activite/[activityId]', params: { activityId: id, childId: child.id, band } });
      }}
      onOpenList={() =>
        router.push({ pathname: '/(parent)/parcours', params: { ...(child ? { childId: child.id } : {}), filtre: 'refus' } })
      }
    />
  );
}

export default function QuandIlDitNonScreen() {
  return (
    <PremiumGate>
      <QuandIlDitNonContent />
    </PremiumGate>
  );
}

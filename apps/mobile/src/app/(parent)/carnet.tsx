import React from 'react';
import { ActivityIndicator, Share } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { CarnetView } from '../../components/maison/CarnetView';
import { carnetObjects } from '../../components/maison/logic';
import { buildCarnetVM } from '../../components/maison/models';
import { momentsCount } from '../../lib/p3';

// N « Le carnet » : il se remplit tout seul, moment après moment. Ce qu’on garde (phrases), objets gagnés
// (acquis pour toujours) et objets à venir. Jamais de manque ni de score. Le rendu vit dans CarnetView.

function CarnetContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const { child, moments, doneIds, band, error, reload, childrenLoading } = useMaisonContext(params.childId);

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  if (childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  const name = child?.first_name ?? 'votre enfant';
  const objects = carnetObjects(doneIds, momentsCount(moments), name);
  const vm = buildCarnetVM({
    firstName: name,
    earned: objects.earned,
    upcoming: objects.upcoming,
    kept: moments.filter((m) => m.kept_phrase),
  });

  const share = () => {
    const lines = vm.kept.map((k) => `${k.title}${k.phrase ? ` : « ${k.phrase} »` : ''}`);
    void Share.share({ message: [`Le carnet de ${name}`, ...lines].join('\n') });
  };

  return (
    <CarnetView
      vm={vm}
      onBack={() => router.back()}
      onShare={share}
      onOpenActivity={(id) => {
        if (!child || !band) return;
        router.push({ pathname: '/(parent)/activite/[activityId]', params: { activityId: id, childId: child.id, band } });
      }}
    />
  );
}

export default function CarnetScreen() {
  return (
    <PremiumGate>
      <CarnetContent />
    </PremiumGate>
  );
}

import React from 'react';
import { ActivityIndicator } from 'react-native';
import type { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { OfflineState } from '../../../components/OfflineState';
import { useMaisonContext } from '../../../hooks/useMaison';
import { carnetObjects } from '../../../components/maison/logic';
import { momentsCount } from '../../../lib/p3';
import { ObjectView } from '../../../components/maison/objets/ObjectView';
import { buildObjectModel, buildPrintHtml, type RewardPayload } from '../../../components/maison/objets/logic';
import { nativeShareDeps } from '../../../components/maison/objets/nativeShare';
import { printObject, shareObjectImage } from '../../../components/maison/objets/share';
import { useRewardRow } from '../../../components/maison/objets/useReward';

// N2 · N3 · N4 · « La lettre » : un objet gagné, ouvert depuis le carnet (N) ou depuis « Voir » (M13).
// Lecture seule (p3_rewards + moments) ; le calcul « gagné » est celui du carnet, jamais un recalcul de droits.

function ObjetContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rewardId?: string; childId?: string }>();
  const rewardId = String(params.rewardId ?? '');
  const { child, moments, doneIds, error, reload, childrenLoading } = useMaisonContext(params.childId);
  const { row, loading } = useRewardRow(child?.id, rewardId);
  const cardRef = React.useRef<View>(null);
  const busy = React.useRef(false);

  if (childrenLoading || loading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0 && !row) return <OfflineState message={error} onRetry={reload} />;

  const name = child?.first_name ?? 'votre enfant';
  const earnedIds = new Set(carnetObjects(doneIds, momentsCount(moments), name).earned.map((e) => e.reward.id as string));
  const model = buildObjectModel({
    id: rewardId,
    firstName: name,
    row: row ? { payload: row.payload as RewardPayload, earned_at: row.earned_at } : null,
    earnedIds,
    fallbackDate: moments[0]?.created_at ?? null,
  });
  const html = buildPrintHtml(model);
  const deps = nativeShareDeps(cardRef);
  const title = model.kind === 'locked' || model.kind === 'letter' ? '' : model.title;

  const run = (job: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    void job().finally(() => { busy.current = false; });
  };

  return (
    <ObjectView
      model={model}
      cardRef={cardRef}
      onBack={() => router.navigate({ pathname: '/(parent)/carnet', params: child ? { childId: child.id } : {} })}
      onHome={() => router.navigate('/(parent)/maison')}
      onPrint={() => run(() => printObject(html, deps))}
      onSaveImage={() => run(() => shareObjectImage(html, 'Enregistrer l’image', deps))}
      onShare={() => run(() => shareObjectImage(html, title ? `Partager ${title}` : 'Partager', deps))}
    />
  );
}

export default function ObjetScreen() {
  return (
    <PremiumGate>
      <ObjetContent />
    </PremiumGate>
  );
}

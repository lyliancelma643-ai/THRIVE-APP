import React, { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabaseClient as supabase, useChildren, useFamily } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { OfflineState } from '../../components/OfflineState';
import { FinDeParcoursView } from '../../components/fin-parcours/FinDeParcoursView';
import { hasFinalPoint, shareMessage, type LsssPoint, type WellbeingPoint } from '../../components/fin-parcours/logic';

// Z · Fin de parcours : certificat partageable, courbe LSSS, bien-être sur 13 séances.
// Données : RPC lsss_progression / perma_progression (mêmes que le web). Aucune valeur codée en dur.
// [À COMPLÉTER] nom du coach et date de fin : pas de source lisible côté mobile pour l'instant.
// [À COMPLÉTER] PDF et documents du parcours (liens sécurisés) : non repris dans ce lot ; la vue masque le bouton PDF
// et la section « Documents du parcours » tant que `onPdf` / `documents` ne sont pas fournis.

export default function FinDeParcoursScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children } = useChildren(family?.id);
  const child = children.find((c) => c.id === childId) ?? children[0];
  const [lsss, setLsss] = useState<LsssPoint[]>([]);
  const [wellbeing, setWellbeing] = useState<WellbeingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.rpc('lsss_progression', { p_child: child.id }),
      supabase.rpc('perma_progression', { p_child: child.id }),
    ]);
    setFailed(!!a.error || !!b.error);
    setLsss((a.data as LsssPoint[] | null) ?? []);
    setWellbeing(((b.data as WellbeingPoint[] | null) ?? []).map((p) => ({ session_number: p.session_number, value: p.value })));
    setLoading(false);
  }, [child?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (failed) return <OfflineState onRetry={load} />;

  const done = hasFinalPoint(lsss);
  const name = child ? [child.first_name, child.last_name].filter(Boolean).join(' ') : '';
  const onShare = child
    ? () => {
        Share.share({ message: shareMessage(child.first_name) }).catch(() => {});
      }
    : undefined;

  return (
    <FinDeParcoursView
      loading={loading}
      certificate={child && done ? { name } : null}
      lsss={lsss}
      wellbeing={wellbeing}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'))}
      onShare={done ? onShare : undefined}
    />
  );
}

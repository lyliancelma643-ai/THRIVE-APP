import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabaseClient as supabase, useChildren, useFamily } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { RADIUS, SPACING, ThemedText, TAB_BAR_INSET, useTheme } from '../../design';
import { OfflineState } from '../../components/OfflineState';
import { Certificate } from '../../components/fin-parcours/Certificate';
import { Curve } from '../../components/fin-parcours/Curves';
import {
  hasFinalPoint,
  lsssDelta,
  wellbeingSeries,
  type LsssPoint,
  type WellbeingPoint,
} from '../../components/fin-parcours/logic';

// Z · Fin de parcours : certificat partageable, courbe LSSS, bien-être sur 13 séances.
// Données : RPC lsss_progression / perma_progression (mêmes que le web). Aucune valeur codée en dur.
// [À COMPLÉTER] nom du coach et date de fin : pas de source lisible côté mobile pour l'instant.
// [À COMPLÉTER] PDF et documents du parcours (liens sécurisés) : non repris dans ce lot.

export default function FinDeParcoursScreen() {
  const { colors } = useTheme();
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

  const series = wellbeingSeries(wellbeing);
  const delta = lsssDelta(lsss);
  const done = hasFinalPoint(lsss);
  const card = { backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space4, gap: SPACING.space2 } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ padding: SPACING.space4, paddingTop: 72, paddingBottom: TAB_BAR_INSET + SPACING.space8, gap: SPACING.space4 }}
    >
      <ThemedText variant="largeTitle" style={{ color: colors.label }} accessibilityRole="header">Fin de parcours</ThemedText>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Chargement" color={colors.tint} />
      ) : (
        <>
          {child && done ? (
            <Certificate firstName={child.first_name} />
          ) : (
            <View style={card}>
              <ThemedText variant="headline" style={{ color: colors.label }}>Le certificat arrive en fin de parcours</ThemedText>
              <ThemedText variant="subheadline" style={{ color: colors.label2 }}>
                Il s’ouvre une fois le bilan final réalisé, à la dernière séance.
              </ThemedText>
            </View>
          )}

          <View style={card}>
            <ThemedText variant="headline" style={{ color: colors.label }}>La courbe se referme</ThemedText>
            {lsss.length > 0 ? (
              <>
                {delta != null ? (
                  <ThemedText variant="subheadline" style={{ color: colors.ok }}>
                    {delta >= 0 ? `+${delta}` : `${delta}`} depuis le départ
                  </ThemedText>
                ) : null}
                <Curve values={lsss.map((p) => p.value)} min={0} max={100} label="Courbe des compétences de vie, du départ au bilan final" />
              </>
            ) : (
              <ThemedText variant="subheadline" style={{ color: colors.label2 }}>
                La courbe apparaîtra après le premier bilan.
              </ThemedText>
            )}
          </View>

          <View style={card}>
            <ThemedText variant="headline" style={{ color: colors.label }}>Bien-être · 13 séances</ThemedText>
            {series.length > 0 ? (
              <Curve values={series.map((p) => p.value)} min={1} max={5} label="Courbe du bien-être sur les séances" />
            ) : (
              <ThemedText variant="subheadline" style={{ color: colors.label2 }}>
                Le bien-être se dessine séance après séance.
              </ThemedText>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

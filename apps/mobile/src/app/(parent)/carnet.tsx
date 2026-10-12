import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { ListGroup, ListRow, RADIUS, SPACING, ThemedText, VignetteImage, useTheme } from '../../design';
import { ScreenBar } from '../../components/maison/ScreenBar';
import { carnetObjects } from '../../components/maison/logic';
import { formatDay } from '../../components/maison/helpers';
import { vignetteIdFor } from '../../lib/vignettes';
import { getActivity, momentsCount } from '../../lib/p3';

// N « Le carnet » : il se remplit tout seul, moment après moment. Ce qu’on garde (phrases),
// objets gagnés (acquis pour toujours) et objets à venir. Jamais de manque ni de score.

const GUTTER = SPACING.space4 + 4;

function CarnetContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ childId?: string }>();
  const { child, moments, doneIds, error, reload, childrenLoading } = useMaisonContext(params.childId);

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  if (childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  const name = child?.first_name ?? 'votre enfant';
  const objects = carnetObjects(doneIds, momentsCount(moments), name);
  const kept = moments.filter((m) => m.kept_phrase);
  const objectTotal = objects.earned.length + objects.upcoming.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: SPACING.space8 * 2 }}>
        <ThemedText variant="displayLarge" accessibilityRole="header" style={{ marginHorizontal: GUTTER }}>Le carnet</ThemedText>
        <ThemedText variant="subheadline" color="label2" style={{ marginHorizontal: GUTTER, marginTop: SPACING.space1 }}>
          Il se remplit tout seul, moment après moment.
        </ThemedText>

        {objects.earned.length > 0 ? (
          <View style={{ marginTop: SPACING.space6 }}>
            <ThemedText variant="title3" accessibilityRole="header" style={{ marginHorizontal: GUTTER, marginBottom: SPACING.space3 }}>
              Gagné
            </ThemedText>
            {objects.earned.map((e) => (
              <View
                key={e.reward.id}
                accessible
                accessibilityLabel={`${e.label}${e.reward.bonus ? `, ${e.reward.bonus}` : ''}`}
                style={{
                  marginHorizontal: GUTTER, marginBottom: SPACING.space2, padding: SPACING.space4, borderRadius: RADIUS.card,
                  flexDirection: 'row', alignItems: 'center', gap: SPACING.space4, backgroundColor: colors.bgGrouped2,
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="gift-outline" size={28} color={colors.accentInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="headline">{e.label}</ThemedText>
                  {e.reward.bonus ? <ThemedText variant="subheadline" color="label2">{e.reward.bonus}</ThemedText> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: SPACING.space6 }}>
          <ThemedText variant="title3" accessibilityRole="header" style={{ marginHorizontal: GUTTER, marginBottom: SPACING.space3 }}>
            Ce qu’on garde
          </ThemedText>
          {kept.length === 0 ? (
            <View style={{ marginHorizontal: GUTTER, padding: SPACING.space5, borderRadius: RADIUS.tile + 2, backgroundColor: colors.bgGrouped2 }}>
              <ThemedText variant="subheadline" color="label2">
                Les phrases que vous gardez avec {name} s’afficheront ici.
              </ThemedText>
            </View>
          ) : (
            <ListGroup>
              {kept.slice(0, 30).map((m) => {
                const a = getActivity(m.activity_id);
                return (
                  <View
                    key={`${m.activity_id}-${m.created_at}`}
                    accessible
                    accessibilityLabel={`${a?.title ?? 'Un moment'}, ${formatDay(m.created_at)} : ${m.kept_phrase}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3, padding: SPACING.space3 }}
                  >
                    <VignetteImage id={vignetteIdFor(a)} style={{ width: 48, height: 48, borderRadius: 14 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="subheadline" style={{ fontWeight: '600' }}>{a?.title ?? 'Un moment ensemble'}</ThemedText>
                      <ThemedText variant="footnote" color="label2">{formatDay(m.created_at)}</ThemedText>
                      <ThemedText variant="displayQuote" style={{ fontSize: 17, lineHeight: 23, marginTop: 4 }}>{`« ${m.kept_phrase} »`}</ThemedText>
                    </View>
                  </View>
                );
              })}
            </ListGroup>
          )}
        </View>

        {objectTotal > 0 ? (
          <View style={{ marginTop: SPACING.space6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: GUTTER, marginBottom: SPACING.space3 }}>
              <ThemedText variant="title3" accessibilityRole="header">Objets</ThemedText>
              <ThemedText variant="subheadline" color="label2">{`${objects.earned.length} sur ${objectTotal}`}</ThemedText>
            </View>
            <ListGroup>
              {[...objects.earned.map((e) => ({ ...e, got: true })), ...objects.upcoming.map((e) => ({ ...e, got: false }))].map((e, i, all) => (
                <ListRow
                  key={e.reward.id}
                  icon={e.got ? 'ribbon-outline' : 'lock-closed-outline'}
                  iconColor={e.got ? 'tint' : 'label2'}
                  title={e.label}
                  subtitle={e.got ? 'Acquis pour toujours' : 'Se débloque en avançant'}
                  chevron={false}
                  last={i === all.length - 1}
                />
              ))}
            </ListGroup>
          </View>
        ) : null}
      </ScrollView>
      <ScreenBar onBack={() => router.back()} />
    </View>
  );
}

export default function CarnetScreen() {
  return (
    <PremiumGate>
      <CarnetContent />
    </PremiumGate>
  );
}

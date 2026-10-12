import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HealthNotice } from '../../components/HealthNotice';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { getActivity, momentsCount, resolveActivity, weeklyProgress, type Duration } from '../../lib/p3';
import {
  GlassButton, ListGroup, ListRow, Pill, RADIUS, SPACING, Sheet, ThemedText, useTheme,
} from '../../design';
import { TonightHero } from '../../components/maison/TonightHero';
import { ActivityPoster } from '../../components/maison/ActivityPoster';
import { recommendTonight, reasonLine } from '../../components/maison/logic';
import { formatDay } from '../../components/maison/helpers';

// « Soir de famille » : le moment recommandé ce soir en fond plein écran, puis les portes,
// le compteur de moments, la semaine, le carnet. Semaine N+1 ouverte quand les 3 fiches de
// la semaine N sont vécues ; aucun échec, aucune série.

type Door = { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string; params: Record<string, string> };

const DOORS: Door[] = [
  { icon: 'grid-outline', label: 'Toutes les activités', params: { vue: 'toutes' } },
  { icon: 'compass-outline', label: 'Le programme', params: {} },
  { icon: 'book-outline', label: 'Le carnet', route: '/(parent)/carnet', params: {} },
  { icon: 'chatbubble-ellipses-outline', label: 'Quand il dit non', params: { filtre: 'refus' } },
];

function MaisonContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ctx = useMaisonContext();
  const { child, children, moments, doneIds, pool, band, error, isLoading, reload } = ctx;
  const [chosen, setChosen] = useState<{ id: string; d: Duration } | null>(null);
  const [childSheet, setChildSheet] = useState(false);
  const [momentSheet, setMomentSheet] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      reload();
    }, [reload]),
  );

  if (ctx.childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  const tonight = child ? recommendTonight(pool, doneIds, band) : null;
  const activity = tonight?.activity ?? null;
  const declared = (activity && chosen?.id === activity.id ? chosen.d : activity?.base_duration) as Duration | undefined;
  const view = activity && band && declared ? resolveActivity(activity, declared, band) : null;
  const duration = view?.duration ?? activity?.base_duration ?? 10;
  const progress = weeklyProgress(moments, new Date());
  const total = momentsCount(moments);

  const goParcours = (params: Record<string, string> = {}) =>
    router.push({ pathname: '/(parent)/parcours', params: { ...(child ? { childId: child.id } : {}), ...params } });
  const openCard = (id: string) =>
    router.push({ pathname: '/(parent)/activite/[activityId]', params: { activityId: id, childId: child!.id, band: band! } });
  const launch = () =>
    router.push({
      pathname: '/(parent)/moment/[activityId]',
      params: { activityId: activity!.id, childId: child!.id, band: band!, duration: String(duration) },
    });

  const header = (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top + SPACING.space1,
        paddingHorizontal: SPACING.space4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      {child ? (
        <GlassButton
          label={child.first_name}
          icon="chevron-down"
          accessibilityLabel={`Enfant : ${child.first_name}. Changer d’enfant`}
          onPress={() => setChildSheet(true)}
        />
      ) : (
        <View />
      )}
      <View style={{ flexDirection: 'row', gap: SPACING.space2 }}>
        <GlassButton icon="notifications-outline" accessibilityLabel="Notifications" onPress={() => router.push('/(parent)/notifications')} />
        <GlassButton icon="person-circle-outline" accessibilityLabel="Compte et famille" onPress={() => router.push('/(parent)/profile')} />
      </View>
    </View>
  );

  const sectionTitle = (title: string, action?: { label: string; onPress: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.space4 + 4 }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontSize: 21, lineHeight: 26 }}>{title}</ThemedText>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={10}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}
        >
          <ThemedText variant="subheadline" style={{ color: colors.sageInk, fontWeight: '600' }}>{action.label}</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={colors.sageInk} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: SPACING.space8 * 2 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} />}
      >
        {children.length === 0 ? (
          <Pressable
            onPress={() => router.push('/(parent)/children')}
            accessibilityRole="button"
            style={{
              marginTop: insets.top + 80, marginHorizontal: SPACING.space4, padding: SPACING.space6, alignItems: 'center',
              borderRadius: RADIUS.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator,
            }}
          >
            <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>
              Ajoutez votre enfant pour recevoir ses activités.
            </ThemedText>
          </Pressable>
        ) : !band || !activity || !child ? (
          <View style={{ marginTop: insets.top + 80, marginHorizontal: SPACING.space4, padding: SPACING.space5, borderRadius: RADIUS.card, backgroundColor: colors.bgGrouped2 }}>
            <ThemedText variant="body" color="label2">
              Les activités Maison sont conçues pour les 8 à 17 ans. Vérifiez la date de naissance de {child?.first_name} dans « Mes enfants ».
            </ThemedText>
          </View>
        ) : (
          <>
            <TonightHero
              activity={activity}
              firstName={child.first_name}
              reason={reasonLine(tonight!)}
              duration={duration}
              onLaunch={launch}
              onOpenCard={() => openCard(activity.id)}
              onMore={() => setMomentSheet(true)}
            />

            <Pressable
              onPress={() => setMomentSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`${duration} minutes, à la maison. Changer la durée`}
              style={{
                alignSelf: 'center', marginTop: SPACING.space5, minHeight: 44, paddingHorizontal: SPACING.space4 + 2, borderRadius: 22,
                flexDirection: 'row', alignItems: 'center', gap: SPACING.space2, backgroundColor: colors.fill3, borderWidth: 1, borderColor: colors.separator,
              }}
            >
              <Ionicons name="timer-outline" size={17} color={colors.label} />
              <ThemedText variant="subheadline" style={{ fontWeight: '600' }}>{duration} min</ThemedText>
              <ThemedText variant="subheadline" color="label2">·</ThemedText>
              <Ionicons name="home-outline" size={17} color={colors.label} />
              <ThemedText variant="subheadline" style={{ fontWeight: '600' }}>À la maison</ThemedText>
              <Ionicons name="chevron-down" size={14} color={colors.label2} />
            </Pressable>

            <View style={{ marginHorizontal: SPACING.space4 + 4, marginTop: SPACING.space8 - 4, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {DOORS.map((d) => (
                <Pressable
                  key={d.label}
                  onPress={() =>
                    d.route
                      ? router.push({ pathname: d.route, params: { childId: child.id } })
                      : goParcours(d.params)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={d.label}
                  style={({ pressed }) => ({
                    flexBasis: '48%', flexGrow: 1, minHeight: 76, padding: SPACING.space3, borderRadius: 22, flexDirection: 'row',
                    alignItems: 'center', gap: SPACING.space3, backgroundColor: colors.bgGrouped2, opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={d.icon} size={20} color={colors.sageInk} />
                  </View>
                  <ThemedText variant="subheadline" style={{ flex: 1, fontWeight: '600' }}>{d.label}</ThemedText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => router.push('/(parent)/videos')}
                accessibilityRole="button"
                accessibilityLabel="Les séances vidéo, bientôt disponibles"
                style={{
                  flexBasis: '100%', minHeight: 64, padding: SPACING.space3, borderRadius: 22, flexDirection: 'row', alignItems: 'center',
                  gap: SPACING.space3, backgroundColor: colors.bgGrouped2, opacity: 0.8,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="play-circle-outline" size={20} color={colors.sageInk} />
                </View>
                <ThemedText variant="subheadline" style={{ flex: 1, fontWeight: '600' }}>Les séances vidéo</ThemedText>
                <Pill label="Bientôt" tone="neutral" />
              </Pressable>
            </View>

            <View
              style={{
                marginHorizontal: SPACING.space4 + 4, marginTop: SPACING.space8 - 4, padding: SPACING.space6 - 1, borderRadius: RADIUS.card,
                alignItems: 'center', gap: SPACING.space3 + 2, backgroundColor: colors.navy900,
              }}
              accessible
              accessibilityLabel={`${total} moment${total > 1 ? 's' : ''} ensemble. ${progress.done} sur ${progress.target} cette semaine`}
            >
              <ThemedText variant="displayLarge" style={{ fontSize: 30, lineHeight: 34, color: colors.cream, textAlign: 'center' }}>
                {total === 0 ? 'Votre premier moment vous attend' : `${total} moment${total > 1 ? 's' : ''} ensemble`}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: SPACING.space4 }}>
                {Array.from({ length: progress.target }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: i < progress.done ? colors.sun : 'rgba(0,0,0,0.25)',
                    }}
                  >
                    <Ionicons name={i < progress.done ? 'star' : 'star-outline'} size={26} color={i < progress.done ? colors.navy900 : colors.cream} />
                  </View>
                ))}
              </View>
              <ThemedText variant="subheadline" style={{ color: colors.cream, fontWeight: '600' }}>
                {progress.done} sur {progress.target} cette semaine
              </ThemedText>
            </View>

            <View style={{ marginTop: SPACING.space8 + 2 }}>
              {sectionTitle('Cette semaine', { label: 'Le programme', onPress: () => goParcours() })}
              <ThemedText variant="footnote" color="label2" style={{ marginHorizontal: SPACING.space4 + 4, marginTop: 6 }}>
                Semaine {tonight!.openWeek} · {tonight!.weekTitle}. Les trois premières suffisent.
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SPACING.space4 + 4, gap: SPACING.space3, marginTop: SPACING.space3 + 2 }}
              >
                {tonight!.weekActivities.map((a) => (
                  <ActivityPoster key={a.id} activity={a} size={148} done={doneIds.has(a.id)} onPress={() => openCard(a.id)} />
                ))}
              </ScrollView>
            </View>

            <Pressable
              onPress={() => goParcours({ vue: 'toutes' })}
              accessibilityRole="button"
              accessibilityLabel={`Voir les ${pool.length} activités`}
              style={{
                marginHorizontal: SPACING.space4 + 4, marginTop: SPACING.space8 - 4, height: 56, borderRadius: 28, borderWidth: 1,
                borderColor: colors.separator, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.space2,
              }}
            >
              <Ionicons name="grid-outline" size={18} color={colors.label} />
              <ThemedText variant="headline">{`Voir les ${pool.length} activités`}</ThemedText>
            </Pressable>

            <View style={{ marginHorizontal: SPACING.space4 + 4, marginTop: SPACING.space8 + 2 }}>
              <ThemedText variant="title2" accessibilityRole="header" style={{ fontSize: 21, lineHeight: 26, marginBottom: SPACING.space3 }}>
                Le carnet
              </ThemedText>
              {moments.length === 0 ? (
                <View style={{ padding: SPACING.space5, borderRadius: RADIUS.tile + 2, backgroundColor: colors.bgGrouped2 }}>
                  <ThemedText variant="subheadline" color="label2">
                    Vos moments vécus avec {child.first_name} s’afficheront ici.
                  </ThemedText>
                </View>
              ) : (
                moments.slice(0, 3).map((m, i) => {
                  const a = getActivity(m.activity_id);
                  return (
                    <View
                      key={`${m.activity_id}-${m.created_at}`}
                      style={{
                        borderRadius: 20, padding: SPACING.space4, marginBottom: SPACING.space3, backgroundColor: colors.cream,
                        transform: [{ rotate: `${[-0.6, 0.5, -0.3][i]}deg` }],
                      }}
                    >
                      <ThemedText variant="footnote" style={{ color: colors.sageInk, fontStyle: 'italic' }}>{formatDay(m.created_at)}</ThemedText>
                      <ThemedText variant="headline" style={{ color: colors.navy900, marginTop: 4 }}>{a?.title ?? 'Un moment ensemble'}</ThemedText>
                      {m.kept_phrase ? (
                        <ThemedText variant="displayQuote" style={{ color: colors.navy900, marginTop: 6 }}>{`« ${m.kept_phrase} »`}</ThemedText>
                      ) : null}
                    </View>
                  );
                })
              )}
              <Pressable
                onPress={() => router.push({ pathname: '/(parent)/carnet', params: { childId: child.id } })}
                accessibilityRole="button"
                accessibilityLabel="Tout le carnet"
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <ThemedText variant="subheadline" style={{ color: colors.sageInk, fontWeight: '600' }}>Tout le carnet</ThemedText>
                <Ionicons name="arrow-forward" size={16} color={colors.sageInk} />
              </Pressable>
            </View>
          </>
        )}

        <View style={{ marginHorizontal: SPACING.space4 + 4, marginTop: SPACING.space8, paddingTop: SPACING.space5, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <HealthNotice />
        </View>
      </ScrollView>

      {header}

      <Sheet visible={childSheet} onClose={() => setChildSheet(false)} title="Pour quel enfant ?">
        <ListGroup>
          {children.map((c, i) => (
            <ListRow
              key={c.id}
              title={c.first_name}
              chevron={false}
              accessory={c.id === child?.id ? <Ionicons name="checkmark" size={20} color={colors.tint} style={{ marginRight: SPACING.space4 }} /> : undefined}
              last={i === children.length - 1}
              onPress={() => { ctx.selectChild(c.id); setChildSheet(false); }}
            />
          ))}
        </ListGroup>
        <View style={{ height: SPACING.space3 }} />
        <ListGroup>
          <ListRow icon="people-outline" title="Gérer mes enfants" last onPress={() => { setChildSheet(false); router.push('/(parent)/children'); }} />
        </ListGroup>
      </Sheet>

      <Sheet visible={momentSheet} onClose={() => setMomentSheet(false)} title="Pour ce soir">
        {activity ? (
          <>
            <ThemedText variant="footnote" color="label2" style={{ marginBottom: SPACING.space2 }}>Durée du moment</ThemedText>
            <ListGroup>
              {activity.durations.map((d, i) => (
                <ListRow
                  key={d}
                  title={`${d} min`}
                  chevron={false}
                  accessory={d === duration ? <Ionicons name="checkmark" size={20} color={colors.tint} style={{ marginRight: SPACING.space4 }} /> : undefined}
                  last={i === activity.durations.length - 1}
                  onPress={() => { setChosen({ id: activity.id, d }); setMomentSheet(false); }}
                />
              ))}
            </ListGroup>
            <View style={{ height: SPACING.space3 }} />
            <ListGroup>
              <ListRow icon="compass-outline" title="Voir tout le parcours" last onPress={() => { setMomentSheet(false); goParcours(); }} />
            </ListGroup>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

export default function MaisonScreen() {
  return (
    <PremiumGate>
      <MaisonContent />
    </PremiumGate>
  );
}

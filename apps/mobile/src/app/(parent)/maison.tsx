import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HealthNotice } from '../../components/HealthNotice';
import { OfflineState } from '../../components/OfflineState';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useMaisonContext } from '../../hooks/useMaison';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { momentsCount, resolveActivity, weeklyProgress, type Duration } from '../../lib/p3';
import { Icon, List, ListRow, SPACING, Sheet, ThemedText, useTheme } from '../../design';
import { HomeView } from '../../components/maison/HomeView';
import { SourcesSheet } from '../../components/maison/SourcesSheet';
import { recommendTonight } from '../../components/maison/logic';
import { bannerFor, buildHomeVM, phaseOfWeek, showOffersInvite } from '../../components/maison/models';
import type { HomeActions } from '../../components/maison/viewModels';
import { MaisonTour } from '../../components/maison/tour/MaisonTour';
import { TourProvider, useTourRegistry } from '../../components/maison/tour/anchors';
import { tourSteps } from '../../components/maison/tour/steps';
import { useMaisonTour } from '../../hooks/useMaisonTour';
import { useAuthStore } from '../../stores/auth.store';

// « Soir de famille » : le moment recommandé ce soir, puis les portes, le compteur, la semaine, les rangées,
// le carnet. Logique inchangée : semaine N+1 ouverte quand les 3 fiches de la semaine N sont vécues,
// filtre de tranche d'âge, aucun échec, aucune série. Le rendu vit dans HomeView (vue présentationnelle).

function MaisonContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styleKey } = useTheme();
  const ctx = useMaisonContext();
  const ent = useEntitlement();
  const sourceMaison = useSubscriptionStore((s) => s.access?.sourceMaison);
  const { child, children, moments, doneIds, pool, band, error, isLoading, reload } = ctx;
  const [chosen, setChosen] = useState<{ id: string; d: Duration } | null>(null);
  const [childSheet, setChildSheet] = useState(false);
  const [momentSheet, setMomentSheet] = useState(false);
  const [sourcesSheet, setSourcesSheet] = useState(false);
  const [momentChip, setMomentChip] = useState('rien');
  const [phaseChip, setPhaseChip] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);
  const tourRegistry = useTourRegistry();
  // Première arrivée : la visite guidée s'ouvre quand Maison est prête et qu'aucun moment n'est encore vécu.
  const tour = useMaisonTour(userId, !ctx.childrenLoading && !!child && !!band && !isLoading && momentsCount(moments) === 0);

  useFocusEffect(
    React.useCallback(() => {
      reload();
    }, [reload]),
  );

  const tonight = useMemo(() => (child ? recommendTonight(pool, doneIds, band) : null), [child, pool, doneIds, band]);
  const activity = tonight?.activity ?? null;

  if (ctx.childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

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

  // Pas d'enfant ou tranche d'âge hors 8-17 : mêmes messages qu'avant, sur le fond de la page.
  if (children.length === 0 || !band || !activity || !child || !tonight) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgGrouped, paddingTop: insets.top + 80, paddingHorizontal: SPACING.space4 }}>
        {children.length === 0 ? (
          <Pressable
            onPress={() => router.push('/(parent)/children')}
            accessibilityRole="button"
            style={{ padding: SPACING.space6, alignItems: 'center', borderRadius: 26, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.label4 }}
          >
            <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>Ajoutez votre enfant pour recevoir ses activités.</ThemedText>
          </Pressable>
        ) : (
          <View style={{ padding: SPACING.space5, borderRadius: 26, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.separator }}>
            <ThemedText variant="body" color="label2">
              Les activités Maison sont conçues pour les 8 à 17 ans. Vérifiez la date de naissance de {child?.first_name} dans « Mes enfants ».
            </ThemedText>
          </View>
        )}
        <View style={{ marginTop: SPACING.space8 }}>
          <HealthNotice />
        </View>
      </View>
    );
  }

  const now = new Date();
  const vm = buildHomeVM({
    childName: child.first_name,
    tonight,
    duration,
    pool: pool.filter((a) => a.age_bands.includes(band)),
    doneIds,
    momentsTotal: total,
    weekDone: progress.done,
    weekTarget: progress.target,
    momentChip,
    phaseChip: phaseChip ?? phaseOfWeek(tonight.openWeek),
    banner: bannerFor({ sourceMaison, isTrial: ent.isTrial, expirationDate: ent.expirationDate, now }),
    // Invitation vers l'écran Offres de l'app (jamais un paiement web) : style Veillée, hors forfait accompagné.
    invite: showOffersInvite({ styleKey, sourceMaison }),
    carnet: moments,
  });
  vm.allLabel = `Voir les ${pool.length} activités, triées par âge`;

  const actions: HomeActions = {
    onChild: () => setChildSheet(true),
    onBell: () => router.push('/(parent)/notifications'),
    onProfile: () => router.push('/(parent)/profile'),
    onLaunch: launch,
    onOpenCard: openCard,
    onMore: () => setMomentSheet(true),
    onMinutes: () => setMomentSheet(true),
    onDoor: (key) => {
      if (key === 'toutes') goParcours({ vue: 'toutes' });
      else if (key === 'programme') goParcours();
      else if (key === 'refus') router.push({ pathname: '/(parent)/quand-il-dit-non', params: { childId: child.id } });
      else if (key === 'carnet') router.push({ pathname: '/(parent)/carnet', params: { childId: child.id } });
      else router.push('/(parent)/videos');
    },
    onWeekAll: () => goParcours(),
    onMomentsAll: () => goParcours({ vue: 'toutes', filtre: momentChip }),
    onMomentsChip: setMomentChip,
    onPhasesAll: () => goParcours(),
    onPhasesChip: setPhaseChip,
    onAll: () => goParcours({ vue: 'toutes' }),
    onInvite: () => router.push('/(parent)/offres'),
    onCarnet: () => router.push({ pathname: '/(parent)/carnet', params: { childId: child.id } }),
    onSources: () => setSourcesSheet(true),
  };

  return (
    <TourProvider value={tourRegistry}>
      <HomeView
        vm={vm}
        actions={actions}
        footer={<View style={{ marginTop: SPACING.space3 }}><HealthNotice /></View>}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} />}
      />

      <MaisonTour
        visible={tour.visible}
        steps={tourSteps({ childName: child.first_name, weekTarget: progress.target })}
        onClose={tour.finish}
        onLaunch={launch}
      />

      <Sheet visible={childSheet} onClose={() => setChildSheet(false)} title="Pour quel enfant ?">
        <List>
          {children.map((c) => (
            <ListRow
              key={c.id}
              title={c.first_name}
              chevron={false}
              accessory={c.id === child.id ? <Icon name="check" size={20} color={colors.tintText} strokeWidth={2.6} /> : undefined}
              onPress={() => { ctx.selectChild(c.id); setChildSheet(false); }}
            />
          ))}
        </List>
        <View style={{ height: SPACING.space3 }} />
        <List>
          <ListRow glyph="people" title="Gérer mes enfants" onPress={() => { setChildSheet(false); router.push('/(parent)/children'); }} />
        </List>
      </Sheet>

      <Sheet visible={momentSheet} onClose={() => setMomentSheet(false)} title="Pour ce soir">
        <ThemedText variant="foot" color="label2" style={{ marginBottom: SPACING.space2 }}>Durée du moment</ThemedText>
        <List>
          {activity.durations.map((d) => (
            <ListRow
              key={d}
              title={`${d} min`}
              chevron={false}
              accessory={d === duration ? <Icon name="check" size={20} color={colors.tintText} strokeWidth={2.6} /> : undefined}
              onPress={() => { setChosen({ id: activity.id, d }); setMomentSheet(false); }}
            />
          ))}
        </List>
        <View style={{ height: SPACING.space3 }} />
        <List>
          <ListRow glyph="compass" title="Voir tout le parcours" onPress={() => { setMomentSheet(false); goParcours(); }} />
        </List>
      </Sheet>

      <SourcesSheet visible={sourcesSheet} onClose={() => setSourcesSheet(false)} pool={pool} />
    </TourProvider>
  );
}

export default function MaisonScreen() {
  return (
    <PremiumGate>
      <MaisonContent />
    </PremiumGate>
  );
}

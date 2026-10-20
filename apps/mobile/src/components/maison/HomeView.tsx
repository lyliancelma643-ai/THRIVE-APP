import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import {
  Avatar, BASE_VIGNETTE_ID, Card, Enamel, Felt, GlassPair, GlassSurface, Icon, Lamp, NavBar, Paper, Star, ThemedText, Velvet, VignetteImage,
  useScrollEdge, useTheme, type IconName,
} from '../../design';
import { HomeChipRow, HomeSectionHeader, PosterRow } from './HomeParts';
import { TonightHero } from './TonightHero';
import { SOON_TAG } from './palette';
import type { HomeActions, HomeShelfVM, HomeVM } from './viewModels';

type Props = {
  vm: HomeVM;
  actions: HomeActions;
  /** Contenu sous « Les sources de la méthode » (avertissement santé). */
  footer?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
};

const DOORS: { key: 'toutes' | 'programme' | 'carnet' | 'refus'; glyph: IconName; label: string }[] = [
  { key: 'toutes', glyph: 'grid', label: 'Toutes les activités' },
  { key: 'programme', glyph: 'compass', label: 'Le programme' },
  { key: 'carnet', glyph: 'book', label: 'Le carnet' },
  { key: 'refus', glyph: 'chat', label: 'Quand il dit non' },
];
const TILT = [-0.6, 0.5, -0.3];

/**
 * K · Maison (« Soir de famille »), identique dans Lin et Veillée (seuls les jetons changent) : la lampe (Veillée),
 * l'affiche du soir avec Lancer en émail (le seul geste soleil), quatre portes en feutre, la semaine en velours,
 * des rangées d'affiches, le carnet en papier vergé. Vue présentationnelle : tout vient de `vm` et `actions`.
 * K3 (« Maison seul ») : même vue, bandeau d'essai et invitation vers l'écran Offres de l'app (jamais un paiement).
 */
export function HomeView({ vm, actions, footer, refreshControl }: Props) {
  const { colors, styleKey } = useTheme();
  const scroll = useScrollEdge();

  const doorInk = (strong: boolean) => (strong ? colors.cream : colors.label);
  const door = (d: (typeof DOORS)[number], strong: boolean) => (
    <Pressable
      key={d.key}
      onPress={() => actions.onDoor(d.key)}
      accessibilityRole="button"
      accessibilityLabel={d.label}
      style={({ pressed }) => ({ width: '48.6%', flexGrow: 1, opacity: pressed ? 0.75 : 1 })}
    >
      <Felt
        strong={strong}
        radius={22}
        color={strong ? undefined : colors.bgGrouped2}
        style={strong ? undefined : { borderWidth: 1, borderColor: colors.separator }}
      >
        <View style={{ minHeight: 76, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: strong ? 'rgba(247,245,242,0.14)' : colors.badgeBg,
            }}
          >
            <Icon name={d.glyph} size={20} color={strong ? colors.cream : colors.badgeInk} />
          </View>
          <ThemedText variant="sub" weight={600} style={{ flex: 1, fontSize: 15, lineHeight: 19, letterSpacing: -0.3, color: doorInk(strong) }}>
            {d.label}
          </ThemedText>
        </View>
      </Felt>
    </Pressable>
  );

  const shelf = (s: HomeShelfVM, onAll: () => void, onChip: (k: string) => void) => (
    <View style={{ marginTop: 34 }}>
      <HomeSectionHeader title={s.title} actionLabel={s.actionLabel} onAction={onAll} />
      {s.chips ? <HomeChipRow chips={s.chips} active={s.activeChip} onChip={onChip} /> : null}
      <ThemedText variant="sub" color="label2" style={{ marginHorizontal: 20, marginTop: s.chips ? 10 : 6, fontSize: 14, lineHeight: 19, letterSpacing: -0.43 }}>
        {s.note}
      </ThemedText>
      <PosterRow posters={s.posters} onOpen={actions.onOpenCard} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      {styleKey === 'veillee' ? <Lamp /> : null}
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <TonightHero hero={vm.hero} banner={vm.banner} onLaunch={actions.onLaunch} onOpenCard={() => actions.onOpenCard(vm.hero.id)} onMore={actions.onMore} />

        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <Pressable
            onPress={actions.onMinutes}
            accessibilityRole="button"
            accessibilityLabel={`${vm.hero.minutes} minutes, à la maison. Changer la durée`}
            style={{
              height: 44, paddingHorizontal: 18, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.fill3, borderWidth: 1, borderColor: colors.separator,
            }}
          >
            <Icon name="timer" size={17} color={colors.label} />
            <ThemedText variant="sub" weight={600} style={{ fontSize: 15, lineHeight: 18, letterSpacing: -0.43 }}>{`${vm.hero.minutes} min`}</ThemedText>
            <ThemedText variant="sub" color="label2" style={{ fontSize: 15 }}>·</ThemedText>
            <Icon name="home" size={17} color={colors.label} />
            <ThemedText variant="sub" weight={600} style={{ fontSize: 15, lineHeight: 18, letterSpacing: -0.43 }}>À la maison</ThemedText>
            <Icon name="chevronDown" size={14} color={colors.label} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 30, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {DOORS.map((d, i) => door(d, i === 0))}
          <Pressable
            onPress={() => actions.onDoor('videos')}
            accessibilityRole="button"
            accessibilityLabel="Les séances vidéo de 20 min, bientôt disponibles"
            style={{ width: '100%' }}
          >
            <Felt radius={22} color={colors.bgGrouped2} style={{ borderWidth: 1, borderColor: colors.separator }}>
              <View style={{ minHeight: 64, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.badgeBg }}>
                  <Icon name="video" size={20} color={colors.badgeInk} />
                </View>
                <ThemedText variant="sub" weight={600} style={{ flex: 1, fontSize: 15, lineHeight: 19, letterSpacing: -0.3 }}>Les séances vidéo de 20 min</ThemedText>
                <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: SOON_TAG.bg, justifyContent: 'center' }}>
                  <ThemedText variant="cap" weight={600} style={{ color: SOON_TAG.ink, letterSpacing: -0.43 }}>Bientôt</ThemedText>
                </View>
              </View>
            </Felt>
          </Pressable>
        </View>

        <View
          accessible
          accessibilityLabel={`${vm.counter.total} moment${vm.counter.total > 1 ? 's' : ''} ensemble. ${vm.counter.done} sur ${vm.counter.target} cette semaine`}
          style={{ marginHorizontal: 20, marginTop: 30 }}
        >
          <Velvet radius={26}>
            <View style={{ paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', gap: 14 }}>
              <ThemedText variant="displayLarge" weight={500} style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.43, textAlign: 'center' }}>
                {vm.counter.total === 0 ? 'Votre premier moment vous attend' : `${vm.counter.total} moment${vm.counter.total > 1 ? 's' : ''} ensemble`}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {Array.from({ length: vm.counter.target }, (_, i) =>
                  // Étoile gagnée en émail (maquette K) : c'est une marque d'état, pas le geste principal (D5).
                  i < vm.counter.done ? (
                    <Enamel key={i} radius={32}>
                      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="star" size={30} color={colors.accentInk} filled />
                      </View>
                    </Enamel>
                  ) : (
                    <Star key={i} size={64} />
                  ),
                )}
              </View>
              <ThemedText variant="sub" weight={600} color="label2" style={{ fontSize: 14, lineHeight: 16, letterSpacing: -0.43 }}>
                {`${vm.counter.done} sur ${vm.counter.target} cette semaine`}
              </ThemedText>
            </View>
          </Velvet>
        </View>

        <View style={{ marginTop: 34 }}>
          <HomeSectionHeader title="Cette semaine" actionLabel="Le programme" onAction={actions.onWeekAll} />
          <ThemedText variant="sub" color="label2" style={{ marginHorizontal: 20, marginTop: 6, fontSize: 14, lineHeight: 19, letterSpacing: -0.43 }}>
            {vm.weekNote}
          </ThemedText>
          <PosterRow posters={vm.weekPosters} onOpen={actions.onOpenCard} />
        </View>

        {vm.moments ? shelf(vm.moments, actions.onMomentsAll, actions.onMomentsChip) : null}
        {vm.phases ? shelf(vm.phases, actions.onPhasesAll, actions.onPhasesChip) : null}

        <Pressable
          onPress={actions.onAll}
          accessibilityRole="button"
          accessibilityLabel={vm.allLabel}
          style={{
            marginHorizontal: 20, marginTop: 30, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.fill4,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Icon name="grid" size={20} color={colors.label} />
          <ThemedText variant="sub" weight={600} style={{ fontSize: 16, lineHeight: 20, letterSpacing: -0.43 }}>{vm.allLabel}</ThemedText>
        </Pressable>

        {vm.invite ? (
          <Card
            padding={14}
            onPress={actions.onInvite}
            accessibilityLabel="Envie d’aller plus loin ? Un coach, en groupe ou seul, près de chez toi."
            style={{ marginHorizontal: 20, marginTop: 24 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden' }}>
                <VignetteImage id={BASE_VIGNETTE_ID} style={{ width: 56, height: 56 }} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline" style={{ fontSize: 16, lineHeight: 20, letterSpacing: -0.43 }}>Envie d’aller plus loin ?</ThemedText>
                <ThemedText variant="sub" color="label2" style={{ fontSize: 14, lineHeight: 19, letterSpacing: -0.43 }}>Un coach, en groupe ou seul, près de chez toi.</ThemedText>
              </View>
              <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.4} />
            </View>
          </Card>
        ) : null}

        <View style={{ marginHorizontal: 20, marginTop: 34 }}>
          <ThemedText variant="sectionTitle" accessibilityRole="header" style={{ marginBottom: 12, lineHeight: 27, letterSpacing: -0.43 }}>Le carnet</ThemedText>
          {vm.carnet.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.fill3 }}>
              <ThemedText variant="sub" color="label2">{vm.carnetEmptyText}</ThemedText>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {vm.carnet.map((m, i) => (
                <Paper key={m.id} laid radius={20} padding={16} style={{ transform: [{ rotate: `${TILT[i % TILT.length]}deg` }] }}>
                  <ThemedText variant="displayQuote" weight={400} color="sageText" style={{ fontSize: 13, lineHeight: 17, fontStyle: 'italic' }}>{m.dateLabel}</ThemedText>
                  <ThemedText variant="sub" weight={700} style={{ marginTop: 4, fontSize: 15, lineHeight: 19, letterSpacing: -0.43 }}>{m.title}</ThemedText>
                  {m.phrase ? (
                    <ThemedText variant="displayQuote" weight={400} style={{ marginTop: 6, fontSize: 16, lineHeight: 22 }}>{`« ${m.phrase} »`}</ThemedText>
                  ) : null}
                </Paper>
              ))}
            </View>
          )}
          <Pressable
            onPress={actions.onCarnet}
            accessibilityRole="button"
            accessibilityLabel="Tout le carnet"
            style={{ marginTop: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <ThemedText variant="sub" weight={600} color="sageText" style={{ fontSize: 15, lineHeight: 18, letterSpacing: -0.43 }}>Tout le carnet</ThemedText>
            <Icon name="arrowRight" size={16} color={colors.sageText} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <Pressable onPress={actions.onSources} accessibilityRole="button" accessibilityLabel="Les sources de la méthode" style={{ minHeight: 44, justifyContent: 'center' }}>
            <ThemedText variant="sub" color="label2" style={{ fontSize: 14, lineHeight: 16, letterSpacing: -0.43 }}>Les sources de la méthode</ThemedText>
          </Pressable>
          {footer}
        </View>
      </ScrollView>

      <NavBar
        edge={scroll.edge}
        left={
          <Pressable onPress={actions.onChild} accessibilityRole="button" accessibilityLabel={`Enfant : ${vm.childName}. Changer d’enfant`} hitSlop={4}>
            <GlassSurface interactive radius={22}>
              <View style={{ height: 44, paddingLeft: 5, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar label={vm.childInitial} size={34} />
                <ThemedText variant="navTitle">{vm.childName}</ThemedText>
                <Icon name="chevronDown" size={14} color={colors.label} strokeWidth={2.6} />
              </View>
            </GlassSurface>
          </Pressable>
        }
        right={
          <GlassPair
            items={[
              { glyph: 'bell', accessibilityLabel: 'Notifications', onPress: actions.onBell },
              { glyph: 'person', accessibilityLabel: 'Compte et famille', onPress: actions.onProfile },
            ]}
          />
        }
      />
    </View>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import {
  Avatar, BASE_VIGNETTE_ID, GlassPair, GlassSurface, Icon, NavBar, ThemedText, VignetteImage, useScrollEdge, useTheme,
  type IconName,
} from '../../design';
import { HomeChipRow, HomeSectionHeader, PosterRow } from './HomeParts';
import { TonightHero } from './TonightHero';
import { COUNTER_EMPTY, FELT_STRIPE, PAPER_RULE, SUN_GRADIENT, useHomePalette } from './palette';
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
 * K · Maison (« Soir de famille »). Vue présentationnelle : tout vient de `vm` et `actions`.
 * Natif / Carnet : lin et cartes papier ; Nuit calme : marine, essai en haut, invitation vers l'écran Offres.
 */
export function HomeView({ vm, actions, footer, refreshControl }: Props) {
  const p = useHomePalette();
  const { colors } = useTheme();
  const scroll = useScrollEdge();

  const doorCard = {
    minHeight: 76, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 12, backgroundColor: p.card, borderWidth: 1, borderColor: p.cardBorder, ...p.cardShadow,
  };
  const badge = (glyph: IconName) => (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.badgeBg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={glyph} size={20} color={p.link} />
    </View>
  );

  const shelf = (s: HomeShelfVM, onAll: () => void, onChip: (k: string) => void) => (
    <View style={{ marginTop: 34 }}>
      <HomeSectionHeader title={s.title} actionLabel={s.actionLabel} onAction={onAll} />
      {s.chips ? <HomeChipRow chips={s.chips} active={s.activeChip} onChip={onChip} /> : null}
      <ThemedText variant="sub" style={{ marginHorizontal: 20, marginTop: s.chips ? 10 : 6, fontSize: 14, lineHeight: 19, letterSpacing: 0, color: p.muted }}>
        {s.note}
      </ThemedText>
      <PosterRow posters={s.posters} onOpen={actions.onOpenCard} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
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
              backgroundColor: p.chipBg, borderWidth: 1, borderColor: p.glassBorder,
            }}
          >
            <Icon name="timer" size={17} color={p.ink} />
            <ThemedText variant="sub" weight={600} style={{ fontSize: 15, lineHeight: 18, letterSpacing: 0, color: p.ink }}>{`${vm.hero.minutes} min`}</ThemedText>
            <ThemedText variant="sub" style={{ fontSize: 15, color: p.muted }}>·</ThemedText>
            <Icon name="home" size={17} color={p.ink} />
            <ThemedText variant="sub" weight={600} style={{ fontSize: 15, lineHeight: 18, letterSpacing: 0, color: p.ink }}>À la maison</ThemedText>
            <Icon name="chevronDown" size={14} color={p.ink} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 30, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {DOORS.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => actions.onDoor(d.key)}
              accessibilityRole="button"
              accessibilityLabel={d.label}
              style={({ pressed }) => [doorCard, { width: '48.6%', flexGrow: 1, opacity: pressed ? 0.75 : 1 }]}
            >
              {badge(d.glyph)}
              <ThemedText variant="sub" weight={600} style={{ flex: 1, fontSize: 15, lineHeight: 19, letterSpacing: 0, color: p.ink }}>{d.label}</ThemedText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => actions.onDoor('videos')}
            accessibilityRole="button"
            accessibilityLabel="Les séances vidéo de 20 min, bientôt disponibles"
            style={[doorCard, { width: '100%', minHeight: 64, paddingVertical: 10, opacity: 0.75 }]}
          >
            {badge('video')}
            <ThemedText variant="sub" weight={600} style={{ flex: 1, fontSize: 15, lineHeight: 19, letterSpacing: 0, color: p.ink }}>Les séances vidéo de 20 min</ThemedText>
            <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: p.soonBg, justifyContent: 'center' }}>
              <ThemedText variant="cap" weight={600} style={{ color: p.soonInk, letterSpacing: 0 }}>Bientôt</ThemedText>
            </View>
          </Pressable>
        </View>

        <View
          accessible
          accessibilityLabel={`${vm.counter.total} moment${vm.counter.total > 1 ? 's' : ''} ensemble. ${vm.counter.done} sur ${vm.counter.target} cette semaine`}
          style={{
            marginHorizontal: 20, marginTop: 30, paddingVertical: 24, paddingHorizontal: 20, borderRadius: 26, alignItems: 'center', gap: 14,
            backgroundColor: p.counterBg, overflow: 'hidden',
          }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
            {Array.from({ length: 60 }, (_, i) => (
              <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 7, width: 2, backgroundColor: FELT_STRIPE }} />
            ))}
          </View>
          <ThemedText variant="displayLarge" weight={500} style={{ fontSize: 30, lineHeight: 34, letterSpacing: 0, textAlign: 'center', color: p.counterInk }}>
            {vm.counter.total === 0 ? 'Votre premier moment vous attend' : `${vm.counter.total} moment${vm.counter.total > 1 ? 's' : ''} ensemble`}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {Array.from({ length: vm.counter.target }, (_, i) =>
              i < vm.counter.done ? (
                <LinearGradient
                  key={i}
                  colors={[...SUN_GRADIENT.medal]}
                  start={{ x: 0.34, y: 0.26 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
                    shadowColor: colors.sun, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
                  }}
                >
                  <Icon name="star" size={30} color={colors.navy900} filled />
                </LinearGradient>
              ) : (
                <View key={i} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COUNTER_EMPTY.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="star" size={28} color={COUNTER_EMPTY.ink} strokeWidth={1.6} />
                </View>
              ),
            )}
          </View>
          <ThemedText variant="sub" weight={600} style={{ fontSize: 14, lineHeight: 16, letterSpacing: 0, color: p.counterInk, opacity: 0.84 }}>
            {`${vm.counter.done} sur ${vm.counter.target} cette semaine`}
          </ThemedText>
        </View>

        <View style={{ marginTop: 34 }}>
          <HomeSectionHeader title="Cette semaine" actionLabel="Le programme" onAction={actions.onWeekAll} />
          <ThemedText variant="sub" style={{ marginHorizontal: 20, marginTop: 6, fontSize: 14, lineHeight: 19, letterSpacing: 0, color: p.muted }}>
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
            marginHorizontal: 20, marginTop: 30, height: 56, borderRadius: 28, borderWidth: 1, borderColor: p.glassBorder,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Icon name="grid" size={20} color={p.ink} />
          <ThemedText variant="sub" weight={600} style={{ fontSize: 16, lineHeight: 20, letterSpacing: 0, color: p.ink }}>{vm.allLabel}</ThemedText>
        </Pressable>

        {vm.invite ? (
          <Pressable
            onPress={actions.onInvite}
            accessibilityRole="button"
            accessibilityLabel="Envie d’aller plus loin ? Un coach, en groupe ou seul, près de chez toi."
            style={[
              { marginHorizontal: 20, marginTop: 24, padding: 14, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 12 },
              { backgroundColor: p.card, borderWidth: 1, borderColor: p.cardBorder, ...p.cardShadow },
            ]}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden' }}>
              <VignetteImage id={BASE_VIGNETTE_ID} style={{ width: 56, height: 56 }} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline" style={{ fontSize: 16, lineHeight: 20, letterSpacing: 0, color: p.ink }}>Envie d’aller plus loin ?</ThemedText>
              <ThemedText variant="sub" style={{ fontSize: 14, lineHeight: 19, letterSpacing: 0, color: p.muted }}>Un coach, en groupe ou seul, près de chez toi.</ThemedText>
            </View>
            <Icon name="chevronRight" size={16} color={p.muted} strokeWidth={2.4} />
          </Pressable>
        ) : null}

        <View style={{ marginHorizontal: 20, marginTop: 34 }}>
          <HomeSectionHeaderPlain title="Le carnet" />
          {vm.carnet.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: p.chipBg }}>
              <ThemedText variant="sub" style={{ color: p.muted }}>{vm.carnetEmptyText}</ThemedText>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {vm.carnet.map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    { borderRadius: 20, padding: 16, backgroundColor: p.paper, transform: [{ rotate: `${TILT[i % TILT.length]}deg` }] },
                    { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 17, shadowOffset: { width: 0, height: 12 }, overflow: 'hidden' },
                  ]}
                >
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
                    {Array.from({ length: 30 }, (_, k) => (
                      <View key={k} style={{ position: 'absolute', left: 0, right: 0, top: k * 4, height: 1, backgroundColor: PAPER_RULE }} />
                    ))}
                  </View>
                  <ThemedText variant="displayQuote" weight={400} style={{ fontSize: 13, lineHeight: 17, fontStyle: 'italic', color: p.paperAccent }}>{m.dateLabel}</ThemedText>
                  <ThemedText variant="sub" weight={700} style={{ marginTop: 4, fontSize: 15, lineHeight: 19, letterSpacing: 0, color: p.paperInk }}>{m.title}</ThemedText>
                  {m.phrase ? (
                    <ThemedText variant="displayQuote" weight={400} style={{ marginTop: 6, fontSize: 16, lineHeight: 22, color: p.paperInk }}>{`« ${m.phrase} »`}</ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          <Pressable
            onPress={actions.onCarnet}
            accessibilityRole="button"
            accessibilityLabel="Tout le carnet"
            style={{ marginTop: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <ThemedText variant="sub" weight={600} style={{ fontSize: 15, lineHeight: 18, letterSpacing: 0, color: p.link }}>Tout le carnet</ThemedText>
            <Icon name="arrowRight" size={16} color={p.link} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: p.rule }}>
          <Pressable onPress={actions.onSources} accessibilityRole="button" accessibilityLabel="Les sources de la méthode" style={{ minHeight: 44, justifyContent: 'center' }}>
            <ThemedText variant="sub" style={{ fontSize: 14, lineHeight: 16, letterSpacing: 0, color: p.muted }}>Les sources de la méthode</ThemedText>
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
                <ThemedText variant="headline">{vm.childName}</ThemedText>
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

function HomeSectionHeaderPlain({ title }: { title: string }) {
  const p = useHomePalette();
  return (
    <ThemedText variant="displayLarge" accessibilityRole="header" style={{ marginBottom: 12, fontSize: 21, lineHeight: 26, letterSpacing: 0, color: p.ink }}>
      {title}
    </ThemedText>
  );
}

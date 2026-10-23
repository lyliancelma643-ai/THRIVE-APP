import { useState, type ReactNode } from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
  type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { Arch, Enamel, Felt, Paper, Star, VIGNETTE_IDS, Velvet } from '../../../design';
import { VIGNETTE_SOURCES } from '../../../design/vignetteSources';
import {
  Eyebrow, LaunchButton, MoreLink, NcPill, PILLAR_HUE, PillGroup, Tap, WIcon, WText, useWeb, type WIconName,
} from '../../../design/web';
import { PILLAR_PLAIN, type Duration, type P3Activity, type PillarCode } from '../../../lib/p3web';
import { WebSheet } from '../WebSheet';

/* ───────────────────────────── Vignettes ───────────────────────────── */

/** `vignetteSrc` du web : null quand l'activité n'a pas encore sa vignette (l'affiche devient une composition). */
export function vignetteSource(activityId: string) {
  return VIGNETTE_IDS.includes(activityId) ? VIGNETTE_SOURCES[activityId] : null;
}

/** Une icône par pilier (pieces.tsx du web). */
export const PILLAR_ICON: Record<PillarCode, WIconName> = {
  P1: 'compass',
  P2: 'trophy',
  P3: 'sparkle',
  P4: 'grid',
  P5: 'star',
  P6: 'user',
  P7: 'target',
  P8: 'chart',
};

/** L'arche de l'affiche (Arch.tsx du web) : la vignette seule, dans un passe-partout de lin. Ratio 312 / 348. */
export function ActivityArch({ activityId, width, style }: { activityId: string; width: number; style?: StyleProp<ViewStyle> }) {
  const src = vignetteSource(activityId) ?? undefined;
  return <Arch size="md" width={width} height={Math.round((width * 348) / 312)} source={src} accessibilityLabel="" style={style} />;
}

/** La vignette entière, jamais recadrée : les marges sont comblées par la même image floutée. */
function Vignette({ activityId }: { activityId: string }) {
  const src = vignetteSource(activityId);
  if (!src) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={src} blurRadius={18} resizeMode="cover" style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.1 }] }]} />
      <Image source={src} resizeMode="contain" style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** PosterArt du web : vignette, sinon composition par pilier (sombre, numéro de semaine, pictogramme). */
export function PosterArt({ activity, done }: { activity: P3Activity; done: boolean }) {
  const w = useWeb();
  const hue = PILLAR_HUE[activity.pillar_main] ?? '#A7C4BC';
  const src = vignetteSource(activity.id);
  const check = done ? (
    <View style={{ position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: w.sage, alignItems: 'center', justifyContent: 'center' }}>
      <WIcon name="check" size={14} color="#022539" strokeWidth={2.6} />
    </View>
  ) : null;
  if (src) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Vignette activityId={activity.id} />
        {check}
      </View>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B2A3A', overflow: 'hidden' }]}>
      <View style={{ position: 'absolute', right: '-12%', bottom: '-6%', width: '62%', aspectRatio: 1, opacity: 0.5 }}>
        <WIcon name={PILLAR_ICON[activity.pillar_main]} size={100} color={hue} strokeWidth={1.2} />
      </View>
      <WText display size={30} weight={600} lh={30} color="rgba(255,255,255,0.9)" style={{ position: 'absolute', top: 10, left: 12 }}>
        {activity.week ?? '★'}
      </WText>
      {check}
    </View>
  );
}

function durationsLabel(a: P3Activity): string {
  return `${Math.min(...a.durations)}–${Math.max(...a.durations)} min`;
}

/** `PosterCard` : un tirage papier incliné, vignette carrée, semaine · durées, titre, pilier. */
export function PosterCard({
  activity, done, onPress, line, wide = false, index = 0,
}: { activity: P3Activity; done: boolean; onPress: () => void; line?: string; wide?: boolean; index?: number }) {
  const tilt = index % 2 ? 0.6 : -0.5;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${activity.week === null ? 'Bonus' : `Semaine ${activity.week}`}, ${durationsLabel(activity)}${done ? ', déjà vécue' : ''}`}
      style={[{ width: wide ? '100%' : 152, transform: [{ rotate: `${tilt}deg` }] }]}
    >
      <Paper radius={18} padding={7} style={{ paddingBottom: 0 }}>
        <View style={{ aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EFE9DF' }}>
          <PosterArt activity={activity} done={done} />
          {activity.programme === 'complement' ? (
            <View style={{ position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(6,22,30,0.82)' }}>
              <WText size={11} weight={600} color="#FFFFFF" lh={15}>
                Plus loin
              </WText>
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 4, paddingTop: 10, paddingBottom: 12 }}>
          <WText size={11} weight={700} tracking={0.02} color="#46695F" numberOfLines={1}>
            {`${activity.week === null ? 'Bonus' : `Semaine ${activity.week}`} · ${durationsLabel(activity)}`}
          </WText>
          <WText display size={16} weight={500} lh={1.2} color="#022539" numberOfLines={2}>
            {activity.title}
          </WText>
          <WText size={12} color="#56626B" numberOfLines={1} style={{ marginTop: 2 }}>
            {PILLAR_PLAIN[activity.pillar_main]}
          </WText>
          {line ? (
            <WText size={13} lh={1.4} color="#33454F" numberOfLines={3} style={{ marginTop: 6 }}>
              {line}
            </WText>
          ) : null}
        </View>
      </Paper>
    </Tap>
  );
}

/* ───────────────────────────── Rangées ───────────────────────────── */

const CARD_W = 152;
const GAP = 12;

/**
 * `Rail` du web : titre + lien, sous-titre, carrousel qui déborde jusqu'aux bords (accroche carte par carte),
 * barre de position fine qui suit le défilement.
 */
export function Rail({
  title, subtitle, more, headerless, children, count,
}: {
  title: string;
  subtitle?: string;
  more?: { label: string; onPress: () => void };
  headerless?: boolean;
  children: ReactNode;
  count: number;
}) {
  const w = useWeb();
  const { width: screen } = useWindowDimensions();
  const [progress, setProgress] = useState(0);
  const content = count * CARD_W + Math.max(0, count - 1) * GAP + 40;
  const ratio = Math.min(1, screen / content);
  const scrollable = ratio < 1;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const max = content - screen;
    setProgress(max > 0 ? Math.max(0, Math.min(1, e.nativeEvent.contentOffset.x / max)) : 0);
  };
  const thumb = Math.max(ratio, 0.12);
  return (
    <View style={{ marginTop: headerless ? 16 : 36 }} accessibilityLabel={title}>
      {!headerless ? (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <WText display size={20} weight={600} lh={1.2} tone="ink" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </WText>
            {more ? (
              <View style={{ marginVertical: -10 }}>
                <MoreLink label={more.label} onPress={more.onPress} />
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <WText size={14} tone="soft" style={{ marginTop: 4 }}>
              {subtitle}
            </WText>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_W + GAP}
        snapToAlignment="start"
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: GAP, paddingTop: 4, paddingBottom: 8 }}
      >
        {children}
      </ScrollView>
      {scrollable ? (
        <View style={{ marginTop: 8, height: 3, width: 96, borderRadius: 2, backgroundColor: w.track, overflow: 'hidden' }}>
          <View style={{ height: 3, borderRadius: 2, width: 96 * thumb, backgroundColor: w.text3, transform: [{ translateX: progress * 96 * (1 - thumb) }] }} />
        </View>
      ) : null}
    </View>
  );
}

export function PosterRow({
  title, subtitle, items, onOpen, isDone, more, headerless,
}: {
  title: string;
  subtitle: string;
  items: P3Activity[];
  onOpen: (a: P3Activity) => void;
  isDone: (a: P3Activity) => boolean;
  more?: { label: string; onPress: () => void };
  headerless?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Rail title={title} subtitle={subtitle} more={more} headerless={headerless} count={items.length}>
      {items.map((a, i) => (
        <PosterCard key={a.id} index={i} activity={a} done={isDone(a)} onPress={() => onOpen(a)} />
      ))}
    </Rail>
  );
}

/** La puce du soir (durée · lieu) et sa feuille « Ce soir ». */
export function TonightSettings({
  duration, durations, onDuration, place, places, onPlace,
}: {
  duration: Duration;
  durations: readonly Duration[];
  onDuration: (d: Duration) => void;
  place: string;
  places: { value: string; label: string }[];
  onPlace: (p: string) => void;
}) {
  const w = useWeb();
  const [open, setOpen] = useState(false);
  const placeLabel = places.find((p) => p.value === place)?.label ?? '';
  return (
    <>
      <Tap onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Régler la durée et le lieu : ${duration} minutes, ${placeLabel}`}>
        <Felt radius={22} color={w.surface} style={{ borderWidth: 1, borderColor: w.line2 }}>
          <View style={{ height: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <WIcon name="settings" size={18} color={w.text} />
            <WText size={14} weight={600} tone="ink" numberOfLines={1}>
              {`${duration} min · ${placeLabel}`}
            </WText>
          </View>
        </Felt>
      </Tap>
      <WebSheet visible={open} onClose={() => setOpen(false)} title="Ce soir">
        <Eyebrow style={{ marginTop: 20, marginBottom: 8 }}>Combien de temps</Eyebrow>
        <PillGroup value={duration} options={durations.map((d) => ({ value: d, label: `${d} min` }))} onChange={onDuration} />
        <Eyebrow style={{ marginTop: 20, marginBottom: 8 }}>Où</Eyebrow>
        <PillGroup value={place} options={places} onChange={onPlace} />
        <LaunchButton label="C’est réglé" icon={null} onPress={() => setOpen(false)} style={{ marginTop: 28 }} />
      </WebSheet>
    </>
  );
}

/* ───────────────────────────── Portes, semaine ───────────────────────────── */

/** Une porte de l'accueil : feutre épais (la première), feutre sur la surface (les autres). */
export function Door({ icon, label, onPress, strong, wide, tag }: { icon: WIconName; label: string; onPress: () => void; strong?: boolean; wide?: boolean; tag?: string }) {
  const w = useWeb();
  const ink = strong ? '#F7F5F2' : w.text;
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={tag ? `${label}, ${tag.toLowerCase()}` : label} style={{ width: wide ? '100%' : '48.5%' }}>
      <Felt strong={strong} radius={22} color={strong ? '#004E7A' : w.surface} style={strong ? undefined : { borderWidth: 1, borderColor: w.line }}>
        <View style={{ minHeight: 76, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(167,196,188,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <WIcon name={icon} size={20} color={strong ? '#F7F5F2' : w.sageInk} />
          </View>
          <WText size={15} weight={600} lh={1.25} color={ink} style={{ flex: 1 }}>
            {label}
          </WText>
          {tag ? (
            <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: w.accent, justifyContent: 'center' }}>
              <WText size={12} weight={700} color="#022539" lh={15}>
                {tag}
              </WText>
            </View>
          ) : null}
        </View>
      </Felt>
    </Tap>
  );
}

/** « Ta semaine » : le compteur cumulatif en velours, trois étoiles, jamais de « 0 ». */
export function WeekCard({ countPhrase, done, streak }: { countPhrase: string | null; done: number; streak: number | null }) {
  const n = Math.min(done, 3);
  return (
    <View style={{ marginTop: 32 }} accessible accessibilityLabel={`${countPhrase ?? ''}. ${done > 0 ? `${done} sur 3 cette semaine` : 'Trois moments cette semaine'}`}>
      <Velvet radius={26}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center', gap: 14 }}>
          {countPhrase ? (
            <WText display size={30} weight={500} lh={1.12} color="#F7F5F2" center>
              {countPhrase}
            </WText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {[0, 1, 2].map((i) =>
              i < n ? (
                <Enamel key={i} radius={32}>
                  <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                    <WIcon name="star" size={30} color="#022539" strokeWidth={1.7} filled />
                  </View>
                </Enamel>
              ) : (
                <Star key={i} size={64} />
              ),
            )}
          </View>
          <WText size={14} weight={600} color="rgba(247,245,242,0.84)">
            {done > 0 ? `${done} sur 3 cette semaine` : 'Trois moments cette semaine'}
          </WText>
          {streak !== null ? (
            <WText size={13.5} color="rgba(247,245,242,0.68)">{`${streak} semaines complètes d’affilée`}</WText>
          ) : null}
        </View>
      </Velvet>
    </View>
  );
}

/** Plusieurs rangées sous un seul titre : une pastille par rangée, une seule affichée à la fois. */
export function ShelfPicker<S extends { id: string; title: string; subtitle: string; items: P3Activity[] }>({
  title, shelves, labelOf, onOpen, isDone, more,
}: {
  title: string;
  shelves: S[];
  labelOf: (s: S) => string;
  onOpen: (a: P3Activity) => void;
  isDone: (a: P3Activity) => boolean;
  more: { label: string; onPress: () => void };
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (shelves.length === 0) return null;
  const current = shelves.find((s) => s.id === selectedId) ?? shelves[0];
  return (
    <View style={{ marginTop: 40 }} accessibilityLabel={title}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <WText display size={20} weight={600} lh={1.2} tone="ink" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </WText>
        <View style={{ marginVertical: -10 }}>
          <MoreLink label={more.label} onPress={more.onPress} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {shelves.map((s) => (
          <NcPill key={s.id} label={labelOf(s)} on={s.id === current.id} onPress={() => setSelectedId(s.id)} />
        ))}
      </ScrollView>
      <WText size={14} tone="soft" style={{ marginTop: 12 }}>
        {current.subtitle}
      </WText>
      <PosterRow key={current.id} title={current.title} subtitle={current.subtitle} items={current.items} onOpen={onOpen} isDone={isDone} headerless />
    </View>
  );
}

/* ───────────────────────────── Divers ───────────────────────────── */

/** Bouton « … » de l'affiche et son petit menu (Pas ce soir · Mettre de côté · Il ne veut pas). */
export function HeroMenu({ open, onToggle, options }: { open: boolean; onToggle: () => void; options: { id: string; label: string; onPress: () => void }[] }) {
  const w = useWeb();
  return (
    <>
      <Tap
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Plus d’options"
        accessibilityState={{ expanded: open }}
        style={{
          position: 'absolute', top: 0, right: 0, zIndex: 10, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: w.line2,
          backgroundColor: w.chip, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <WText size={20} tone="ink" lh={22}>
          …
        </WText>
      </Tap>
      {open ? (
        <View
          accessibilityRole="menu"
          style={{
            position: 'absolute', right: 0, top: 56, zIndex: 20, minWidth: 220, padding: 6, borderRadius: 18, backgroundColor: w.surface,
            borderWidth: 1, borderColor: w.line2, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10,
          }}
        >
          {options.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="menuitem"
              onPress={o.onPress}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? w.surfaceSub : 'transparent' })}
            >
              <WText size={15} tone="ink">
                {o.label}
              </WText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

/** Rangée de lien plein (« Quand il dit non › »). */
export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const w = useWeb();
  return (
    <Tap onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={{ marginTop: 16 }}>
      <View style={{ minHeight: 56, padding: 16, borderRadius: 18, backgroundColor: w.surface, borderWidth: w.surfaceKind === 'maison' ? 1 : 0, borderColor: w.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <WText size={15} weight={600} tone="ink">
          {label}
        </WText>
        <WIcon name="chevron-right" size={20} color={w.text3} />
      </View>
    </Tap>
  );
}

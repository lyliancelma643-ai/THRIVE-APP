import { Pressable, ScrollView, View } from 'react-native';
import { Icon, ThemedText, VignetteImage, useTheme } from '../../design';
import { POSTER_BG, useHomePalette } from './palette';
import type { HomeChip, PosterVM } from './viewModels';

/** Vignette de 148 pt du carrousel d'accueil : image, coche sauge si vécue, titre 15/19, durées 13/17. */
export function HomePoster({ poster, onPress }: { poster: PosterVM; onPress: () => void }) {
  const p = useHomePalette();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${poster.title}, ${poster.durations}${poster.done ? ', déjà vécue' : ''}`}
      style={({ pressed }) => ({ width: 148, opacity: pressed ? 0.75 : 1 })}
    >
      <View style={[{ width: 148, height: 148, borderRadius: 20, backgroundColor: POSTER_BG }, p.cardShadow]}>
        <View style={{ width: 148, height: 148, borderRadius: 20, overflow: 'hidden' }}>
          <VignetteImage id={poster.vignetteId} style={{ width: 148, height: 148 }} />
          {poster.done ? (
            <View
              style={{
                position: 'absolute', top: 9, right: 9, width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="check" size={13} color={colors.navy900} strokeWidth={3} />
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText variant="sub" weight={600} numberOfLines={2} style={{ marginTop: 8, fontSize: 15, lineHeight: 19, letterSpacing: -0.35, color: p.ink }}>
        {poster.title}
      </ThemedText>
      <ThemedText variant="foot" numberOfLines={1} style={{ marginTop: 2, fontSize: 13, lineHeight: 17, letterSpacing: 0, color: p.muted }}>
        {poster.durations}
      </ThemedText>
    </Pressable>
  );
}

/** Titre de rangée : Fraunces 600 21/26 à gauche, lien sauge 14 à droite. */
export function HomeSectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const p = useHomePalette();
  return (
    <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <ThemedText
        variant="displayLarge"
        accessibilityRole="header"
        style={{ fontSize: 21, lineHeight: 26, letterSpacing: 0, color: p.ink }}
      >
        {title}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={10}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <ThemedText variant="sub" weight={600} style={{ fontSize: 14, lineHeight: 18, letterSpacing: 0, color: p.link }}>{actionLabel}</ThemedText>
          <Icon name="chevronRight" size={14} color={p.link} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pastilles de filtre 40 pt (rayon plein, 14 600) ; la pastille active inverse encre et fond. */
export function HomeChipRow({ chips, active, onChip }: { chips: HomeChip[]; active?: string; onChip: (key: string) => void }) {
  const p = useHomePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ marginTop: 12 }}>
      {chips.map((c) => {
        const on = c.key === active;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChip(c.key)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{ selected: on }}
            style={{
              height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', flexShrink: 0,
              backgroundColor: on ? p.chipOnBg : p.chipBg, borderWidth: on ? 0 : 1, borderColor: p.chipBorder,
            }}
          >
            <ThemedText variant="sub" weight={600} style={{ fontSize: 14, lineHeight: 18, letterSpacing: 0, color: on ? p.chipOnInk : p.chipInk }}>
              {c.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Rangée de vignettes à défilement horizontal (marges 20, écart 12). */
export function PosterRow({ posters, onOpen }: { posters: PosterVM[]; onOpen: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} style={{ marginTop: 14 }}>
      {posters.map((a) => (
        <HomePoster key={a.id} poster={a} onPress={() => onOpen(a.id)} />
      ))}
    </ScrollView>
  );
}

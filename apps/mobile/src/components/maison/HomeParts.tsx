import { Pressable, ScrollView, View } from 'react-native';
import { Felt, Icon, ThemedText, VignetteImage, useCardShadow, useTheme } from '../../design';
import { POSTER_BG } from './palette';
import type { HomeChip, PosterVM } from './viewModels';

/** Vignette de 148 pt du carrousel d'accueil : image, coche sauge si vécue, titre 15/19, durées 13/17. */
export function HomePoster({ poster, onPress }: { poster: PosterVM; onPress: () => void }) {
  const { colors } = useTheme();
  const shadow = useCardShadow();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${poster.title}, ${poster.durations}${poster.done ? ', déjà vécue' : ''}`}
      style={({ pressed }) => ({ width: 148, opacity: pressed ? 0.75 : 1 })}
    >
      <View style={[{ width: 148, height: 148, borderRadius: 20, backgroundColor: POSTER_BG }, shadow]}>
        <View style={{ width: 148, height: 148, borderRadius: 20, overflow: 'hidden' }}>
          <VignetteImage id={poster.vignetteId} style={{ width: 148, height: 148 }} />
          {poster.done ? (
            <View
              style={{
                position: 'absolute', top: 9, right: 9, width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="check" size={14} color={colors.navy900} strokeWidth={3} />
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText variant="sub" weight={600} numberOfLines={2} style={{ marginTop: 8, fontSize: 15, lineHeight: 19, letterSpacing: -0.43 }}>
        {poster.title}
      </ThemedText>
      <ThemedText variant="foot" color="label2" numberOfLines={1} style={{ marginTop: 2, lineHeight: 17, letterSpacing: -0.43 }}>
        {poster.durations}
      </ThemedText>
    </Pressable>
  );
}

/** Titre de rangée : Fraunces 600 22/27 à gauche, lien sauge 14 à droite (`rowHead` de la maquette K). */
export function HomeSectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <ThemedText variant="sectionTitle" accessibilityRole="header" style={{ lineHeight: 27, letterSpacing: -0.43 }}>
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
          <ThemedText variant="sub" weight={600} color="sageText" style={{ fontSize: 14, lineHeight: 18, letterSpacing: -0.43 }}>{actionLabel}</ThemedText>
          <Icon name="chevronRight" size={14} color={colors.sageText} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pastille de filtre 40 pt (rayon plein, 14 600) : active = feutre marine en Lin, crème en Veillée (jamais jaune). */
function HomeChipPill({ chip, on, onPress }: { chip: HomeChip; on: boolean; onPress: () => void }) {
  const { colors, styleKey } = useTheme();
  const felt = on && styleKey === 'lin';
  const ink = on ? (felt ? colors.cream : colors.navy900) : colors.label;
  const label = (
    <ThemedText variant="sub" weight={600} style={{ fontSize: 14, lineHeight: 18, letterSpacing: -0.23, color: ink }}>{chip.label}</ThemedText>
  );
  const box = { height: 40, paddingHorizontal: 16, justifyContent: 'center' as const };
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2 }}
      accessibilityRole="button"
      accessibilityLabel={chip.label}
      accessibilityState={{ selected: on }}
      style={{ flexShrink: 0 }}
    >
      {felt ? (
        <Felt radius={20}><View style={box}>{label}</View></Felt>
      ) : (
        <View
          style={[box, {
            borderRadius: 20, backgroundColor: on ? colors.cream : colors.fill3,
            borderWidth: on ? 0 : 1, borderColor: colors.separator,
          }]}
        >
          {label}
        </View>
      )}
    </Pressable>
  );
}

/** Pastilles de filtre d'une rangée (marges 20, écart 8). */
export function HomeChipRow({ chips, active, onChip }: { chips: HomeChip[]; active?: string; onChip: (key: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ marginTop: 12 }}>
      {chips.map((c) => (
        <HomeChipPill key={c.key} chip={c} on={c.key === active} onPress={() => onChip(c.key)} />
      ))}
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

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Icon, ThemedText, VignetteImage, useNavBarHeight, useTheme, withAlpha } from '../../design';
import { SUN_GRADIENT, useHomePalette } from './palette';
import type { HomeVM } from './viewModels';

type Props = {
  hero: HomeVM['hero'];
  banner: HomeVM['banner'];
  onLaunch: () => void;
  onOpenCard: () => void;
  onMore: () => void;
};

/** « Soir de famille » : l'affiche du moment recommandé, fondue dans le fond de la page (canevas K, 676 pt). */
export function TonightHero({ hero, banner, onLaunch, onOpenCard, onMore }: Props) {
  const p = useHomePalette();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navH = useNavBarHeight();
  const H = 676;
  const clear = withAlpha(p.bg, 0);

  return (
    <View style={{ height: H, overflow: 'hidden' }}>
      <VignetteImage
        id={hero.vignetteId}
        blurRadius={34}
        style={{ position: 'absolute', top: -60, left: -60, width: width + 120, height: H + 120, opacity: p.heroBlurOpacity }}
      />
      <VignetteImage
        id={hero.vignetteId}
        accessibilityLabel={hero.vignetteLabel}
        style={{ position: 'absolute', left: 0, top: 52, width, height: 396 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[p.heroTopVeil, clear, clear, p.bg, p.bg]}
        locations={[0, 0.16, 0.44, 0.72, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {banner ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(110, navH + 8), left: 0, right: 0, alignItems: 'center' }}>
          <View
            accessible
            accessibilityLabel={banner.label}
            style={{
              height: banner.kind === 'trial' ? 32 : 30, paddingHorizontal: banner.kind === 'trial' ? 13 : 12,
              borderRadius: 16, backgroundColor: p.bannerBg, borderWidth: 1, borderColor: p.bannerBorder,
              flexDirection: 'row', alignItems: 'center', gap: banner.kind === 'trial' ? 8 : 4,
            }}
          >
            <Icon name={banner.kind === 'trial' ? 'gift' : 'check'} size={banner.kind === 'trial' ? 15 : 12} color={p.bannerInk} strokeWidth={banner.kind === 'trial' ? 1.85 : 3} />
            <ThemedText variant="cap" weight={600} style={{ fontSize: banner.kind === 'trial' ? 13 : 12, lineHeight: 16, letterSpacing: 0, color: p.bannerInk }}>
              {banner.label}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 6 }}>
        <View
          accessible
          accessibilityLabel={hero.recommendedLabel}
          style={{
            alignSelf: 'flex-start', height: 32, paddingHorizontal: 13, borderRadius: 16, backgroundColor: p.capsuleBg,
            borderWidth: 1, borderColor: p.capsuleBorder, flexDirection: 'row', alignItems: 'center', gap: 8,
          }}
        >
          <Icon name="sparkles" size={14} color={p.capsuleInk} />
          <ThemedText variant="cap" weight={700} style={{ fontSize: 12, lineHeight: 14, letterSpacing: 0.96, textTransform: 'uppercase', color: p.capsuleInk }}>
            {hero.recommendedLabel}
          </ThemedText>
        </View>
        <ThemedText
          variant="displayLarge"
          weight={500}
          accessibilityRole="header"
          style={{ marginTop: 12, fontSize: 40, lineHeight: 42, letterSpacing: 0, color: p.ink }}
        >
          {hero.title}
        </ThemedText>
        <ThemedText variant="callout" weight={500} style={{ marginTop: 10, fontSize: 16, lineHeight: 22, letterSpacing: 0, color: p.body }}>
          {hero.reason}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {hero.chips.map((c) => (
            <View
              key={c.label}
              style={{
                height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: p.chipBg, borderWidth: 1, borderColor: p.chipBorder,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}
            >
              <Icon name={c.glyph} size={14} color={p.body} strokeWidth={2.2} />
              <ThemedText variant="sub" weight={600} numberOfLines={1} style={{ fontSize: 13, lineHeight: 16, letterSpacing: 0, color: p.body }}>
                {c.label}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <Pressable
            onPress={onLaunch}
            accessibilityRole="button"
            accessibilityLabel={`Lancer le moment, ${hero.minutes} minutes`}
            style={({ pressed }) => ({
              flex: 1.4, height: 56, borderRadius: 28, opacity: pressed ? 0.85 : 1, overflow: 'hidden',
              shadowColor: colors.sun, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 },
            })}
          >
            <LinearGradient
              colors={[...SUN_GRADIENT.button]}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <Icon name="play" size={18} color={colors.navy900} />
              <ThemedText variant="headline" weight={700} style={{ color: colors.navy900, letterSpacing: 0 }}>
                {`Lancer · ${hero.minutes} min`}
              </ThemedText>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={onOpenCard}
            accessibilityRole="button"
            accessibilityLabel="Voir la fiche"
            style={({ pressed }) => ({
              flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1,
              backgroundColor: p.glassBg, borderWidth: 1, borderColor: p.glassBorder,
            })}
          >
            <ThemedText variant="headline" weight={600} style={{ fontSize: 16, letterSpacing: 0, color: p.glassInk }}>Voir la fiche</ThemedText>
          </Pressable>
          <Pressable
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel="Plus d’options"
            style={({ pressed }) => ({
              width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1,
              backgroundColor: p.glassBg, borderWidth: 1, borderColor: p.glassBorder,
            })}
          >
            <Icon name="more" size={22} color={p.glassInk} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

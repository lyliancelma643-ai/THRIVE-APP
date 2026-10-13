import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { Enamel, GlassSurface, Icon, ThemedText, VignetteImage, useNavBarHeight, useTheme, withAlpha } from '../../design';
import { useHeroStyle } from './palette';
import type { HomeVM } from './viewModels';

type Props = {
  hero: HomeVM['hero'];
  banner: HomeVM['banner'];
  onLaunch: () => void;
  onOpenCard: () => void;
  onMore: () => void;
};

const FADE_FROM = 0.62;
const FADE_STEPS = 16;

/**
 * Image dont le bas se fond dans le décor (le canevas la masque de 62 % à 100 %). RN n'a pas de masque d'image :
 * on empile des bandes d'opacité décroissante, ce qui rend le même fondu sans dégradé de couleur de fond.
 */
export function FadedImage({
  id, label, width, height, top, fadeFrom = FADE_FROM,
}: { id: string; label: string; width: number; height: number; top: number; fadeFrom?: number }) {
  const solid = Math.round(height * fadeFrom);
  const stripH = (height - solid) / FADE_STEPS;
  if (Platform.OS === 'web') {
    // Aperçu web : vrai masque CSS, identique au canevas.
    const mask = `linear-gradient(to bottom, #000 ${fadeFrom * 100}%, rgba(0,0,0,0) 100%)`;
    return (
      <View
        style={{ position: 'absolute', left: 0, top, width, height, WebkitMaskImage: mask, maskImage: mask } as object}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <VignetteImage id={id} style={{ width, height }} />
      </View>
    );
  }
  return (
    <View style={{ position: 'absolute', left: 0, top, width, height }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ position: 'absolute', top: 0, left: 0, width, height: solid, overflow: 'hidden' }}>
        <VignetteImage id={id} style={{ width, height }} />
      </View>
      {Array.from({ length: FADE_STEPS }, (_, i) => (
        <View
          key={i}
          style={{ position: 'absolute', top: solid + i * stripH, left: 0, width, height: stripH + 0.5, overflow: 'hidden', opacity: 1 - (i + 0.5) / FADE_STEPS }}
        >
          <VignetteImage id={id} style={{ position: 'absolute', top: -(solid + i * stripH), left: 0, width, height }} />
        </View>
      ))}
    </View>
  );
}

/**
 * « Soir de famille » : l'affiche du moment recommandé, fondue dans le fond de la page (canevas K, 676 pt).
 * Lancer est l'émail : le seul geste soleil de l'écran. Les autres boutons de l'affiche sont en verre.
 */
export function TonightHero({ hero, banner, onLaunch, onOpenCard, onMore }: Props) {
  const { colors } = useTheme();
  const { topVeil, blurOpacity } = useHeroStyle();
  const { width } = useWindowDimensions();
  const navH = useNavBarHeight();
  const H = 676;
  const bg = colors.bgGrouped;
  const clear = withAlpha(bg, 0);
  const trial = banner?.kind === 'trial';

  return (
    <View style={{ height: H, overflow: 'hidden' }}>
      <VignetteImage
        id={hero.vignetteId}
        blurRadius={34}
        style={{ position: 'absolute', top: -60, left: -60, width: width + 120, height: H + 120, opacity: blurOpacity }}
      />
      <FadedImage id={hero.vignetteId} label={hero.vignetteLabel} width={width} height={396} top={52} />
      {/* Fondu de l'image (le canevas la masque : bas 62 → 100 %, côtés 12 %) : dégradés vers le fond de la page. */}
      <LinearGradient
        pointerEvents="none"
        colors={[bg, clear]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left: 0, top: 52, width: width * 0.12, height: 396 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[clear, bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', right: 0, top: 52, width: width * 0.12, height: 396 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[topVeil, clear, clear, bg, bg]}
        locations={[0, 0.16, 0.44, 0.72, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {banner ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: navH + 2, left: 0, right: 0, alignItems: 'center' }}>
          <GlassSurface radius={16}>
            <View
              accessible
              accessibilityLabel={banner.label}
              style={{
                height: trial ? 32 : 30, paddingHorizontal: trial ? 13 : 12, flexDirection: 'row', alignItems: 'center', gap: trial ? 8 : 4,
              }}
            >
              <Icon
                name={trial ? 'gift' : 'check'}
                size={trial ? 15 : 12}
                color={trial ? colors.tintText : colors.sageText}
                strokeWidth={trial ? 1.85 : 3}
              />
              <ThemedText
                variant="cap"
                weight={600}
                style={{ fontSize: trial ? 13 : 12, lineHeight: 16, letterSpacing: 0, color: trial ? colors.tintText : colors.sageText }}
              >
                {banner.label}
              </ThemedText>
            </View>
          </GlassSurface>
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 6 }}>
        <View style={{ alignSelf: 'flex-start' }}>
          <GlassSurface radius={16}>
            <View
              accessible
              accessibilityLabel={hero.recommendedLabel}
              style={{ height: 32, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Icon name="sparkles" size={14} color={colors.sageText} />
              <ThemedText variant="cap" weight={700} style={{ fontSize: 12, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.sageText }}>
                {hero.recommendedLabel}
              </ThemedText>
            </View>
          </GlassSurface>
        </View>
        <ThemedText
          variant="displayLarge"
          weight={500}
          accessibilityRole="header"
          style={{ marginTop: 12, fontSize: 40, lineHeight: 42, letterSpacing: 0 }}
        >
          {hero.title}
        </ThemedText>
        <ThemedText variant="callout" weight={500} color="label2" style={{ marginTop: 10, fontSize: 16, lineHeight: 22, letterSpacing: 0 }}>
          {hero.reason}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {hero.chips.map((c) => (
            <View
              key={c.label}
              style={{
                height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: colors.fill3, borderWidth: 1, borderColor: colors.separator,
                flexDirection: 'row', alignItems: 'center', gap: 4,
              }}
            >
              <Icon name={c.glyph} size={14} color={colors.label} strokeWidth={2.2} />
              <ThemedText variant="sub" weight={600} numberOfLines={1} style={{ fontSize: 13, lineHeight: 16, letterSpacing: 0 }}>
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
            style={({ pressed }) => ({ flex: 1.4, opacity: pressed ? 0.85 : 1 })}
          >
            <Enamel radius={28}>
              <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Icon name="play" size={18} color={colors.accentInk} />
                <ThemedText variant="headline" weight={700} style={{ letterSpacing: 0 }}>
                  {`Lancer · ${hero.minutes} min`}
                </ThemedText>
              </View>
            </Enamel>
          </Pressable>
          <Pressable
            onPress={onOpenCard}
            accessibilityRole="button"
            accessibilityLabel="Voir la fiche"
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
          >
            <GlassSurface radius={28} interactive>
              <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText variant="headline" weight={600} style={{ fontSize: 16, letterSpacing: 0 }}>Voir la fiche</ThemedText>
              </View>
            </GlassSurface>
          </Pressable>
          <Pressable
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel="Plus d’options"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <GlassSurface radius={28} interactive>
              <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="more" size={22} color={colors.label} />
              </View>
            </GlassSurface>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

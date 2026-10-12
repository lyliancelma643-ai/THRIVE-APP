import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Capsule, GlassButton, GlassSurface, Pill, SPACING, ThemedText, VignetteImage, useTheme,
} from '../../design';
import { vignetteIdFor, vignetteLabel } from '../../lib/vignettes';
import type { P3Activity } from '../../lib/p3';
import { MOVEMENT_LABEL, materialsLabel, withAlpha } from './helpers';

type Props = {
  activity: P3Activity;
  firstName: string;
  reason: string;
  /** Durée réellement jouée (jamais une durée annoncée différente du minuteur). */
  duration: number;
  onLaunch: () => void;
  onOpenCard: () => void;
  onMore: () => void;
};

/** « Soir de famille » : l'activité recommandée en fond plein écran fondu, titre et actions. */
export function TonightHero({ activity, firstName, reason, duration, onLaunch, onOpenCard, onMore }: Props) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroH = Math.min(720, Math.max(580, height * 0.8));
  const imgTop = insets.top + 56;
  const imgH = Math.min(width, 420);
  const bg = colors.bgGrouped;
  const id = vignetteIdFor(activity);

  return (
    <View style={{ height: heroH, overflow: 'hidden' }}>
      <VignetteImage
        id={id}
        blurRadius={34}
        style={{ position: 'absolute', top: -60, left: -60, width: width + 120, height: heroH * 0.7 + 60, opacity: isDark ? 0.55 : 0.9 }}
      />
      <VignetteImage
        id={id}
        accessibilityLabel={vignetteLabel(activity)}
        style={{ position: 'absolute', left: 0, top: imgTop, width, height: imgH }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(bg, isDark ? 0.55 : 0.35), withAlpha(bg, 0), withAlpha(bg, 0), bg, bg]}
        locations={[0, 0.16, 0.44, 0.72, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: 'absolute', left: SPACING.space4 + 4, right: SPACING.space4 + 4, bottom: SPACING.space2 }}>
        <Capsule label={`Recommandé pour ${firstName} ce soir`} icon="sparkles" style={{ alignSelf: 'flex-start' }} />
        <ThemedText
          variant="displayLarge"
          accessibilityRole="header"
          style={{ fontSize: 40, lineHeight: 42, marginTop: SPACING.space3 }}
        >
          {activity.title}
        </ThemedText>
        <ThemedText variant="callout" color="label2" style={{ marginTop: SPACING.space2 }}>
          {reason}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.space2, marginTop: SPACING.space3 }}>
          <Pill label={`${duration} min`} />
          <Pill label={MOVEMENT_LABEL[activity.movement]} />
          <Pill label={materialsLabel(activity)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space2, marginTop: SPACING.space4 + 2 }}>
          <Pressable
            onPress={onLaunch}
            accessibilityRole="button"
            accessibilityLabel={`Lancer le moment, ${duration} minutes`}
            style={({ pressed }) => ({
              flex: 1.4, height: 56, borderRadius: 28, backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.space2 + 2,
            })}
          >
            <Ionicons name="play" size={18} color={colors.accentInk} />
            <ThemedText variant="headline" style={{ color: colors.accentInk }}>
              {`Lancer · ${duration} min`}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onOpenCard}
            accessibilityRole="button"
            accessibilityLabel={`Voir la fiche de ${activity.title}`}
            style={{ flex: 1, height: 56 }}
          >
            <GlassSurface strong interactive style={{ height: 56 }}>
              <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText variant="headline">Voir la fiche</ThemedText>
              </View>
            </GlassSurface>
          </Pressable>
          <GlassButton icon="ellipsis-horizontal" accessibilityLabel="Plus d’options" onPress={onMore} style={{ width: 56, height: 56 }} />
        </View>
      </View>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, VignetteImage, useTheme } from '../../design';
import { vignetteIdFor, vignetteLabel } from '../../lib/vignettes';
import type { P3Activity } from '../../lib/p3';

type Props = {
  activity: P3Activity;
  size: number;
  done?: boolean;
  /** Semaine pas encore ouverte : vignette atténuée, non pressable (verrou neutre). */
  locked?: boolean;
  onPress?: () => void;
  style?: object;
};

/** Vignette d'activité (poster) : image, coche sauge si vécue, titre, durées. */
export function ActivityPoster({ activity, size, done, locked, onPress, style }: Props) {
  const { colors } = useTheme();
  const durations = `${activity.durations.join(' · ')} min`;
  const state = locked ? ', pas encore ouverte' : done ? ', déjà vécue' : '';
  return (
    <Pressable
      onPress={onPress}
      disabled={locked || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}, ${durations}${state}`}
      style={({ pressed }) => [{ width: size, opacity: pressed ? 0.75 : 1 }, style]}
    >
      <View style={{ width: size, height: size, borderRadius: RADIUS.tile + 2, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
        <VignetteImage id={vignetteIdFor(activity)} style={{ width: size, height: size, opacity: locked ? 0.45 : 1 }} />
        {done && !locked ? (
          <View
            style={{
              position: 'absolute', top: SPACING.space2, right: SPACING.space2, width: 24, height: 24, borderRadius: 12,
              backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={15} color={colors.navy900} />
          </View>
        ) : null}
        {locked ? (
          <View
            style={{
              position: 'absolute', top: SPACING.space2, right: SPACING.space2, width: 24, height: 24, borderRadius: 12,
              backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed" size={13} color={colors.label2} />
          </View>
        ) : null}
      </View>
      <ThemedText variant="subheadline" style={{ fontWeight: '600', marginTop: SPACING.space2 }} numberOfLines={2}>
        {activity.title}
      </ThemedText>
      <ThemedText variant="footnote" color="label2" numberOfLines={1}>
        {durations}
        {activity.programme === 'complement' ? ' · pour aller plus loin' : ''}
      </ThemedText>
    </Pressable>
  );
}

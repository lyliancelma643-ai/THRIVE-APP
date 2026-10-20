import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Star, ThemedText, useTheme } from '../../design';
import { SYNTHESIS } from '../../lib/p3';
import { countLine } from './flow';
import { Display, Eyebrow, Frame, Ghost, type Chrome } from './parts';

export type EndReward = { id: string; label: string };

type Props = {
  chrome: Chrome;
  firstName: string;
  /** Compteur affiché (il « monte » jusqu'au total quand le parent a répondu). */
  count: number;
  /** Étoiles allumées cette semaine (0 à 3). Le seul geste soleil de l'écran. */
  weekStars: number;
  pride: string;
  /** Note ≤ 2 : « Ce qui empêche souvent celle-ci de marcher » + phrase rassurante. Jamais un état d'échec. */
  low: { text: string; reassurance: string } | null;
  /** Lettre scellée : « Lettre scellée. Elle te reviendra par courriel le … » */
  sealedLine: string | null;
  /** Objets débloqués (M13), `Voir` / `Plus tard`. */
  rewards: EndReward[];
  weekCompleteLabel: string | null;
  next: { title: string } | null;
  /** « Voir » : ouvre l’objet `id`. Sans rappel, EndView ouvre lui-même `objet/[rewardId]` (enfant lu dans la route). */
  onViewReward?: (id: string) => void;
  onLaterRewards: () => void;
  onNext: () => void;
  onHome: () => void;
};

/** M12 · Fin (compteur, trois étoiles de la semaine, fierté, suite, retour Maison) et M13 · objet débloqué. */
export function EndView({
  chrome, firstName, count, weekStars, pride, low, sealedLine, rewards, weekCompleteLabel, next, onViewReward, onLaterRewards, onNext, onHome,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  // M13 · « Voir » ouvre l’objet débloqué (N2–N4, « La lettre »), pour l’enfant de ce moment.
  const openReward = (rewardId: string) =>
    router.push({ pathname: '/(parent)/objet/[rewardId]', params: childId ? { rewardId, childId } : { rewardId } });
  const lit = Math.max(0, Math.min(3, weekStars));
  return (
    <Frame chrome={{ ...chrome, timer: null }} padTop={rewards.length > 0 ? 28 : 60} padBottom={48}>
      <View accessibilityLiveRegion="polite">
        <Display size={38} lineHeight={44} weight={600}>{countLine(count, firstName)}</Display>
      </View>
      <View
        style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${lit} sur 3 cette semaine`}
      >
        {[0, 1, 2].map((i) => <Star key={i} on={i < lit} size={48} />)}
        <ThemedText variant="sub" weight={600} color="label2" style={{ marginLeft: 4 }}>{`${lit} sur 3 cette semaine`}</ThemedText>
      </View>

      {low ? (
        <Card style={{ marginTop: 30 }} padding={18}>
          <Eyebrow>{SYNTHESIS.lowRatingTitle}</Eyebrow>
          <ThemedText variant="body" color="label2" style={{ marginTop: 8 }}>{low.text}</ThemedText>
          <ThemedText variant="body" style={{ marginTop: 14 }}>{low.reassurance}</ThemedText>
        </Card>
      ) : (
        <ThemedText variant="body" color="label2" style={{ marginTop: 30, fontSize: 18, lineHeight: 27 }}>{pride}</ThemedText>
      )}

      {sealedLine ? <ThemedText variant="callout" color="label2" style={{ marginTop: 24 }}>{sealedLine}</ThemedText> : null}

      {rewards.length > 0 ? (
        <View style={{ marginTop: 28, gap: 12 }}>
          {rewards.map((r) => (
            <Card key={r.id} padding={18} style={{ borderColor: colors.sage }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.badgeBg }}>
                  <Icon name="medal" size={24} color={colors.badgeInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Eyebrow>Débloqué</Eyebrow>
                  <Display size={20} lineHeight={25} weight={600} style={{ marginTop: 2 }}>{r.label}</Display>
                </View>
              </View>
              <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button variant="gray" size="md" label="Voir" onPress={() => (onViewReward ? onViewReward(r.id) : openReward(r.id))} accessibilityLabel={`Voir ${r.label}`} />
                <Ghost label="Plus tard" onPress={onLaterRewards} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 30 }}>
        {weekCompleteLabel ? <ThemedText variant="callout" weight={500} style={{ marginBottom: 14 }}>{weekCompleteLabel}</ThemedText> : null}
        {next ? (
          <Pressable
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={`La suite : ${next.title}`}
            style={({ pressed }) => ({
              minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              borderRadius: 22, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator, opacity: pressed ? 0.8 : 1,
            })}
          >
            <ThemedText variant="foot" color="label2" style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>
              {'La suite : '}
              <ThemedText variant="foot" weight={600} style={{ fontSize: 15, lineHeight: 21 }}>{next.title}</ThemedText>
            </ThemedText>
            <Icon name="chevronRight" size={19} color={colors.label2} strokeWidth={2.2} />
          </Pressable>
        ) : null}
        <View style={{ marginTop: 16, width: 180 }}>
          <Button variant="plainglass" label="Retour à Maison" onPress={onHome} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Frame>
  );
}

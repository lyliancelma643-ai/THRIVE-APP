import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, ThemedText, VignetteImage, useTheme } from '../../design';
import { RadialGlow } from './RadialGlow';
import { SceneBar } from './SceneBar';
import { SceneButton } from './SceneButton';
import { SCENE, whiteAlpha } from './scene';

export type VideoReadyViewProps = {
  childName: string;
  /** Initiale du parent / coach (pastille grise). */
  partnerInitial: string;
  /** Vignette de la séance (ACT-xxxx). */
  vignetteId: string;
  /** Nombre de questions posées pendant la vidéo. */
  questionCount: number;
  /** Fiche de la séance : Thème, Compétence, Durée… */
  rows: readonly { label: string; value: string }[];
  onStart: () => void;
  onLater: () => void;
  onClose: () => void;
};

/**
 * P · Prêt avec … ? Scène marine (la même dans Lin et Veillée) avec une lueur bleutée en haut, vignette de la séance, deux avatars
 * (l'enfant et le parent), fiche de la séance en verre, « On y va » (soleil) et « Plus tard ».
 * Vue seulement : le lecteur vidéo (Wistia) n'est pas branché.
 * [À COMPLÉTER] branchement du lecteur de séance vidéo quand VIDEO_SESSIONS_ENABLED passera à vrai.
 */
export function VideoReadyView({ childName, partnerInitial, vignetteId, questionCount, rows, onStart, onLater, onClose }: VideoReadyViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = SCENE.marine;
  const glow = SCENE.marineLight;
  const times = questionCount === 1 ? '1 fois' : `${questionCount} fois`;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <RadialGlow color={glow} height={430} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 66, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 132, height: 132, borderRadius: 34, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
            <VignetteImage id={vignetteId} style={{ width: 132, height: 132 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: -22 }}>
            <Avatar label={childName.slice(0, 1)} size={44} background={SCENE.childAvatarBg} ink={SCENE.childAvatarInk} accessibilityLabel={childName} />
            <Avatar label={partnerInitial} size={44} background={SCENE.partnerAvatar} ink={SCENE.white} style={{ marginLeft: -10 }} accessibilityLabel="Le parent" />
          </View>
          <ThemedText variant="largetitle" accessibilityRole="header" style={{ marginTop: 26, color: SCENE.white, textAlign: 'center' }}>
            {`Prêt avec ${childName} ?`}
          </ThemedText>
          <ThemedText variant="body" style={{ marginTop: 10, marginHorizontal: 36, color: whiteAlpha(0.72), textAlign: 'center' }}>
            {`Cette séance se vit à deux. La vidéo s’arrêtera ${times} pour poser une question à ${childName}.`}
          </ThemedText>
        </View>

        <View
          style={{
            marginTop: 30, marginHorizontal: 16, borderRadius: 26, backgroundColor: whiteAlpha(0.1), borderWidth: 1,
            borderColor: whiteAlpha(0.16), borderTopColor: whiteAlpha(0.28), overflow: 'hidden',
          }}
        >
          {rows.map((r, i) => (
            <View
              key={r.label}
              accessible
              accessibilityLabel={`${r.label} : ${r.value}`}
              style={{
                paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: whiteAlpha(0.14),
              }}
            >
              <ThemedText variant="body" style={{ color: whiteAlpha(0.66) }}>{r.label}</ThemedText>
              <ThemedText variant="body" weight={600} style={{ color: SCENE.white, flexShrink: 1, textAlign: 'right' }}>{r.value}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 10, gap: 8 }}>
        <Button label="On y va" glyph="play" variant="accent" onPress={onStart} />
        <Pressable onPress={onLater} accessibilityRole="button" accessibilityLabel="Plus tard" style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText variant="headline" style={{ color: SCENE.white }}>Plus tard</ThemedText>
        </Pressable>
      </View>
      <SceneBar left={<SceneButton glyph="close" accessibilityLabel="Fermer" onPress={onClose} />} />
    </View>
  );
}

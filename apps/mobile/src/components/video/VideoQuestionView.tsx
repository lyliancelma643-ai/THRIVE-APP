import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GlassSurface, Icon, ThemedText, VignetteImage, useTheme } from '../../design';
import { SceneBar } from './SceneBar';
import { SceneButton } from './SceneButton';
import { SCENE, whiteAlpha } from './scene';

export type VideoQuestionViewProps = {
  childName: string;
  /** Image de la scène en pause (ACT-xxxx), plein cadre en haut. */
  sceneVignetteId: string;
  /** Portrait de la mascotte dans l'en-tête de la carte (ACT-xxxx). */
  portraitVignetteId: string;
  /** Numéro de la question (1-indexé) et total. */
  index: number;
  total: number;
  question: string;
  choices: readonly string[];
  /** Réponse cochée (0-indexée) ou null. */
  selected: number | null;
  onSelect: (index: number) => void;
  /** Position de lecture (0 à 1) et repères des questions (0 à 1). */
  progress: number;
  markers: readonly number[];
  elapsedLabel: string;
  durationLabel: string;
  onClose: () => void;
};

/**
 * Q · Question en pause. La vidéo est arrêtée (pastille « En pause ») : la scène est assombrie, une carte de verre
 * porte la question posée à l'enfant et ses réponses ; en bas, la barre de lecture avec les repères de questions.
 * Vue seulement : aucune lecture réelle. [À COMPLÉTER] branchement du lecteur (Wistia) et de l'enregistrement des réponses.
 */
export function VideoQuestionView({
  childName, sceneVignetteId, portraitVignetteId, index, total, question, choices, selected, onSelect, progress, markers,
  elapsedLabel, durationLabel, onClose,
}: VideoQuestionViewProps) {
  const { colors } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [barW, setBarW] = useState(0);
  const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%` as const;
  return (
    <View style={{ flex: 1, backgroundColor: SCENE.black }}>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 560, overflow: 'hidden' }}>
        <VignetteImage id={sceneVignetteId} style={{ width: '100%', height: 560 }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={`veil${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.35} />
              <Stop offset="0.4" stopColor="#000000" stopOpacity={0.45} />
              <Stop offset="0.78" stopColor="#000000" stopOpacity={1} />
              <Stop offset="1" stopColor="#000000" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#veil${uid})`} />
        </Svg>
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, top: 300 }}>
        <GlassSurface strong radius={34}>
          <View style={{ paddingVertical: 22, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
                <VignetteImage id={portraitVignetteId} style={{ width: 40, height: 40 }} />
              </View>
              <ThemedText
                variant="cap"
                weight={600}
                accessibilityRole="header"
                style={{ flex: 1, letterSpacing: 1, textTransform: 'uppercase', color: colors.tintText }}
              >
                {`Question pour ${childName} · ${index} sur ${total}`}
              </ThemedText>
            </View>
            <ThemedText variant="title3" style={{ marginTop: 8 }}>{question}</ThemedText>
            <View style={{ marginTop: 16, gap: 8 }}>
              {choices.map((c, i) => {
                const on = selected === i;
                return (
                  <Pressable
                    key={c}
                    onPress={() => onSelect(i)}
                    accessibilityRole="button"
                    accessibilityLabel={c}
                    accessibilityState={{ selected: on }}
                    style={{
                      height: 52, borderRadius: 26, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: on ? colors.tint : colors.fill3,
                    }}
                  >
                    {on ? <Icon name="check" size={18} color={colors.tintInk} strokeWidth={2.6} /> : null}
                    <ThemedText variant="headline" weight={on ? 600 : 500} style={{ color: on ? colors.tintInk : colors.label, flexShrink: 1 }}>
                      {c}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </GlassSurface>
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 44 }}>
        <View
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Lecture, ${elapsedLabel} sur ${durationLabel}`}
          style={{ height: 5, borderRadius: 3, backgroundColor: whiteAlpha(0.25) }}
        >
          <View style={{ position: 'absolute', left: 0, top: 0, height: 5, width: pct(progress), borderRadius: 3, backgroundColor: SCENE.white }} />
          {barW > 0
            ? markers.map((m) => (
                <View
                  key={m}
                  style={{
                    position: 'absolute', top: -3.5, left: m * barW - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.sun,
                    borderWidth: 2, borderColor: SCENE.black,
                  }}
                />
              ))
            : null}
        </View>
        <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText variant="foot" style={{ color: whiteAlpha(0.7) }}>{elapsedLabel}</ThemedText>
          <ThemedText variant="foot" style={{ color: whiteAlpha(0.7) }}>La vidéo reprend après la réponse</ThemedText>
          <ThemedText variant="foot" style={{ color: whiteAlpha(0.7) }}>{durationLabel}</ThemedText>
        </View>
      </View>

      <SceneBar
        left={<SceneButton glyph="close" accessibilityLabel="Fermer" onPress={onClose} />}
        right={<SceneButton glyph="pause" label="En pause" />}
      />
    </View>
  );
}

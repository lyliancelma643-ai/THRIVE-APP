import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Icon, Section, Slider, ThemedText, VignetteImage, useTheme, withAlpha } from '../../design';
import { VideoMascot } from './VideoMascot';

export type VideoHomeTask = {
  /** Titre de l'action (« La demande de la semaine »). */
  title: string;
  /** Phrase d'invitation à la maison. */
  text: string;
  /** Vignette (ACT-xxxx). */
  vignetteId: string;
};

export type VideoDoneViewProps = {
  sessionNumber: number;
  childName: string;
  /** Durée vécue, en minutes (« 20 minutes à deux »). */
  durationMinutes: number;
  /** Effort ressenti, de 0 (facile) à 10 (très dur). */
  effort: number;
  onEffortChange: (value: number) => void;
  /** Action de transfert « À la maison cette semaine » ; absente : carte masquée. */
  homeTask?: VideoHomeTask | null;
  onFinish: () => void;
};

/**
 * R · Après la séance. Célébration avec la mascotte (halo soleil), question d'effort ressenti avec le curseur Liquid
 * Glass (0 à 10), carte « À la maison cette semaine » et « Terminer ».
 * Vue seulement. [À COMPLÉTER] enregistrement de l'effort ressenti et fin de séance côté serveur.
 */
export function VideoDoneView({ sessionNumber, childName, durationMinutes, effort, onEffortChange, homeTask, onFinish }: VideoDoneViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 66, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <VideoMascot size={120} vignetteId="ACT-1303" halo={withAlpha(colors.sun, 0.35)} accessibilityLabel="La mascotte THRIVE en fête" />
          <ThemedText variant="title1" accessibilityRole="header" style={{ marginTop: 18, textAlign: 'center' }}>
            {`Séance ${sessionNumber}, c’est fait`}
          </ThemedText>
          <ThemedText variant="body" color="label2" style={{ marginTop: 6, textAlign: 'center' }}>
            {`${durationMinutes} minutes à deux. Bravo à vous deux.`}
          </ThemedText>
        </View>

        <Section style={{ marginTop: 26 }}>
          <Card>
            <ThemedText variant="headline">C’était difficile aujourd’hui ?</ThemedText>
            <ThemedText variant="sub" color="label2">{`Demande à ${childName}. De 0 (facile) à 10 (très dur).`}</ThemedText>
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ThemedText variant="foot" color="label2">0</ThemedText>
              <View style={{ flex: 1 }}>
                <Slider value={effort} onChange={onEffortChange} min={0} max={10} step={1} accessibilityLabel="Effort ressenti" valueText={(v) => `${v} sur 10`} />
              </View>
              <ThemedText variant="foot" color="label2">10</ThemedText>
            </View>
            <ThemedText variant="title2" style={{ marginTop: 4, textAlign: 'center' }}>{String(effort)}</ThemedText>
          </Card>
        </Section>

        {homeTask ? (
          <Section style={{ marginTop: 12 }}>
            <View
              accessible
              accessibilityLabel={`À la maison cette semaine. ${homeTask.title}. ${homeTask.text}`}
              style={{ borderRadius: 26, padding: 16, backgroundColor: colors.tint, flexDirection: 'row', gap: 12 }}
            >
              <View style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgGrouped3 }}>
                <VignetteImage id={homeTask.vignetteId} style={{ width: 72, height: 72 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                  <Icon name="home" size={15} color={colors.tintInk} />
                  <ThemedText variant="foot" weight={600} style={{ color: colors.tintInk }}>À la maison cette semaine</ThemedText>
                </View>
                <ThemedText variant="headline" style={{ marginTop: 4, color: colors.tintInk }}>{homeTask.title}</ThemedText>
                <ThemedText variant="sub" style={{ marginTop: 2, color: colors.tintInk, opacity: 0.86 }}>{homeTask.text}</ThemedText>
              </View>
            </View>
          </Section>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button label="Terminer" variant="prom" onPress={onFinish} />
      </View>
    </View>
  );
}

import { View } from 'react-native';
import { Arch, Button, Paper, ThemedText, useTheme } from '../../design';
import { VIGNETTE_SOURCES } from '../../design/vignetteSources';
import { BASE_VIGNETTE_ID } from '../../design/vignetteIds';
import { frTypo } from './flow';
import { Disclosure, Display, Eyebrow, Frame, InlineMd, type Chrome } from './parts';

type Props = {
  chrome: Chrome;
  vignetteId: string;
  vignetteLabel: string;
  /** « Ce qu'on travaille » : compétence de la semaine, objectif, puis « sous-titre · pilier ». */
  worked: { skill: string; objective: string; tail: string };
  safety: string | null;
  opener: string;
  minutes: number;
  onStart: () => void;
};

/** M3 · Amorce : affiche en arche, « Ce qu'on travaille » sur papier, phrase d'ouverture, puis le minuteur démarre. */
export function AmorceView({ chrome, vignetteId, vignetteLabel, worked, safety, opener, minutes, onStart }: Props) {
  const { colors } = useTheme();
  return (
    <Frame chrome={chrome} padTop={12} padBottom={56}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Arch width={240} height={268} source={VIGNETTE_SOURCES[vignetteId] ?? VIGNETTE_SOURCES[BASE_VIGNETTE_ID]} accessibilityLabel={vignetteLabel} />
      </View>
      <Paper laid radius={26} padding={22} style={{ transform: [{ rotate: '-0.3deg' }] }}>
        <Eyebrow>Ce qu’on travaille</Eyebrow>
        <Display size={24} lineHeight={28} weight={500} style={{ marginTop: 6 }}>{worked.skill}</Display>
        <ThemedText variant="callout" style={{ marginTop: 10 }}>{worked.objective}</ThemedText>
        <ThemedText variant="foot" color="label2" style={{ marginTop: 8 }}>{worked.tail}</ThemedText>
      </Paper>
      {safety ? (
        <Disclosure title="À savoir avant de commencer">
          <InlineMd text={safety} variant="callout" color="label2" />
        </Disclosure>
      ) : null}
      <View
        style={{
          marginTop: 36, paddingTop: 46, paddingBottom: 24, paddingHorizontal: 24, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomRightRadius: 26, borderBottomLeftRadius: 8,
          backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.separator,
        }}
      >
        <ThemedText variant="numeralHero" color="sageText" accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', left: 18, top: 2, opacity: 0.6 }}>“</ThemedText>
        <ThemedText variant="callout" color="label2">Pour commencer, dis :</ThemedText>
        <Display size={30} lineHeight={37} italic style={{ marginTop: 8 }}>{frTypo(opener)}</Display>
      </View>
      <ThemedText variant="callout" color="label2" style={{ marginTop: 22, marginHorizontal: 4 }}>
        {`Le minuteur démarre sur ${minutes} minutes. Ensuite, touche « Suivant » : chaque consigne s’ajoute en dessous, une à la fois.`}
      </ThemedText>
      <View style={{ marginTop: 30 }}>
        <Button variant="accent" label="C’est dit, on commence" onPress={onStart} />
      </View>
    </Frame>
  );
}

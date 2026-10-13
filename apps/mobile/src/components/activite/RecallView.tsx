import { View } from 'react-native';
import { Button, ThemedText } from '../../design';
import { frTypo } from './flow';
import { Display, Eyebrow, Frame, type Chrome } from './parts';

type Props = {
  chrome: Chrome;
  /** « Semaine N · titre » + phrase d'ouverture, seulement avant la première fiche cœur de la semaine. */
  opening: { weekLabel: string; line: string } | null;
  /** « La dernière fois, {prénom} avait dit « … ». » (vient de la dernière phrase gardée, jamais d'une démo). */
  recall: string | null;
  onContinue: () => void;
};

/** M2 · La fois d'avant : une grande phrase, un seul bouton. */
export function RecallView({ chrome, opening, recall, onContinue }: Props) {
  return (
    <Frame chrome={chrome} padTop={34} cta={<Button variant="accent" label="Continuer" flex onPress={onContinue} />}>
      <ThemedText variant="numeralHero" color="sageText" accessibilityElementsHidden importantForAccessibility="no" style={{ height: 54, opacity: 0.55 }}>“</ThemedText>
      {opening ? (
        <View>
          <Eyebrow>{opening.weekLabel}</Eyebrow>
          <Display size={36} lineHeight={44} style={{ marginTop: 14 }}>{frTypo(opening.line)}</Display>
        </View>
      ) : null}
      {recall ? (
        <View style={{ marginTop: opening ? 40 : 0 }}>
          <Eyebrow>La fois d’avant</Eyebrow>
          <Display size={36} lineHeight={44} style={{ marginTop: 14 }}>{frTypo(recall)}</Display>
        </View>
      ) : null}
    </Frame>
  );
}

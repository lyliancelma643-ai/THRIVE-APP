import { View } from 'react-native';
import { Button, Card, ThemedText, useTheme } from '../../design';
import { frTypo, mmss, overtimeLine, overtimeMinutes, remainingOf, ringRatio } from './flow';
import { Display, Eyebrow, Frame, InlineMd, Ring, type Chrome } from './parts';

/** M6 · En voiture, avant de partir : on lit les étapes maintenant, tout se fait ensuite à voix haute. */
export function CarReadView({
  chrome, opener, steps, says, onRead,
}: {
  chrome: Chrome;
  opener: string;
  /** Titres des étapes pour l'écran. */
  steps: string[];
  /** Pour chaque étape, les phrases « Dites : … » du pas à pas. */
  says: string[][];
  onRead: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Frame chrome={chrome} padTop={20} cta={<Button size="xl" variant="accent" label="C’est lu" flex onPress={onRead} />} padBottom={150}>
      <Eyebrow>En voiture</Eyebrow>
      <ThemedText variant="body" style={{ marginTop: 12, fontSize: 20, lineHeight: 29 }}>
        Lis les étapes maintenant. Pendant la route, pose le téléphone : tout se fait à voix haute.
      </ThemedText>
      <Card padding={20} style={{ marginTop: 24 }}>
        <ThemedText variant="callout" color="label2" style={{ marginBottom: 8 }}>Dis :</ThemedText>
        <Display size={23} lineHeight={30}>{frTypo(opener)}</Display>
      </Card>
      <View style={{ marginTop: 22, gap: 16 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
            <Display size={22} lineHeight={26} weight={600} style={{ width: 26, color: colors.sageText }}>{String(i + 1)}</Display>
            <View style={{ flex: 1 }}>
              <InlineMd text={s} color="label2" style={{ fontSize: 18, lineHeight: 26 }} />
              {(says[i] ?? []).map((d, k) => (
                <ThemedText key={k} variant="callout" style={{ marginTop: 4 }}>{`Dites : ${frTypo(d)}`}</ThemedText>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Frame>
  );
}

/** M7 · La route : le parent conducteur n'a jamais à regarder l'écran pour avancer. L'anneau est le seul geste soleil (« Terminer » est gris). */
export function CarRoadView({
  chrome, elapsedS, totalS, onFinish,
}: { chrome: Chrome; elapsedS: number; totalS: number; onFinish: () => void }) {
  const { colors } = useTheme();
  const remaining = remainingOf(elapsedS, totalS);
  const extra = overtimeMinutes(elapsedS, totalS);
  const size = 236;
  return (
    <Frame chrome={{ ...chrome, timer: null }} scroll={false} cta={<Button size="xl" variant="gray" label="Terminer" flex onPress={onFinish} />}>
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 84 }}>
        <View
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`Il reste ${Math.ceil(remaining / 60)} minutes sur ${Math.round(totalS / 60)}`}
        >
          <View style={{ position: 'absolute' }}>
            <Ring size={size} stroke={12} ratio={ringRatio(elapsedS, totalS)} color={colors.sun} track={colors.fill2} />
          </View>
          <Display size={52} lineHeight={56} weight={600} style={{ fontVariant: ['tabular-nums'] }}>{mmss(remaining)}</Display>
          <ThemedText variant="sub" weight={500} color="label2" style={{ marginTop: 8 }}>{`sur ${Math.round(totalS / 60)} min`}</ThemedText>
        </View>
        {extra >= 1 ? <ThemedText variant="sub" color="label2" style={{ marginTop: 16 }}>{overtimeLine(extra)}</ThemedText> : null}
        <ThemedText variant="body" color="label2" style={{ marginTop: 34, maxWidth: 290, textAlign: 'center' }}>
          Tout se fait à voix haute. Le téléphone peut rester posé.
        </ThemedText>
      </View>
    </Frame>
  );
}

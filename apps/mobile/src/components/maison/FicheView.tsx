import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button, CANVAS, Card, GlassButton, GlassSurface, Kicker, List, ListRow, NavBar, Section, SectionHeader, Segmented, Sheet,
  ThemedText, VignetteImage, useScrollEdge, useTheme, withAlpha,
} from '../../design';
import { copyPhrase, stripQuotes } from './copy';
import type { FicheVM } from './viewModels';

type Props = {
  vm: FicheVM;
  onBack: () => void;
  onDuration: (d: number) => void;
  onStart: () => void;
  /** Ce qui suit la fiche (ex. « C’est fait ? » pour noter un moment vécu sans minuteur). */
  children?: ReactNode;
};

/**
 * L · Fiche moment : vignette en grand, durée 10/20/30, phrase d’ouverture à copier, étapes, niveau de preuve,
 * puis la barre en verre « Pas ce soir / Commencer ». Vue présentationnelle.
 */
export function FicheView({ vm, onBack, onDuration, onStart, children }: Props) {
  const { colors, style } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useScrollEdge();
  const [sheet, setSheet] = useState<null | 'why' | 'refusal' | 'more'>(null);
  const [copied, setCopied] = useState(false);
  const opener = stripQuotes(vm.opener);

  const copy = async () => {
    const r = await copyPhrase(opener);
    if (r === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 340, backgroundColor: colors.bgGrouped3, overflow: 'hidden' }}>
          <VignetteImage
            id={vm.vignetteId}
            accessibilityLabel={vm.vignetteLabel}
            style={{ position: 'absolute', left: (width - 300) / 2, top: 44, width: 300, height: 296 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(colors.navy900, 0), withAlpha(colors.navy900, 0.88)]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}
          />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
            <ThemedText variant="cap" weight={600} style={{ color: CANVAS.white, opacity: 0.85, letterSpacing: 1, lineHeight: 16, textTransform: 'uppercase' }}>
              {vm.kicker}
            </ThemedText>
            <ThemedText
              variant="title1"
              accessibilityRole="header"
              style={{ color: CANVAS.white, fontSize: style === 'carnet' ? 30 : 28, lineHeight: 34, letterSpacing: 0 }}
            >
              {vm.title}
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="callout" color="label2" style={{ marginHorizontal: 16, marginTop: 16 }}>{vm.objective}</ThemedText>

        {vm.durations.length > 1 ? (
          <Section style={{ marginTop: 14 }}>
            <Segmented
              accessibilityLabel="Durée du moment"
              options={vm.durations.map((d) => ({ key: String(d), label: `${d} min` }))}
              value={String(vm.minutes)}
              onChange={(k) => onDuration(Number(k))}
            />
          </Section>
        ) : null}

        <Section style={{ marginTop: 14 }}>
          <Card>
            <Kicker glyph="quote">Ce que tu dis pour commencer</Kicker>
            <ThemedText variant={style === 'carnet' ? 'displayQuote' : 'title3'} weight={500} style={{ marginTop: 8, ...(style === 'carnet' ? { fontSize: 19, lineHeight: 25, letterSpacing: -0.2 } : null) }}>
              {`« ${opener} »`}
            </ThemedText>
            <View style={{ marginTop: 12, flexDirection: 'row' }}>
              <Button size="sm" variant="gray" glyph="copy" label={copied ? 'Phrase copiée' : 'Copier la phrase'} onPress={copy} />
            </View>
          </Card>
        </Section>

        <SectionHeader small title="Ce que tu vas faire" />
        <Section>
          <List>
            {vm.steps.map((s, i) => (
              <ListRow
                key={`s${i}`}
                title={s}
                accessibilityLabel={`Étape ${i + 1} : ${s}`}
                leading={
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText variant="sub" weight={600} style={{ fontSize: 15 }}>{String(i + 1)}</ThemedText>
                  </View>
                }
                leadingInset={60}
              />
            ))}
            {vm.extensions.map((e, i) => (
              <ListRow key={`x${i}`} title={`+ ${e}`} />
            ))}
          </List>
        </Section>

        <Section style={{ marginTop: 12 }}>
          <List>
            <ListRow
              glyph="leaf"
              iconColor="sysGreen"
              title="Pourquoi ça marche"
              value={vm.evidenceLevel ? `Niveau ${vm.evidenceLevel}` : undefined}
              onPress={() => setSheet('why')}
            />
            {vm.refusal ? <ListRow glyph="hand" iconColor="sysPink" title="S’il dit non" onPress={() => setSheet('refusal')} /> : null}
          </List>
        </Section>

        <Section style={{ marginTop: 12 }}>
          <List>
            <ListRow glyph="toolbox" iconColor="sysTeal" title="À prévoir" subtitle={vm.materials} />
            {vm.variant ? <ListRow glyph="person" iconColor="sysIndigo" title="À cet âge" subtitle={vm.variant} /> : null}
          </List>
        </Section>

        {children}
      </ScrollView>

      <NavBar
        edge={scroll.edge}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
        right={<GlassButton glyph="more" accessibilityLabel="Plus d’options" onPress={() => setSheet('more')} />}
      />

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(16, insets.bottom) }}>
        <GlassSurface strong radius={30}>
          <View style={{ flexDirection: 'row', padding: 6, gap: 6, alignItems: 'center' }}>
            <Button variant="plain" size="lg" label="Pas ce soir" onPress={onBack} style={{ paddingHorizontal: 18, alignSelf: 'center' }} />
            <Button flex glyph="play" label={`Commencer · ${vm.minutes} min`} onPress={onStart} />
          </View>
        </GlassSurface>
      </View>

      <Sheet visible={sheet === 'more'} onClose={() => setSheet(null)} title="Plus d’options">
        <List>
          <ListRow glyph="leaf" iconColor="sysGreen" title="Pourquoi ça marche" onPress={() => setSheet('why')} />
          <ListRow glyph="copy" iconColor="sysBlue" title="Copier la phrase d’ouverture" onPress={() => { setSheet(null); void copy(); }} />
        </List>
      </Sheet>

      <Sheet visible={sheet === 'why'} onClose={() => setSheet(null)} title="Pourquoi ça marche" detent="large" scroll>
        <ThemedText variant="body">{vm.whyDetail || vm.whyLine}</ThemedText>
        {vm.evidenceLevel ? (
          <ThemedText variant="foot" color="label2" style={{ marginTop: 12 }}>{`Niveau de preuve : ${vm.evidenceLevel}`}</ThemedText>
        ) : null}
      </Sheet>

      <Sheet visible={sheet === 'refusal'} onClose={() => setSheet(null)} title="S’il dit non" detent="large" scroll>
        {vm.refusal?.help.map((h, i) => (
          <ThemedText key={`h${i}`} variant="body" style={{ marginBottom: 10 }}>{h}</ThemedText>
        ))}
        {vm.refusal?.donts.length ? (
          <>
            <ThemedText variant="foot" color="label2" style={{ textTransform: 'uppercase', marginTop: 6, marginBottom: 6 }}>À éviter</ThemedText>
            {vm.refusal.donts.map((d, i) => (
              <ThemedText key={`d${i}`} variant="body" style={{ marginBottom: 8 }}>{`• ${d}`}</ThemedText>
            ))}
          </>
        ) : null}
        {vm.refusal?.safety ? <ThemedText variant="sub" color="label2" style={{ marginTop: 10 }}>{vm.refusal.safety}</ThemedText> : null}
      </Sheet>
    </View>
  );
}

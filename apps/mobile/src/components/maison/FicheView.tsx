import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button, GlassButton, GlassSurface, Icon, Lamp, List, ListRow, NavBar, Paper, Section, SectionHeader, Segmented, Sheet,
  ThemedText, VignetteImage, useScrollEdge, useTheme, withAlpha,
} from '../../design';
import { copyPhrase, stripQuotes } from './copy';
import { FadedImage } from './TonightHero';
import { useHeroStyle } from './palette';
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
 * L · Fiche moment : l’affiche en grand (fondue dans le fond), durée 10/20/30, phrase d’ouverture sur papier vergé
 * à copier, étapes, niveau de preuve, puis la barre en verre « Pas ce soir / Commencer » (Commencer = l’émail,
 * le seul geste soleil). Identique dans Lin et Veillée. Vue présentationnelle.
 */
export function FicheView({ vm, onBack, onDuration, onStart, children }: Props) {
  const { colors, styleKey } = useTheme();
  const { ficheBlurOpacity } = useHeroStyle();
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
      {styleKey === 'veillee' ? <Lamp /> : null}
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 372, overflow: 'hidden' }}>
          <VignetteImage
            id={vm.vignetteId}
            blurRadius={34}
            style={{ position: 'absolute', top: -60, left: -60, width: width + 120, height: 372 + 120, opacity: ficheBlurOpacity }}
          />
          <FadedImage id={vm.vignetteId} label={vm.vignetteLabel} width={width} height={330} top={52} fadeFrom={0.7} />
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(colors.bgGrouped, 0), colors.bgGrouped]}
            locations={[0.62, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 6 }}>
            <ThemedText variant="eyebrow" color="sageText">{vm.kicker}</ThemedText>
            <ThemedText variant="displayLarge" accessibilityRole="header" style={{ marginTop: 6, fontSize: 38, lineHeight: 40, letterSpacing: -0.43 }}>
              {vm.title}
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="callout" color="label2" style={{ marginHorizontal: 16, marginTop: 12 }}>{vm.objective}</ThemedText>

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
          <Paper laid radius={22} padding={18}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="quote" size={15} color={colors.sageInk} />
              <ThemedText variant="kick" color="sageText" style={{ flexShrink: 1 }}>Ce que tu dis pour commencer</ThemedText>
            </View>
            <ThemedText variant="displayQuote" weight={400} style={{ marginTop: 8, fontSize: 20, lineHeight: 27 }}>
              {`« ${opener} »`}
            </ThemedText>
            <View style={{ marginTop: 12, flexDirection: 'row' }}>
              <Button size="sm" variant="gray" glyph="copy" label={copied ? 'Phrase copiée' : 'Copier la phrase'} onPress={copy} />
            </View>
          </Paper>
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
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.badgeBg, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText variant="sectionTitle" color="badgeInk" style={{ fontSize: 16, lineHeight: 20, letterSpacing: -0.43 }}>{String(i + 1)}</ThemedText>
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
            <Button flex variant="accent" glyph="play" label={`Commencer · ${vm.minutes} min`} onPress={onStart} />
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

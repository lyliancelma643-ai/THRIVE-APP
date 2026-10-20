import { useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button, GlassButton, Lamp, List, ListRow, NavBar, Paper, Section, SectionFooter, Star, ThemedText,
  useNavBarHeight, useScrollEdge, useTheme,
} from '../../../design';
import {
  EMPTY_BLOCK_TEXT, TOOLS_VERSO_LABEL, hasCard,
  type Block, type CertificateModel, type LetterModel, type LockedModel, type ObjectModel, type SheetModel, type ToolsModel,
} from './logic';

type Props = {
  model: ObjectModel;
  /** Cible de la capture « Enregistrer en image » (la carte seule, sans les boutons). */
  cardRef: RefObject<View | null>;
  onBack: () => void;
  onHome: () => void;
  onPrint: () => void;
  onSaveImage: () => void;
  onShare: () => void;
};

/**
 * N2 · Fiche Identité, N3 · Boîte à Outils, N4 · Certificat, « La lettre », et l'objet pas encore gagné.
 * Identique dans Lin et Veillée (le papier garde son encre marine). Un seul geste soleil : l'étoile émail.
 * Vue présentationnelle : aucune donnée en dur, tout vient du modèle (`buildObjectModel`).
 */
export function ObjectView({ model, cardRef, onBack, onHome, onPrint, onSaveImage, onShare }: Props) {
  const { colors, styleKey } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useScrollEdge();
  const card = hasCard(model);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      {styleKey === 'veillee' ? <Lamp /> : null}
      <ScrollView
        onScroll={scroll.onScroll}
        scrollEventThrottle={scroll.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {model.kind === 'locked' ? <Locked model={model} onHome={onHome} /> : null}
        {model.kind === 'letter' ? <Letter model={model} /> : null}
        {model.kind === 'sheet' ? <Sheet model={model} cardRef={cardRef} /> : null}
        {model.kind === 'tools' ? <Tools model={model} cardRef={cardRef} /> : null}
        {model.kind === 'certificate' ? <Certificate model={model} cardRef={cardRef} /> : null}
        {card ? <Actions onPrint={onPrint} onSaveImage={onSaveImage} /> : null}
        {model.kind === 'sheet' && model.assembled ? <SectionFooter style={{ marginHorizontal: 16, marginTop: 10 }}>{model.assembled}</SectionFooter> : null}
        {model.kind === 'tools' ? <SectionFooter style={{ marginHorizontal: 16, marginTop: 10 }}>À imprimer en 85 × 55 mm.</SectionFooter> : null}
      </ScrollView>
      <NavBar
        edge={scroll.edge}
        left={<GlassButton glyph="chevronLeft" label="Le carnet" accessibilityLabel="Retour au carnet" onPress={onBack} />}
        right={card ? <GlassButton glyph="share" accessibilityLabel="Partager" onPress={onShare} /> : undefined}
      />
    </View>
  );
}

function Locked({ model, onHome }: { model: LockedModel; onHome: () => void }) {
  return (
    <Section style={{ paddingTop: 48, gap: 20 }}>
      <ThemedText variant="body" color="label2">{model.text}</ThemedText>
      <Button variant="gray" size="md" label={model.backLabel} onPress={onHome} />
    </Section>
  );
}

function Letter({ model }: { model: LetterModel }) {
  return (
    <Section style={{ paddingTop: 24 }}>
      <Paper laid radius={24} padding={24} accessible accessibilityLabel={`${model.eyebrow}. ${model.line}`}>
        <ThemedText variant="eyebrow" color="sageText">{model.eyebrow}</ThemedText>
        <ThemedText variant="body" style={{ marginTop: 10, lineHeight: 25 }}>{model.line}</ThemedText>
      </Paper>
    </Section>
  );
}

function BlockView({ block }: { block: Block }) {
  return (
    <View style={{ marginTop: 18 }}>
      <ThemedText variant="eyebrow" color="sageText">{block.label}</ThemedText>
      <View style={{ marginTop: 8, gap: 6 }}>
        {block.lines.length > 0 ? (
          block.lines.map((l, i) => <ThemedText key={i} variant="body" style={{ lineHeight: 24 }}>{l}</ThemedText>)
        ) : (
          <ThemedText variant="sub" color="label3">{EMPTY_BLOCK_TEXT}</ThemedText>
        )}
      </View>
    </View>
  );
}

/** Étoile émail de l'objet : le seul geste soleil de l'écran. */
function EnamelStar() {
  return <Star on size={62} style={{ marginTop: 22 }} />;
}

function Sheet({ model, cardRef }: { model: SheetModel; cardRef: RefObject<View | null> }) {
  return (
    <Section style={{ paddingTop: 24 }}>
      <View ref={cardRef} collapsable={false}>
        <Paper laid framed radius={26} padding={10}>
          <View style={{ borderRadius: 18, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 26 }}>
            <ThemedText variant="title1" accessibilityRole="header">{model.title}</ThemedText>
            {model.blocks.map((b) => <BlockView key={b.label} block={b} />)}
            {model.footer ? (
              <ThemedText variant="sub" color="label2" style={{ marginTop: 22, fontStyle: 'italic', lineHeight: 21 }}>{model.footer}</ThemedText>
            ) : null}
            <EnamelStar />
          </View>
        </Paper>
      </View>
    </Section>
  );
}

function WalletCard({ eyebrow, lines, small }: { eyebrow: string; lines: string[]; small?: boolean }) {
  const { colors } = useTheme();
  // Format carte de portefeuille 85 × 55 mm : la hauteur suit la largeur mesurée, « THRIVE MAISON » reste en bas.
  const [width, setWidth] = useState(0);
  return (
    <Paper radius={18} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ minHeight: width > 0 ? (width * 55) / 85 : undefined, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 }}>
        <ThemedText variant="eyebrow" color="sageText">{eyebrow}</ThemedText>
        <View style={{ marginTop: 8, gap: 4 }}>
          {lines.map((l, i) => (
            <ThemedText key={i} variant="body" color={small ? 'label2' : 'label'} style={{ fontSize: small ? 14 : 15.5, lineHeight: 20 }}>{l}</ThemedText>
          ))}
        </View>
        <ThemedText
          variant="cap2"
          style={{ marginTop: 'auto', alignSelf: 'flex-end', color: colors.sageText, letterSpacing: 0.9, fontSize: 11 }}
        >
          THRIVE MAISON
        </ThemedText>
      </View>
    </Paper>
  );
}

function Tools({ model, cardRef }: { model: ToolsModel; cardRef: RefObject<View | null> }) {
  return (
    <>
      <ThemedText variant="title1" accessibilityRole="header" style={{ paddingTop: 4, paddingHorizontal: 16 }}>{model.title}</ThemedText>
      <ThemedText variant="sub" color="label2" style={{ paddingTop: 2, paddingHorizontal: 16 }}>Format carte de portefeuille, recto et verso.</ThemedText>
      <Section style={{ paddingTop: 22 }}>
        {/* Recto puis verso : une seule image enregistrée, les deux cartes à la suite. */}
        <View ref={cardRef} collapsable={false} style={{ gap: 12 }}>
          <WalletCard eyebrow={model.title} lines={model.recto} />
          {model.verso.length > 0 ? <WalletCard eyebrow={TOOLS_VERSO_LABEL} lines={model.verso} small /> : null}
        </View>
      </Section>
    </>
  );
}

function Certificate({ model, cardRef }: { model: CertificateModel; cardRef: RefObject<View | null> }) {
  const { colors } = useTheme();
  return (
    <Section style={{ paddingTop: 24 }}>
      <View ref={cardRef} collapsable={false}>
        <Paper framed radius={26} padding={10}>
          <View style={{ borderRadius: 18, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' }}>
            <ThemedText variant="eyebrow" color="sageText" accessibilityRole="header">{model.title}</ThemedText>
            <ThemedText variant="title1" style={{ marginTop: 12, fontSize: 48, lineHeight: 52, textAlign: 'center' }}>{model.firstName}</ThemedText>
            <ThemedText variant="callout" color="label2" style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}>{model.intro}</ThemedText>
            <View style={{ marginTop: 20, flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              {model.columns.map((b) => (
                <View
                  key={b.label}
                  style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.fill3, borderWidth: 1, borderColor: colors.separator }}
                >
                  <ThemedText variant="eyebrow" color="sageText" style={{ fontSize: 10.5, lineHeight: 14 }}>{b.label}</ThemedText>
                  <View style={{ marginTop: 6, gap: 3 }}>
                    {b.lines.length > 0 ? (
                      b.lines.map((l, i) => <ThemedText key={i} variant="sub" style={{ fontSize: 14.5, lineHeight: 19 }}>{l}</ThemedText>)
                    ) : (
                      <ThemedText variant="sub" color="label3">{EMPTY_BLOCK_TEXT}</ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
            {model.keep ? (
              <ThemedText variant="title3" weight={400} style={{ marginTop: 18, fontStyle: 'italic', textAlign: 'center', lineHeight: 25 }}>
                {`« ${model.keep} »`}
              </ThemedText>
            ) : null}
            {model.dateLine ? <ThemedText variant="foot" color="sageText" style={{ marginTop: 12 }}>{model.dateLine}</ThemedText> : null}
            <EnamelStar />
          </View>
        </Paper>
      </View>
    </Section>
  );
}

function Actions({ onPrint, onSaveImage }: { onPrint: () => void; onSaveImage: () => void }): ReactNode {
  return (
    <>
      <Section style={{ marginTop: 16 }}>
        <List>
          <ListRow glyph="document" iconColor="sysGreen" title="Imprimer" chevron={false} onPress={onPrint} />
          <ListRow glyph="arrowUp" iconColor="sysGreen" title="Enregistrer en image" chevron={false} onPress={onSaveImage} />
        </List>
      </Section>
    </>
  );
}

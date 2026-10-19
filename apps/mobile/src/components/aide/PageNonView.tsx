import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  GlassButton, Icon, Lamp, LargeTitle, List, ListRow, NavBar, Paper, Section, SectionHeader, ThemedText,
  VignetteImage, useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';
import { PAGE_NON } from '../../lib/p3';
import type { ageBlocks } from './logic';

export type SoftVM = { id: string; vignetteId: string; title: string; detail: string };

type Props = {
  blocks: ReturnType<typeof ageBlocks>;
  soft: SoftVM | null;
  /** Libellé de la liste filtrée (tirée de l'existant Maison : « Des moments qui marchent… »). */
  listLabel: string;
  onBack: () => void;
  onOpenSoft: (id: string) => void;
  onOpenList: () => void;
};

/**
 * K4 · Quand il dit non : PAGE_NON dans l'ordre du web — intro, la tranche d'âge de l'enfant d'abord, « Les autres âges »
 * repliable, ce qui aggrave, ce qui marche, la phrase de sortie sur papier + sa note, puis une fiche anti-refus.
 * Aucun geste soleil : la page se lit. Vue présentationnelle (les données viennent de la route).
 */
export function PageNonView({ blocks, soft, listLabel, onBack, onOpenSoft, onOpenList }: Props) {
  const { colors, styleKey } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(40);
  const [others, setOthers] = useState(false);
  const { mine, others: rest } = blocks;

  const bullets = (block: { title: string; items: string[] }) => (
    <>
      <SectionHeader small title={block.title} />
      <Section>
        <List>
          {block.items.map((it) => (
            <ListRow key={it} title={it} chevron={false} />
          ))}
        </List>
      </Section>
    </>
  );

  const ageCard = (b: { band: string; text: string }, strong: boolean) => (
    <View
      key={b.band}
      style={{
        padding: 18, borderRadius: 22, backgroundColor: colors.bgGrouped2, borderWidth: 1, borderColor: colors.separator,
        opacity: strong ? 1 : 0.96,
      }}
    >
      <ThemedText variant="kick" color="sageText">{`${b.band} ans`}</ThemedText>
      <ThemedText variant="body" style={{ marginTop: 8, fontSize: 16, lineHeight: 24, letterSpacing: -0.3 }}>{b.text}</ThemedText>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      {styleKey === 'veillee' ? <Lamp /> : null}
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 60 }}
      >
        <LargeTitle>{PAGE_NON.title}</LargeTitle>
        <Section style={{ marginTop: 10 }}>
          <ThemedText variant="body" color="label2" style={{ lineHeight: 25 }}>{PAGE_NON.intro}</ThemedText>
        </Section>

        <Section style={{ marginTop: 18, gap: 8 }}>
          {mine ? ageCard(mine, true) : null}
          {mine ? (
            <Pressable
              onPress={() => setOthers((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: others }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <ThemedText variant="sub" weight={600} color="tintText" style={{ fontSize: 15 }}>Les autres âges</ThemedText>
              <View style={{ transform: [{ rotate: others ? '180deg' : '0deg' }] }}>
                <Icon name="chevronDown" size={15} color={colors.tintText} strokeWidth={2.4} />
              </View>
            </Pressable>
          ) : null}
          {!mine || others ? rest.map((b) => ageCard(b, false)) : null}
        </Section>

        {bullets(PAGE_NON.worse)}
        {bullets(PAGE_NON.works)}

        <Section style={{ marginTop: 26 }}>
          <Paper radius={24} padding={22}>
            <ThemedText variant="eyebrow" color="sageText">La phrase à dire</ThemedText>
            <ThemedText variant="title1" style={{ marginTop: 10, fontSize: 27, lineHeight: 34 }}>{PAGE_NON.exitLine}</ThemedText>
            <ThemedText variant="sub" color="label2" style={{ marginTop: 10, fontSize: 14.5, lineHeight: 20 }}>{PAGE_NON.exitNote}</ThemedText>
          </Paper>
        </Section>

        {soft ? (
          <>
            <SectionHeader small title={PAGE_NON.ctaSoft} />
            <Section>
              <List>
                <ListRow
                  large
                  title={soft.title}
                  subtitle={soft.detail}
                  leading={<VignetteImage id={soft.vignetteId} style={{ width: 48, height: 48, borderRadius: 14 }} />}
                  leadingInset={72}
                  onPress={() => onOpenSoft(soft.id)}
                  accessibilityLabel={`${PAGE_NON.ctaSoft} : ${soft.title}`}
                />
              </List>
            </Section>
          </>
        ) : null}

        <Section style={{ marginTop: 18 }}>
          <List>
            <ListRow title={listLabel} onPress={onOpenList} />
          </List>
        </Section>
      </ScrollView>
      <NavBar
        edge={lt.edge}
        title={PAGE_NON.title}
        titleVisible={lt.titleVisible}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
      />
    </View>
  );
}

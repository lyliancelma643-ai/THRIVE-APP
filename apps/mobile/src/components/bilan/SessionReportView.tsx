import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  Avatar, Card, GlassButton, NavBar, Section, SectionHeader, Tag, ThemedText, VignetteImage, CANVAS, useNavBarHeight, useScrollEdge, useTheme,
} from '../../design';
import { Ring } from './Ring';
import { fmtNote } from './bilanData';

// T — Bilan du coach : le message, le bilan détaillé, les observations sur 5.
// Vue PRÉSENTATIONNELLE. Un bloc absent (pas de message, bilan non servi par le serveur…) n'est pas affiché ;
// la numérotation 1 · 2 · 3 suit les blocs présents.

export type SessionReportModel = {
  number: number;
  title: string;
  /** « Séance 7 · Développer ». */
  subtitle: string;
  /** « 8 oct. » */
  dateLabel: string | null;
  coachName: string | null;
  coachInitial: string | null;
  message: string | null;
  bilan: [string, string][];
  /** [libellé, note sur 5]. */
  observations: [string, number][];
};

export function SessionReportView({ m, onBack, onShare }: { m: SessionReportModel; onBack: () => void; onShare?: () => void }) {
  const { colors, style } = useTheme();
  const navH = useNavBarHeight();
  const scroll = useScrollEdge();
  let n = 0;
  const head = (t: string) => <SectionHeader small title={`${++n} · ${t}`} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="bilan-seance">
      <ScrollView onScroll={scroll.onScroll} scrollEventThrottle={scroll.scrollEventThrottle} contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tag tone="ok" glyph="check" label="Validée par le coach" />
            {m.dateLabel ? <ThemedText variant="foot" color="label2">{m.dateLabel}</ThemedText> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.fill3 }}>
              <VignetteImage id={`ACT-${String(m.number).padStart(2, '0')}01`} style={{ width: 64, height: 64 }} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title1" accessibilityRole="header">{m.title}</ThemedText>
              <ThemedText variant="sub" color="label2">{m.subtitle}</ThemedText>
            </View>
          </View>
        </View>

        {m.message ? (
          <>
            {head('Le message du coach')}
            <Section>
              <Card>
                {m.coachName ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Avatar label={m.coachInitial ?? m.coachName.charAt(0)} size={32} background={colors.sysIndigo} ink={CANVAS.white} />
                    <ThemedText variant="headline">{m.coachName}</ThemedText>
                  </View>
                ) : null}
                <ThemedText variant="body" style={{ marginTop: m.coachName ? 10 : 0 }}>{m.message}</ThemedText>
              </Card>
            </Section>
          </>
        ) : null}

        {m.bilan.length > 0 ? (
          <>
            {head('Le bilan détaillé')}
            <Section>
              <Card style={{}}>
                {m.bilan.map(([k, v], i) => (
                  <ThemedText key={k} variant="sub" style={{ marginTop: i ? 8 : 0 }}>
                    <ThemedText variant="sub" weight={700}>{`${k}. `}</ThemedText>
                    {v}
                  </ThemedText>
                ))}
              </Card>
            </Section>
          </>
        ) : null}

        {m.observations.length > 0 ? (
          <>
            {head('Observations du coach · sur 5')}
            <Section>
              <Card>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: m.observations.length >= 4 ? 'space-between' : 'flex-start', rowGap: 12, columnGap: 8 }}>
                  {m.observations.map(([label, value]) => (
                    <View key={label} style={{ width: 76, alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${label} : ${fmtNote(value)} sur 5`}>
                      <Ring size={58} stroke={7} value={value / 5} color={value >= 4 ? 'sysGreen' : 'sysOrange'}>
                        <ThemedText variant="sub" weight={700}>{fmtNote(value)}</ThemedText>
                      </Ring>
                      <ThemedText variant="cap" color="label2" style={{ textAlign: 'center', lineHeight: 14 }}>{label}</ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            </Section>
          </>
        ) : null}
        {m.message === null && m.bilan.length === 0 && m.observations.length === 0 ? (
          <ThemedText variant="sub" color="label2" style={{ paddingHorizontal: 32, paddingTop: 22 }}>Le bilan de cette séance n’est pas encore disponible.</ThemedText>
        ) : null}
      </ScrollView>
      <NavBar
        title="Bilan"
        edge={scroll.edge || style !== 'natif'}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
        right={onShare ? <GlassButton glyph="share" accessibilityLabel="Partager" onPress={onShare} /> : undefined}
      />
    </View>
  );
}

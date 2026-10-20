import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import {
  Card, GlassButton, Kicker, List, ListRow, NavBar, Section, SectionFooter, SectionHeader, ThemedText,
  useNavBarHeight, useTheme, type ColorTokens, type IconName,
} from '../../design';
import { Certificate } from './Certificate';
import { LsssChart, WellbeingSpark } from './Curves';
import { lsssDelta, type LsssPoint, type WellbeingPoint } from './logic';

export type FinDocument = {
  key: string;
  title: string;
  subtitle?: string;
  glyph: IconName;
  /** Token de la pastille d'icône (sysIndigo, sysPink, tint, sysOrange). */
  color: keyof ColorTokens;
  onPress: () => void;
};

export type FinDeParcoursViewProps = {
  /** Certificat ; null tant que le bilan final n'est pas réalisé (une carte d'attente prend sa place). */
  certificate: { name: string; detail?: string | null } | null;
  lsss: LsssPoint[];
  wellbeing: WellbeingPoint[];
  loading?: boolean;
  /** « Documents du parcours » (liens sécurisés) ; absent ou vide : section masquée. */
  documents?: readonly FinDocument[];
  onBack: () => void;
  /** Partage du certificat (bouton de la carte et de la barre) ; absent : masqués. */
  onShare?: () => void;
  /** Ouverture du certificat en PDF ; absent : bouton masqué. */
  onPdf?: () => void;
};

/**
 * Z · Fin de parcours : barre « Fin de parcours » (retour, partage), certificat sur papier à double cadre sauge, « La courbe se referme »
 * (courbe LSSS complète et écart depuis le départ), bien-être sur 13 séances, documents du parcours.
 * Vue seulement ; les données viennent de lsss_progression et perma_progression (voir la route).
 */
export function FinDeParcoursView({ certificate, lsss, wellbeing, loading, documents, onBack, onShare, onPdf }: FinDeParcoursViewProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const delta = lsssDelta(lsss);
  const latest = [...lsss].reverse().find((p) => p.moment !== 'BASELINE') ?? lsss[0];
  const docs = documents && documents.length > 0 ? documents : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Chargement" color={colors.tint} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Section>
              {certificate ? (
                <Certificate name={certificate.name} detail={certificate.detail} onShare={onShare} onPdf={onPdf} />
              ) : (
                <Card>
                  <ThemedText variant="headline">Le certificat arrive en fin de parcours</ThemedText>
                  <ThemedText variant="sub" color="label2" style={{ marginTop: 2 }}>
                    Il s’ouvre une fois le bilan final réalisé, à la dernière séance.
                  </ThemedText>
                </Card>
              )}
            </Section>

            <SectionHeader title="La courbe se referme" />
            <Section>
              {lsss.length > 0 ? (
                <Card padding={0}>
                  <View style={{ paddingTop: 12, paddingHorizontal: 12, paddingBottom: 6 }}>
                    <View style={{ paddingTop: 2, paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ThemedText variant="largetitle" style={{ lineHeight: 36 }}>{String(Math.round(latest.value))}</ThemedText>
                      {delta != null ? (
                        <ThemedText variant="headline" color="ok">{`${delta >= 0 ? '+' : ''}${delta} depuis le départ`}</ThemedText>
                      ) : null}
                    </View>
                    <LsssChart points={lsss} label="Courbe des compétences de vie, du départ au bilan final" />
                  </View>
                </Card>
              ) : (
                <Card>
                  <ThemedText variant="sub" color="label2">La courbe apparaîtra après le premier bilan.</ThemedText>
                </Card>
              )}
            </Section>

            <Section style={{ marginTop: 12 }}>
              <Card>
                <Kicker glyph="pulse">Bien-être · 13 séances</Kicker>
                <View style={{ marginTop: 8 }}>
                  {wellbeing.length > 0 ? (
                    <WellbeingSpark points={wellbeing} label="Courbe du bien-être sur les séances" />
                  ) : (
                    <ThemedText variant="sub" color="label2">Le bien-être se dessine séance après séance.</ThemedText>
                  )}
                </View>
              </Card>
            </Section>

            {docs ? (
              <>
                <SectionHeader small title="Documents du parcours" />
                <Section>
                  <List>
                    {docs.map((d) => (
                      <ListRow key={d.key} glyph={d.glyph} iconColor={d.color} title={d.title} subtitle={d.subtitle} onPress={d.onPress} />
                    ))}
                  </List>
                  <SectionFooter>Chaque ouverture passe par un lien sécurisé à durée limitée.</SectionFooter>
                </Section>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
      <NavBar
        title="Fin de parcours"
        edge
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
        right={onShare && certificate ? <GlassButton glyph="share" accessibilityLabel="Partager le certificat" onPress={onShare} /> : undefined}
      />
    </View>
  );
}

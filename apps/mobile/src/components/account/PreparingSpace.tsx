import { Image, ScrollView, View } from 'react-native';
import {
  BRAND_LOGO, Card, GlassButton, GlassSurface, Grid2, Icon, LargeTitle, MutedPreview, NavBar, Section, ThemedText,
  CANVAS, useNavBarHeight, useTheme,
} from '../../design';
import { ChildChip } from './ChildChip';

export type PreparingStep = {
  title: string;
  /** Horodatage ou précision (« Aujourd’hui, 18 h 02 », « Il lit le dossier de … »). */
  sub?: string;
  done: boolean;
};

type Props = {
  /** Prénom réel de l'enfant concerné (jamais une valeur de démo). */
  childName: string;
  /** Étapes dans l'ordre : fiche reçue, confirmée par l'équipe, ouverte par le coach. */
  steps: PreparingStep[];
  /** Nom du programme (« Individuel »…), pour la phrase de pied. Absent : phrase sans programme. */
  programName?: string;
  onSwitchChild?: () => void;
  onBell?: () => void;
};

/** Libellés de la chronologie à partir de données réelles (aucun texte de démo). */
export function buildPreparingSteps(o: {
  childName: string;
  receivedAt?: string;
  confirmedAt?: string;
  coachName?: string;
  coachOpened?: boolean;
}): PreparingStep[] {
  return [
    { title: `Fiche de ${o.childName} reçue`, sub: o.receivedAt, done: true },
    { title: 'Confirmée par l’équipe THRIVE', sub: o.confirmedAt, done: Boolean(o.confirmedAt) },
    {
      title: o.coachName ? `Ouverte par ${o.coachName}` : 'Ouverte par ton coach',
      sub: o.coachName ? `Il lit le dossier de ${o.childName}` : undefined,
      done: Boolean(o.coachOpened),
    },
  ];
}

/**
 * Maquette E · Ton espace se prépare : aperçu atténué de l'espace de l'enfant, feuille flottante en verre avec la
 * chronologie (fiche reçue → confirmée → ouverte par le coach). À afficher tant que l'espace n'est pas validé.
 * Pas encore branché : le dépôt mobile n'expose aucun statut de validation (validation_status) sur l'enfant.
 */
export function PreparingSpace({ childName, steps, programName, onSwitchChild, onBell }: Props) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const foot = programName
    ? `Ton programme ${programName} démarre 1 à 2 semaines après l’appel. En attendant, Maison est déjà ouvert.`
    : 'Ton programme démarre 1 à 2 semaines après l’appel. En attendant, Maison est déjà ouvert.';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} accessibilityLabel="Ton espace se prépare">
      <MutedPreview style={{ flex: 1 }}>
        <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingTop: navH }}>
          <LargeTitle>{childName}</LargeTitle>
          <Section style={{ marginTop: 14 }}><Card style={{ height: 150 }} /></Section>
          <Section style={{ marginTop: 12 }}>
            <Grid2>
              <Card style={{ height: 150 }} />
              <Card style={{ height: 150 }} />
            </Grid2>
          </Section>
          <Section style={{ marginTop: 12 }}><Card style={{ height: 120 }} /></Section>
        </ScrollView>
      </MutedPreview>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, right: 8, bottom: 15 }}>
        <GlassSurface strong heavy radius={46} style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View accessible accessibilityRole="summary" style={{ gap: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors accessible={false} style={{ width: 44, height: 44, borderRadius: 11 }} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="title3" accessibilityRole="header">Ton espace se prépare</ThemedText>
                <ThemedText variant="sub" color="label2">Ouvert par un humain, pas par un algorithme.</ThemedText>
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              {steps.map((s, i) => {
                const last = i === steps.length - 1;
                return (
                  <View key={s.title} style={{ flexDirection: 'row', gap: 12, minHeight: 58 }}>
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <View
                        style={{
                          width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: s.done ? colors.sysGreen : colors.fill,
                        }}
                      >
                        {s.done ? (
                          <Icon name="check" size={16} color={CANVAS.white} strokeWidth={3} />
                        ) : (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tint }} />
                        )}
                      </View>
                      {!last ? <View style={{ flex: 1, width: 2, marginVertical: 3, backgroundColor: colors.sysGreen }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="headline">{s.title}</ThemedText>
                      {s.sub ? <ThemedText variant="sub" color="label2">{s.sub}</ThemedText> : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <ThemedText variant="foot" color="label2" style={{ marginTop: 6 }}>{foot}</ThemedText>
          </View>
        </GlassSurface>
      </View>

      <NavBar
        left={<ChildChip name={childName} onPress={onSwitchChild} />}
        right={<GlassButton glyph="bell" accessibilityLabel="Notifications" onPress={onBell ?? (() => {})} />}
      />
    </View>
  );
}

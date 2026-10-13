import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  GlassButton,
  Icon,
  LargeTitle,
  Section,
  SectionFooter,
  SectionHeader,
  ThemedText,
  useTheme,
} from '../../design';
import type { ProgramPack } from '../../services/programPayments';
import { OffreScreen, StripeMark } from './parts';
import { ProgramCard } from './ProgramCard';
import { PROGRAMS } from './pricing';

export type OffresViewProps = {
  /** Carte Maison (conteneur `MaisonOfferCard`, ou `MaisonOfferCardView` en galerie). */
  maison: ReactNode;
  /** Bloc programmes (Groupe / Individuel / Complet, Stripe, garantie, appel) : drapeau EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP. */
  showPrograms: boolean;
  /** Programme actif du compte (anneau + « Ton programme »). */
  currentPack?: ProgramPack | null;
  /** Mention facultative sous les cartes (visio hors île de Montréal), tant que le prix est à confirmer : absente en prod. */
  visioNote?: string;
  onClose: () => void;
  onOpenProgram: (pack: ProgramPack) => void;
  onBookCall: () => void;
};

/**
 * Y · Offres : Maison en tête, puis (si le drapeau le permet) les trois programmes, le paiement Stripe, la garantie et l'appel.
 * Un seul geste soleil : « Réserver un appel » (émail). Sélection « Ton programme » : marine en Lin, sauge en Veillée.
 */
export function OffresView({ maison, showPrograms, currentPack, visioNote, onClose, onOpenProgram, onBookCall }: OffresViewProps) {
  const { colors } = useTheme();
  return (
    <OffreScreen
      title="Offres"
      collapseTitle
      testID="offres"
      left={<GlassButton glyph="close" accessibilityLabel="Fermer" onPress={onClose} />}
      footer={showPrograms ? <Button variant="accent" glyph="calendar" label="Réserver un appel de 15 min" onPress={onBookCall} /> : undefined}
    >
      <LargeTitle subtitle="Pour ta famille. Prix en dollars canadiens.">Offres</LargeTitle>

      <SectionHeader title="Chaque soir" />
      <Section>{maison}</Section>

      {showPrograms ? (
        <>
          <SectionHeader title="Avec un coach" />
          <Section style={{ gap: 12 }}>
            {PROGRAMS.map((p) => (
              <ProgramCard key={p.pack} program={p} current={currentPack === p.pack} onPress={() => onOpenProgram(p.pack)} />
            ))}
          </Section>

          <Section style={{ marginTop: 12 }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <StripeMark />
                <ThemedText variant="sub" style={{ flex: 1 }}>
                  <ThemedText variant="sub" weight={600}>Paiement des programmes par Stripe.</ThemedText>
                  {' 1ᵉʳ versement à l’inscription, dans l’app ou par lien courriel ; le 2ᵉ à la séance 7.'}
                </ThemedText>
              </View>
            </Card>
          </Section>

          <Section style={{ marginTop: 12 }}>
            <Card style={{ backgroundColor: colors.badgeBg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name="shieldCheck" size={24} color={colors.ok} />
                <ThemedText variant="sub" style={{ flex: 1 }}>
                  <ThemedText variant="sub" weight={600}>Garantie :</ThemedText>
                  {' les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.'}
                </ThemedText>
              </View>
            </Card>
          </Section>

          {/* [À COMPLÉTER : prix de la visio Individuel hors île de Montréal — non fourni] */}
          {visioNote ? <SectionFooter style={{ marginHorizontal: 16, marginTop: 8 }}>{visioNote}</SectionFooter> : null}
        </>
      ) : null}
    </OffreScreen>
  );
}

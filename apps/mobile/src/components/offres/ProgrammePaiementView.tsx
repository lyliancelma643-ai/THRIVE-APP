import { Pressable, View } from 'react-native';
import {
  CANVAS,
  GlassButton,
  Icon,
  List,
  ListRow,
  Section,
  SectionFooter,
  SectionHeader,
  Segmented,
  ThemedText,
  VignetteImage,
  useTheme,
} from '../../design';
import type { ProgramPaymentMode } from '../../services/programPayments';
import { BRAND } from './brand';
import { AmberTag, IconBadge, OffreScreen, PACK_IMAGE, StripeMark } from './parts';
import { formatCentsFr, todayCents, withTaxesCents, type ProgramInfo } from './pricing';

const MODES = [
  { key: 'deux_versements', label: 'En 2 versements' },
  { key: 'une_fois', label: 'En une fois' },
] as const;

export type ProgrammePaiementViewProps = {
  program: ProgramInfo;
  mode: ProgramPaymentMode;
  onModeChange: (m: ProgramPaymentMode) => void;
  /** Vague d'inscription (« Vague d’automne · 8–11 ans » / « 2 inscrits … ») : absente tant qu'aucune donnée réelle n'existe. */
  cohort?: { title: string; detail: string };
  busy?: boolean;
  /** Message d'état sous le bouton (erreur, paiement ouvert…). */
  notice?: string | null;
  onPay: () => void;
  onBack: () => void;
  onShare: () => void;
};

/**
 * Y2 · Programme · paiement. Montants AFFICHÉS HORS TAXES « + tx » (le serveur fait foi : le client n'envoie que
 * { pack, mode }) ; le TTC n'est qu'indicatif. Moyens de paiement traités par Stripe.
 */
export function ProgrammePaiementView({ program, mode, onModeChange, cohort, busy, notice, onPay, onBack, onShare }: ProgrammePaiementViewProps) {
  const { colors } = useTheme();
  const today = todayCents(program, mode);
  const todayTtc = withTaxesCents(today);
  const split = mode === 'deux_versements';
  const payLabel = `Payer ${formatCentsFr(today)} + tx · Apple Pay`;

  const amount = (text: string, strong: boolean) => (
    <ThemedText variant="body" color={strong ? 'label' : 'label2'} numberOfLines={1}>{text}</ThemedText>
  );

  return (
    <OffreScreen
      testID="offres-paiement"
      hero
      bottomSpace={140}
      left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
      right={<GlassButton glyph="share" accessibilityLabel="Partager" onPress={onShare} />}
      footer={
        <View>
          <Pressable
            onPress={onPay}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={payLabel}
            accessibilityState={{ disabled: !!busy, busy: !!busy }}
            style={({ pressed }) => ({
              height: 52, borderRadius: 26, backgroundColor: BRAND.applePay, flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 8, opacity: busy ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            <Icon name="phone" size={19} color={CANVAS.white} />
            <ThemedText variant="headline" style={{ color: CANVAS.white }}>{busy ? '…' : payLabel}</ThemedText>
          </Pressable>
          {notice ? (
            <ThemedText variant="cap" color="label2" accessibilityLiveRegion="polite" style={{ textAlign: 'center', paddingTop: 6, paddingBottom: 2, paddingHorizontal: 8 }}>
              {notice}
            </ThemedText>
          ) : null}
        </View>
      }
    >
      <View style={{ height: 280, backgroundColor: BRAND.packshot, overflow: 'hidden', alignItems: 'center', paddingTop: 40 }}>
        <VignetteImage id={PACK_IMAGE[program.pack]} style={{ width: 250, height: 246 }} accessibilityLabel="" />
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        {program.featured ? <AmberTag label="Programme phare" /> : null}
        <ThemedText variant="title1" accessibilityRole="header" style={{ marginTop: 8 }}>{`THRIVE ${program.name}`}</ThemedText>
        <ThemedText variant="sub" color="label2">{program.summary}</ThemedText>
      </View>

      <Section style={{ marginTop: 14 }}>
        <List>
          {cohort ? <ListRow glyph="people" iconColor="sysIndigo" title={cohort.title} subtitle={cohort.detail} /> : null}
          <ListRow glyph="home" iconColor="sysGreen" title="Maison inclus" subtitle="Pendant tout le programme" />
          <ListRow glyph="sparkles" iconColor="tint" title="Bilan et Mes séances" subtitle="Questionnaires avant / après" />
        </List>
      </Section>

      <SectionHeader small title="Paiement" />
      <Section>
        <Segmented accessibilityLabel="Mode de paiement" options={MODES} value={mode} onChange={onModeChange} />
      </Section>
      <Section style={{ marginTop: 10 }}>
        <List>
          <ListRow
            title="Aujourd’hui"
            subtitle="Remboursable pendant la garantie"
            accessory={amount(`${formatCentsFr(today)} + tx`, true)}
          />
          {split ? (
            <ListRow
              title="À la séance 7"
              subtitle="Prélevé automatiquement"
              accessory={amount(`${formatCentsFr(program.totalCents - today)} + tx`, false)}
            />
          ) : null}
        </List>
        <SectionFooter>{`Aujourd’hui : ${formatCentsFr(todayTtc)} taxes incluses (TPS + TVQ), à titre indicatif.`}</SectionFooter>
      </Section>

      <SectionHeader small title="Moyen de paiement" />
      <Section>
        <List>
          <ListRow
            leading={<IconBadge glyph="phone" bg={BRAND.applePay} ink={CANVAS.white} />}
            leadingInset={60}
            title="Apple Pay"
            subtitle="Traité par Stripe"
            checked
          />
          <ListRow
            leading={<IconBadge glyph="tray" bg={colors.fill} ink={colors.label} />}
            leadingInset={60}
            title="Carte de crédit ou de débit"
            subtitle="Visa, Mastercard, Amex · traité par Stripe"
          />
          <ListRow
            leading={<IconBadge glyph="mail" bg={colors.fill} ink={colors.label} />}
            leadingInset={60}
            title="Recevoir un lien de paiement"
            subtitle="Payer depuis ton ordinateur, par courriel"
          />
        </List>
        <View style={{ paddingTop: 7, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StripeMark size={18} />
          <ThemedText variant="foot" color="label2" style={{ flex: 1 }}>
            {split
              ? 'Paiement sécurisé par Stripe. Le 2ᵉ versement est prélevé sur le même moyen à la séance 7 ; reçu par courriel.'
              : 'Paiement sécurisé par Stripe. Reçu par courriel.'}
          </ThemedText>
        </View>
      </Section>
    </OffreScreen>
  );
}

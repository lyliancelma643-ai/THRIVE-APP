import { Platform, Pressable, View } from 'react-native';
import {
  Button,
  Card,
  GlassButton,
  Icon,
  MascotMedallion,
  Section,
  SectionHeader,
  Tag,
  ThemedText,
  useTheme,
  type IconName,
} from '../../design';
import { OffreScreen, RingCard } from '../offres/parts';

/** Une formule de l'offering (annuel / mensuel) prête à afficher : tout le texte vient du store. */
export type PaywallPlanView = {
  id: string;
  /** « Annuel » / « Mensuel » / « Formule ». */
  name: string;
  /** Montant FACTURÉ (priceString) : l'élément de prix le plus visible (Apple 3.1.2(c)). */
  headline: string;
  /** « par an » / « par mois ». */
  unit: string;
  /** Ligne sous le nom : « soit 24,92 $ par mois » (annuel) ou « 32,50 $ facturés chaque mois ». */
  sub: string;
  /** « −23 % » (annuel seulement). */
  saving: string | null;
  accessibilityLabel: string;
};

export type PaywallTimelineView = { today: string; notice: string; firstPayment: string };

export type PaywallViewProps = {
  /** Essai gratuit déclaré par l'offering : « 1 mois » + dates de la frise ; null = pas d'essai. */
  trial: { periodLabel: string; timeline: PaywallTimelineView } | null;
  /** Ligne sous le « 0 $ » : « Puis 299 $ par an. Annule quand tu veux. » */
  trialLine: string;
  /** Sans essai : prix de la formule choisie en vedette (« 299 $ » / « par an »). */
  noTrialHero: { price: string; period: string } | null;
  plans: readonly PaywallPlanView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Vente possible (formules lues + liens légaux complets). */
  canSell: boolean;
  ctaLabel: string;
  /** « 0 $ aujourd’hui · rien à payer avant le 10 nov. » */
  ctaCaption: string | null;
  busy: 'buy' | 'restore' | null;
  finePrint: string;
  terms?: { onPress: () => void };
  privacy?: { onPress: () => void };
  onBuy: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onClose?: () => void;
};

const STEPS: readonly { glyph: IconName; key: 'today' | 'notice' | 'first'; note: string }[] = [
  { glyph: 'gift', key: 'today', note: '0 $' },
  { glyph: 'bell', key: 'notice', note: 'On te prévient' },
  { glyph: 'star', key: 'first', note: '1er paiement' },
];

function Timeline({ t }: { t: PaywallTimelineView }) {
  const { colors } = useTheme();
  const days = { today: 'Aujourd’hui', notice: t.notice, first: t.firstPayment };
  return (
    <View
      accessible
      accessibilityLabel={`Aujourd’hui 0 $. ${t.notice} : on te prévient. ${t.firstPayment} : premier paiement.`}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
    >
      <View style={{ position: 'absolute', left: '12%', right: '12%', top: 13, height: 3, borderRadius: 2, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ flex: 1, backgroundColor: colors.tint }} />
        <View style={{ flex: 1, backgroundColor: colors.fill }} />
      </View>
      {STEPS.map((s, i) => {
        const on = i === 0;
        return (
          <View key={s.key} style={{ width: '33%', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 34, height: 34, margin: -2, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.tint : colors.fill }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.tint : colors.bgGrouped2 }}>
                <Icon name={s.glyph} size={15} color={on ? colors.tintInk : colors.label2} strokeWidth={2.2} />
              </View>
            </View>
            <ThemedText variant="foot" weight={600}>{days[s.key]}</ThemedText>
            <ThemedText variant="cap" color="label2">{s.note}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function PlanCard({ plan, on, onPress }: { plan: PaywallPlanView; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={plan.accessibilityLabel}>
      <RingCard on={on} padding={0}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
          {on ? (
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={14} color={colors.tintInk} strokeWidth={3} />
            </View>
          ) : (
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.label3 }} />
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText variant="headline">{plan.name}</ThemedText>
              {plan.saving ? <Tag label={plan.saving} tone="tint" /> : null}
            </View>
            <ThemedText variant="foot" color="label2" style={{ marginTop: 2 }}>{plan.sub}</ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {/* Apple 3.1.2(c) : le montant facturé est l'élément de prix le plus visible de la carte. */}
            <ThemedText variant="headline" weight={700} style={{ fontSize: 20, lineHeight: 24 }}>{plan.headline}</ThemedText>
            <ThemedText variant="cap" color="label2">{plan.unit}</ThemedText>
          </View>
        </View>
      </RingCard>
    </Pressable>
  );
}

/**
 * D2 · Paywall de Maison (achat intégré App Store / Google Play UNIQUEMENT). Hiérarchie voulue : le mois gratuit
 * d'abord (« 0 $ » en serif, frise), le prix facturé jamais caché. ANTI-STEERING : aucun renvoi vers un autre moyen
 * de paiement. Vue pure : prix, périodes, essai et dates arrivent en props, lus dans l'offering RevenueCat.
 */
export function PaywallView(p: PaywallViewProps) {
  const { fontsLoaded } = useTheme();
  const serif = fontsLoaded ? 'Fraunces_400Regular' : Platform.select({ ios: 'Times New Roman', default: 'serif' });
  const linkStyle = { textDecorationLine: 'underline' as const };
  return (
    <OffreScreen
      testID="paywall"
      topExtra={2}
      left={p.onClose ? <GlassButton glyph="close" accessibilityLabel="Fermer" onPress={p.onClose} /> : undefined}
      right={
        <View testID="paywall-restore">
          <GlassButton label="Restaurer" accessibilityLabel="Restaurer les achats" onPress={p.onRestore} disabled={p.busy !== null} />
        </View>
      }
      footer={
        p.canSell ? (
          <View>
            <Button label={p.ctaLabel} onPress={p.onBuy} loading={p.busy === 'buy'} disabled={p.busy !== null} />
            {p.ctaCaption ? (
              <ThemedText variant="cap" color="label2" style={{ textAlign: 'center', paddingTop: 6, paddingBottom: 2 }}>{p.ctaCaption}</ThemedText>
            ) : null}
          </View>
        ) : undefined
      }
      footerLift={-4}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24 }}>
        <MascotMedallion size={76} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="foot" color="label2" weight={700} accessibilityRole="header" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>THRIVE Maison</ThemedText>
          <ThemedText variant="headline">Le moment qui compte, 10 min par soir</ThemedText>
        </View>
      </View>

      {p.trial ? (
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View
            accessible
            accessibilityLabel={`0 $ par mois, pendant ${p.trial.periodLabel}`}
            style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}
          >
            <ThemedText style={{ fontFamily: serif, fontSize: 58, lineHeight: 58, letterSpacing: -0.5 }}>0 $</ThemedText>
            <ThemedText color="label2" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, lineHeight: 19 }}>
              {`par mois, pendant ${p.trial.periodLabel}`}
            </ThemedText>
          </View>
          {/* Conformité (revue G1) : le montant facturé reste lisible juste sous le « 0 $ » (≥ taille de l'italique, contraste label). */}
          <ThemedText style={{ textAlign: 'center', fontSize: 19, lineHeight: 24, marginTop: 6, paddingHorizontal: 24 }}>{p.trialLine}</ThemedText>
        </View>
      ) : p.noTrialHero ? (
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ThemedText style={{ fontFamily: serif, fontSize: 48, lineHeight: 52 }}>{p.noTrialHero.price}</ThemedText>
            <ThemedText color="label2" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, lineHeight: 24 }}>{p.noTrialHero.period}</ThemedText>
          </View>
        </View>
      ) : null}

      {p.trial ? (
        <Section style={{ marginTop: 16 }}>
          <Card padding={0}>
            <View style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
              <Timeline t={p.trial.timeline} />
            </View>
          </Card>
        </Section>
      ) : null}

      {!p.canSell ? (
        <Section style={{ marginTop: 16, gap: 12 }}>
          <ThemedText variant="body">L’abonnement n’est pas disponible pour le moment. Réessaie plus tard.</ThemedText>
          <Button size="md" variant="gray" label="Réessayer" onPress={p.onRetry} />
        </Section>
      ) : (
        <>
          <SectionHeader small title={p.trial ? 'Après le mois gratuit' : 'Choisis ta formule'} />
          <Section>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {p.plans.map((pl) => (
                <PlanCard key={pl.id} plan={pl} on={pl.id === p.selectedId} onPress={() => p.onSelect(pl.id)} />
              ))}
            </View>
          </Section>
          <ThemedText variant="cap" color="label2" style={{ textAlign: 'center', marginTop: 10, marginHorizontal: 24 }}>
            {p.finePrint}
            {p.terms ? <>{' '}<ThemedText variant="cap" color="label2" style={linkStyle} accessibilityRole="link" accessibilityLabel="Conditions d’utilisation (EULA)" onPress={p.terms.onPress}>Conditions</ThemedText></> : null}
            {p.terms && p.privacy ? ' · ' : null}
            {p.privacy ? <ThemedText variant="cap" color="label2" style={linkStyle} accessibilityRole="link" accessibilityLabel="Politique de confidentialité" onPress={p.privacy.onPress}>Confidentialité</ThemedText> : null}
          </ThemedText>
        </>
      )}
    </OffreScreen>
  );
}

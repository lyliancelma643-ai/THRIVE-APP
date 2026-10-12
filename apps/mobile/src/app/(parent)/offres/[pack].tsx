import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, ThemedText, VignetteImage, useTheme } from '../../../design';
import { Card } from '../../../components/offres/Card';
import { Frame } from '../../../components/offres/Frame';
import { Primary } from '../../../components/offres/Primary';
import { Segmented } from '../../../components/offres/Segmented';
import {
  formatCentsFr,
  programByPack,
  todayCents,
  withTaxesCents,
} from '../../../components/offres/pricing';
import { OFFRES_PROGRAMMES_IN_APP } from '../../../lib/offresFlags';
import { startProgramCheckout, type ProgramPaymentMode } from '../../../services/programPayments';

// Y2 — Programme · paiement. Le montant affiché est indicatif : le client envoie
// seulement { pack, mode } ; le serveur décide du montant et des taxes.
const MODES = [
  { key: 'deux_versements', label: 'En 2 versements' },
  { key: 'une_fois', label: 'En une fois' },
] as const;

export default function ProgrammePaiementScreen() {
  const { pack } = useLocalSearchParams<{ pack: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<ProgramPaymentMode>('deux_versements');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const program = programByPack(pack);
  if (!OFFRES_PROGRAMMES_IN_APP || !program) return <Redirect href="/(parent)/offres" />;

  const today = todayCents(program, mode);
  const todayTtc = withTaxesCents(today);
  const split = mode === 'deux_versements';

  const pay = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await startProgramCheckout(program.pack, mode);
      if (r.status === 'paid') {
        router.replace('/(parent)/maison');
      } else if (r.status === 'error') {
        setNotice(r.message);
      } else if (r.status === 'opened') {
        setNotice('Une fois le paiement terminé, ton accès s’ouvre automatiquement.');
      } else if (r.status === 'disabled') {
        setNotice('Le paiement n’est pas disponible pour le moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  const line = (title: string, detail: string, amount: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: SPACING.rowMin, gap: SPACING.space3 }}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">{title}</ThemedText>
        <ThemedText variant="subheadline" color="label2">{detail}</ThemedText>
      </View>
      <ThemedText variant="body">{amount}</ThemedText>
    </View>
  );

  const method = (icon: keyof typeof Ionicons.glyphMap, title: string, detail: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: SPACING.rowMin, gap: SPACING.space3 }}>
      <Ionicons name={icon} size={22} color={colors.label} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">{title}</ThemedText>
        <ThemedText variant="subheadline" color="label2">{detail}</ThemedText>
      </View>
    </View>
  );

  return (
    <Frame
      title={`THRIVE ${program.name}`}
      subtitle={program.description}
      footer={
        <View style={{ gap: SPACING.space1 }}>
          <Primary tone="dark" busy={busy} label={`Payer ${formatCentsFr(today)} + tx · Apple Pay`} onPress={pay} />
          {notice ? (
            <ThemedText variant="footnote" color="label2" accessibilityLiveRegion="polite" style={{ textAlign: 'center', padding: SPACING.space2 }}>
              {notice}
            </ThemedText>
          ) : null}
        </View>
      }
    >
      <View style={{ alignItems: 'center' }}>
        <VignetteImage id={program.pack === 'groupe' ? 'BON-01' : program.pack === 'individuel' ? 'ACT-0101' : 'ACT-0801'} style={{ width: 160, height: 160, borderRadius: 32 }} accessibilityLabel="" />
      </View>

      <ThemedText variant="title3" accessibilityRole="header">Paiement</ThemedText>
      <Segmented label="Mode de paiement" options={MODES} value={mode} onChange={setMode} />

      <Card>
        {split ? (
          <>
            {line('Aujourd’hui', 'Remboursable pendant la garantie', `${formatCentsFr(today)} + tx`)}
            {line('À la séance 7', '2ᵉ versement, réglé avec le même moyen de paiement ; tu reçois un avis avant.', `${formatCentsFr(program.totalCents - today)} + tx`)}
          </>
        ) : (
          line('Aujourd’hui', 'Remboursable pendant la garantie', `${formatCentsFr(today)} + tx`)
        )}
        <ThemedText variant="footnote" color="label2">
          {`Soit ${formatCentsFr(todayTtc)} taxes incluses (TPS + TVQ), à titre indicatif : le montant exact figure au paiement.`}
        </ThemedText>
      </Card>

      <ThemedText variant="title3" accessibilityRole="header">Moyen de paiement</ThemedText>
      <Card>
        {method('logo-apple', 'Apple Pay', 'Traité par Stripe')}
        {method('card-outline', 'Carte de crédit ou de débit', 'Visa, Mastercard, Amex · traité par Stripe')}
        {method('mail-outline', 'Recevoir un lien de paiement', 'Payer depuis ton ordinateur, par courriel')}
      </Card>
      <ThemedText variant="footnote" color="label2">
        {'Paiement sécurisé par Stripe. Reçu par courriel.'}
      </ThemedText>
    </Frame>
  );
}

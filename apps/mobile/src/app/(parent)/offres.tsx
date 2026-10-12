import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, ThemedText, useTheme } from '../../design';
import { Card } from '../../components/offres/Card';
import { Frame } from '../../components/offres/Frame';
import { MaisonOfferCard } from '../../components/offres/MaisonOfferCard';
import { Primary } from '../../components/offres/Primary';
import { ProgramCard } from '../../components/offres/ProgramCard';
import { PROGRAMS } from '../../components/offres/pricing';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';
import { useSubscriptionStore } from '../../stores/subscription.store';

// Y — Offres. Maison toujours en tête (achat intégré, prix lus de l'offering).
// Le bloc programmes (Groupe / Individuel / Complet, paiement Stripe, garantie, appel)
// n'est rendu que si EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP est vrai (GO 3, §7-R1).
export default function OffresScreen() {
  const { colors } = useTheme();
  const sourceMaison = useSubscriptionStore((s) => s.access?.sourceMaison);
  const includedWithProgram = sourceMaison === 'pack';

  const footer = OFFRES_PROGRAMMES_IN_APP ? (
    <Primary label="Réserver un appel de 15 min" onPress={() => router.push('/(parent)/appel')} />
  ) : undefined;

  return (
    <Frame title="Offres" subtitle="Pour ta famille. Prix en dollars canadiens." footer={footer}>
      <ThemedText variant="title3" accessibilityRole="header">Chaque soir</ThemedText>
      <MaisonOfferCard included={includedWithProgram} />

      {OFFRES_PROGRAMMES_IN_APP ? (
        <>
          <ThemedText variant="title3" accessibilityRole="header">Avec un coach</ThemedText>
          <View style={{ gap: SPACING.space3 }}>
            {PROGRAMS.map((p) => (
              <ProgramCard key={p.pack} program={p} />
            ))}
          </View>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
            <Ionicons name="card-outline" size={26} color={colors.tint} />
            <ThemedText variant="subheadline" style={{ flex: 1 }}>
              {'Paiement des programmes par Stripe. 1er versement à l’inscription, dans l’app ou par lien courriel ; le 2ᵉ à la séance 7.'}
            </ThemedText>
          </Card>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
            <Ionicons name="shield-checkmark-outline" size={26} color={colors.ok} />
            <ThemedText variant="subheadline" style={{ flex: 1 }}>
              {'Garantie : les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.'}
            </ThemedText>
          </Card>
          {/* [À COMPLÉTER : prix de la visio Individuel hors île de Montréal — non fourni] */}
        </>
      ) : null}
    </Frame>
  );
}

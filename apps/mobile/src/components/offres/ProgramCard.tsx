import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Pill, SPACING, ThemedText, VignetteImage } from '../../design';
import { Card } from './Card';
import { formatCentsShortFr, type ProgramInfo } from './pricing';

// Image d'illustration par pack : identifiants de vignettes existants (resolveVignetteId gère le repli).
const PACK_IMAGE: Record<ProgramInfo['pack'], string> = {
  groupe: 'BON-01',
  individuel: 'ACT-0101',
  complet: 'ACT-0801',
};

export function ProgramCard({ program, current }: { program: ProgramInfo; current?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(parent)/offres/[pack]', params: { pack: program.pack } })}
      accessibilityRole="button"
      accessibilityLabel={`THRIVE ${program.name}, ${formatCentsShortFr(program.totalCents)} plus taxes. Voir le paiement.`}
    >
      <Card>
        <View style={{ flexDirection: 'row', gap: SPACING.space3, alignItems: 'center' }}>
          <VignetteImage id={PACK_IMAGE[program.pack]} style={{ width: 64, height: 64, borderRadius: 18 }} accessibilityLabel="" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <ThemedText variant="title3">{`THRIVE ${program.name}`}</ThemedText>
              <ThemedText variant="headline">
                {formatCentsShortFr(program.totalCents)}
                <ThemedText variant="footnote" color="label2">{' + tx'}</ThemedText>
              </ThemedText>
            </View>
            <ThemedText variant="footnote" color="label2">{program.tagline}</ThemedText>
          </View>
        </View>
        <ThemedText variant="subheadline" color="label2">{program.description}</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.space1 }}>
          {program.featured ? <Pill label="Phare" tone="accent" /> : null}
          {current ? <Pill label="Ton programme" tone="tint" /> : null}
          <Pill label="En 2 versements" />
          <Pill label="Maison inclus" />
          <Pill label="Bilan + Mes séances" />
        </View>
      </Card>
    </Pressable>
  );
}

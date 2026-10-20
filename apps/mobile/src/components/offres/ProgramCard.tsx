import { Pressable, View } from 'react-native';
import { ThemedText } from '../../design';
import { AmberTag, PACK_IMAGE, PROPORTIONAL, Packshot, RingCard, SoftTag } from './parts';
import { formatCentsShortFr, type ProgramInfo } from './pricing';

/**
 * Carte de programme de Y : vignette, nom, prix HORS TAXES « + tx », accroche, description et étiquettes.
 * `current` : anneau de sélection + étiquette « Ton programme » (programme actif du compte).
 */
export function ProgramCard({ program, current, onPress }: { program: ProgramInfo; current?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`THRIVE ${program.name}, ${formatCentsShortFr(program.totalCents)} plus taxes${current ? ', ton programme' : ''}. Voir le paiement.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <RingCard on={current}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Packshot id={PACK_IMAGE[program.pack]} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <ThemedText variant="title3" style={{ flexShrink: 1 }}>{`THRIVE ${program.name}`}</ThemedText>
              <ThemedText variant="title2" weight={500} style={{ fontSize: 20, lineHeight: 24, letterSpacing: 0 }}>
                {formatCentsShortFr(program.totalCents)}
                <ThemedText variant="foot" color="label2">{' + tx'}</ThemedText>
              </ThemedText>
            </View>
            <ThemedText variant="foot" color="label2">{program.tagline}</ThemedText>
          </View>
        </View>
        <ThemedText variant="sub" style={[PROPORTIONAL, { marginTop: 10 }]}>{program.description}</ThemedText>
        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {program.featured ? <AmberTag label="Phare" /> : null}
          {current ? <SoftTag label="Ton programme" tone="tint" /> : null}
          <SoftTag label="En 2 versements" />
          <SoftTag label="Maison inclus" />
          <SoftTag label="Bilan + Mes séances" />
        </View>
      </RingCard>
    </Pressable>
  );
}

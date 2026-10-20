import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, useTheme } from '../../design';
import { recordMoment } from '../../hooks/useMaison';
import type { Duration, P3Activity } from '../../lib/p3';

const OUTCOMES = [
  { id: 'ACCROCHE', label: 'Ça a accroché' },
  { id: 'MOYEN', label: 'Moyen' },
  { id: 'PAS_CE_SOIR', label: 'Pas ce soir' },
] as const;

type Props = {
  activity: P3Activity;
  childId: string;
  duration: Duration;
  /** Appelé une fois le moment enregistré. */
  onSaved: () => void;
};

/** « C’est fait ? » : une phrase à garder (facultatif) puis le ressenti. Enregistre via recordMoment. */
export function MomentClose({ activity, childId, duration, onSaved }: Props) {
  const { colors } = useTheme();
  const [keptPhrase, setKeptPhrase] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (outcome: (typeof OUTCOMES)[number]['id']) => {
    if (activity.week === null) return;
    setSaving(true);
    try {
      await recordMoment({ childId, activityId: activity.id, week: activity.week, duration, outcome, keptPhrase });
      onSaved();
    } catch {
      Alert.alert('Enregistrement impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <ThemedText variant="footnote" color="label2" style={{ marginBottom: SPACING.space2 }}>
        Une phrase à garder (facultatif)
      </ThemedText>
      <TextInput
        value={keptPhrase}
        onChangeText={setKeptPhrase}
        placeholder="Ce qu’il ou elle a dit, ce que vous voulez retenir"
        placeholderTextColor={colors.label2}
        maxLength={500}
        multiline
        accessibilityLabel="Une phrase à garder, facultatif"
        style={{
          backgroundColor: colors.bgGrouped2, color: colors.label, borderRadius: RADIUS.tile, minHeight: 72,
          padding: SPACING.space4, fontSize: 17, textAlignVertical: 'top', marginBottom: SPACING.space5,
        }}
      />
      <ThemedText variant="footnote" color="label2" style={{ marginBottom: SPACING.space2 }}>
        C’est fait ? Comment ça s’est passé
      </ThemedText>
      {saving ? (
        <ActivityIndicator accessibilityLabel="Enregistrement en cours" />
      ) : (
        OUTCOMES.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => save(o.id)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            style={({ pressed }) => ({
              minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.space2,
              backgroundColor: o.id === 'ACCROCHE' ? colors.accent : colors.bgGrouped2, opacity: pressed ? 0.75 : 1,
            })}
          >
            <ThemedText variant="headline" style={{ color: o.id === 'ACCROCHE' ? colors.accentInk : colors.label }}>
              {o.label}
            </ThemedText>
          </Pressable>
        ))
      )}
    </View>
  );
}

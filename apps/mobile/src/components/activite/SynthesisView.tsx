import { Pressable, TextInput, View } from 'react-native';
import { Button, Icon, ThemedText, resolveTextStyle, useTheme } from '../../design';
import { SYNTHESIS, type P3Outcome } from '../../lib/p3';
import { Eyebrow, Frame, Ghost, NO_FOCUS_RING, type Chrome } from './parts';

type Props = {
  chrome: Chrome;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  outcome: P3Outcome | null;
  kept: string;
  saving: boolean;
  onRating: (r: 1 | 2 | 3 | 4 | 5 | null) => void;
  onOutcome: (o: P3Outcome | null) => void;
  onKept: (t: string) => void;
  /** « Garder ce moment » (false) ou « Passer » (true : le temps joué compte, rien d'autre n'est gardé). */
  onSave: (skipped: boolean) => void;
};

/**
 * M11 · Synthèse facultative : une note pour le parent (étoiles sauge, jamais un score affiché à l'enfant),
 * « Ça a donné quoi ? », une phrase à garder. « Passer » est toujours là.
 */
export function SynthesisView({ chrome, rating, outcome, kept, saving, onRating, onOutcome, onKept, onSave }: Props) {
  const { colors, fontsLoaded } = useTheme();
  return (
    <Frame
      chrome={chrome}
      cta={
        <>
          <Button size="xl" variant="accent" label="Garder ce moment" flex loading={saving} onPress={() => onSave(false)} />
          <Ghost label={SYNTHESIS.skip} onPress={() => onSave(true)} accessibilityLabel="Passer la synthèse" />
        </>
      }
    >
      <Eyebrow>{SYNTHESIS.rating}</Eyebrow>
      <View style={{ marginTop: 10, flexDirection: 'row', gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel={SYNTHESIS.rating}>
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const on = rating !== null && n <= rating;
          return (
            <Pressable
              key={n}
              onPress={() => onRating(rating === n ? null : n)}
              accessibilityRole="radio"
              accessibilityLabel={`${n} sur 5`}
              accessibilityState={{ selected: rating === n }}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="star" size={32} color={on ? colors.sage : colors.label3} filled={on} strokeWidth={on ? 2.6 : 1.6} />
            </Pressable>
          );
        })}
      </View>

      <Eyebrow style={{ marginTop: 30 }}>{SYNTHESIS.outcome.question}</Eyebrow>
      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SYNTHESIS.outcome.options.map((o) => {
          const on = outcome === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onOutcome(on ? null : (o.id as P3Outcome))}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({
                minHeight: 52, paddingHorizontal: 14, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? colors.cream : colors.fill4, borderWidth: on ? 0 : 1, borderColor: colors.separator, opacity: pressed ? 0.8 : 1,
              })}
            >
              <ThemedText variant="callout" weight={500} style={{ fontSize: 16, color: on ? colors.navy900 : colors.label }}>{o.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Eyebrow style={{ marginTop: 30 }}>{SYNTHESIS.kept}</Eyebrow>
      <TextInput
        value={kept}
        onChangeText={onKept}
        multiline
        maxLength={500}
        accessibilityLabel={SYNTHESIS.kept}
        placeholder="Ce qu’il ou elle a dit, ce que vous voulez retenir"
        placeholderTextColor={colors.label3}
        selectionColor={colors.tintText}
        style={[
          resolveTextStyle('body', fontsLoaded),
          { marginTop: 14, minHeight: 78, padding: 16, borderRadius: 20, color: colors.label, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator, textAlignVertical: 'top' },
          NO_FOCUS_RING,
        ]}
      />
    </Frame>
  );
}

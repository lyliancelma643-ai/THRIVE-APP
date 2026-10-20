import { useMemo } from 'react';
import { View } from 'react-native';
import { Sheet, ThemedText, SPACING } from '../../design';
import type { P3Activity } from '../../lib/p3';

/** « Les sources de la méthode » : les références citées par les fiches, sans doublon. */
export function SourcesSheet({ visible, onClose, pool }: { visible: boolean; onClose: () => void; pool: P3Activity[] }) {
  const sources = useMemo(() => {
    const seen = new Map<string, 'A' | 'B' | 'C'>();
    for (const a of pool) for (const s of a.sources) if (!seen.has(s.citation)) seen.set(s.citation, s.level);
    return [...seen.entries()].sort((x, y) => x[0].localeCompare(y[0], 'fr'));
  }, [pool]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Les sources de la méthode" detent="large" scroll>
      <ThemedText variant="foot" color="label2" style={{ marginBottom: SPACING.space3 }}>
        Chaque fiche s’appuie sur des travaux publiés. Niveau A : étude solide ; B : appui plus partiel ; C : pratique courante.
      </ThemedText>
      {sources.map(([citation, level]) => (
        <View key={citation} style={{ marginBottom: SPACING.space3 }}>
          <ThemedText variant="sub">{citation}</ThemedText>
          <ThemedText variant="foot" color="label2">{`Niveau ${level}`}</ThemedText>
        </View>
      ))}
    </Sheet>
  );
}

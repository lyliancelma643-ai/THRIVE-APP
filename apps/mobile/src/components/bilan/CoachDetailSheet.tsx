import React from 'react';
import { View } from 'react-native';
import { List, ListRow, Sheet, Tag, ThemedText } from '../../design';
import type { DocRow, NextStepRow, PassportCard } from './bilanApi';

// Détail d'une rangée « travail du coach » du Bilan (G) : objectif SMART, boîte à outils, prochaines étapes, documents.
// Lecture seule (le coach les écrit, le parent les lit).

export type CoachDetailKind = 'smart' | 'toolbox' | 'steps' | 'docs';

const TITLE: Record<CoachDetailKind, string> = {
  smart: 'Objectif SMART',
  toolbox: 'Boîte à outils',
  steps: 'Prochaines étapes',
  docs: 'Documents',
};
const STEP_LABEL = { todo: 'À faire', doing: 'En cours', done: 'Faite' } as const;

type Props = {
  kind: CoachDetailKind | null;
  onClose: () => void;
  card: PassportCard | null;
  steps: NextStepRow[];
  docs: DocRow[];
  onOpenDoc: (d: DocRow) => void;
};

export function CoachDetailSheet({ kind, onClose, card, steps, docs, onOpenDoc }: Props) {
  const empty = <ThemedText variant="sub" color="label2">Votre coach le complétera.</ThemedText>;
  return (
    <Sheet visible={!!kind} onClose={onClose} title={kind ? TITLE[kind] : ''} detent="medium">
      {kind === 'smart' ? (
        card?.smartGoal ? <ThemedText variant="body">{card.smartGoal}</ThemedText> : empty
      ) : kind === 'toolbox' ? (
        card && card.toolbox.length ? (
          <List>
            {card.toolbox.map((t) => <ListRow key={t.tool} title={t.tool} subtitle={t.context ?? undefined} />)}
          </List>
        ) : empty
      ) : kind === 'steps' ? (
        steps.length ? (
          <List>
            {steps.map((s) => (
              <ListRow key={s.id} title={s.label} accessory={<Tag tone={s.status === 'done' ? 'ok' : s.status === 'doing' ? 'tint' : 'gray'} label={STEP_LABEL[s.status]} />} />
            ))}
          </List>
        ) : empty
      ) : kind === 'docs' ? (
        docs.length ? (
          <List>
            {docs.map((d) => <ListRow key={d.id} glyph="document" iconColor="sysIndigo" title={d.title} onPress={() => onOpenDoc(d)} />)}
          </List>
        ) : empty
      ) : <View />}
    </Sheet>
  );
}

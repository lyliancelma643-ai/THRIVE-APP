'use client';

// Une page = un temps de séance = exactement 5 blocs, empilés.
// Un bloc dont la source ne porte rien disparaît proprement — jamais de
// placeholder inventé.
import { useState } from 'react';
import type { FieldModePage as Page } from '@/lib/field-mode/types';
import type { SectionTimer } from '@/hooks/useSessionDraft';
import { BlockChecklist } from './BlockChecklist';
import { BlockFreeNote } from './BlockFreeNote';
import { BlockHeaderTimer } from './BlockHeaderTimer';
import { BlockKeyPhrase } from './BlockKeyPhrase';
import { BlockObservationGrid } from './BlockObservationGrid';
import { DetailSheet } from './DetailSheet';
import { ImportantBanner } from './ImportantBanner';

export function FieldModePage({
  page,
  checks,
  ratings,
  fields,
  timer,
  onToggleCheck,
  onRate,
  onField,
  onTimer,
}: {
  page: Page;
  checks: Record<string, boolean>;
  ratings: Record<string, number>;
  fields: Record<string, string>;
  timer: SectionTimer | undefined;
  onToggleCheck: (key: string) => void;
  onRate: (key: string, value: number) => void;
  onField: (key: string, value: string) => void;
  onTimer: (next: SectionTimer) => void;
}) {
  const [detail, setDetail] = useState(false);

  return (
    <>
      {/* Espacement généreux : ≥ 24 px entre les blocs. L'air est une fonctionnalité. */}
      <div className="space-y-6">
        {/* BLOC 1 */}
        <BlockHeaderTimer
          title={page.title}
          durationMin={page.durationMin}
          timer={timer}
          onChange={onTimer}
        />

        {/* Surcouche contextuelle — pas un 6ᵉ bloc */}
        <ImportantBanner items={page.important} />

        {/* BLOC 2 */}
        <BlockKeyPhrase phrase={page.keyPhrase} onDetail={() => setDetail(true)} />

        {/* BLOC 3 */}
        <BlockChecklist
          items={page.checklist}
          checks={checks}
          onToggle={onToggleCheck}
          onSeeAll={() => setDetail(true)}
        />

        {/* BLOC 4 — dominant */}
        <BlockObservationGrid indicators={page.indicators} ratings={ratings} onRate={onRate} />

        {/* BLOC 5 */}
        <BlockFreeNote notes={page.notes} fields={fields} onChange={onField} />

        {/* Une page sans phrase-clé n'offrirait aucun accès au contenu source. */}
        {!page.keyPhrase && page.detail.length > 0 && (
          <button
            type="button"
            onClick={() => setDetail(true)}
            className="w-full min-h-[56px] rounded-2xl text-[17px] font-bold"
            style={{ color: 'var(--fm-dim)', border: '2px dashed var(--fm-border)' }}
          >
            Voir le détail
          </button>
        )}
      </div>

      {detail && (
        <DetailSheet title={page.title} blocks={page.detail} onClose={() => setDetail(false)} />
      )}
    </>
  );
}

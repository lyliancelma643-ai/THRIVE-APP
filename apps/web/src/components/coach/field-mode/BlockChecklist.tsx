'use client';

// BLOC 3 — Les cases à cocher.
//
// 5 items visibles au maximum ; les suivants ne sont pas supprimés, ils sont
// consultables via « Voir tout » dans la feuille de détail. L'ordre est celui
// du contenu source : la méthode ne porte pas d'indication de priorité, on ne
// la réinvente pas.
import type { FieldModeCheckItem } from '@/lib/field-mode/types';
import { MAX_VISIBLE_CHECKS } from '@/lib/field-mode/build';
import { tap } from './haptics';

export function BlockChecklist({
  items,
  checks,
  onToggle,
  onSeeAll,
}: {
  items: FieldModeCheckItem[];
  checks: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSeeAll: () => void;
}) {
  if (items.length === 0) return null;
  const visible = items.slice(0, MAX_VISIBLE_CHECKS);
  const hidden = items.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((item) => {
        const on = !!checks[item.key];
        return (
          <button
            key={item.key}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => {
              tap();
              onToggle(item.key);
            }}
            className="w-full min-h-[56px] px-4 py-3 rounded-2xl flex items-center gap-3 text-left transition-colors duration-150"
            style={{
              background: on ? 'var(--fm-accent)' : 'var(--fm-surface)',
              color: on ? 'var(--fm-on-accent)' : 'var(--fm-text)',
              border: `2px solid ${on ? 'var(--fm-accent)' : 'var(--fm-border)'}`,
            }}
          >
            {/* Forme + glyphe, jamais la couleur seule. */}
            <span
              aria-hidden
              className="shrink-0 w-8 h-8 grid place-items-center text-[19px] font-bold"
              style={{
                borderRadius: on ? '0.6rem' : '9999px',
                border: `2.5px solid ${on ? 'var(--fm-on-accent)' : 'var(--fm-border)'}`,
              }}
            >
              {on ? '✓' : ''}
            </span>
            <span className="flex-1 text-[17px] font-semibold leading-snug">{item.label}</span>
          </button>
        );
      })}

      {hidden > 0 && (
        <button
          type="button"
          onClick={onSeeAll}
          className="w-full min-h-[56px] rounded-2xl text-[17px] font-bold"
          style={{ color: 'var(--fm-dim)', border: '2px dashed var(--fm-border)' }}
        >
          Voir tout ({hidden} de plus)
        </button>
      )}
    </div>
  );
}

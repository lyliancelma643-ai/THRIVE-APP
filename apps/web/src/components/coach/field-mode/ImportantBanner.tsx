'use client';

// Bandeau « Important » — surcouche contextuelle, pas un 6ᵉ bloc.
//
// N'apparaît que si la section porte une règle spéciale dans le contenu source.
// Contenu strictement verbatim : aucune paraphrase, aucun résumé.
import { useState } from 'react';
import { tap } from './haptics';

export function ImportantBanner({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--fm-surface-2)', border: '2px solid var(--fm-accent)' }}
    >
      <button
        type="button"
        onClick={() => {
          tap();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left"
      >
        <span
          className="shrink-0 px-2.5 py-1 rounded-lg text-[15px] font-bold"
          style={{ background: 'var(--fm-accent)', color: 'var(--fm-on-accent)' }}
        >
          Important
        </span>
        <span
          className="flex-1 text-[17px] font-semibold truncate"
          style={{ color: 'var(--fm-text)' }}
        >
          {open ? 'Masquer' : items[0]}
        </span>
        <span aria-hidden className="text-[17px]" style={{ color: 'var(--fm-dim)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((text, i) => (
            <p key={i} className="text-[17px] leading-relaxed" style={{ color: 'var(--fm-text)' }}>
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

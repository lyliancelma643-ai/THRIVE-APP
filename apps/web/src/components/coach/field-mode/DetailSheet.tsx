'use client';

// Feuille de détail — le contenu source du temps, intégral et verbatim.
//
// Tout ce que la page replie (phrase longue, items au-delà de 5, textes de
// méthode) reste ici. Rien n'est perdu : c'est le même contenu, seulement
// déplacé d'un tap.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScriptBlock } from '@/lib/session-scripts';
import { unescapeMarkdown } from '@/lib/field-mode/build';

export function DetailSheet({
  title,
  blocks,
  onClose,
}: {
  title: string;
  blocks: ScriptBlock[];
  onClose: () => void;
}) {
  // Portée sur <body> : imbriquée, la feuille héritait d'un décalage de son
  // conteneur et ne couvrait pas tout l'écran.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col"
      style={{ background: 'var(--fm-bg)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Détail — ${title}`}
    >
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 safe-top"
        style={{ borderBottom: '1px solid var(--fm-border)' }}
      >
        <h2 className="flex-1 text-[20px] font-bold leading-snug" style={{ color: 'var(--fm-text)' }}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[56px] min-h-[56px] rounded-2xl text-[17px] font-bold"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
        >
          Fermer
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 safe-bottom">
        {blocks.map((b, i) => (
          <DetailBlock key={i} block={b} />
        ))}
      </div>
    </div>,
    document.body
  );
}

function DetailBlock({ block }: { block: ScriptBlock }) {
  switch (block.t) {
    case 'section':
      return (
        <h3
          className={`font-display font-bold pt-2 ${block.level === 2 ? 'text-[22px]' : 'text-[19px]'}`}
          style={{ color: 'var(--fm-text)' }}
        >
          {unescapeMarkdown(block.title)}
        </h3>
      );
    case 'callout':
      return (
        <p
          className="p-4 rounded-2xl text-[17px] leading-relaxed"
          style={{
            background: 'var(--fm-surface-2)',
            color: 'var(--fm-text)',
            borderLeft: block.icon === '⚠️' ? '5px solid var(--fm-accent)' : '5px solid var(--fm-ok)',
          }}
        >
          {block.icon} {unescapeMarkdown(block.text)}
        </p>
      );
    case 'verbatim':
      return (
        <p
          className="p-4 rounded-2xl text-[19px] font-semibold leading-relaxed"
          style={{
            background: 'var(--fm-surface)',
            color: 'var(--fm-text)',
            borderLeft: '5px solid var(--fm-accent)',
          }}
        >
          « {unescapeMarkdown(block.text)} »
        </p>
      );
    case 'checklist':
    case 'chips':
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="px-4 py-3 rounded-xl text-[17px] leading-snug"
              style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
            >
              {unescapeMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    case 'grid':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="text-[17px]" style={{ color: 'var(--fm-dim)' }}>
              · {unescapeMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    case 'field':
      return (
        <p className="text-[17px] font-bold" style={{ color: 'var(--fm-dim)' }}>
          ✏️ {unescapeMarkdown(block.label)}
          {block.hint ? ` ${unescapeMarkdown(block.hint)}` : ''}
        </p>
      );
    default:
      return (
        <p
          className="text-[17px] leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--fm-text)' }}
        >
          {unescapeMarkdown(block.text)}
        </p>
      );
  }
}

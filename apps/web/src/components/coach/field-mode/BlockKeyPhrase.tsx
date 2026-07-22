'use client';

// BLOC 2 — La phrase-clé.
//
// Le texte affiché vient tel quel du contenu source (verbatim du coach, ou la
// formulation la plus courte qui porte l'intention). Il est replié à 2 lignes ;
// rien n'est tronqué dans la donnée — « Voir le détail » rouvre l'intégralité.
import type { FieldModeKeyPhrase } from '@/lib/field-mode/types';

export function BlockKeyPhrase({
  phrase,
  onDetail,
}: {
  phrase: FieldModeKeyPhrase | null;
  onDetail: () => void;
}) {
  if (!phrase) return null;
  const spoken = phrase.source === 'verbatim' || phrase.source === 'megaphone';

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--fm-surface)',
        borderLeft: '5px solid var(--fm-accent)',
      }}
    >
      {spoken && (
        <span
          className="block text-[15px] font-bold uppercase tracking-wide mb-1"
          style={{ color: 'var(--fm-dim)' }}
        >
          À dire
        </span>
      )}
      <p
        className="text-[20px] sm:text-[22px] font-semibold leading-snug line-clamp-2"
        style={{ color: 'var(--fm-text)' }}
      >
        {spoken ? `« ${phrase.text} »` : phrase.text}
      </p>
      <button
        type="button"
        onClick={onDetail}
        className="mt-2 min-h-[56px] -mb-2 text-[17px] font-bold underline underline-offset-4"
        style={{ color: 'var(--fm-dim)' }}
      >
        Voir le détail
      </button>
    </div>
  );
}

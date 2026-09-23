import { Fragment } from 'react';

// Rend le seul markdown inline présent dans les fiches : **gras**. Le texte
// reste celui du contenu (R1) — on ne fait que le mettre en forme.
export function InlineMd({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </span>
  );
}

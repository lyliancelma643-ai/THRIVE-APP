import { Fragment } from 'react';

/**
 * Typographie française : l'espace avant ? ! : ; » et après « devient
 * insécable, pour qu'un signe ne se retrouve jamais seul en début de ligne.
 */
export function frTypo(text: string): string {
  return text.replace(/«\s+/g, '«\u00a0').replace(/\s+([?!:;»])/g, '\u00a0$1');
}

// Rend le seul markdown inline présent dans les fiches : **gras**. Le texte
// reste celui du contenu (R1) — on ne fait que le mettre en forme.
export function InlineMd({ text, className }: { text: string; className?: string }) {
  const parts = frTypo(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
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

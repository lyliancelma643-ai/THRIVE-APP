import { Fragment } from 'react';

// Rendu du markdown inline du fichier maître : **gras**, *italique*, retours à
// la ligne. Rien d'autre n'existe dans les champs de carte. L'apostrophe droite
// est rendue typographique (’) — pure mise en forme, le texte ne change pas.
export function InlineMd({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/'/g, '’').split('\n');
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, pi) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return (
                <strong key={pi} className="font-semibold text-night-ink">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return <em key={pi}>{part.slice(1, -1)}</em>;
            }
            return <Fragment key={pi}>{part}</Fragment>;
          })}
        </Fragment>
      ))}
    </span>
  );
}

/** Première lettre en capitale pour les champs qui commencent en minuscule (« qu'il entende… »). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

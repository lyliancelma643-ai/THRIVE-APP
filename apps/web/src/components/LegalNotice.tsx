import { LEGAL_LINKS } from '@/lib/legal';

/** « En créant ton compte, tu acceptes les Conditions… et la Politique… ». */
export function LegalNotice({ action, className = '' }: { action: string; className?: string }) {
  const { terms, privacy } = LEGAL_LINKS;
  if (!terms && !privacy) return null;
  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-semibold">
      {label}
    </a>
  );
  return (
    <p className={`text-[11px] leading-relaxed text-center ${className}`}>
      {action}, tu acceptes{' '}
      {terms && link(terms, 'les conditions d’utilisation')}
      {terms && privacy && ' et '}
      {privacy && (terms ? link(privacy, 'la politique de confidentialité') : <>la {link(privacy, 'politique de confidentialité')}</>)}.
    </p>
  );
}

import Link from 'next/link';
import { Icon } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6 text-center">
<span aria-hidden className="w-16 h-16 mb-5 rounded-2xl bg-navy-600 text-sun grid place-items-center shadow-card">
        <Icon name="compass" className="w-8 h-8" />
      </span>
      <h1 className="font-display text-[28px] font-semibold text-navy-900 mb-2 text-balance">Page introuvable</h1>
      <p className="text-navy-700 mb-6 max-w-sm text-pretty">
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center min-h-[48px] rounded-full bg-navy-600 px-6 text-white font-bold shadow-card hover:bg-navy-700 transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

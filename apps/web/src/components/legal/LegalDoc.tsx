import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { LEGAL_VERSION_DATE } from '@/lib/legal-entity';
import { PRIVACY_PATH, TERMS_PATH } from '@/lib/legal';

// Gabarit des documents légaux publics (/cgu, /confidentialite) : lisible sur
// téléphone, imprimable, accessible sans compte (URL à déclarer aux stores).

export function LegalDoc({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  const date = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${LEGAL_VERSION_DATE}T12:00:00`)
  );
  return (
    <main className="min-h-dvh bg-cream text-navy-900 px-4 py-8 md:py-12">
      <article className="max-w-3xl mx-auto bg-white rounded-3xl shadow-card p-6 md:p-10 leading-relaxed">
        <header className="mb-8">
          <Link href="/login" className="inline-flex items-center gap-3 mb-6" aria-label="THRIVE — retour à la connexion">
            <BrandLogo className="w-10 h-10" />
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">{title}</h1>
          <p className="text-sm text-navy-700 mt-2">En vigueur le {date}</p>
          <div className="mt-4 text-[15px] text-navy-800">{intro}</div>
        </header>
        <div className="space-y-8 text-[15px] text-navy-800">{children}</div>
        <footer className="mt-10 pt-6 border-t border-navy-100 text-sm text-navy-700 flex flex-wrap gap-4">
          <Link href={TERMS_PATH} className="underline underline-offset-2">Conditions d’utilisation</Link>
          <Link href={PRIVACY_PATH} className="underline underline-offset-2">Politique de confidentialité</Link>
        </footer>
      </article>
    </main>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="space-y-3 scroll-mt-6">
      <h2 id={`${id}-t`} className="font-display text-xl md:text-2xl font-semibold text-navy-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

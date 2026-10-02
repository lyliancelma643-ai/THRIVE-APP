import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { LEGAL_VERSION_DATE } from '@/lib/legal-entity';

// Gabarit des documents légaux publics (/legal/*) : lisible sur téléphone,
// imprimable, sans dépendance au compte connecté.

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
          <Link href="/legal/conditions" className="underline underline-offset-2">Conditions d’utilisation</Link>
          <Link href="/legal/confidentialite" className="underline underline-offset-2">Politique de confidentialité</Link>
        </footer>
      </article>
    </main>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="space-y-3">
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

/** Valeur issue de la configuration ; signalée visiblement si elle manque. */
export function Fill({ value, label }: { value: string; label: string }) {
  return value ? (
    <>{value}</>
  ) : (
    <mark className="bg-amber-100 text-amber-900 px-1 rounded">[à compléter : {label}]</mark>
  );
}

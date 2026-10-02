// Gabarit des pages publiques (support, confidentialité) : lisibles sans
// connexion, sans JavaScript, sur fond clair quel que soit le thème choisi
// dans l'app — ce sont aussi les URL déclarées aux stores.
import Link from 'next/link';
import { LEGAL, PRIVACY_PATH, SUPPORT_PATH } from '@/lib/legal';

export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-cream text-navy-900">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <nav aria-label="Navigation" className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          <Link href="/login" className="text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline">
            ← Retour à THRIVE
          </Link>
          <Link href={SUPPORT_PATH} className="text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline">
            Support
          </Link>
          <Link href={PRIVACY_PATH} className="text-navy-600 hover:text-navy-900 underline-offset-4 hover:underline">
            Confidentialité
          </Link>
        </nav>

        <h1 className="font-display text-[32px] md:text-[40px] font-semibold leading-tight text-balance mb-3">
          {title}
        </h1>
        {updated && (
          <p className="text-sm text-navy-700 mb-4">Dernière mise à jour : {formatDate(updated)}</p>
        )}
        {intro && <div className="text-navy-700 text-[17px] leading-relaxed mb-8 text-pretty">{intro}</div>}

        <div className="legal-prose space-y-8">{children}</div>

        <footer className="mt-14 border-t border-navy-900/10 pt-6 text-sm text-navy-700">
          {LEGAL.company} · {LEGAL.city} ·{' '}
          <a className="underline" href={`mailto:${LEGAL.supportEmail}`}>
            {LEGAL.supportEmail}
          </a>
        </footer>
      </div>
    </main>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-[22px] font-semibold mb-3 text-balance">{title}</h2>
      <div className="space-y-3 text-[16px] leading-relaxed text-navy-800 [&_a]:underline [&_a]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-navy-900">
        {children}
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

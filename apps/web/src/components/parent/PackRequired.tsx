'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
import { PACKS_URL, PROGRAM_PACK_LABELS, PROGRAM_PACK_ORDER } from '@/lib/program-packs';

// ─────────────────────────────────────────────────────────────────────────────
// Écran bloquant « section incluse avec un pack THRIVE » : Maison pour un
// parent sans pack ni abonnement, Bilan / Mes séances pour un abonné Maison
// seul (ou une section fermée par l'admin). Le bouton principal mène à la page
// des trois packs sur le site ; l'abonnement Maison seul reste proposé en lien
// secondaire sur l'écran Maison. Présentation seulement : la RLS fait foi.
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  maison: {
    eyebrow: 'Maison · Le moment qui compte',
    title: 'Maison est incluse avec les packs THRIVE.',
    body:
      "Pour ouvrir Maison, choisis l'un de nos trois packs : Groupe, Individuel ou Complet. " +
      "Chacun donne accès à Maison dès l'inscription.",
  },
  bilan: {
    eyebrow: 'Bilan',
    title: 'Le Bilan est inclus avec les packs THRIVE.',
    body:
      "Le bilan de ton enfant fait partie du parcours avec un coach. Choisis l'un de nos " +
      'trois packs (Groupe, Individuel ou Complet) pour y accéder.',
  },
  seances: {
    eyebrow: 'Mes séances',
    title: 'Les séances sont incluses avec les packs THRIVE.',
    body:
      "Les séances avec un coach font partie de nos packs. Choisis l'un des trois " +
      '(Groupe, Individuel ou Complet) pour y accéder.',
  },
} as const;

export function PackRequired({ section }: { section: keyof typeof COPY }) {
  const copy = COPY[section];
  return (
    <div className="max-w-xl mx-auto py-6 md:py-12 animate-om-up">
      <p className="nc-eyebrow">{copy.eyebrow}</p>
      <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-2 text-pretty">
        {copy.title}
      </h1>

      <section className="nc-card mt-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center text-accent-ink shrink-0">
            <Icon name="lock" className="w-5 h-5" />
          </span>
          <p className="text-[15px] leading-[1.55] text-body text-pretty">{copy.body}</p>
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-2">
          {PROGRAM_PACK_ORDER.map((p) => (
            <li
              key={p}
              className="rounded-[14px] bg-surface-sub px-3 py-3 text-center text-[14px] font-semibold text-night-ink"
            >
              Pack {PROGRAM_PACK_LABELS[p]}
            </li>
          ))}
        </ul>

        <a
          href={PACKS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 transition-transform"
        >
          Découvrir les packs
          <Icon name="arrow-right" className="w-4 h-4" />
        </a>
        <p className="text-[13px] text-faint text-center mt-3">
          Plus d&apos;informations et inscription directement sur notre site.
        </p>
      </section>

      {section === 'maison' && (
        <p className="text-[14px] text-soft text-center mt-5">
          Tu veux seulement Maison ?{' '}
          <Link href="/parent/abonnement" className="font-semibold text-accent-ink underline underline-offset-2">
            Voir l&apos;abonnement Maison
          </Link>
        </p>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { ACCESS_MESSAGES } from '@/lib/access';

// ─────────────────────────────────────────────────────────────────────────────
// Habillage « accès en préparation » du hub parent : aperçus grisés (titres
// lisibles, contenu non cliquable) + messages premium. Présentation seulement —
// l'enforcement des données est fait par la RLS (migration 035).
// ─────────────────────────────────────────────────────────────────────────────

export function LockedBanner({ message }: { message?: string }) {
  return (
    <div className="glass-navy rounded-2xl px-5 py-4 md:px-6 md:py-5 mb-6 border border-sun/20">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 select-none" aria-hidden>
          ✦
        </span>
        <div>
          <p className="font-semibold text-white/95">Votre espace se prépare</p>
          <p className="text-sm text-white/70 mt-1 leading-relaxed max-w-xl">
            {message ?? ACCESS_MESSAGES.welcomeLocked}
          </p>
        </div>
      </div>
    </div>
  );
}

// Bloc grisé : le titre reste lisible, le contenu est visible mais inerte.
export function GreyedSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="select-none">
      <h2 className="text-lg md:text-xl font-bold text-white/85">{title}</h2>
      {subtitle && <p className="text-sm text-white/45 mt-0.5">{subtitle}</p>}
      {/* inert bloque aussi le focus clavier sur les aperçus */}
      <div className="mt-3 opacity-35 grayscale pointer-events-none" aria-hidden inert>
        {children ?? (
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 h-28 md:h-32" />
        )}
      </div>
    </section>
  );
}

// Aperçu verrouillé de la page Bilan : structure et titres visibles, zéro clic.
const BILAN_SECTIONS: { title: string; subtitle: string }[] = [
  { title: 'Résumé', subtitle: "L'essentiel du parcours de votre enfant, en un regard" },
  { title: 'Le dossier de votre enfant', subtitle: 'Identité sportive, objectifs et mot-focus' },
  { title: 'La jauge de progression', subtitle: '8 familles de compétences de vie mesurées' },
  { title: 'Les 13 séances', subtitle: 'Ancrer · Développer · Intégrer — le parcours complet' },
  { title: 'Émotions & routines', subtitle: 'Ce que le coach observe séance après séance' },
  { title: 'Prochaines étapes', subtitle: "Le plan d'action personnalisé de votre coach" },
];

export function BilanLockedPreview() {
  return (
    <div className="space-y-8">
      <LockedBanner />
      {BILAN_SECTIONS.map((s) => (
        <GreyedSection key={s.title} title={s.title} subtitle={s.subtitle} />
      ))}
    </div>
  );
}

export function SessionsLockedNotice() {
  return (
    <div className="max-w-xl mx-auto text-center py-16 md:py-24 px-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-sun/15 border border-sun/25 flex items-center justify-center text-2xl select-none" aria-hidden>
        ★
      </div>
      <h1 className="mt-6 text-xl md:text-2xl font-bold text-white/95">Vos séances arrivent</h1>
      <p className="mt-3 text-white/70 leading-relaxed">{ACCESS_MESSAGES.sessionsLocked}</p>
    </div>
  );
}

export function FitnessConstructionNotice() {
  return (
    <div className="max-w-xl mx-auto text-center py-16 md:py-24 px-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-sage/15 border border-sage/25 flex items-center justify-center text-2xl select-none" aria-hidden>
        ▦
      </div>
      <h1 className="mt-6 text-xl md:text-2xl font-bold text-white/95">En construction</h1>
      <p className="mt-3 text-white/70 leading-relaxed">{ACCESS_MESSAGES.fitnessConstruction}</p>
    </div>
  );
}

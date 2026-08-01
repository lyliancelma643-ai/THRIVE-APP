'use client';

import type { ReactNode } from 'react';
import { ACCESS_MESSAGES } from '@/lib/access';
import { Icon, type IconName } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Habillage « accès en préparation » du hub parent : aperçus grisés (titres
// lisibles, contenu non cliquable) + messages premium. Présentation seulement —
// l'enforcement des données est fait par la RLS (migration 035).
// ─────────────────────────────────────────────────────────────────────────────

export function LockedBanner({ message }: { message?: string }) {
  return (
    <div className="nc-card ring-1 ring-sun/[0.22] mb-6 animate-om-up">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center text-sun shrink-0">
          <Icon name="sparkle" className="w-5 h-5" />
        </span>
        <div>
          <p className="font-display text-[19px] font-semibold text-night-ink">
            Votre espace se prépare
          </p>
          <p className="text-[15px] leading-[1.55] text-[rgba(234,243,241,0.72)] mt-1 max-w-xl text-pretty">
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
      <h2 className="font-display text-[22px] font-semibold text-night-ink">{title}</h2>
      {subtitle && (
        <p className="text-sm text-[rgba(234,243,241,0.6)] mt-0.5">{subtitle}</p>
      )}
      {/* inert bloque aussi le focus clavier sur les aperçus */}
      <div className="mt-3 opacity-40 grayscale pointer-events-none" aria-hidden inert>
        {children ?? <div className="rounded-[22px] bg-night-surface h-28 md:h-32" />}
      </div>
    </section>
  );
}

// Écran d'attente plein page — même grammaire pour « séances » et « fitness ».
function NoticeScreen({
  icon,
  tone,
  title,
  body,
}: {
  icon: IconName;
  tone: 'sun' | 'sage';
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-xl mx-auto text-center py-16 md:py-24 animate-om-up">
      <div
        className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
          tone === 'sun' ? 'bg-sun/10 text-sun' : 'bg-sage/10 text-sage'
        }`}
      >
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h1 className="mt-6 font-display text-2xl md:text-3xl font-semibold text-night-ink">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-[rgba(234,243,241,0.72)] text-pretty">
        {body}
      </p>
    </div>
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
    <NoticeScreen
      icon="star"
      tone="sun"
      title="Vos séances arrivent"
      body={ACCESS_MESSAGES.sessionsLocked}
    />
  );
}

export function FitnessConstructionNotice() {
  return (
    <NoticeScreen
      icon="grid"
      tone="sage"
      title="En construction"
      body={ACCESS_MESSAGES.fitnessConstruction}
    />
  );
}

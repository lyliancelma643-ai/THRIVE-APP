'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ACCESS_MESSAGES, useAccessStore } from '@/lib/access';
import { Icon, type IconName } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Habillage « accès en préparation » du hub parent : aperçus grisés (titres
// lisibles, contenu non cliquable) + messages premium. Présentation seulement —
// l'enforcement des données est fait par la RLS (migration 035).
// ─────────────────────────────────────────────────────────────────────────────

/** Vérification d'accès impossible (réseau/base) : on ne devine pas, on propose de réessayer. */
export function AccessErrorNotice() {
  const error = useAccessStore((s) => s.error);
  const isLoading = useAccessStore((s) => s.isLoading);
  const refresh = useAccessStore((s) => s.refresh);
  if (!error) return null;
  return (
    <div role="alert" className="nc-card ring-1 ring-sun/[0.22] mb-6 flex flex-wrap items-center gap-3">
      <p className="text-[15px] text-ink flex-1 min-w-[200px]">
        Impossible de vérifier ton accès pour le moment.
      </p>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={isLoading}
        className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-accent text-accent-on text-[14px] font-bold disabled:opacity-60"
      >
        Réessayer
      </button>
    </div>
  );
}

export function LockedBanner({ message }: { message?: string }) {
  return (
    <div className="nc-card ring-1 ring-sun/[0.22] mb-6 animate-om-up">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center text-accent-ink shrink-0">
          <Icon name="sparkle" className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[19px] font-semibold text-night-ink">
            Ton espace se prépare
          </p>
          <p className="text-[15px] leading-[1.55] text-soft mt-1 max-w-xl text-pretty">
            {message ?? ACCESS_MESSAGES.welcomeLocked}
          </p>
        </div>
      </div>
      <ActivationSteps />
    </div>
  );
}

/**
 * Les trois étapes de l'activation, lues dans access_state() : le parent voit où
 * il en est, ce qui dépend de lui (ajouter son enfant) et à qui s'adresser.
 */
export function ActivationSteps({ divider = true }: { divider?: boolean }) {
  const access = useAccessStore((s) => s.access);
  if (!access) return null;
  const steps: { label: string; detail: string; done: boolean }[] = [
    {
      label: 'La fiche de ton enfant',
      detail: access.hasChild ? 'Enregistrée.' : 'À créer : c’est elle qui ouvre son parcours.',
      done: access.hasChild,
    },
    {
      label: 'La validation par l’équipe THRIVE',
      detail: access.hasConfirmedChild ? 'Validée.' : 'En cours : l’équipe THRIVE vérifie la fiche.',
      done: access.hasConfirmedChild,
    },
    {
      label: 'L’activation par ton coach',
      detail: access.coachValidated ? 'Faite.' : 'Ton coach te contacte pour démarrer.',
      done: access.coachValidated,
    },
  ];
  const current = steps.findIndex((st) => !st.done);
  return (
    <div className={divider ? 'mt-5 pt-5 border-t border-line' : ''}>
      <ol className="flex flex-col gap-3.5">
        {steps.map((st, i) => (
          <li key={st.label} className="flex items-start gap-3">
            <span
              className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[13px] font-bold ${
                st.done
                  ? 'bg-sage text-[#06222A]'
                  : i === current
                    ? 'bg-accent text-accent-on'
                    : 'border border-line2 text-soft'
              }`}
            >
              {st.done ? <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-[15px] font-semibold ${st.done || i === current ? 'text-ink' : 'text-soft'}`}>
                {st.label}
              </span>
              <span className="block text-[13px] text-soft mt-0.5">{st.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {!access.hasChild && (
          <Link
            href="/parent/select-profile?type=CHILD"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-accent text-accent-on text-[14px] font-bold"
          >
            Ajouter mon enfant
          </Link>
        )}
        <Link
          href="/parent/messages"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full border border-line2 bg-chip text-ink text-[14px] font-semibold"
        >
          <Icon name="mail" className="w-4 h-4" />
          Une question ? Écris-nous
        </Link>
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
        <p className="text-sm text-soft mt-0.5">{subtitle}</p>
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
          tone === 'sun' ? 'bg-sun/10 text-accent-ink' : 'bg-sage/10 text-sage-ink'
        }`}
      >
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h1 className="mt-6 font-display text-2xl md:text-3xl font-semibold text-night-ink">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-soft text-pretty">
        {body}
      </p>
    </div>
  );
}

// Aperçu verrouillé de la page Bilan : structure et titres visibles, zéro clic.
const BILAN_SECTIONS: { title: string; subtitle: string }[] = [
  { title: 'Résumé', subtitle: "L'essentiel du parcours de ton enfant, en un regard" },
  { title: 'Le dossier de ton enfant', subtitle: 'Identité sportive, objectifs et mot-focus' },
  { title: 'La jauge de progression', subtitle: '8 familles de compétences de vie mesurées' },
  { title: 'Les 13 séances', subtitle: 'Ancrer · Développer · Intégrer — le parcours complet' },
  { title: 'Émotions & routines', subtitle: 'Ce que le coach observe séance après séance' },
  { title: 'Prochaines étapes', subtitle: "Le plan d'action personnalisé de ton coach" },
];

export function BilanLockedPreview() {
  return (
    <div className="max-w-2xl">
      <LockedBanner />
      <h2 className="font-display text-[22px] font-semibold text-night-ink mt-2">Ce que tu découvriras ici</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {BILAN_SECTIONS.map((sec) => (
          <li key={sec.title} className="nc-row-idle flex items-start gap-3 px-4 py-3.5">
            <Icon name="lock" className="w-4 h-4 mt-1 shrink-0 text-faint" />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-body">{sec.title}</span>
              <span className="block text-[13px] text-soft mt-0.5">{sec.subtitle}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SessionsLockedNotice() {
  return (
    <div className="max-w-xl mx-auto">
      <NoticeScreen
        icon="star"
        tone="sun"
        title="Tes séances arrivent"
        body={ACCESS_MESSAGES.sessionsLocked}
      />
      <div className="nc-card -mt-6 md:-mt-12 text-left">
        <ActivationSteps divider={false} />
      </div>
    </div>
  );
}

export function FitnessConstructionNotice({ videosHref }: { videosHref?: string }) {
  return (
    <div className="text-center">
      <NoticeScreen
        icon="grid"
        tone="sage"
        title="En construction"
        body={ACCESS_MESSAGES.fitnessConstruction}
      />
      {videosHref && (
        <Link
          href={videosHref}
          className="-mt-8 md:-mt-16 inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-accent text-accent-on text-[15px] font-bold"
        >
          <Icon name="video" className="w-4 h-4" />
          Voir les séances vidéo
        </Link>
      )}
    </div>
  );
}

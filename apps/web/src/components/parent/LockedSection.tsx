'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { isNativeApp } from '@/lib/native-bridge';
import { COACH_CALL_URL, programVideoUrl } from '@/lib/locked-cta';

// ─────────────────────────────────────────────────────────────────────────────
// Onglet Bilan / Mes séances verrouillé (abonné Maison seul, aucun droit, ou
// fermeture Super Admin) : l'onglet reste visible, son contenu est un SQUELETTE
// FACTICE flouté — aucune donnée réelle n'est chargée ni envoyée au navigateur
// (la RLS les refuse de toute façon, migration 080).
//
// Actions : découvrir le programme (vidéo de présentation ~5 min) et rencontrer
// un coach (appel de 15 min). Jamais de paiement depuis cet écran.
//
// Dans la WebView de l'app iOS / Android (anti-steering Apple 3.1.1 / Google
// Play) : aucun lien vers le site des packs. La vidéo n'est proposée que si une
// page vidéo dédiée est configurée ; le coach se rencontre via la messagerie
// ou la page de rendez-vous configurée.
// ─────────────────────────────────────────────────────────────────────────────

function useNative(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native;
}

const COPY = {
  bilan: {
    title: 'Le Bilan de ton enfant',
    body: 'Le suivi avant / après du programme, avec ton coach. Il s’ouvre avec un pack THRIVE.',
  },
  seances: {
    title: 'Mes séances',
    body: 'Les séances avec un coach, en groupe ou en individuel. Elles s’ouvrent avec un pack THRIVE.',
  },
} as const;

function FakeBilan() {
  return (
    <div className="flex flex-col gap-4">
      <div className="nc-card h-40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="nc-card h-28" />
        <div className="nc-card h-28" />
      </div>
      <div className="nc-card h-24" />
      <div className="nc-card h-24" />
    </div>
  );
}

function FakeSessions() {
  return (
    <div className="flex flex-col gap-3">
      <div className="nc-card h-32" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="nc-card h-16 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-surface-sub" />
          <span className="h-3 w-1/2 rounded bg-surface-sub" />
        </div>
      ))}
    </div>
  );
}

export function LockedSection({ section }: { section: 'bilan' | 'seances' }) {
  const copy = COPY[section];
  const videoUrl = programVideoUrl(useNative());
  const external = (href: string) => /^https?:\/\//.test(href);
  return (
    <div className="relative max-w-2xl mx-auto min-h-[520px]" data-testid={`locked-${section}`}>
      {/* Squelette factice : forme de l'écran, aucune donnée. */}
      <div className="pointer-events-none select-none blur-[6px] opacity-60" aria-hidden inert>
        {section === 'bilan' ? <FakeBilan /> : <FakeSessions />}
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-10 px-4">
        <section className="nc-card w-full max-w-md text-center shadow-xl animate-om-up">
          <span className="mx-auto w-12 h-12 rounded-full bg-sun/10 flex items-center justify-center text-accent-ink">
            <Icon name="lock" className="w-5 h-5" />
          </span>
          <h1 className="font-display text-[24px] font-semibold text-night-ink mt-4">{copy.title}</h1>
          <p className="text-[15px] leading-[1.55] text-soft mt-2 text-pretty">{copy.body}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 transition-transform"
              >
                <Icon name="video" className="w-4 h-4" />
                Découvrir le programme
              </a>
            )}
            {external(COACH_CALL_URL) ? (
              <a
                href={COACH_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full border border-line2 bg-chip text-ink font-semibold text-[15px]"
              >
                <Icon name="mail" className="w-4 h-4" />
                Rencontrer un coach
              </a>
            ) : (
              <Link
                href={COACH_CALL_URL}
                className="flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full border border-line2 bg-chip text-ink font-semibold text-[15px]"
              >
                <Icon name="mail" className="w-4 h-4" />
                Rencontrer un coach
              </Link>
            )}
          </div>
          <p className="text-[13px] text-faint mt-3">Vidéo de 5 minutes · appel de 15 minutes, sans engagement.</p>
        </section>
      </div>
    </div>
  );
}

/** Pack terminé : l'historique reste consultable, rien de nouveau ne s'y ajoute. */
export function ReadOnlyBanner({ endedOn }: { endedOn: string | null }) {
  const date = endedOn
    ? new Date(`${endedOn}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  return (
    <div role="status" className="nc-card ring-1 ring-sun/[0.22] mb-6 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center text-accent-ink shrink-0">
        <Icon name="lock" className="w-5 h-5" />
      </span>
      <p className="text-[15px] leading-[1.55] text-body text-pretty">
        Ton programme {date ? `s’est terminé le ${date}` : 'est terminé'}. Tu peux toujours consulter tout l’historique ; rien
        de nouveau ne s’y ajoute.{' '}
        <Link href={COACH_CALL_URL} className="font-semibold text-accent-ink underline underline-offset-2">
          Repartir avec un coach
        </Link>
      </p>
    </div>
  );
}

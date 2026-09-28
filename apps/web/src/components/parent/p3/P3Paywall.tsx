'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Écran d'invitation de « Maison » pour un parent sans accès (ni programme
// coaché activé, ni abonnement P3). Il ne montre aucun prix : l'offre, lue en
// direct chez Stripe, vit sur /parent/abonnement.
// ─────────────────────────────────────────────────────────────────────────────

const PROMISES = [
  'Une activité de 10 minutes par jour, rien à préparer',
  'Choisie pour votre enfant, selon son âge et ce qui a marché',
  'Le carnet des moments, pour garder ce que vous vivez ensemble',
];

export function P3Paywall() {
  return (
    <div className="max-w-xl mx-auto py-6 md:py-12 animate-om-up">
      <p className="nc-eyebrow">Maison · Le moment qui compte</p>
      <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-2 text-pretty">
        Ce n&apos;est pas le nombre d&apos;heures qui compte. C&apos;est la qualité du moment.
      </h1>

      <section className="nc-card mt-6">
        <ul className="space-y-3">
          {PROMISES.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] leading-[1.5] text-body">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
                <Icon name="check" className="w-3.5 h-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <Link
          href="/parent/abonnement"
          className="mt-6 flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 transition-transform"
        >
          Découvrir l&apos;abonnement
          <Icon name="arrow-right" className="w-4 h-4" />
        </Link>
        <p className="text-[13px] text-faint text-center mt-3">Sans engagement, annulable à tout moment.</p>
      </section>
    </div>
  );
}

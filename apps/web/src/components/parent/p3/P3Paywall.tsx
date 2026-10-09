'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { isNativeApp, postToNative } from '@/lib/native-bridge';
import { PACKS_URL, PROGRAM_PACK_LABELS, PROGRAM_PACK_ORDER } from '@/lib/program-packs';

// ─────────────────────────────────────────────────────────────────────────────
// Paywall de « Maison » (web) pour un parent sans droit : ni pack actif, ni
// abonnement Maison, ni ouverture Super Admin (access_state, migration 080).
// Offre principale : l'abonnement Maison (Stripe Checkout sur /parent/abonnement,
// essai d'un mois une seule fois par compte) ; Maison est aussi incluse dans les
// trois packs. Présentation seulement : la RLS des tables p3_* fait foi.
//
// Dans la WebView de l'app iOS / Android : achat par le paywall natif
// (RevenueCat), et aucune mention ni lien vers une offre web (anti-steering).
// ─────────────────────────────────────────────────────────────────────────────

export function P3Paywall() {
  const trialUsed = useAccessStore((s) => s.access?.trialUsed === true);
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  if (native) {
    return (
      <div className="max-w-xl mx-auto py-6 md:py-12 animate-om-up">
        <p className="nc-eyebrow">Maison · Le moment qui compte</p>
        <h1 className="font-display text-[30px] font-semibold text-night-ink leading-[1.12] mt-2 text-pretty">
          Des moments parent-enfant, chaque jour.
        </h1>
        <button
          type="button"
          onClick={() => postToNative({ type: 'open-paywall' })}
          className="mt-6 w-full h-14 rounded-full bg-accent text-accent-on font-bold text-[16px] active:scale-95 transition-transform"
        >
          Débloquer Maison
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto py-6 md:py-12 animate-om-up">
      <p className="nc-eyebrow">Maison · Le moment qui compte</p>
      <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-2 text-pretty">
        Des moments parent-enfant, chaque jour.
      </h1>

      <section className="nc-card mt-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-sun/10 flex items-center justify-center text-accent-ink shrink-0">
            <Icon name="lock" className="w-5 h-5" />
          </span>
          <p className="text-[15px] leading-[1.55] text-body text-pretty">
            Maison s’ouvre avec l’abonnement Maison
            {trialUsed ? '.' : ', avec un mois d’essai gratuit.'}
          </p>
        </div>
        <Link
          href="/parent/abonnement"
          className="mt-6 flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 transition-transform"
        >
          {trialUsed ? 'Voir l’abonnement Maison' : 'Essayer Maison gratuitement'}
          <Icon name="arrow-right" className="w-4 h-4" />
        </Link>
      </section>

      <section className="nc-card mt-4">
        <p className="text-[15px] text-body">Maison est aussi incluse dans les trois packs THRIVE, avec un coach :</p>
        <ul className="mt-4 grid grid-cols-3 gap-2">
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
          className="mt-4 flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full border border-line2 bg-chip text-ink text-[14px] font-semibold"
        >
          Découvrir les packs
        </a>
      </section>
    </div>
  );
}

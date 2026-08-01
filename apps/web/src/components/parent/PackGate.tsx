'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { type Pack, upgradeHint } from '@/lib/packs';

// ─────────────────────────────────────────────────────────────────────────────
// Teasers de la matrice de droits — extraits tels quels de my-sessions/page.tsx
// (mêmes classes, même rendu au pixel près) pour être partagés par toutes les
// pages parent. Règle : structure et titres visibles, contenu flouté, jamais de
// données réelles exposées.
// ─────────────────────────────────────────────────────────────────────────────

/* Échelle de couleur des notes : vert (fort) → jaune (moyen) → gris (faible / sans couleur) */
export const NOTE_COLORS: Record<number, string> = {
  5: '#34D399', // vert plein
  4: '#A3E635', // vert-lime
  3: '#F9EB50', // jaune (accent sun)
  2: '#B7AE72', // jaune éteint
  1: '#6B7280', // gris — « sans couleur »
};

/* Jauge circulaire incurvée — note /5 au centre, anneau coloré selon le niveau.
   `locked` : anneau (couleurs + cercle) visible mais chiffre flouté (teaser d'upgrade). */
export function ScoreGauge({ note, max = 5, locked = false }: { note: number; max?: number; locked?: boolean }) {
  const value = Math.max(0, Math.min(max, Math.round(note)));
  const pct = (value / max) * 100;
  const color = NOTE_COLORS[value] ?? '#6B7280';
  return (
    <div
      className="relative w-14 h-14 shrink-0"
      role="img"
      aria-label={locked ? 'Note masquée — réservée aux packs supérieurs' : `Note ${value} sur ${max}`}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-display font-bold text-white text-lg leading-none tabular-nums ${
            locked ? 'blur-[6px] select-none' : ''
          }`}
          aria-hidden={locked}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/* Section d'un bilan de séance — direction « Nuit calme » : pas de carte dans la
   carte. Une étiquette en capitales, puis le contenu à même la surface. */
export function BilanCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="nc-eyebrow mb-2.5">{title}</h4>
      {children}
    </section>
  );
}

/* Cadenas (SVG — pas d'emoji, cf. règles d'icônes) */
export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* Bandeau d'incitation à l'upgrade — affiché sur les sections verrouillées.
   `hint` permet d'adapter le message à la fonctionnalité (défaut : bilans). */
export function UpgradeHintBar({ pack, hint }: { pack: Pack; hint?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border border-sun/[0.28] bg-sun/[0.07] px-3.5 py-3">
      <LockIcon className="w-4 h-4 text-sun shrink-0 mt-0.5" />
      <p className="text-sm leading-[1.5] text-[rgba(234,243,241,0.88)]">
        <span className="font-semibold text-sun">Contenu réservé.</span> {hint ?? upgradeHint(pack)}{' '}
        <Link href="/parent/upgrade" className="font-semibold text-sun underline underline-offset-2">
          Voir les forfaits
        </Link>
      </p>
    </div>
  );
}

/* Aperçu flouté d'un contenu texte verrouillé (aucune donnée réelle exposée) */
export function LockedText({ pack, hint }: { pack: Pack; hint?: string }) {
  return (
    <div>
      <div aria-hidden className="space-y-2 mb-3 blur-[5px] select-none pointer-events-none">
        <div className="h-3 rounded bg-white/15 w-[95%]" />
        <div className="h-3 rounded bg-white/15 w-[88%]" />
        <div className="h-3 rounded bg-white/15 w-[72%]" />
      </div>
      <UpgradeHintBar pack={pack} hint={hint} />
    </div>
  );
}

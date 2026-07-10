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
      className="relative w-16 h-16 shrink-0"
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
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
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

/* Carte de section interactive — réagit au survol (lift + halo accent, titre qui s'allume) */
export function BilanCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-sun/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-navy-900/40 motion-safe:hover:-translate-y-0.5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-2 transition-colors group-hover:text-sun">
        {title}
      </h4>
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
    <div className="flex items-start gap-2.5 rounded-lg border border-sun/30 bg-sun/[0.08] px-3 py-2.5">
      <LockIcon className="w-4 h-4 text-sun shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-white/85">
        <span className="font-semibold text-sun">Contenu réservé.</span> {hint ?? upgradeHint(pack)}{' '}
        <Link href="/parent/upgrade" className="font-semibold text-sun underline decoration-sun/40 underline-offset-2 hover:decoration-sun">
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

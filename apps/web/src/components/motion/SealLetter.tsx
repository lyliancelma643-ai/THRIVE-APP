'use client';

import { useEffect, useRef, useState } from 'react';
import { DUR } from '@thrive/shared';

export type SealPhase = 'ready' | 'sealing' | 'sealed';

/**
 * Durée minimale du rituel : la confirmation n'est montrée qu'après 2 400 ms, même si le serveur répond avant.
 * Renvoie l'étape à afficher (`sealing` tant que le minimum n'est pas écoulé).
 */
export function useMinSealing<T extends string>(step: T, sealing: T, sealed: T, min: number = DUR.ritualMin): T {
  const startedAt = useRef<number | null>(null);
  const [, bump] = useState(0);
  if (step === sealing && startedAt.current === null) startedAt.current = Date.now();
  if (step !== sealing && step !== sealed) startedAt.current = null;
  const waited = startedAt.current === null ? min : Date.now() - startedAt.current;
  useEffect(() => {
    if (step !== sealed || startedAt.current === null) return;
    const rest = min - (Date.now() - startedAt.current);
    if (rest <= 0) return;
    const id = window.setTimeout(() => bump((n) => n + 1), rest);
    return () => window.clearTimeout(id);
  }, [step, sealed, min]);
  return step === sealed && waited < min ? sealing : step;
}

/** Vrai quand `active` dure depuis plus de `ms` (la réponse tarde : « Encore un instant… »). */
export function useLate(active: boolean, ms: number = DUR.ritualMin): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) {
      setLate(false);
      return;
    }
    const id = window.setTimeout(() => setLate(true), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
  return late;
}

export function sealTexts(phase: 'ready' | 'sealing' | 'waiting' | 'sealed', date: string): { title: string; body: string } {
  switch (phase) {
    case 'ready':
      return { title: 'Ta lettre est prête.', body: `Une fois scellée, personne ne pourra la lire avant le ${date}, pas même toi.` };
    case 'sealing':
      return { title: 'On la scelle…', body: 'Rien à faire, ça ne prend qu’un instant.' };
    case 'waiting':
      return { title: 'Encore un instant…', body: 'On finit de la mettre en sécurité.' };
    default:
      return { title: 'Lettre scellée.', body: `Elle te reviendra par courriel le ${date}.` };
  }
}

const T = (name: string, ms: number, delay: number, ease: string, extra = '') => `${name} ${ms}ms ${ease} ${delay}ms both ${extra}`;

/** L'enveloppe qui se ferme : feuille, rabat, sceau, anneau (chronologie du cahier de mouvement). */
export function SealLetter({ phase, waiting = false }: { phase: SealPhase; waiting?: boolean }) {
  const on = phase !== 'ready';
  const sealed = phase === 'sealed';
  return (
    <svg className="mo-anim mx-auto" width="300" height="250" viewBox="0 -20 240 200" role="img" aria-label={sealed ? 'Une enveloppe fermée' : 'Une enveloppe'}>
      <rect x="20" y="60" width="200" height="110" rx="12" className="fill-night-surface" stroke="var(--line2)" strokeWidth="1.5" />
      <g clipPath="url(#env-clip)">
        <g style={{ transform: on ? 'translateY(46px)' : 'translateY(0)', transition: 'transform 500ms var(--ease-out)' }}>
          <rect x="42" y="28" width="156" height="118" rx="6" fill="var(--text)" opacity="0.94" stroke="var(--line2)" strokeWidth="1.5" />
          {[[46, 90], [62, 124], [78, 110], [94, 70]].map(([y, w]) => (
            <rect key={y} x="58" y={y} width={w} height="6" rx="3" fill="var(--bg)" opacity="0.18" />
          ))}
        </g>
      </g>
      <defs>
        <clipPath id="env-clip">
          <rect x="0" y="-20" width="240" height="188" />
        </clipPath>
      </defs>
      <rect x="20" y="60" width="200" height="110" rx="12" className="fill-night-surface" />
      <path d="M20 170 L20 76 L120 132 L220 76 L220 170 Z" className="fill-night-surface" stroke="var(--line2)" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M20 60 L120 125 L220 60 Z"
        className="fill-night-surface"
        stroke="var(--line2)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ transformOrigin: '120px 60px', transform: on ? 'scaleY(1)' : 'scaleY(-1)', transition: `transform 450ms cubic-bezier(.4,0,.2,1) ${on ? 300 : 0}ms` }}
      />
      {sealed && <circle cx="120" cy="118" r="22" fill="none" strokeWidth="3" className="stroke-accent-ink" style={{ transformOrigin: '120px 118px', animation: 'sl-wave 800ms var(--ease-out) both' }} />}
      {on && (
        <>
          {!sealed && (
          <circle
            cx="120"
            cy="118"
            r="27"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-accent-ink"
            strokeDasharray="170"
            transform="rotate(-90 120 118)"
            style={{ animation: T('sl-ring', 1700, 700, 'linear') }}
          />
          )}
          <g style={{ transformOrigin: '120px 118px', animation: [T('sl-seal', 450, 700, 'var(--ease-spring)'), waiting && !sealed ? 'sl-breathe 1400ms ease-in-out 0ms infinite' : ''].filter(Boolean).join(', ') }}>
            <circle cx="120" cy="118" r="20" className="fill-accent" stroke="var(--on-accent)" strokeWidth="2.5" />
            <circle cx="120" cy="118" r="10" fill="none" stroke="var(--on-accent)" strokeWidth="2.5" />
          </g>
        </>
      )}
    </svg>
  );
}

export function SealCaption({ phase, date }: { phase: 'ready' | 'sealing' | 'waiting' | 'sealed'; date: string }) {
  const t = sealTexts(phase, date);
  return (
    <div className="mt-2 text-center" aria-live="polite">
      <p className="font-display text-[25px] leading-8 font-semibold text-ink">{t.title}</p>
      <p className="mt-1.5 text-[16px] leading-6 text-soft">{t.body}</p>
    </div>
  );
}

'use client';

// Minuteur du mode activité : il mesure le MOMENT, jamais une performance (R4).
//   • Il part du temps choisi par le parent (10, 20 ou 30 min) et affiche le
//     temps qui reste ; l'anneau se remplit (jamais un compte à rebours rouge).
//   • À 2 minutes de la fin, l'anneau change simplement de teinte — aucun son,
//     aucune vibration : on n'interrompt pas un enfant qui parle.
//   • Après la durée : OVERTIME_LINE (« 3 minutes de plus — tant mieux. »).
//   • `boost` change → l'anneau « prend » ses minutes d'approfondissement
//     (rebond + « +10 min »). prefers-reduced-motion : aucune animation.
//   • Lecteurs d'écran : annonce polie aux minutes rondes seulement.

import { OVERTIME_LINE } from '@/lib/p3-moments/guide';
import { fill } from '@/lib/p3-moments/app';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function TimerRing({
  elapsed,
  total,
  size = 112,
  compact = false,
  boost = 0,
  boostLabel = '+10 min',
}: {
  elapsed: number;
  total: number;
  size?: number;
  /** Version en-tête : anneau + chiffres côte à côte, sans ligne de dépassement. */
  compact?: boolean;
  /** Incrémenté à chaque « Approfondir » : rejoue l'animation. */
  boost?: number;
  boostLabel?: string;
}) {
  const stroke = compact ? 4 : 6;
  const r = (size - stroke - 4) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(elapsed / total, 1);
  const nearEnd = elapsed >= total - 120;
  const remaining = Math.max(0, total - elapsed);
  const extra = Math.floor((elapsed - total) / 60);
  const minutesLeft = Math.ceil(remaining / 60);

  const ring = (
    <div key={`ring-${boost}`} className={`relative shrink-0 rounded-full ${boost ? 'motion-safe:animate-om-boost' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={nearEnd ? 'var(--sage, #A7C4BC)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      {!compact && (
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-semibold tabular-nums text-ink leading-none">{mmss(remaining)}</span>
          <span className="mt-1 text-[12px] text-soft">sur {Math.round(total / 60)} min</span>
        </span>
      )}
    </div>
  );

  return (
    <div className={compact ? 'relative flex items-center gap-2' : 'relative flex flex-col items-center gap-2'}>
      {ring}
      {compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tabular-nums text-ink">{mmss(remaining)}</span>
          <span className="mt-0.5 text-[11px] text-soft">sur {Math.round(total / 60)} min</span>
        </span>
      )}
      {boost > 0 && (
        <span
          key={`plus-${boost}`}
          aria-hidden
          className={`pointer-events-none absolute rounded-full whitespace-nowrap ${compact ? 'top-full mt-1 left-0' : '-top-3 left-1/2 -translate-x-1/2'} bg-accent text-accent-on text-[12px] font-bold px-2 py-0.5 opacity-0 motion-safe:animate-om-plus`}
        >
          {boostLabel}
        </span>
      )}
      {!compact && extra >= 1 && <p className="text-[14px] text-soft">{fill(OVERTIME_LINE, { extra })}</p>}
      <span className="sr-only" aria-live="polite">
        {remaining > 0 && remaining % 60 === 0 ? `Encore ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}` : ''}
      </span>
    </div>
  );
}

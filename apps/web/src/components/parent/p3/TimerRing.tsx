'use client';

// Minuteur du mode activité : il mesure le MOMENT, jamais une performance (R4).
//   • Anneau qui se remplit (jamais un compte à rebours rouge), mm:ss discrets.
//   • À 2 minutes de la fin, l'anneau change simplement de teinte — aucun son,
//     aucune vibration : on n'interrompt pas un enfant qui parle.
//   • Après la durée : OVERTIME_LINE (« 3 minutes de plus — tant mieux. »).
//   • Lecteurs d'écran : annonce polie aux minutes rondes seulement.
//   • prefers-reduced-motion : pas de transition sur l'anneau.

import { OVERTIME_LINE } from '@/lib/p3-moments/guide';
import { fill } from '@/lib/p3-moments/app';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function TimerRing({
  elapsed,
  total,
  size = 112,
}: {
  elapsed: number;
  total: number;
  size?: number;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(elapsed / total, 1);
  const nearEnd = elapsed >= total - 120;
  const extra = Math.floor((elapsed - total) / 60);
  const minutes = Math.floor(elapsed / 60);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={6} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={nearEnd ? 'var(--sage)' : 'var(--accent)'}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ratio)}
            className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums text-soft">
          {mmss(elapsed)}
        </span>
      </div>
      {extra >= 1 && <p className="text-[14px] text-soft">{fill(OVERTIME_LINE, { extra })}</p>}
      <span className="sr-only" aria-live="polite">
        {minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''}
      </span>
    </div>
  );
}

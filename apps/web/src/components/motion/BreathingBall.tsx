'use client';

import { useEffect, useState } from 'react';

type Phase = 'inspire' | 'expire' | 'fin';
const IN_S = 4;
const OUT_S = 6;

/**
 * Un souffle avant de commencer : inspiration 4 s (la balle grandit), expiration 6 s (elle rétrécit), puis « Voilà. ».
 * Toujours avec « Passer ». Réduire les animations : les chiffres restent, la balle ne bouge pas.
 */
export function BreathingBall({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [phase, setPhase] = useState<Phase>('inspire');
  const [count, setCount] = useState(1);
  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const run = (p: Phase, secs: number, next: () => void) => {
      if (!alive) return;
      setPhase(p);
      setCount(1);
      for (let i = 2; i <= secs; i++) timers.push(window.setTimeout(() => alive && setCount(i), (i - 1) * 1000));
      timers.push(window.setTimeout(next, secs * 1000));
    };
    run('inspire', IN_S, () => run('expire', OUT_S, () => alive && setPhase('fin')));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);
  const label = phase === 'inspire' ? 'Inspire par le nez' : phase === 'expire' ? 'Souffle doucement' : 'Voilà.';
  const grown = phase === 'inspire';
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="relative grid h-[280px] w-[280px] place-items-center" aria-hidden>
        <svg width="280" height="280" className="absolute inset-0">
          <circle cx="140" cy="140" r="130" fill="none" stroke="var(--line2)" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />
        </svg>
        <div
          className="mo-anim h-[260px] w-[260px] rounded-full bg-accent"
          style={{
            border: '3px solid var(--on-accent)',
            transform: `scale(${grown ? 1 : 0.62})`,
            transition: `transform ${phase === 'inspire' ? IN_S : OUT_S}s cubic-bezier(.45,0,.55,1)`,
          }}
        />
        {phase !== 'fin' && <span className="absolute text-[56px] font-bold leading-none text-accent-on tabular-nums">{count}</span>}
      </div>
      <p className="font-display text-[26px] leading-8 font-semibold text-ink" aria-live="polite">
        {label}
      </p>
      {phase === 'fin' ? (
        <button onClick={onDone} className="h-[52px] rounded-full bg-accent px-8 font-bold text-accent-on">
          Commencer l’activité
        </button>
      ) : (
        <button onClick={onSkip} className="min-h-11 px-4 text-[15px] font-semibold text-soft">
          Passer
        </button>
      )}
    </div>
  );
}

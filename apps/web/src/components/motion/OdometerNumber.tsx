'use client';

import { useEffect, useState } from 'react';

/** Un chiffre = une colonne 0‒9 qui défile (`translateY`, 600 ms). `animate={false}` : valeur finale directe. */
function Digit({ digit, from, lh, animate }: { digit: number; from: number; lh: number; animate: boolean }) {
  const [v, setV] = useState(animate ? from : digit);
  useEffect(() => {
    if (!animate) {
      setV(digit);
      return;
    }
    const id = requestAnimationFrame(() => setV(digit));
    return () => cancelAnimationFrame(id);
  }, [digit, animate]);
  return (
    <span className="inline-block overflow-hidden align-bottom" style={{ height: lh }} aria-hidden>
      <span className="mo-anim block" style={{ transform: `translateY(${-v * lh}px)`, transition: animate ? 'transform 600ms var(--ease-out)' : 'none' }}>
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block tabular-nums" style={{ height: lh, lineHeight: `${lh}px` }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Compteur à chiffres qui défilent, de `from` vers `value`. Le lecteur d'écran lit la valeur finale. */
export function OdometerNumber({ value, from, lineHeight = 44, animate = true, className = '' }: { value: number; from?: number; lineHeight?: number; animate?: boolean; className?: string }) {
  const to = String(Math.max(0, Math.round(value)));
  const start = String(Math.max(0, Math.round(from ?? 0))).padStart(to.length, '0').slice(-to.length);
  return (
    <span className={`inline-flex ${className}`} role="text" aria-label={to}>
      {to.split('').map((d, i) => (
        <Digit key={`${to.length}-${i}`} digit={Number(d)} from={Number(start[i])} lh={lineHeight} animate={animate} />
      ))}
    </span>
  );
}

import type { ReactNode } from 'react';

const C = 490.1; // 2π × 78

/**
 * Anneau de progression (r78, trait 16, départ à −90°). `animate` : l'arc se dessine en 900 ms (à la première
 * apparition ou quand la valeur change) ; sinon il est posé directement. Exception à « transform/opacité » :
 * `stroke-dashoffset`. `value` : 0..1.
 */
export function ProgressRing({ value, size = 180, animate = true, children }: { value: number; size?: number; animate?: boolean; children?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 180 180" className="absolute inset-0" aria-hidden>
        <circle cx="90" cy="90" r="78" fill="none" strokeWidth="16" className="stroke-track" />
        {v > 0 && (
          <circle
            key={v}
            cx="90"
            cy="90"
            r="78"
            fill="none"
            strokeWidth="16"
            strokeLinecap="round"
            className="stroke-accent-ink"
            strokeDasharray={`${C},${C}`}
            transform="rotate(-90 90 90)"
            style={{ strokeDashoffset: C * (1 - v), animation: animate ? 'ring-draw var(--dur-ring) var(--ease-out) backwards' : undefined, ['--ring-from' as string]: C }}
          />
        )}
      </svg>
      {children}
    </div>
  );
}

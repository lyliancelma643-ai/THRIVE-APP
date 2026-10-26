import type { ReactNode } from 'react';

/**
 * Carte de déblocage : monte du bas (140 % → 0, 500 ms) et reçoit un reflet unique (bande blanche translucide en aplat,
 * inclinée à −20°, 900 ms après 450 ms). `skip` (synthèse passée, réduire les animations) : posée sans mouvement.
 */
export function UnlockCard({ skip, className = '', children }: { skip?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`mo-anim relative overflow-hidden rounded-[22px] ${className}`} style={{ animation: skip ? undefined : 'unlock-up 500ms var(--ease-out) backwards' }}>
      {children}
      {!skip && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-5 -top-5 left-0 w-9"
          style={{ background: 'rgba(255,255,255,0.22)', animation: 'glint 900ms var(--ease-in-out) 450ms both' }}
        />
      )}
    </div>
  );
}

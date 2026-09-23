'use client';

import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui';
import type { Duration, PillarCode } from '@/lib/p3-moments';
import { PILLAR_PLAIN } from '@/lib/p3-moments/guide';

// ─────────────────────────────────────────────────────────────────────────────
// Pièces partagées des écrans P3 — même grammaire que l'onglet Fitness :
// surfaces plates (.nc-card / .nc-row), un seul accent, pastilles .nc-pill.
// ─────────────────────────────────────────────────────────────────────────────

/** Une icône par pilier : la chaleur passe par l'image, jamais par le code P1…P8. */
export const PILLAR_ICON: Record<PillarCode, IconName> = {
  P1: 'compass',
  P2: 'trophy',
  P3: 'sparkle',
  P4: 'grid',
  P5: 'star',
  P6: 'user',
  P7: 'target',
  P8: 'chart',
};

export function PillarTag({ pillar }: { pillar: PillarCode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-soft">
      <Icon name={PILLAR_ICON[pillar]} className="w-4 h-4 text-accent-ink" />
      {PILLAR_PLAIN[pillar]}
    </span>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-semibold text-soft hover:text-ink"
    >
      <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
      {label}
    </Link>
  );
}

export function PillGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="nc-pill min-h-[44px] select-none"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DurationPills({
  value,
  available,
  onChange,
}: {
  value: Duration;
  available: readonly Duration[];
  onChange: (d: Duration) => void;
}) {
  return (
    <PillGroup
      label="Durée"
      value={value}
      options={available.map((d) => ({ value: d, label: `${d} min` }))}
      onChange={onChange}
    />
  );
}

export function P3Skeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-5 w-40 rounded-full bg-night-surface animate-pulse" />
      <div className="h-[360px] rounded-[28px] bg-night-surface animate-pulse" />
      <div className="h-24 rounded-[22px] bg-night-surface animate-pulse" />
    </div>
  );
}

/** Contenu posé : titre de section en .nc-eyebrow (seul niveau secondaire de la direction). */
export function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-8 ${className}`}>
      <h2 className="nc-eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

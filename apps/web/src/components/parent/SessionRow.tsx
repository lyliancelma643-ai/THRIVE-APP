'use client';

import { VideoSession } from '@/lib/catalog';
import { SessionCard } from './SessionCard';

type Props = {
  title: string;
  subtitle?: string;
  sessions: VideoSession[];
  completedIds?: Set<string>;
};

export function SessionRow({ title, subtitle, sessions, completedIds }: Props) {
  if (sessions.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-1 px-1 pb-2">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} completed={completedIds?.has(s.id)} />
        ))}
      </div>
    </section>
  );
}

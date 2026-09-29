'use client';

import { VideoSession } from '@/lib/catalog';
import { Rail } from './Rail';
import { SessionCard } from './SessionCard';

type Props = {
  title: string;
  subtitle?: string;
  sessions: VideoSession[];
  completedIds?: Set<string>;
};

// Rangée de séances vidéo : même grammaire que les rangées Maison (Rail) —
// doigt, souris, clavier, indicateur de position.
export function SessionRow({ title, subtitle, sessions, completedIds }: Props) {
  if (sessions.length === 0) return null;

  return (
    <Rail id={`video:${title}`} title={title} subtitle={subtitle} arrowTopClass="top-[65px] lg:top-[74px]">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} completed={completedIds?.has(s.id)} />
      ))}
    </Rail>
  );
}

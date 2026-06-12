'use client';

import Link from 'next/link';
import { VideoSession, themeAccent, formatDuration } from '@/lib/catalog';

type Props = {
  session: VideoSession;
  size?: 'md' | 'lg';
  completed?: boolean;
};

export function SessionCard({ session, size = 'md', completed = false }: Props) {
  const accent = themeAccent(session.theme);
  const width = size === 'lg' ? 'w-80' : 'w-64';

  return (
    <Link
      href={`/parent/session/${session.id}`}
      className={`${width} shrink-0 group snap-start`}
    >
      <div
        className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${accent.glow} shadow-card group-hover:shadow-card-hover group-hover:scale-[1.02] transition-all duration-200`}
      >
        {session.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.thumbnail_url}
            alt={session.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="absolute -right-2 -bottom-6 font-display text-[7rem] leading-none text-white/10 select-none">
            {session.session_number}
          </span>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${accent.chip}`}>
            {session.theme}
          </span>
          {session.is_free && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/90 text-navy-900">
              Gratuit
            </span>
          )}
        </div>

        {completed && (
          <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xs font-bold">
            ✓
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-navy-900/90 to-transparent">
          <p className="text-[11px] text-sage font-medium mb-0.5">
            Séance {session.session_number} · {formatDuration(session.duration_minutes)} · {session.age_group} ans
          </p>
          <h3 className="text-white font-semibold leading-snug">{session.title}</h3>
        </div>

        {/* Bouton play au survol */}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-12 h-12 rounded-full bg-sun text-navy-900 flex items-center justify-center text-lg shadow-card">
            ▶
          </span>
        </span>
      </div>
    </Link>
  );
}

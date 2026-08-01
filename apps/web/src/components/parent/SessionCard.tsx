'use client';

import Link from 'next/link';
import { VideoSession, formatDuration } from '@/lib/catalog';
import { Icon } from '@/components/ui';

type Props = {
  session: VideoSession;
  size?: 'md' | 'lg';
  completed?: boolean;
};

// Direction « Nuit calme » : la vignette porte l'image, le texte vit SOUS elle
// (et non en surimpression). Pas de dégradé de thème, pas d'ombre — un aplat
// #0C2029 quand l'image manque, et le sage pour la ligne de contexte.
export function SessionCard({ session, size = 'md', completed = false }: Props) {
  const width = size === 'lg' ? 'w-[264px]' : 'w-[230px]';

  return (
    <Link
      href={`/parent/session/${session.id}`}
      className={`${width} shrink-0 group snap-start select-none`}
    >
      <div className="relative aspect-video rounded-[18px] overflow-hidden bg-night-surface">
        {session.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.thumbnail_url}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 10px,rgba(255,255,255,0) 10px 20px)',
            }}
          />
        )}

        {session.is_free && (
          <span className="absolute top-2.5 left-2.5 px-2.5 h-6 inline-flex items-center rounded-full bg-sun text-navy-900 text-[11px] font-bold">
            Gratuit
          </span>
        )}

        {completed && (
          <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sage text-navy-900 flex items-center justify-center">
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} />
          </span>
        )}

        {/* Bouton de lecture au survol — la seule surimpression conservée */}
        <span className="absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
          <span className="w-11 h-11 rounded-full bg-sun text-navy-900 flex items-center justify-center">
            <Icon name="play" className="w-4 h-4" />
          </span>
        </span>
      </div>

      <p className="mt-3 mb-0.5 text-[13px] font-semibold text-sage">
        Séance {session.session_number} · {formatDuration(session.duration_minutes)}
      </p>
      <p className="text-base font-semibold leading-[1.35] text-night-ink">{session.title}</p>
      <p className="mt-0.5 text-[13px] text-[rgba(234,243,241,0.5)]">{session.age_group} ans</p>
    </Link>
  );
}

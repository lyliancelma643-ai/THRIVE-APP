import React from 'react';

// Jeu d'icônes vectoriel maison (dependency-free) — remplace les emoji et les
// glyphes typographiques. Traits sur grille 24, `currentColor`, décoratif par
// défaut (aria-hidden) pour ne pas polluer les lecteurs d'écran : le libellé
// texte adjacent porte déjà le sens.
export type IconName =
  | 'dashboard'
  | 'folder'
  | 'compass'
  | 'user'
  | 'target'
  | 'users'
  | 'child'
  | 'link'
  | 'trophy'
  | 'clipboard'
  | 'award'
  | 'message'
  | 'bell'
  | 'chart'
  | 'lock'
  | 'arrow-right'
  | 'plus'
  | 'check'
  | 'flag';

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 7M18 21a6 6 0 0 0-3-5.2" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M9 8h.01M15 8h.01M9.5 11a3 3 0 0 0 5 0" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  link: <path d="M9 15 15 9M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5" />,
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 21h6M10 21v-2h4v2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m9 13-1.5 8 4.5-3 4.5 3L15 13" />
    </>
  ),
  message: <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z" />,
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-9M20 20v-4" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5L20 7" />,
  flag: <path d="M5 21V4m0 1h12l-2.5 4L17 13H5" />,
};

export function Icon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 1.9,
  title,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

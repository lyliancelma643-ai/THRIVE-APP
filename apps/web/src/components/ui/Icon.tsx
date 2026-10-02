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
  | 'flag'
  // Navigation Parent + Coach (remplacent les glyphes ◈ ★ ▦ ⌂ ◔ ✉ ⚙ ⏻)
  | 'home'
  | 'star'
  | 'grid'
  | 'sparkle'
  | 'pie'
  | 'mail'
  | 'settings'
  | 'power'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'play'
  | 'pause'
  | 'download'
  | 'menu'
  | 'close'
  | 'expand'
  | 'arrow-left'
  | 'refresh'
  | 'timer'
  | 'eye'
  | 'book'
  // Écran d'accueil / connexion
  | 'eye-off'
  | 'minus'
  | 'shield'
  | 'send'
  | 'chevron-left';

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
  // ◈ Bilan/Résumé → étincelle (registre « premium » Apple Forme)
  sparkle: <path d="M12 3c.5 3.8 1.7 5 5.5 5.5-3.8.5-5 1.7-5.5 5.5-.5-3.8-1.7-5-5.5-5.5C10.3 8 11.5 6.8 12 3Z" />,
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 9.5v4l2.5 1.5M9.5 3.5h5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
      <path d="M8 17h10" />
    </>
  ),
  // ★ Mes séances / Mes athlètes → étoile
  star: <path d="M12 3.5l2.6 5.35 5.9.86-4.27 4.16 1.01 5.88L12 17.02l-5.25 2.79 1.01-5.88L3.5 9.71l5.9-.86z" />,
  // ▦ Fitness → grille de quatre tuiles
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  // ⌂ Tableau de bord → maison
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10.2V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.8" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // ◔ Suivi → jauge / progression
  pie: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9" />
    </>
  ),
  // ✉ Messages → enveloppe
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  // ⚙ Réglages → engrenage
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A1.9 1.9 0 1 1 6.9 4.6l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  // ⏻ Déconnexion → symbole d'alimentation
  power: (
    <>
      <path d="M12 4v8" />
      <path d="M7.6 7.1a7 7 0 1 0 8.8 0" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  // ▶ Lecture — pleine, seule icône « remplie » du jeu (bouton primaire)
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" strokeLinejoin="round" />,
  // ⤓ Téléchargement d'un livrable (contrat, lettre, certificat)
  download: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  'arrow-left': <path d="M20 12H5m6-6-6 6 6 6" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" />,
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4" />
      <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.4 9.4 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  minus: <path d="M6 12h12" />,
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
};

export function Icon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 1.9,
  fill = 'none',
  title,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  fill?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
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

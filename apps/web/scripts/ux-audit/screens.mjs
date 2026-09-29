// Écrans audités : rôle (persona du mock), route, ambiance, action éventuelle
// avant capture (ouvrir une modale, un menu…). Les identifiants viennent des
// données de démonstration (mock/fixtures.mjs).

const K1 = '00000003-0000-4000-8000-000000000001'; // Léo
const S7 = '00000004-0000-4000-8000-000000000007'; // Léo · séance 7 (en cours)
const V1 = '00000005-0000-4000-8000-000000000001'; // séance vidéo 1 (8-11)
const CONV = '00000006-0000-4000-8000-000000000800';

// `main: true` → écran principal (CLS mesuré, capturé dans les deux ambiances).
export const VIEWPORTS = [
  { id: 'iphone-se', w: 375, h: 667, touch: true, dpr: 2 },
  { id: 'iphone-15', w: 393, h: 852, touch: true, dpr: 3 },
  { id: 'iphone-pro-max', w: 430, h: 932, touch: true, dpr: 3 },
  { id: 'android', w: 360, h: 800, touch: true, dpr: 3 },
  { id: 'phone-landscape', w: 852, h: 393, touch: true, dpr: 3 },
  { id: 'ipad-mini', w: 744, h: 1133, touch: true, dpr: 2, tablet: true },
  { id: 'ipad-portrait', w: 820, h: 1180, touch: true, dpr: 2, tablet: true },
  { id: 'ipad-landscape', w: 1180, h: 820, touch: true, dpr: 2, tablet: true },
  { id: 'ipad-pro-portrait', w: 1024, h: 1366, touch: true, dpr: 2, tablet: true },
  { id: 'ipad-pro-landscape', w: 1366, h: 1024, touch: true, dpr: 2, tablet: true },
  { id: 'laptop', w: 1280, h: 800, touch: false, dpr: 1 },
  { id: 'desktop', w: 1440, h: 900, touch: false, dpr: 1 },
  { id: 'full-hd', w: 1920, h: 1080, touch: false, dpr: 1 },
  { id: 'qhd', w: 2560, h: 1440, touch: false, dpr: 1 },
];

// Viewports « rapides » pour les passes intermédiaires entre deux lots.
export const QUICK = ['iphone-se', 'ipad-portrait', 'ipad-landscape', 'desktop'];
// Viewports où axe-core tourne (les violations dépendent peu de la largeur).
export const AXE_VIEWPORTS = ['iphone-15', 'ipad-portrait', 'desktop'];

const P = 'parent-performance';
const both = { ambiances: ['night', 'day'] };

export const SCREENS = [
  // ── Public ──
  { role: 'public', id: 'login', path: '/login', main: true },
  { role: 'public', id: 'login-inscription', path: '/login', action: 'signup-tab' },
  { role: 'public', id: 'login-oubli', path: '/login', action: 'forgot' },
  { role: 'public', id: 'reset-password', path: '/reset-password' },
  { role: 'public', id: '404', path: '/page-inexistante' },
  { role: 'public', id: 'offline', path: '/offline' },
  { role: 'public', id: 'questionnaire-enfant', path: '/q/demo-perma', main: true },
  { role: 'public', id: 'questionnaire-invalide', path: '/q/jeton-inconnu' },

  // ── Parent (Performance + Maison) ──
  { role: P, id: 'bilan', path: '/parent/bilans', main: true, ...both },
  { role: P, id: 'bilan-fiche-detail', path: '/parent/bilans', action: 'bilan-detail', ...both },
  { role: P, id: 'bilan-passeport', path: '/parent/bilans', action: 'bilan-passport' },
  { role: P, id: 'menu-compte', path: '/parent/bilans', action: 'user-menu' },
  { role: P, id: 'menu-enfant', path: '/parent/bilans', action: 'child-menu' },
  { role: P, id: 'notifications', path: '/parent/bilans', action: 'notifications' },
  { role: P, id: 'mes-seances', path: '/parent/my-sessions', main: true, ...both },
  { role: P, id: 'mes-seances-bilan', path: '/parent/my-sessions', action: 'open-session-bilan', ...both },
  { role: P, id: 'maison', path: '/parent/fitness', main: true, ...both },
  { role: P, id: 'maison-accueil-1re-visite', path: '/parent/fitness', welcome: false },
  { role: P, id: 'maison-fiche', path: '/parent/fitness/ACT-0301', ...both },
  { role: P, id: 'maison-mode-activite', path: '/parent/fitness/ACT-0301/moment?duree=10&lieu=maison', ...both },
  { role: P, id: 'maison-catalogue', path: '/parent/fitness/toutes' },
  { role: P, id: 'maison-programme', path: '/parent/fitness/programme' },
  { role: P, id: 'maison-carnet', path: '/parent/fitness/carnet' },
  { role: P, id: 'maison-objet', path: '/parent/fitness/objets/fiche_identite' },
  { role: P, id: 'maison-quand-il-dit-non', path: '/parent/fitness/quand-il-dit-non' },
  { role: P, id: 'maison-sources', path: '/parent/fitness/sources' },
  { role: P, id: 'seances-video', path: '/parent/fitness/seances', main: true, ...both },
  { role: P, id: 'lecteur-seance', path: `/parent/session/${V1}`, ...both },
  { role: P, id: 'messagerie', path: '/parent/messages', ...both },
  { role: P, id: 'messagerie-fil', path: `/parent/messages?c=${CONV}`, ...both },
  { role: P, id: 'forfaits', path: '/parent/upgrade', ...both },
  { role: P, id: 'abonnement-actif', path: '/parent/abonnement', ...both },
  { role: P, id: 'compte', path: '/parent/compte', ...both },
  { role: P, id: 'ajout-profil', path: '/parent/select-profile' },

  // ── Parent Essentiel (contenus réservés) ──
  { role: 'parent-essentiel', id: 'bilan', path: '/parent/bilans' },
  { role: 'parent-essentiel', id: 'mes-seances-bilan', path: '/parent/my-sessions', action: 'open-session-bilan' },
  { role: 'parent-essentiel', id: 'messagerie', path: '/parent/messages' },

  // ── Parent en préparation (verrouillé, paywall) ──
  { role: 'parent-preparation', id: 'bilan', path: '/parent/bilans' },
  { role: 'parent-preparation', id: 'mes-seances', path: '/parent/my-sessions' },
  { role: 'parent-preparation', id: 'maison-paywall', path: '/parent/fitness', main: true, ...both },
  { role: 'parent-preparation', id: 'abonnement-offre', path: '/parent/abonnement', main: true, ...both },
  { role: 'parent-preparation', id: 'seances-video', path: '/parent/fitness/seances' },

  // ── Coach ──
  { role: 'coach', id: 'tableau-de-bord', path: '/coach/dashboard', main: true },
  { role: 'coach', id: 'seances', path: '/coach/sessions' },
  { role: 'coach', id: 'athletes', path: '/coach/athletes' },
  { role: 'coach', id: 'athlete', path: `/coach/athletes/${K1}` },
  { role: 'coach', id: 'conduite-seance', path: `/coach/athletes/${K1}/session/${S7}`, main: true },
  { role: 'coach', id: 'mode-terrain', path: `/coach/athletes/${K1}/session/${S7}`, action: 'field-mode' },
  { role: 'coach', id: 'bilans', path: '/coach/bilan' },
  { role: 'coach', id: 'suivi', path: '/coach/dossiers' },
  { role: 'coach', id: 'messages', path: '/coach/messages' },

  // ── Admin ──
  { role: 'admin', id: 'dashboard', path: '/admin', main: true },
  { role: 'admin', id: 'dossiers', path: '/admin/dossiers' },
  { role: 'admin', id: 'dossier', path: `/admin/dossiers/${K1}` },
  { role: 'admin', id: 'validations', path: '/admin/validations' },
  { role: 'admin', id: 'roadmap', path: '/admin/roadmap' },
  { role: 'admin', id: 'comptes', path: '/admin/users', main: true },
  { role: 'admin', id: 'coaches', path: '/admin/coaches' },
  { role: 'admin', id: 'familles', path: '/admin/families' },
  { role: 'admin', id: 'enfants', path: '/admin/children' },
  { role: 'admin', id: 'assignations', path: '/admin/assignments' },
  { role: 'admin', id: 'programmes', path: '/admin/programs' },
  { role: 'admin', id: 'questionnaires', path: '/admin/questionnaires' },
  { role: 'admin', id: 'badges', path: '/admin/badges' },
  { role: 'admin', id: 'messages', path: '/admin/messages' },
  { role: 'admin', id: 'notifications', path: '/admin/notifications' },
  { role: 'admin', id: 'analytics', path: '/admin/analytics' },
  { role: 'admin', id: 'contenu', path: '/admin/content' },
  { role: 'admin', id: 'securite', path: '/settings/security' },

  // ── Super Admin ──
  { role: 'super-admin', id: 'supervision', path: '/admin/supervision' },
  { role: 'super-admin', id: 'liste-attente', path: '/admin/waitlist', main: true },
  { role: 'super-admin', id: 'reglages', path: '/admin/reglages' },
];

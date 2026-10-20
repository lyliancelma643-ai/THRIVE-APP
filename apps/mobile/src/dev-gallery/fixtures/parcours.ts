import type { LsssPoint, WellbeingPoint } from '../../components/fin-parcours/logic';

/** Données de démonstration du lot « parcours » (maquettes O, P, Q, R, W, Z). DEV uniquement : jamais dans l'app. */
export const DEMO_CHILD = 'Léo';

export const UPCOMING = [
  { id: 's1', title: '1. Reconnaître ses forces', vignetteId: 'ACT-0101' },
  { id: 's2', title: '2. Objectif d’effort', vignetteId: 'ACT-0201' },
  { id: 's3', title: '3. Les preuves', vignetteId: 'ACT-0301' },
] as const;

export const READY_ROWS = [
  { label: 'Thème', value: 'Connexion' },
  { label: 'Compétence', value: 'Demander de l’aide' },
  { label: 'Durée', value: '20 min' },
] as const;

export const QUESTION = {
  index: 2,
  total: 3,
  text: 'Ton bâton casse en plein match. Tu vas voir qui en premier ?',
  choices: ['Personne, je me débrouille', 'Mon coach, sur le banc', 'Un coéquipier à côté de moi', 'Je ne sais pas encore'],
  selected: 1,
  progress: 0.46,
  markers: [0.22, 0.46, 0.78],
  elapsed: '9:12',
  duration: '20:00',
} as const;

export const HOME_TASK = {
  title: 'La demande de la semaine',
  text: 'Une fois d’ici dimanche, Léo demande de l’aide à quelqu’un.',
  vignetteId: 'ACT-0803',
} as const;

export const EPOCH_QUESTION = {
  dimension: 'Engagement',
  fr: 'Quand je fais une activité, j’y prends tellement de plaisir que je perds la notion du temps.',
  en: 'When I do an activity, I enjoy it so much that I lose track of time.',
  index: 7,
  total: 20,
  selected: 4,
} as const;

export const LSSS: LsssPoint[] = [
  { moment: 'BASELINE', created_at: '2026-09-01', value: 56 },
  { moment: 'MID', created_at: '2026-10-15', value: 67 },
  { moment: 'FINAL', created_at: '2026-12-10', value: 79 },
];

/** Bien-être : 13 séances (valeurs de 1 à 5). */
export const WELLBEING: WellbeingPoint[] = [1, 1.8, 1.4, 2.4, 2, 3, 3.4, 3, 3.8, 3.4, 4.2, 4.6, 4.6].map((value, i) => ({
  session_number: i + 1,
  value,
}));

export const CERTIFICATE = { name: 'Léo Tremblay', detail: 'avec Coach Lylian · décembre 2026' } as const;

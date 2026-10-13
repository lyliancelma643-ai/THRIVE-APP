import type { BilanModel } from '../../components/bilan/BilanView';
import type { LsssPoint } from '../../components/bilan/bilanData';
import type { SeanceItem, SeancesModel } from '../../components/bilan/SeancesView';
import type { SessionReportModel } from '../../components/bilan/SessionReportView';
import type { ThreadMessage } from '../../components/bilan/ThreadView';
import type { NotifItem } from '../../components/bilan/NotificationsView';
// Données de la MAQUETTE (Léo, 7/13, notes, messages du coach…) : galerie DEV uniquement, jamais dans l'app.

export const LEO: BilanModel = {
  firstName: 'Léo',
  displayName: 'Léo',
  fullName: 'Léo « Flash » Tremblay',
  initial: 'L',
  jersey: 17,
  photoUri: null,
  accent: null,
  sportLine: 'Hockey · Ailier gauche · 11 ans',
  club: 'Les Faucons de Rosemont',
  coachFirst: 'Lylian',
  strength: 'Persévérance',
  done: 7,
  gaugeGlobal: 67,
  delta: 11,
  wellbeing: [3.4, 3.8, 3.6, 4.2, 4.0, 4.4, 4.1],
  smart: '3 rondelles récupérées par match d’ici le 15 nov.',
  toolbox: ['Respiration 4-4', 'ma phrase', 'le spaghetti cuit', 'le reset'],
  steps: [{ status: 'todo' }, { status: 'doing' }, { status: 'done' }],
  docs: ['Contrat de confiance', 'lettre à moi-même'],
  quote: { text: 'Revenir au calme en moins de 30 secondes après une erreur.', tag: 'Compétence de vie' },
  focusWord: 'Calme',
  pendingQuestionnaire: false,
  readonly: false,
  childOptions: [{ id: 'leo', label: 'Léo' }, { id: 'ines', label: 'Inès' }],
  activeChildId: 'leo',
  parentInitial: 'C',
};

export const LSSS: LsssPoint[] = [
  { moment: 'BASELINE', created_at: '2026-09-03', value: 56 },
  { moment: 'MID', created_at: '2026-10-08', value: 67 },
];

export const BY_SKILL: Record<string, number> = {
  teamwork: 74, goal_setting: 71, social_skills: 69, problem_solving: 63, emotional_skills: 66, leadership: 61, time_management: 58, communication: 72,
};
export const BASELINES: Record<string, number> = {
  teamwork: 62, goal_setting: 55, social_skills: 60, problem_solving: 52, emotional_skills: 48, leadership: 54, time_management: 50, communication: 63,
};


const TITLES = [
  'Reconnaître ses forces', 'Objectif de résultat, objectif d’effort', 'Les preuves', 'Les six émotions', 'La respiration et la phrase',
  'Le corps qui se pose', 'Se mesurer à soi', 'Sur qui je compte', 'Choisir où on regarde', 'Revivre de l’intérieur',
];
const DONE_DATES = ['3 sept.', '10 sept.', '17 sept.', '24 sept.', '1 oct.', '3 oct.', '8 oct.'];

export const SEANCE_ITEMS: SeanceItem[] = TITLES.map((title, i) => {
  const n = i + 1;
  const state = n <= 7 ? 'done' : n === 8 ? 'next' : 'upcoming';
  return {
    id: `s${n}`,
    number: n,
    title,
    state,
    subtitle: state === 'done' ? `Validée par le coach · ${DONE_DATES[i]}` : state === 'next' ? 'Jeudi 15 oct. · 17 h 30' : 'À venir',
    hasReport: state === 'done',
  };
});

export const SEANCES: SeancesModel = {
  done: 7,
  nextLine: 'Prochaine : jeudi avec Coach Lylian',
  items: SEANCE_ITEMS,
  readonly: false,
  childName: 'Léo',
  childOptions: [],
  activeChildId: 'leo',
};

export const REPORT: SessionReportModel = {
  number: 7,
  title: 'Se mesurer à soi',
  subtitle: 'Séance 7 · Confiance',
  dateLabel: '8 oct.',
  coachName: 'Coach Lylian',
  coachInitial: 'L',
  message: 'Léo a été fier de lui aujourd’hui — et il a su dire pourquoi. Ce soir, demandez-lui son progrès préféré.',
  bilan: [
    ['Travaillé', 'Comparer ses performances à celles d’il y a six semaines, pas à celles des autres.'],
    ['Observé', 'Léo a nommé trois progrès sans aide, dont un en dehors du hockey.'],
    ['Ensuite', 'Séance 8 : construire sa carte des personnes ressources.'],
  ],
  observations: [['Nomme ses progrès', 4.5], ['Se compare à lui-même', 4], ['Accepte le compliment', 3], ['Fixe un prochain pas', 4]],
};

export const THREAD: ThreadMessage[] = [
  { id: 'm1', mine: false, created_at: '2026-10-08T17:40:00', content: 'Bonjour Camille ! Séance 7 validée. Léo a été super aujourd’hui.' },
  { id: 'm2', mine: true, created_at: '2026-10-08T17:52:00', content: 'Merci ! Il en parle depuis le souper.' },
  { id: 'm3', mine: false, created_at: '2026-10-08T18:10:00', content: 'Pour jeudi, il peut apporter son bâton cassé ? On s’en sert dans un exercice.' },
  { id: 'm4', mine: true, created_at: '2026-10-08T18:24:00', content: 'Parfait, c’est noté.', read: true },
];

function ago(days: number, h: number, min: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}
export const NOTIFS: NotifItem[] = [
  { id: 'n1', type: 'MESSAGE', title: 'Nouveau message de Lylian', body: 'Pour jeudi, il peut apporter son bâton cassé ?', created_at: ago(0, 18, 24), is_read: false },
  { id: 'n2', type: 'SESSION', title: 'Bilan de la séance 7', body: 'Se mesurer à soi · validée par le coach', created_at: ago(0, 17, 52), is_read: false },
  { id: 'n3', type: 'PROGRAM', title: 'Questionnaire à faire remplir', body: 'Prise de pouls de Léo · 3 min', created_at: ago(2, 12, 0), is_read: true },
  { id: 'n4', type: 'SYSTEM', title: 'Nouveau document', body: 'Lettre à moi-même · disponible', created_at: ago(3, 12, 0), is_read: true },
  { id: 'n5', type: 'BADGE', title: 'Semaine 7 complète', body: 'Un objet attend dans le carnet', created_at: ago(4, 12, 0), is_read: true },
];

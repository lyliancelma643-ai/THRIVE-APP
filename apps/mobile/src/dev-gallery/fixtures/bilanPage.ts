import type { DocRow, NextStepRow, PassportCard } from '../../components/bilan/bilanApi';
import type { PermaPoint } from '../../components/bilan/bilanData';
import { buildExtras, rightsFor, type BilanExtras, type RawExtras } from '../../components/bilan/bilanPage';
import { BY_SKILL, LSSS } from './bilan';
// Données de la MAQUETTE de la page Bilan (G, G11, G3 à G10) : galerie DEV uniquement, jamais dans l'app.

const CARD: PassportCard = {
  sport: 'Hockey', position: 'Ailier gauche', club: 'Les Faucons de Rosemont',
  strengths: ['Persévérance', 'Humour', 'Bonté'],
  seasonDream: 'Jouer toute la saison sans lâcher après une erreur.',
  smartGoal: '3 rondelles récupérées par match d’ici le 15 nov.',
  lifeSkillGoal: 'Revenir au calme en moins de 30 secondes après une erreur.',
  focusWord: 'Calme',
  toolbox: [
    { tool: 'Respiration 4-4', context: 'avant un match' },
    { tool: 'Ma phrase', context: 'je réussis ce que j’entreprends' },
    { tool: 'Le spaghetti cuit', context: 'quand je suis tendu' },
    { tool: 'Le reset', context: 'quand je fais une erreur' },
  ],
  lastName: 'Tremblay', dateOfBirth: null, avatarUrl: null,
};

const STEPS: NextStepRow[] = [
  { id: 'a', label: 'Choisir trois personnes ressources', status: 'done', due_date: null },
  { id: 'b', label: 'Demander de l’aide une fois par dimanche', status: 'doing', due_date: '2026-10-18' },
  { id: 'c', label: 'Apporter le bâton cassé jeudi', status: 'todo', due_date: '2026-10-15' },
];
const DOCS: DocRow[] = [{ id: 'd1', title: 'Contrat de confiance', storage_path: 'x' }];
const PERMA: PermaPoint[] = [3, 4, 5, 6, 7].map((n, i) => ({
  session_number: n, created_at: null, value: [62, 68, 66, 74, 80][i],
  pillars: { engagement: 84, perseverance: 79, optimism: 74, connectedness: 71, happiness: 85 },
}));
const RAW: RawExtras = {
  sessions: Array.from({ length: 13 }, (_, i) => ({
    session_number: i + 1, status: i < 7 ? 'COMPLETED' : i === 7 ? 'SCHEDULED' : 'SCHEDULED', scheduled_at: i === 7 ? '2026-10-15T17:30:00' : null,
  })),
  identity: {
    sport_story: 'Léo a commencé le hockey à 5 ans, sur la patinoire du parc ; il aime lâcher sa vitesse sur l’aile.',
    my_actions: ['Ma respiration avant chaque match', 'Mon effort à chaque présence'],
    letter: null, program_pct_override: null, certificate_ready: false,
  },
  latestEmotion: 'Trac',
  docs: [{ id: 'd1', kind: 'CONTRACT', parent_visible: true }],
  pendingWellbeing: { token: null, sessionNumber: 8 },
};

const make = (pack: 'groupe' | null): BilanExtras =>
  buildExtras({ raw: RAW, completed: 7, card: CARD, steps: STEPS, docs: DOCS, gauge: { global: 67, sample_size: 43, by_skill: BY_SKILL }, lsss: LSSS, perma: PERMA, rights: rightsFor(pack) });

export const LEO_EXTRAS = make(null);
export const LEO_EXTRAS_GROUPE = make('groupe');

/** Valeurs de démonstration des écrans de la galerie (prénom, surnom, numéro, poste) : DEV uniquement. */
export const DEMO_CHILD = { name: 'Léo', initial: 'L', nickname: 'Flash', jersey: '17', position: 'Ailier gauche' } as const;

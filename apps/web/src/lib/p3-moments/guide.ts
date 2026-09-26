// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — textes d'accompagnement hors fiches.
// Affichés tels quels (markdown inline conservé).
//
//   • Les 5 temps compressés en 10 minutes (Méthode, structure invariante)
//   • Check-in, rappel, débrief, clôture, synthèse
//   • Page « Le non » (spec §10)
//   • Page « Quand consulter » + mention légale (Architecture §6.2) — [À VALIDER]
// ─────────────────────────────────────────────────────────────────────────────

import type { ChildMood, DebriefKind, PillarCode, Role } from './parse';

/** Amorce générique par défaut [TOI 22/09] — premier moment, onboarding, fiches sans amorce. */
export const DEFAULT_OPENER = 'Pendant {duree}, je suis à toi, et c’est toi qui décides ce qu’on fait.';

/** Libellés parent des 8 piliers — les MÊMES que le module « À la maison » (le code n'est jamais affiché). */
export const PILLAR_PLAIN: Record<PillarCode, string> = {
  P1: 'Le moteur intérieur',
  P2: 'Les preuves',
  P3: 'Ce qu’il a de bon en lui',
  P4: 'Les outils qui servent partout',
  P5: 'Le plaisir et le sens',
  P6: 'Qui il est',
  P7: 'L’effort plutôt que le résultat',
  P8: 'Le bon exercice au bon âge',
};

export const ROLE_LABELS: Record<Role, string> = {
  decouvrir: 'Découvrir',
  pratiquer: 'Pratiquer',
  transferer: 'Transférer',
  ancrer: 'Ancrer',
  bonus: 'Bonus',
};

// ── Les 5 temps (Méthode → 10 minutes) ───────────────────────────────────────
export const FIVE_TIMES = [
  { id: 'checkin', label: 'Check-in', seconds: 45 },
  { id: 'rappel', label: 'La fois d’avant', seconds: 20 },
  { id: 'activite', label: 'L’activité', seconds: 390 },
  { id: 'debrief', label: 'Le débrief', seconds: 120 },
  { id: 'cloture', label: 'Pour finir', seconds: 30 },
] as const;

// ── Temps 1 : check-in (45 s) — « Sur 10, où t'en es ? Émotion, corps, tête » ─
export type CheckinOption = { id: string; emoji: string; label: string; mood: ChildMood | null };

export const CHECKIN = {
  intro: 'Avant de commencer, trois petites questions. Il répond d’un geste.',
  axes: [
    {
      id: 'emotion',
      question: '« Là, maintenant, t’es comment ? »',
      options: [
        { id: 'joie', emoji: '😄', label: 'Content', mood: 'disponible' },
        { id: 'calme', emoji: '🙂', label: 'Tranquille', mood: 'disponible' },
        { id: 'nervosite', emoji: '😬', label: 'Nerveux', mood: 'agite' },
        { id: 'frustration', emoji: '😤', label: 'Frustré', mood: 'renfrogne' },
        { id: 'tristesse', emoji: '😔', label: 'Pas terrible', mood: 'renfrogne' },
      ] satisfies CheckinOption[],
    },
    {
      id: 'corps',
      question: '« Et ton corps ? »',
      options: [
        { id: 'fatigue', emoji: '😴', label: 'Fatigué', mood: 'fatigue' },
        { id: 'ok', emoji: '🙂', label: 'Correct', mood: null },
        { id: 'energie', emoji: '⚡', label: 'Plein d’énergie', mood: 'agite' },
      ] satisfies CheckinOption[],
    },
    {
      id: 'tete',
      question: '« Et ta tête ? »',
      options: [
        { id: 'pleine', emoji: '🌪️', label: 'Pleine', mood: 'agite' },
        { id: 'ok', emoji: '🙂', label: 'Ça va', mood: null },
        { id: 'libre', emoji: '☀️', label: 'Libre', mood: 'disponible' },
      ] satisfies CheckinOption[],
    },
  ],
  skip: 'Passer',
};

/** Humeur retenue pour le moteur : la plus « lourde » des réponses données. */
export function moodFromCheckin(selected: CheckinOption[]): ChildMood | null {
  const order: ChildMood[] = ['renfrogne', 'fatigue', 'agite', 'disponible'];
  for (const m of order) if (selected.some((s) => s.mood === m)) return m;
  return null;
}

// ── Temps 4 : débrief — les 3 questions de la Méthode (Pierce et al., 2017) ──
export const DEBRIEF = {
  intro: 'Lisez la question à voix haute. Notez sa réponse d’un tap, ou passez.',
  labels: {
    vecu: 'Ce qu’il a vécu',
    fait: 'Ce qu’il a fait',
    ailleurs: 'Où il le réutilise',
  } satisfies Record<DebriefKind, string>,
  week1Note: 'Cette semaine, pas de question « où ailleurs » : la Méthode garde la première semaine pour la relation.',
};

// ── Fin d'activité (spec §9.3, modèle Bevel) ─────────────────────────────────
export const CLOSING_SCREEN = '{minutes} minutes avec {prenom}.';
export const OVERTIME_LINE = '{extra} minutes de plus — tant mieux.';

export const SYNTHESIS = {
  rating: 'Une note, pour vous',
  outcome: {
    question: 'Ça a donné quoi ?',
    options: [
      { id: 'ACCROCHE', label: 'Il a accroché' },
      { id: 'MOYEN', label: 'Moyen' },
      { id: 'PAS_CE_SOIR', label: 'Pas ce soir' },
    ],
  },
  kept: 'Une phrase à garder ?',
  skip: 'Passer',
  /** Affiché uniquement si note ≤ 2 (spec §4.2). */
  lowRatingTitle: 'Ce qui empêche souvent celle-ci de marcher',
};

export const PRIDE_LINES = {
  done: 'Vous venez de faire quelque chose que la plupart des parents ne font jamais.',
  notReally: 'Normal. Celle-là marche souvent mieux au deuxième essai.',
};

// ── Bilan court à 4 semaines (promesse commerciale — ressenti, jamais un score) ──
export const BILAN_4_SEMAINES = {
  title: 'Quatre semaines avec {prenom}',
  intro: 'Trois questions pour vous. Il n’y a pas de bonne réponse, et rien n’est noté.',
  questions: [
    'Qu’est-ce que vous avez remarqué de différent chez {prenom} ?',
    'Quel moment vous a le plus surpris ?',
    'Et vous, vous vous sentez comment, par rapport au début ?',
  ],
  guiltScale: {
    label: 'Aujourd’hui, vous vous en voulez de manquer de temps avec {prenom} :',
    options: ['Pas du tout', 'Un peu', 'Souvent', 'Tout le temps'],
    note: 'C’est un ressenti, pour vous. Ce n’est pas un score et il n’est comparé à rien.',
  },
};

// ── Page « Le non » (spec §10) ───────────────────────────────────────────────
export const PAGE_NON = {
  title: 'Quand il dit non',
  intro: 'Il va dire non. Tous les enfants disent non, et ce n’est pas un échec — ni le sien, ni le vôtre.',
  byAge: [
    { band: '8-11', text: 'À cet âge, le non est souvent un besoin de contrôle : il veut décider de quelque chose. Donnez-lui le choix de l’activité, ou du moment.' },
    { band: '12-14', text: 'À cet âge, le non protège son autonomie. Une proposition annoncée à l’avance passe beaucoup mieux qu’une surprise.' },
    { band: '15-17', text: 'À cet âge, le non est souvent un « pas maintenant ». Proposez une fois, clairement, et laissez la porte ouverte.' },
  ],
  worse: {
    title: 'Ce qui aggrave',
    items: ['Insister ou négocier.', 'Transformer le moment en obligation.', 'Le lui reprocher plus tard.'],
  },
  works: {
    title: 'Ce qui marche',
    items: [
      'Laisser la porte ouverte, sans condition.',
      'Faire l’activité seul, devant lui, sans rien lui demander.',
      'Reproposer un autre jour, sans rappeler le refus.',
    ],
  },
  exitLine: '« Pas de souci. Je te le reproposerai. »',
  exitNote: 'Et tenez-vous-y : reproposez, un autre jour, sans mentionner le refus.',
  ctaSoft: 'Voir une activité qui marche même quand il dit non',
};

// ── Page « Quand consulter » [À VALIDER par un·e psychologue avant mise en ligne] ──
export const PAGE_CONSULTER = {
  title: 'Quand consulter',
  status: 'A_VALIDER' as const,
  intro:
    'THRIVE Maison est un programme d’activités parent-enfant. Ce n’est ni un soin, ni une évaluation, ni un suivi psychologique. Certaines situations demandent l’avis d’un professionnel.',
  signals: {
    title: 'Parlez-en à un professionnel si, depuis plus de deux semaines, votre enfant :',
    items: [
      'est triste, irritable ou vide la plupart du temps ;',
      'ne prend plus plaisir à ce qu’il aimait ;',
      'dort ou mange très différemment de d’habitude ;',
      'se retire de ses amis ou refuse d’aller à l’école ;',
      'a des crises de colère ou d’angoisse qui augmentent ;',
      'se plaint souvent de maux de ventre ou de tête sans cause trouvée.',
    ],
  },
  urgent: {
    title: 'Sans attendre',
    text: 'Si votre enfant parle de mourir, de se faire du mal, ou si vous craignez pour sa sécurité, appelez ou textez le 9-8-8, ou le 9-1-1 en cas de danger immédiat.',
  },
  whoToCall: {
    title: 'Vers qui se tourner, au Québec',
    items: [
      'Info-Social 811, option 2 — un professionnel psychosocial, 24 h/24.',
      'Votre médecin de famille, votre CLSC, ou le professionnel de l’école.',
      'Tel-jeunes (pour votre enfant) — 1 800 263-2266, texto 514 600-1002.',
      'Jeunesse, J’écoute — 1 800 668-6868, ou texte PARLER au 686868.',
      'Ligne parents — 1 800 361-5085.',
    ],
    verifyNote: '[À VÉRIFIER avant mise en ligne : numéros et horaires.]',
  },
  inApp: 'Aucune activité de l’app ne mesure, ne diagnostique ni n’évalue votre enfant.',
};

/** À reprendre dans les conditions d'utilisation (Architecture §6.2). */
export const TERMS_LINE =
  'THRIVE Maison propose des activités éducatives parent-enfant inspirées de la Méthode THRIVE. Il ne constitue ni un soin, ni une évaluation psychologique, ni un substitut à une consultation professionnelle.';

/** Sources de la méthode — lien toujours visible dans Réglages (spec §3.4). */
export const SOURCES_PAGE_TITLE = 'Les sources de la méthode';

// Données de démonstration du lot « Maison » (K, K2, L, M, N) : ce sont celles de la maquette Claude Design
// (Léo, « La cabane impossible », « 14 moments »…). Elles ne servent QU'À la galerie DEV (/__ecran) : jamais en production.
// Les vignettes, titres et durées viennent des vraies fiches (lib/p3) ; seuls les textes propres à la maquette sont littéraux.
import { P3_ACTIVITIES, WEEK_COUNT } from '../../lib/p3';
import { durationsText, posterOf } from '../../components/maison/models';
import { vignetteIdFor } from '../../lib/vignettes';
import type {
  CarnetVM, FicheVM, HomeActions, HomeVM, MomentVM, ParcoursVM, PosterVM,
} from '../../components/maison/viewModels';

const act = (id: string) => {
  const a = P3_ACTIVITIES.find((x) => x.id === id);
  if (!a) throw new Error(`fixture : activité ${id} introuvable`);
  return a;
};

// Vécues dans la maquette : semaines 1 à 7 complètes + « Mes trois personnes » (semaine 8 en cours).
const DONE = new Set<string>([
  ...P3_ACTIVITIES.filter((a) => a.week !== null && a.week <= 7 && a.programme === 'coeur').map((a) => a.id),
  'ACT-0801',
]);
const posters = (ids: string[]): PosterVM[] => ids.map((id) => posterOf(act(id), DONE));

export const HOME_ACTIONS: HomeActions = {
  onChild: () => {}, onBell: () => {}, onProfile: () => {}, onLaunch: () => {}, onOpenCard: () => {}, onMore: () => {},
  onMinutes: () => {}, onDoor: () => {}, onWeekAll: () => {}, onMomentsAll: () => {}, onMomentsChip: () => {}, onPhasesAll: () => {},
  onPhasesChip: () => {}, onAll: () => {}, onInvite: () => {}, onCarnet: () => {}, onSources: () => {},
};

/** K : « Inclus avec ton programme » ; K3 (Maison seul) : essai gratuit en haut + invitation vers l'écran Offres. */
export function homeFixture(variant: 'included' | 'trial' = 'included'): HomeVM {
  const cabane = act('ACT-0802');
  return {
    childName: 'Léo',
    childInitial: 'L',
    banner:
      variant === 'trial'
        ? { kind: 'trial', label: 'Essai gratuit · encore 24 jours' }
        : { kind: 'included', label: 'Inclus avec ton programme Individuel' },
    hero: {
      id: cabane.id,
      vignetteId: vignetteIdFor(cabane),
      vignetteLabel: cabane.title,
      title: 'La cabane impossible',
      reason: 'Le cœur de la semaine 8 : Léo découvre qu’il réussit mieux en demandant.',
      minutes: 20,
      recommendedLabel: 'Recommandé pour Léo ce soir',
      chips: [
        { glyph: 'timer', label: '20 min' },
        { glyph: 'runner', label: 'Actif' },
        { glyph: 'gift', label: 'Coussins, couverture' },
      ],
    },
    counter: { total: 14, done: 1, target: 3 },
    weekNote: 'Semaine 8 · Sur qui je compte. Les trois premières suffisent.',
    weekPosters: posters(['ACT-0801', 'ACT-0802', 'ACT-0803', 'ACT-0804']),
    moments: {
      title: 'Selon ton moment',
      actionLabel: 'Tout voir',
      chips: ['Rien à préparer', 'Soir à plat', 'Il dit non', 'En voiture', 'Bouger', '30 minutes', 'Week-end'].map((label) => ({ key: label, label })),
      activeChip: 'Rien à préparer',
      note: 'Tu peux commencer dans la minute.',
      posters: posters(['ACT-0101', 'ACT-0403', 'ACT-0903', 'ACT-1103']),
    },
    phases: {
      title: 'Tout le parcours',
      actionLabel: 'Le programme',
      chips: ['Ancrer', 'Développer', 'Intégrer'].map((label) => ({ key: label, label })),
      activeChip: 'Développer',
      note: 'Semaines 3 à 10 : le cœur du travail.',
      posters: posters(['ACT-0301', 'ACT-0401', 'ACT-0501', 'ACT-0601']),
    },
    allLabel: 'Voir les 53 activités, triées par âge',
    invite: variant === 'trial',
    carnet: [
      { id: 'c1', dateLabel: 'jeudi 8 octobre', title: 'Mes trois personnes', phrase: 'Maman, Coach Lylian, Noah. Noah, c’est pour quand j’ai peur au hockey.' },
      { id: 'c2', dateLabel: 'dimanche 4 octobre', title: 'Le podium des progrès', phrase: 'Avant, je lâchais après une erreur. Là, je reviens au jeu.' },
      { id: 'c3', dateLabel: 'mercredi 30 septembre', title: 'Spaghetti cru, spaghetti cuit', phrase: 'Son corps qui se pose : épaules basses, trois respirations.' },
    ],
    carnetEmptyText: '',
  };
}

const WEEK_TITLES = [
  'Reconnaître ses forces', 'Objectif de résultat, objectif d’effort', 'Les preuves', 'Les six émotions', 'La respiration et la phrase',
  'Le corps qui se pose', 'Se mesurer à soi', 'Sur qui je compte', 'Choisir où on regarde', 'Revivre de l’intérieur', 'Nommer ses outils',
  'Contribuer', 'Le regard du parent',
];

/** K2 : semaines 1 à 7 faites, 8 en cours, 9 à 13 à venir ; bonus en famille. */
export function parcoursFixture(): ParcoursVM {
  const weeks = Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map((week) => {
    const state = week <= 7 ? ('faite' as const) : week === 8 ? ('en_cours' as const) : ('a_venir' as const);
    return {
      week,
      title: WEEK_TITLES[week - 1],
      state,
      posters: P3_ACTIVITIES.filter((a) => a.week === week)
        .sort((a, b) => a.rank - b.rank)
        .map((a) => posterOf(a, DONE, { complement: true, locked: state === 'a_venir' })),
    };
  });
  return {
    title: 'Tout le parcours',
    subtitle: '13 semaines · 53 activités. Les trois premières de chaque semaine suffisent ; les autres vont plus loin.',
    flat: null,
    weeks,
    bonus: P3_ACTIVITIES.filter((a) => a.week === null).map((a) => posterOf(a, DONE)),
  };
}

/** L : fiche de « La cabane impossible », 20 min. */
export function ficheFixture(): FicheVM {
  const a = act('ACT-0802');
  return {
    vignetteId: vignetteIdFor(a),
    vignetteLabel: a.title,
    kicker: 'Semaine 8 · Moment 2',
    title: 'La cabane impossible',
    objective: 'Objectif : votre enfant découvre par lui-même qu’il réussit mieux en demandant.',
    durations: [10, 20, 30],
    minutes: 20,
    opener: 'Défi : une cabane avec les coussins et la couverture. Je suis là si t’as besoin.',
    steps: [
      'Il construit seul.',
      'Vous êtes là. Vous ne faites rien.',
      'Ça coince ? Attendez sa demande.',
      'Il demande : aidez tout de suite.',
      '« T’as demandé. C’est ça qu’il fallait. »',
    ],
    extensions: [],
    evidenceLevel: 'A',
    whyLine: a.why_one_line,
    whyDetail: a.why_detail,
    refusal: { help: [], donts: [...a.donts], safety: a.safety },
    materials: 'Coussins, couverture',
    variant: null,
  };
}

/** M : étape 2 sur 5, 12:24 restantes sur 20 min. */
export function momentFixture(): MomentVM {
  const a = act('ACT-0802');
  return {
    title: 'La cabane impossible',
    vignetteId: vignetteIdFor(a),
    stepIndex: 1,
    stepCount: 5,
    stepText: 'Vous êtes là.\nVous ne faites rien.',
    clock: '12:24',
    minutes: 20,
    ratio: 0.38,
    running: true,
    isLast: false,
    a11yTimer: 'Il reste 12:24 sur 20 minutes',
  };
}

/** N : l'objet gagné, ce qu'on garde, la collection (3 sur 13). */
export function carnetFixture(): CarnetVM {
  const kept = [
    { id: 'k1', activityId: 'ACT-0101', title: 'Ses trois forces', detail: 'Les trois choses', phrase: 'Il n’abandonne pas, il aide Noah, il rit fort' },
    { id: 'k2', activityId: 'ACT-0201', title: 'Ce qui dépend de lui', detail: 'Ce qui dépend de toi · 4 choses notées', phrase: null },
    { id: 'k3', activityId: 'ACT-0501', title: 'Sa phrase', detail: 'Deux outils, tu choisis', phrase: 'Je reviens au jeu' },
    { id: 'k4', activityId: 'ACT-0801', title: 'Ses trois personnes', detail: 'Mes trois personnes · Maman, Coach Lylian, Noah', phrase: null },
  ];
  const glyphs = ['medal', 'star', 'key'] as const;
  return {
    firstName: 'Léo',
    earned: [{ id: 'cle', label: 'La clé du vestiaire', detail: 'Semaine 7 complète. À ouvrir avec Léo.', glyph: 'gift' }],
    kept: kept.map((k) => ({ ...k, vignetteId: vignetteIdFor(k.activityId) })),
    objects: Array.from({ length: 13 }, (_, i) => ({ id: `o${i}`, label: `Objet ${i + 1}`, glyph: glyphs[i] ?? ('lock' as const), got: i < 3 })),
  };
}

export { durationsText };

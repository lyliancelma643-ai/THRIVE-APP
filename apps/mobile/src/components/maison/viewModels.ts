import type { IconName } from '../../design';

// Modèles de vue des écrans Maison : les VUES (HomeView, ParcoursView, FicheView, MomentView, CarnetView)
// ne reçoivent que ces objets. Les routes les construisent depuis les vraies données (p3, moments) ;
// la galerie DEV les construit depuis des fixtures. Aucune donnée de démo ne vit dans une vue.

export type PosterVM = {
  id: string;
  title: string;
  /** « 10 · 20 · 30 min » (+ « · bonus » pour un complément, dans le parcours). */
  durations: string;
  vignetteId: string;
  done: boolean;
  /** Parcours : semaine pas encore ouverte (vignette grisée). */
  locked?: boolean;
};

export type HomeChip = { key: string; label: string };

export type HomeShelfVM = {
  title: string;
  actionLabel: string;
  chips?: HomeChip[];
  activeChip?: string;
  note: string;
  posters: PosterVM[];
};

export type HomeVM = {
  childName: string;
  childInitial: string;
  /** Bandeau en haut de l'affiche : accès inclus avec un programme, ou essai gratuit en cours. */
  banner: { kind: 'included' | 'trial'; label: string } | null;
  hero: {
    id: string;
    vignetteId: string;
    vignetteLabel: string;
    title: string;
    reason: string;
    minutes: number;
    recommendedLabel: string;
    chips: { glyph: IconName; label: string }[];
  };
  counter: { total: number; done: number; target: number };
  weekNote: string;
  weekPosters: PosterVM[];
  moments: HomeShelfVM | null;
  phases: HomeShelfVM | null;
  allLabel: string;
  /** Invitation discrète vers l'écran Offres de l'app (style Veillée, jamais un paiement web). */
  invite: boolean;
  carnet: { id: string; dateLabel: string; title: string; phrase: string | null }[];
  carnetEmptyText: string;
};

export type HomeActions = {
  onChild: () => void;
  onBell: () => void;
  onProfile: () => void;
  onLaunch: () => void;
  onOpenCard: (id: string) => void;
  onMore: () => void;
  onMinutes: () => void;
  onDoor: (key: 'toutes' | 'programme' | 'carnet' | 'refus' | 'videos') => void;
  onWeekAll: () => void;
  onMomentsAll: () => void;
  onMomentsChip: (key: string) => void;
  onPhasesAll: () => void;
  onPhasesChip: (key: string) => void;
  onAll: () => void;
  onInvite: () => void;
  onCarnet: () => void;
  onSources: () => void;
};

export type ParcoursWeekVM = {
  week: number;
  title: string;
  state: 'faite' | 'en_cours' | 'a_venir';
  posters: PosterVM[];
};

export type ParcoursVM = {
  title: string;
  subtitle: string;
  weeks: ParcoursWeekVM[];
  /** Mode « Quand il dit non » (filtre) : une seule grille, sans semaines. */
  flat: PosterVM[] | null;
  bonus: PosterVM[];
};

export type FicheVM = {
  vignetteId: string;
  vignetteLabel: string;
  kicker: string;
  title: string;
  objective: string;
  durations: number[];
  minutes: number;
  opener: string;
  steps: string[];
  extensions: string[];
  /** Meilleur niveau de preuve parmi les sources (A, B ou C), s'il y en a. */
  evidenceLevel: 'A' | 'B' | 'C' | null;
  whyLine: string;
  whyDetail: string;
  /** Rangée « S'il dit non » : consignes quand ça coince, à éviter, limite de sécurité. */
  refusal: { help: string[]; donts: string[]; safety: string | null } | null;
  materials: string;
  variant: string | null;
};

export type MomentVM = {
  title: string;
  vignetteId: string;
  stepIndex: number;
  stepCount: number;
  stepText: string;
  clock: string;
  minutes: number;
  ratio: number;
  running: boolean;
  isLast: boolean;
  a11yTimer: string;
};

export type CarnetVM = {
  firstName: string;
  earned: { id: string; label: string; detail: string; glyph: IconName }[];
  kept: { id: string; activityId: string; vignetteId: string; title: string; detail: string; phrase: string | null }[];
  objects: { id: string; label: string; glyph: IconName; got: boolean }[];
};

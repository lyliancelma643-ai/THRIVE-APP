/**
 * Visite guidée de Maison (première arrivée du parent) : 8 écrans, passable à tout moment, dans l'ordre
 * le soir → le temps → le programme → le carnet → lancer → pendant → finir.
 * Chaque étape éclaire un vrai élément de l'écran (`anchor`) ou, pour ce qui se passe hors de Maison
 * (pendant et à la fin de l'activité), montre une petite illustration (`visual`). Textes seuls ici : la vue est dans MaisonTour.
 */

export type TourAnchorId = 'hero' | 'duration' | 'programme' | 'carnet' | 'launch' | 'counter';
export type TourVisual = 'pendant';

export type TourStep = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Élément de Maison mis en lumière. Absent : carte centrée. */
  anchor?: TourAnchorId;
  visual?: TourVisual;
};

export type TourInput = { childName: string; weekTarget: number };

export function tourSteps({ childName, weekTarget }: TourInput): TourStep[] {
  const name = childName.trim() || 'votre enfant';
  return [
    {
      key: 'bienvenue',
      eyebrow: 'Bienvenue',
      title: 'Maison, en une minute',
      body: `Chaque soir, un moment simple à vivre avec ${name}. On vous montre l’essentiel, en 7 repères.`,
    },
    {
      key: 'soir',
      eyebrow: '1 · L’activité du soir',
      title: 'Choisie pour vous, chaque jour',
      body: `L’app propose une activité adaptée à l’âge de ${name} et à là où vous en êtes. Rien à chercher.`,
      anchor: 'hero',
    },
    {
      key: 'temps',
      eyebrow: '2 · Votre temps',
      title: 'Vous choisissez la durée',
      body: 'Soirée chargée ? Touchez ici pour raccourcir. Envie de prolonger ? Allongez. Le contenu s’adapte tout seul.',
      anchor: 'duration',
    },
    {
      key: 'programme',
      eyebrow: '3 · Le programme',
      title: `${weekTarget} activités par semaine`,
      body: `Elles se suivent dans l’ordre. Quand les ${weekTarget} sont vécues, la semaine suivante s’ouvre. Pas de retard, pas d’échec : à votre rythme.`,
      anchor: 'programme',
    },
    {
      key: 'carnet',
      eyebrow: '4 · Le carnet',
      title: 'Le carnet garde tout',
      body: `Après chaque activité, les phrases de ${name} et vos ressentis s’y rangent tout seuls, semaine après semaine.`,
      anchor: 'carnet',
    },
    {
      key: 'lancer',
      eyebrow: '5 · Lancer',
      title: 'Un geste pour commencer',
      body: '« Voir la fiche » pour la lire avant (but, matériel). « Lancer » quand vous êtes prêts : l’app vous guide pas à pas.',
      anchor: 'launch',
    },
    {
      key: 'pendant',
      eyebrow: '6 · Pendant l’activité',
      title: 'Laissez-vous guider',
      body: 'Rien à préparer, rien à retenir.',
      visual: 'pendant',
    },
    {
      key: 'finir',
      eyebrow: '7 · Finir',
      title: 'Une étoile s’allume',
      body: `« Terminer l’activité », quelques questions (toutes facultatives), puis « Garder ce moment ». Chaque moment gardé allume une étoile : ${weekTarget} étoiles, la semaine est complète.`,
      anchor: 'counter',
    },
  ];
}

/** Lignes de l'illustration « Pendant l'activité » : les étiquettes reprennent les boutons de l'activité. */
export const PENDANT_ROWS: { tag: string; text: string }[] = [
  { tag: 'Dis', text: 'La phrase à dire à votre enfant, mot pour mot.' },
  { tag: 'Suivant', text: 'Un tap, le temps suivant. À votre rythme.' },
  { tag: 'Minuteur', text: 'Jeu chronométré ? « Lancer le minuteur » : l’app garde le temps.' },
  { tag: '✕', text: 'Il ne veut plus ? Fermez : l’app propose de garder ce qui a été fait.' },
];

/** Clé locale « visite vue », par compte (un autre parent sur le même téléphone la verra). */
export const tourStorageKey = (userId: string) => `thrive.tour.maison.v1.${userId}`;

import type { Stage } from '@thrive/shared';

/** Scénarios de l'escalier : 4 marches = 4 événements réels (voir les branchements). */
export type StairScenario = {
  title: string;
  doneTitle: string;
  doneSubtitle?: string;
  cta: string;
  stages: Stage[];
};

export function ouvertureScenario(opts: { childName?: string | null; week?: number | null; theme?: string | null }): StairScenario {
  const { childName, week, theme } = opts;
  return {
    title: 'Ton espace se prépare',
    doneTitle: 'C’est prêt.',
    doneSubtitle: 'Tout est prêt pour ce soir.',
    cta: 'Commencer',
    stages: [
      { key: 'session', label: 'Connexion sécurisée' },
      { key: 'profil', label: childName ? `Le profil de ${childName}` : 'Le profil de ton enfant' },
      { key: 'semaine', label: week ? `La semaine ${week}${theme ? ` · ${theme}` : ''}` : 'La semaine en cours' },
      { key: 'acces', label: 'Ton accès THRIVE Maison' },
    ],
  };
}

export const paiementScenario: StairScenario = {
  title: 'On finalise ton abonnement',
  doneTitle: 'Bienvenue dans THRIVE Maison.',
  cta: 'Commencer',
  stages: [
    { key: 'paiement', label: 'Paiement confirmé' },
    { key: 'abonnement', label: 'Abonnement vérifié' },
    { key: 'acces', label: 'Accès ouvert' },
    { key: 'donnees', label: 'Ton espace se prépare' },
  ],
};

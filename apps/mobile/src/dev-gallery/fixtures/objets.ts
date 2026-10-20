import { buildObjectModel, type ObjectModel, type RewardPayload } from '../../components/maison/objets/logic';
import { DEMO_CHILD } from './bilanPage';
// Données de la MAQUETTE des objets du carnet (N2, N3, N4) : galerie DEV uniquement, jamais dans l'app.
// Les modèles passent par `buildObjectModel`, comme la route de production.

const model = (id: string, payload: RewardPayload, earnedAt: string): ObjectModel =>
  buildObjectModel({
    id,
    firstName: DEMO_CHILD.name,
    row: { payload, earned_at: earnedAt },
    earnedIds: new Set([id]),
  });

export const OBJET_IDENTITE = model(
  'fiche_identite',
  {
    forces: ['Il n’abandonne pas', 'Il aide son coéquipier', 'Il rit fort'],
    choix: ['Le hockey, même quand il pleut'],
    reve: ['Marquer un but en tournoi, devant mamie.'],
  },
  '2026-10-12T12:00:00Z',
);

export const OBJET_OUTILS = model(
  'boite_a_outils',
  {
    outils: [
      'Le ballon : 4 dedans, 8 dehors',
      'Ma phrase : « Je reviens au jeu »',
      'Spaghetti cuit avant le match',
      'Mes deux colonnes',
      'Mon escalier, une marche à la fois',
      'Mes personnes : maman, Coach',
      'Mon mot : « Calme »',
    ],
  },
  '2026-11-20T12:00:00Z',
);

export const OBJET_CERTIFICAT = model(
  'certificat',
  {
    forces_s1: ['Il n’abandonne pas', 'Il aide', 'Il rit fort'],
    forces_s13: ['Il revient au jeu', 'Il demande de l’aide', 'Il encourage'],
    a_garder: ['Une erreur, ce n’est pas la fin du match.'],
  },
  '2027-01-13T12:00:00Z',
);

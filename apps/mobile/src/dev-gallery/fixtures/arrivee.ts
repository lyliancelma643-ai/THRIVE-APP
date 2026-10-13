// Données de démonstration du lot « arrivée et compte » : ce sont celles de la maquette Claude Design
// (Camille Tremblay, Léo, Inès…). Elles ne servent QU'À la galerie DEV (/__ecran) : jamais en production.

export const PARENT = {
  firstName: 'Camille',
  lastName: 'Tremblay',
  email: 'camille.tremblay@exemple.ca',
} as const;

export const KIDS = [
  { id: 'kid-leo', first_name: 'Léo', age: 11, sport: 'Hockey', session: 8, jersey: '17' },
  { id: 'kid-ines', first_name: 'Inès', age: 14, sport: 'Natation', session: 3, jersey: '4' },
] as const;

export const SPORTS = ['Hockey', 'Soccer', 'Natation', 'Basketball', 'Gymnastique', 'Tennis', 'Autre sport'] as const;

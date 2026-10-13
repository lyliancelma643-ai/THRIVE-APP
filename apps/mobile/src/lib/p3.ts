// Contenu et règles du programme Maison (P3) : une seule source pour le web et
// le mobile. Le module web est pur (aucun React, aucune API navigateur) ; Metro
// le résout grâce à `watchFolders` sur la racine du monorepo (metro.config.js).
export * from '../../../web/src/lib/p3-moments/index';
export { ageFromBirthDate, p3Pool } from '../../../web/src/lib/p3-moments/app';
// Ajouts rétro-compatibles (GO 4 · mode activité) : textes d'accompagnement du mode activité (check-in, débrief,
// synthèse, clôture), gabarits et dates, choix du lieu. Rien n'est renommé ni retiré.
export { CHECKIN, CLOSING_SCREEN, DEBRIEF, OVERTIME_LINE, PILLAR_PLAIN, PRIDE_LINES, SYNTHESIS } from '../../../web/src/lib/p3-moments/guide';
export { PLACE_CHOICES, captureText, fill, formatFullDate, inOneYear } from '../../../web/src/lib/p3-moments/app';
export type { P3Checkin, P3Outcome } from '../../../web/src/lib/p3-moments/app';

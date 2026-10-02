// Contenu et règles du programme Maison (P3) : une seule source pour le web et
// le mobile. Le module web est pur (aucun React, aucune API navigateur) ; Metro
// le résout grâce à `watchFolders` sur la racine du monorepo (metro.config.js).
export * from '../../../web/src/lib/p3-moments/index';
export { ageFromBirthDate, p3Pool } from '../../../web/src/lib/p3-moments/app';

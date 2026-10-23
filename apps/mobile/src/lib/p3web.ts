// Module Maison du web, complet (règles, couche applicative, textes du guide, rangées) : une seule source de vérité
// pour les écrans portés du web. Tout est pur (aucun React, aucune API navigateur) ; Metro le résout grâce à
// `watchFolders` sur la racine du monorepo (metro.config.js), comme lib/p3.ts.
export * from '../../../web/src/lib/p3-moments/index';
export * from '../../../web/src/lib/p3-moments/app';
export * from '../../../web/src/lib/p3-moments/guide';
export * from '../../../web/src/lib/p3-moments/shelves';

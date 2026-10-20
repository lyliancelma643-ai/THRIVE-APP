// Matrice de droits des forfaits (Groupe / Individuel / Complet) : une seule source pour le web et le mobile.
// Le module web est pur (aucun React, aucune API navigateur) ; Metro le résout grâce à `watchFolders` sur la racine
// du monorepo (metro.config.js), comme `lib/p3.ts`. Rien n'est recopié ici : la seule vérité du droit reste
// `access_state()` (serveur) ; cette matrice ne sert qu'à savoir ce que chaque forfait ouvre dans l'affichage.
export { PACK_ORDER, PLAN_FEATURES, can } from '../../../web/src/lib/packs';
export type { Pack, PlanFeature } from '../../../web/src/lib/packs';

# Rapport — mouvement et chargement

## 1. Fait (par bloc)
- **Tokens et moteurs partagés** (`packages/shared/src/motion/*`, `content/microcopy.ts`) : `DUR/EASE/THRESH/STAGGER`, `useDelayedFlag`, `useLoadStages` (moteurs purs testés), `pickMicrocopy`.
- **Mobile** (`apps/mobile/src/components/motion/*`) : `StairLoader`, `Mascot` (repli disque + yeux), `WaveSkeleton`/`DelayedSkeleton`, `HairlineRefresh`, `ProgressRing`, `OdometerNumber`, `UploadProgress`, `SealLetter`, `ClosingSequence` (`ClosingCount`, `PrideFade`), `Glint` (`UnlockRise`), `BreathingBall`, `MicroTip`, `Rise`, `Pop`, `ScaleBar`, `OpeningGate`.
- **Web** (`apps/web/src/components/motion/*`) : mêmes noms (hors `PushTransition`/`TabTransition`), tokens CSS + keyframes Tailwind, `Skeleton` en vague.
- Banc de contrôle DEV : `/__ecran?e=MOT-escalier|MOT-escalier-rafale|MOT-squelette|MOT-anneau|MOT-lettre|MOT-photo|MOT-souffle|MOT-mot`.

## 2. Branchements
Voir `docs/motion/PLAN.md` (tableau). Nouveau côté mobile : escalier d'ouverture dans Maison, filet sous l'en-tête aux relectures, cascade de la fiche, lettre scellée, fin d'activité, souffle.

## 3. Écarts par rapport au prompt
- **Reanimated non utilisé** : tout le code existant est en `Animated` (pilote natif) ; rester dessus évite un risque de crash natif sans appareil pour tester.
- **`TabTransition` / `PushTransition` web non créés** : le `TabPager` existant garde déjà les onglets montés (aucun squelette à la revisite) ; le toucher ne change pas la structure de navigation.
- **Upload de photo** : l'app n'a aucun envoi de photo aujourd'hui ; `UploadProgress` est prêt (progression réelle ou barre indéterminée) mais pas branché.
- **`ProgressRing`/`OdometerNumber` dans le Bilan** : le Bilan est un document web partagé sans anneau ; seul son squelette utilise l'anneau.
- **Escalier d'ouverture** : « semaine {n} · thème » n'est pas encore lu à ce stade → libellé générique « La semaine en cours ». Session restaurée : on enchaîne sans bouton ; pas de bouton non plus après connexion.
- **Tests Playwright / axe** non écrits (aucun `@axe-core/playwright` dans le dépôt, parcours protégés). À faire avec un compte de test.
- Phrase « Tu peux quitter cet écran : on termine pour toi. » conservée : le webhook Stripe finalise bien côté serveur.

## 4. Reste à Lylian
- Images de la mascotte (`public/mascotte/{pose}.webp`, `assets/mascotte/`) puis passer `MASCOT_IMAGES_READY` à vrai / déclarer les `require`.
- Valider les 7 définitions (`reviewed: false`, masquées en production).
- « Garder ce mot » et les questions restent sur l'appareil ; une table Supabase serait nécessaire pour les relire côté coach (non créée).

## 5. Incohérences relevées
- Les fiches P3 vouvoient (« Vous ne dessinez pas ») alors que le reste tutoie ; non réécrit.
- « Tu t'es arrêté pour {prénom} » / « Tu n'as pas à être parfait » sont au masculin ; à rendre neutres si le parent peut être une femme.
- L'enveloppe de la référence laisse dépasser la feuille hors du cadre ; ici elle est rognée.

## 6. Résultats
- Moteurs partagés : 13 tests verts. Mobile : tsc, eslint (0 erreur), 495 tests verts. Web : tsc, lint, 466 tests verts (après compilation de `@thrive/shared`).
- Poids web ajouté : non mesuré (petits composants, aucune dépendance).

## 7. Questions
1. Veux-tu un bouton « Commencer » après connexion (au lieu d'enchaîner seul) ?
2. Brancher l'escalier d'ouverture aussi sur le web ?
3. Un envoi de photo dans le carnet est-il prévu (pour `UploadProgress`) ?

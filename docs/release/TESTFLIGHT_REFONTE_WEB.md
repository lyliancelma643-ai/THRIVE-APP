# Refonte TestFlight — l'app reprend l'espace parent du web

**Date** : 2026-10-23 · **Branche** : `claude/testflight-ui-ux-refinement-27a66d` (3 commits, non poussée)

## Ce qui a changé (copié du web)

| Zone | Avant (TestFlight) | Maintenant |
|---|---|---|
| En-tête | Enfant + 2 boutons (cloche, compte) | Comme le web : logo, « Léo · 12 ans ⌄ », **Messagerie** (non-lus), **Notifications** (panneau déroulant), **Ambiance** soleil/lune, **Compte** (menu : abonnement, paramètres, déconnexion) |
| Maison | Canevas iOS 27 (affiche plein cadre) | Accueil du web : arche, « Recommandé pour… », Lancer / Voir la fiche, menu « … » (Pas ce soir, Mettre de côté, Il ne veut pas), puce du soir (durée + lieu), 4 portes + séances vidéo 20 min, semaine en velours, rangées, « Selon ton moment », « Tout le parcours », catalogue, bilan à 4 semaines, carnet |
| Toutes les activités | Liste filtrée | Catalogue du web : version par âge, filtres, ordre, grille par phase |
| Le programme | « Tout le parcours » | 13 semaines + détail de semaine + bibliothèque (rayons) |
| Le carnet | Vue iOS | Carnet du web : moments sur papier vergé, objets à leur date, objets à venir |
| Quand il dit non | Vue iOS | Page du web, tranche de l'enfant d'abord, fiche anti-refus |
| Fiche activité | Vue iOS | Fiche du web : « Ce qu'on travaille », puces, durée, phrase d'ouverture (copier), déroulé, à éviter, pourquoi ça marche (3 niveaux), barre Lancer / Favori / De côté / Autre |
| Bilan | Cartes natives refaites | **Gabarit HTML du web rendu à l'identique** (composant DOM Expo, local) ; fiches détaillées, explications et passeport en feuilles iOS |
| Mes séances | Vue iOS | Page du web : jauge 0/13, prochaine séance (**Calendrier d'iOS**), 13 séances, bilan du coach déplié |
| Messagerie | « Aucun message » sans issue | Fils **coach** et **Support THRIVE** toujours présents (créés au besoin, comme le web) |

Les deux styles de l'app pilotent les ambiances du web : **Veillée = Nuit calme**, **Lin = Jour clair** (même réglage dans Compte et dans le rond soleil/lune).

## Ce qui est gardé de l'app

- Toute la section **Compte** (dont le choix Lin / Veillée).
- **Vidéos — bientôt** (« Me prévenir de l'ouverture »), ouverte par la porte « Les séances vidéo de 20 min ».
- Les **animations Apple** : feuille de choix d'enfant, feuilles du bas à ressort (glisser pour fermer), barre d'onglets en verre, rond détaché.
- Le **rond en bas à droite** → messagerie (coach + support), avec pastille de non-lus, dans les deux styles.
- Le **mode activité** (déroulé plein écran à la lampe), les objets, l'abonnement App Store (PremiumGate), les offres.

## Conformité Apple

- Aucun prix ni lien d'achat externe (3.1.1) : les liens « Voir les forfaits » du gabarit Bilan sont masqués tant que `EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP` est faux (production) ; « Rencontrer un coach » = page de rendez-vous configurée ou messagerie.
- Permission Calendrier déclarée (`expo-calendar`), demandée seulement au geste « Ajouter au calendrier ».

## Nouveaux modules natifs (nouveau build obligatoire)

`@expo/dom-webview` (Bilan), `expo-clipboard` (copier la phrase), `expo-calendar` (ajout au calendrier).

## Vérifié

- `tsc` sans erreur, **493 tests** verts (dont 8 nouveaux : ambiances, routage des notifications, état de la soirée).
- `expo export --platform ios` : bundle natif + bundle DOM du Bilan compilés.
- Rendu contrôlé écran par écran dans le banc DEV (`/__ecran?e=HK|HT|HP|HC|HN|HSO|HF|HB|HS&s=veillee|lin`).
- **Non vérifié** : exécution sur iPhone / simulateur (CocoaPods absent de ce Mac) → à confirmer sur le build TestFlight.

## Pour publier sur TestFlight (depuis `apps/mobile`)

```bash
npx -y eas-cli@16 build --platform ios --profile production
```

```bash
npx -y eas-cli@16 submit --platform ios --latest
```

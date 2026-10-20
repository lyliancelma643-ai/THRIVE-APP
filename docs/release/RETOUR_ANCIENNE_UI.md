# Revenir à l’ancienne interface (et repasser à la nouvelle)

L’interface d’avant iOS 27 n’est pas supprimée. Elle est gardée telle quelle sur la branche **`archive/ui-avant-ios27`** (et le tag `ui-avant-ios27`), c’est-à-dire l’état exact de `main` juste avant la fusion du GO 5.

Toutes les commandes se lancent dans le Terminal, à la racine du dossier `thrive APP`, sur `main`.

| Je veux… | Commande |
|---|---|
| Savoir quelle interface est active | `pnpm ui:etat` |
| **Remettre l’ancienne interface sur main** | `pnpm ui:ancienne` |
| Remettre la nouvelle (Lin / Veillée) | `pnpm ui:nouvelle` |
| Juste ouvrir l’ancienne version pour la regarder, sans toucher main | `pnpm ui:voir-ancienne` (puis `git switch main` pour revenir) |

## Ce que fait chaque bascule

- Un seul commit « Revert » sur `main`, en local. Rien n’est poussé, rien n’est effacé de l’historique. On peut basculer autant de fois qu’on veut.
- Si tu as des modifications non enregistrées, la commande s’arrête sans rien toucher.
- Si des commits faits **après** la fusion modifient les mêmes fichiers, la bascule peut tomber sur un conflit. La commande annule alors tout et te le dit. Dans ce cas, `pnpm ui:voir-ancienne` permet toujours de lancer l’ancienne version telle quelle.

## Ce qui ne bascule pas

- **La base de données.** Si les migrations 081, 082 ou 083 (paiements des programmes, appels, style de l’app) ont été appliquées en production, elles y restent. L’ancienne interface les ignore sans problème. Leurs fichiers de retour arrière sont dans `supabase/rollbacks/`, à appliquer à la main si un jour tu veux aussi les retirer.
- **Les builds déjà publiés** sur l’App Store ou TestFlight. Basculer `main` ne change que le code ; il faut refaire un build pour publier l’autre interface.
- **GitHub.** Pour que l’archive existe aussi en ligne : `git push origin archive/ui-avant-ios27 ui-avant-ios27` (une fois).

# GO 4 : rapport de chantier (UI Lin et Veillée)

- **Branche** : `feature/ios27-lin-veillee` (worktree `.claude/worktrees/go-4-89318d`), créée depuis `feature/ios27-ui-paiements` (base `a78501c`). Elle a été créée dans ce worktree et non dans celui du GO 3, parce qu'une autre session Claude et un serveur Expo utilisaient ce dernier.
- **Commits** : 18 au-dessus de `a78501c` (HEAD avant ce rapport : `ce799cc`).
- **Date** : 2026-10-13
- **Non poussée** (absente de `origin`). Rien appliqué en prod, aucun appel Stripe, aucune écriture en base. La migration 083 est modifiée en place et **non appliquée**.

Documents liés : `GO4_INVENTAIRE.md` (L0), `GO4_G1_REVUE.md` (revue G1), `GO4_UI_LIN_VEILLEE.md` (prompt), `GO3_RAPPORT.md`, `CHECKLIST_TOI.md` (section GO 4 en fin de fichier).

## 1. Statut par lot

Légende : **FAIT** = livré en local et vérifié par la batterie ; **FAIT (partiel)** = livré avec un écart listé ; **À TOI** = une action humaine reste ; **BLOQUÉ** = impossible sans accès externe.

| Lot | Statut | Commits | Résumé |
|---|---|---|---|
| L0 Inventaire | FAIT | `2df2a51` | `GO4_INVENTAIRE.md`, empreinte avant chantier. |
| L1 Fondations | FAIT | `35c7fd7`, `003d420`, `c04519f`, `a0df7dd`, `27373fa`, `d845bb5` | Maquettes V4/V5 copiées (+ LISEZMOI). Tokens repris de `final.css`, `ThemeScope`, matières (Paper, Felt, Velvet, Enamel, Star, Arch, Lamp, Texture), 9 tuiles PNG, onglets Coach / Ce soir. Couche de compatibilité des anciens styles retirée. Tests de tokens et de contraste AA. |
| L2 Arrivée et compte | FAIT | `4b467a1` | Écrans A à F et X. Sélecteur de style à deux tuiles. |
| L3 Maison | FAIT | `9192ee4` | K, K2, L, N, K3. Captures web. |
| L4 Mode activité | FAIT | `818afa5`, `ce799cc` | M1 à M17. Réducteur pur testé. Corrections G1 : durée plafonnée à 4 h, sortie possible après un échec d'enregistrement. |
| L5 Bilan | FAIT | `6cb278f`, `9beaccc` | G, G11, G2, G3 à G10, H, I, J : 16 cartes. Nouveau `bilanExtraApi.ts`, en lecture seule. |
| L6 Coach, séances, messages, fin | FAIT | `66ad43f` | S, T, U, V, O (« Bientôt disponible »), W, Z, S2, U2. Captures web. P, Q, R non construits (aperçus). |
| L7 Offres et abonnement | FAIT (partiel) | `8a15806` | D2, Y, Y2, Y3, X2, X2b : habillage seul, logique de paiement inchangée. D3 non construit. |
| H1 à H3 Vérifications | FAIT | `88072cb`, `9beaccc` | Batterie et greps. Corrections : mot « score » retiré du Bilan, prénoms de démo déplacés en fixtures. |
| O6 Style serveur (083) | À TOI | `a51f52b` | Migration, rollback et tests SQL modifiés en place. PGlite 14/14. **Non appliquée.** |
| G1 Revue | FAIT (À TOI pour D1 à D5) | `053e3ca`, `ce799cc` | Verdict initial À CORRIGER (deux points). Les deux corrections sont faites et testées. Décisions D1 à D5 à trancher (§6). |
| Rendu natif | NON_VÉRIFIÉ | | Aucun rendu iOS ni Android (§5). |

## 2. Résultats de la batterie

Commandes lancées depuis la racine du worktree. `pnpm` absent du PATH : shim vers `corepack pnpm` (pnpm 9.15.9).

| Contrôle | Avant GO 4 | Après GO 4 | Verdict |
|---|---|---|---|
| `pnpm typecheck` (racine, mobile et web) | 0 erreur | 0 erreur (exit 0) | Identique |
| `pnpm lint` mobile | 1 erreur (`lib/secure-storage.ts:85`) + 10 avertissements | 1 erreur (même ligne, préexistante) + 10 avertissements | Identique |
| `pnpm lint` web | `next lint` (avertissement de dépréciation) | Passe, même avertissement | Identique |
| `pnpm test` (racine, web) | 5 suites KO (`@thrive/shared` non construit), 426 tests OK | 5 suites KO (même cause), 426 tests OK | Identique |
| `vitest run src` (`apps/mobile`) | 19 fichiers, 160 tests | 26 fichiers, 372 tests, tous verts | +7 fichiers, +212 tests |

Notes : le `test` racine ne couvre pas le mobile, qui se lance à part. La revue G1 comptait 367 tests mobiles ; les 5 tests de plus viennent de la correction `ce799cc`. Le lint racine sort en code 1 à cause de l'erreur préexistante, pas d'une erreur nouvelle.

## 3. État du dépôt

- `git status` propre avant ce rapport.
- `git diff --name-only a78501c..HEAD` : 177 fichiers. **Aucun `.env*`.**
- Binaires ajoutés : 9 tuiles de texture (160 × 160 px, sauf `laid` 30 × 4, `linen` 3 × 3, `ribs` 6 × 6, répétées) ; 21 captures PNG de 49 à 831 Ko.
- **Capture recompressée** : `docs/release/go4-captures/L3-K2-lin-long.png` ramenée de 1,1 Mo à 359 Ko (commit de08313).

## 4. Écarts de fidélité connus

- **Fraunces** : instances statiques 400, 500 et 600, sans axe SOFT, sans italique. Approximation (R12).
- **Textures** : tuiles PNG répétées ; sur Android, repli en aplat. Jamais animées.
- **Verre** : natif iOS 26 et plus ; sinon flou (`expo-blur`), ou opaque avec « Réduire la transparence ». `blurRadius` non rendu sur le web.
- **Ombres** RN approchées de `final.css`.
- **Pas d'`expo-keep-awake`** : l'écran peut se mettre en veille pendant le minuteur du mode activité. La vibration (expo-haptics) remplace le bip.
- **Éléments web non portés** dans le mode activité : feuille « visuel », bouton « Ses outils », télécharger ou imprimer la récompense.
- **Passeport** : pas de sélecteur de photo (J).
- **Libellé EPOCH** (nom produit) conservé.
- **Étoiles de la carte velours** en sauge, pour ne garder qu'un seul soleil.
- **« 3 semaines d'affilée » retiré** de la carte : c'est une série, interdite par la règle 5.
- **Séance manquée** affichée « À replanifier ».
- **Lettre du Bilan (G9)** : le mobile n'affiche jamais le texte, le web oui (D4).
- **Libellé « Léo » restant** : `apps/mobile/src/app/__design.tsx:123` (galerie de design, hors DEV elle redirige), et deux commentaires (`components/bilan/bilanData.ts:180`, `components/bilan/Chrome.tsx:25`). Pas de donnée rendue.

Vérifications de H2 et H3 : aucun lien ni prix de paiement web dans Maison, Activité ou Bilan (seulement des textes « sans lien, sans prix »). Les mots `natif`, `nuit`, `carnet` n'apparaissent que dans la table de migration, son test, la route `carnet` et « verre natif ».

## 5. NON_VÉRIFIÉ

- **Rendu natif iOS et Android** de tous les écrans. Aucun simulateur dans cette batterie.
- **Captures** : web seulement, pour L3 (K, K2, K3, L, N) et L6 (O, S, T, U, V, W, Z). Aucune pour L2, L4, L5 ni L7.
- **Écritures réelles** de `p3_moments` et `p3_letters` : non testées en base.
- **Comparaison côte à côte** avec `maquettes-ios27/apercus/` : non faite.
- **Migration 083 GO 3 vers GO 4** : vérifiée hors dépôt (script de la revue G1). Le `run-pglite.mjs` du dépôt couvre GO 4 (14/14), pas le passage depuis GO 3.
- **Hors ligne réel** : comportement déduit du code et des tests du réducteur, non observé.
- **Revue G1, remarques R1 à R5** : toujours ouvertes (commentaire de la colonne 083, `rightsFor()` recopié de `packs.ts`, deux écrivains de `p3_moments`, `keep-awake`, test de migration hors dépôt).

## 6. Décisions à valider par Lylian

| # | Sujet | Recommandation |
|---|---|---|
| R5 | Style par défaut `lin` (décidé seul) | Confirmer. |
| R11 | Anciennes valeurs normalisées : `natif` et `carnet` vers `lin`, `nuit` vers `veillee` | Confirmer. Aucune valeur n'est perdue. |
| R12 | Fraunces sans axe SOFT, textures en tuiles PNG | Accepter l'écart, juger sur simulateur. |
| R13 | Design system artifact « THRIVE iOS 27 » périmé | `final.css` fait foi. Mettre l'artifact à jour dans un chantier séparé, si utile. |
| D1 | Invitation Offres de K3 (« Envie d'aller plus loin ? ») réservée à Veillée (`components/maison/models.ts:88-90`), alors que la maquette l'affiche dans les deux styles | Afficher dans Lin et Veillée : supprimer la condition `styleKey`, garder `sourceMaison !== 'pack'`. Pas de lien web, donc pas de risque d'anti-steering. |
| D2 | Libellé X2 « Programme réglé par Stripe · aucun abonnement séparé » | Acceptable tel quel (reconnaissance d'un achat, sans lien). Pour un risque nul en revue Apple : « Inclus avec ton programme · aucun abonnement séparé ». |
| D3 | Lettre scellée, puis « Non » à « Enregistrer ce moment ? » | Garder : la lettre reste scellée, le moment n'est pas compté. Ajouter « Ta lettre reste scellée » sous le titre de M17. |
| D4 | Lettre du Bilan (G9) : mobile sans texte, web avec texte | Garder le mobile. Aligner le web plus tard. Décider si la lettre se descelle après 12 mois : aucune date n'est stockée aujourd'hui. |
| D5 | Règle « un seul soleil » sur V (points non lus) et G en Veillée (marques d'état) | Accepter, comme sur la maquette : la règle vise le geste, pas les marques d'état. Corriger le commentaire de `components/bilan/BilanCards.tsx:17`. |

Décision technique à prendre (hors G1) : `expo-keep-awake`, à ajouter ou à accepter. Voir `CHECKLIST_TOI.md`.

## 7. Prochaines étapes

1. Trancher R5, R11, R12, R13 et D1 à D5.
2. Relire et appliquer la migration 083 modifiée (`a51f52b`) avec 081 et 082, après validation. Vérifier `get_advisors`.
3. ~~Recompresser `L3-K2-lin-long.png`~~ (fait).
4. Tests manuels sur simulateur iOS (Lin, Veillée, mode activité, accessibilité).
5. Pousser la branche une fois validée.

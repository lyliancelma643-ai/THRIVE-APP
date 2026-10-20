# GO 5 : finition Lin et Veillée, parité avec l'UX actuelle

> Rapport d'exécution du prompt `docs/release/GO5_FINALISATION_LIN_VEILLEE.md`, daté du 2026-10-20.

## 1. État de la fusion : NON FAITE

- **Branche** : `feature/ios27-lin-veillee`, tête `6dc5cf8`, **87 commits** au-dessus de `main` (`3af7908`). Non poussée.
- **Archive** : `archive/ui-avant-ios27` et tag `ui-avant-ios27` créés sur `3af7908`, vérifiés. Ils ne bougent pas.
- **Fusion dans `main`** : **bloquée**. Le classifieur de permissions a refusé la commande `git merge --no-ff feature/ios27-lin-veillee` (catégorie « Production Deploy »). Je ne l'ai pas contournée. `main` est resté à `3af7908`.
- **Tag `ui-lin-veillee-fusion`** : non posé (dépend de la fusion).
- **Preuve de bascule** (phase F5, worktree d'essai) : non faite, elle dépend de la fusion.
- **Fichiers racine** : les copies non suivies identiques à la branche (`GO3_*`, `GO4_*`, `GO5_*`, `docs/release/go5/`, `maquettes-ios27/`) ont été retirées puis **restaurées à l'identique** après le refus. Le dépôt principal est dans son état d'origine.

**Pour fusionner, si tu le valides** (depuis le dépôt principal, `thrive APP`) :

```bash
git merge --no-ff feature/ios27-lin-veillee -m "feat: nouvelle interface Lin et Veillée (GO 3 à GO 5)"
```

Il faudra d'abord retirer les copies racine identiques à la branche (ou les laisser si git ne se plaint pas), puis `git tag -a ui-lin-veillee-fusion -m "Fusion de la nouvelle interface Lin et Veillée"`.

## 2. Lots

| Lot | Statut | Commits |
|---|---|---|
| A0 maquettes à jour (02 ter) | FAIT | `558bfda` |
| A1 tableau de parité | FAIT, 0 route perdue sur 27 | `GO5_PARITE.md` (non suivi) |
| Dépendances (keep-awake, print, sharing, view-shot, image-picker) | FAIT | `080f53b` |
| B1 visuels MV, VI1–VI8, E1 | FAIT | `c980afe` |
| B2 objets N2–N4, « La lettre », impression, partage | FAIT | `b543920` |
| B3 K4, K5, D1 | FAIT | `dcd8ddb`, `39fa040` |
| B4 E2 photo, E5 matrice de droits, E6 écrivain unique, D2, D3, M16c, W, U2, E4, E7 | FAIT | `2865cb9`, `76b605f`, `0077db9` |
| C1 banc V4/V5 | FAIT | `42422d2` |
| C2 fidélité (A, B, C, D) | FAIT, sauf écarts gardés | `17c830e`, `74c6857`, `d16f403`, `b7b7e1d` |
| Revue G2 : C1 verrou d'écran, C2 `p3_rewards`, C3 « Voir » M13, C4 captures | FAIT | `c619942`, `f50c84b`, `a769902`, `5146449`, `39fa040` |
| F1 archive | FAIT | tag `ui-avant-ios27` |
| F2 script de bascule (`pnpm ui:*`) | FAIT sur la branche | `6dc5cf8` |
| F4 fusion dans `main` | **BLOQUÉ** (classifieur) | — |
| F5 preuve de bascule | NON FAIT | — |

## 3. Vérifications (sur `6dc5cf8`)

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck` | 0 erreur |
| `pnpm lint` | 1 erreur préexistante (`src/lib/secure-storage.ts:85`), 10 avertissements |
| `pnpm test` (racine) | web 426 OK ; 5 suites KO préexistantes (`@thrive/shared` non construit) |
| `vitest run src` (`apps/mobile`) | 486 tests verts |
| `vitest` services (anti-steering) | 45 tests verts |
| `run-pglite.mjs` | vert, dont l'étape GO 3 → GO 4 et les rollbacks |

## 4. Parité UX

- Les **27 routes** de `main` existent toutes dans la branche (0 perdue).
- La revue (`GO5_REVUE.md`, section 12) donne **OK** sur la re-vérification des quatre points bloquants.

## 5. Écarts gardés (apparence)

- Fraunces statique sans axe SOFT : graisse plus lourde que la maquette (R12).
- Verre natif, ombres RN approchées, `blurRadius` non rendu sur le web.
- Web seulement : `Arch` avec coins carrés ou ombre rectangulaire, `Star` masquée par des vues, `Texture` non répétée.
- `Sheet` : titre en sans-serif sur certains écrans du mode activité.
- Plusieurs soleils de la maquette (CALME, nœud 8, roue, routine) ramenés à un seul (règle du soleil, décision D5).

Détail par lettre dans `docs/release/go5-captures/index.html` (captures locales, non versionnées : 146 PNG, environ 85 Mo).

## 6. NON_VÉRIFIÉ

- Rendu natif iOS et Android de tous les écrans. Toutes les captures sont web.
- Photo du passeport : prise de vue réelle, permission, et GPS retiré sur Android (la photo n'est pas réduite à 512 px côté mobile, comme le fait le web).
- Écritures réelles en base depuis l'app (`p3_moments`, `p3_rewards`).

## 7. Décisions à trancher par Lylian

1. **Photo du passeport** : enregistrée dès le choix, alors que le web attend « Enregistrer ». Recommandation : aligner sur le web (le comportement actuel gagne).
2. **`PAGE_CONSULTER`** : statut `A_VALIDER` côté web (page cachée en production). Le mobile l'affiche. Décision juridique : la faire valider par un·e psychologue, ou la masquer en attendant.
3. **« Stripe » dans le programme en personne** (`ProgrammePaiementView`) : derrière le drapeau `EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP` (désactivé en iOS). Acceptable tel quel, ou libellé « Inclus avec ton programme » ?
4. **« 1 mois offert »** : présent côté web (`apps/web/src/lib/p3-moments/index.ts:259`, `RewardView.tsx:192`), retiré du mobile (D7). À décider côté web.
5. **Lettre `lettre_un_an`** : écrite au scellement sur mobile, à l'enregistrement du moment sur le web. Écart accepté par la revue.

## 8. Ce qui reste (checklist)

Voir la section GO 5 de `CHECKLIST_TOI.md`.

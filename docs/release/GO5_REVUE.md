# GO 5 — G2 · Revue finale (Opus 5.5, lecture seule + tests)

**Date** : 2026-10-20 · **Branche** : `feature/ios27-lin-veillee` à `74c6857` · **Base GO 4** : `fc8dcbe` · **main** : `3af7908`
**Verdict global : À CORRIGER** (4 points, dont 2 fonctionnels). La fusion (phase F) est **bloquée** tant qu'ils ne sont pas traités.

## 0. Batterie relancée par la revue

| Commande | Résultat |
|---|---|
| `pnpm typecheck` | OK (mobile + web) |
| `pnpm lint` | 1 erreur, la préexistante tolérée (`lib/secure-storage.ts:85`), 10 warnings |
| `cd apps/mobile && vitest run src` | **34 fichiers, 479 tests verts** (plancher 372) |
| `cd apps/web && vitest run --root ../mobile src/services` | 45/45 verts (abonnement, anti-steering) |
| `node supabase/tests/local/run-pglite.mjs` (lien temporaire `node_modules` créé puis supprimé) | Tout vert, dont « 083 », « rollback 083 » et « passage 083 GO 3 → GO 4 » |

## 1. Parité UX des routes — OK

`git ls-tree -r --name-only 3af7908 apps/mobile/src/app` (27 fichiers) comparé à `HEAD` avec `comm -23` : **aucune route supprimée**. 17 routes ajoutées (GO 3 à GO 5, dont `objet/[rewardId]`, `quand-il-dit-non`, `quand-consulter`, `questionnaire-enfant`). Toutes les nouvelles routes parent sont déclarées et cachées de la barre (`app/(parent)/_layout.tsx:17-38`). Le côté coach n'est pas modifié. `GO5_PARITE.md` : 0 ligne PERDU, ce qui est confirmé.

Deux écarts de parcours (voir §11, C2 et C3) : les objets restent vides pour une famille qui n'utilise que l'app, et « Voir » (M13) ouvre le carnet au lieu de l'objet.

## 2. Objets (N2–N4, « La lettre »)

- **La lettre n'affiche jamais son texte** : OK. `components/maison/objets/logic.ts:76-83` ne lit que `payload.sealed_at` ; `p3_letters` n'est jamais lu par le mobile (grep : un seul `insert` dans `components/activite/persist.ts:65`, aucun `select`).
- **Un objet non gagné n'affiche rien de son contenu** : OK. `logic.ts:128-129` renvoie `LOCKED` (texte « Cet objet s'assemble… », mot pour mot comme `apps/web/.../objets/[rewardId]/page.tsx:41`).
- **Aucun « 1 mois offert »** : OK. Grep `mois offert` dans `apps/mobile/src` : le seul résultat est le test (`objets/logic.test.ts:126-129`).
- **Impression et partage sans `expo-sharing`** : OK, aucun plantage possible. `objets/nativeShare.ts` charge chaque module par `import()` à l'appel ; `objets/share.ts:19-25` attrape l'absence et l'erreur (repli sur l'impression) ; `printObject` (`share.ts:28-36`) ne lève jamais d'exception. Le double tap est verrouillé par `busy` dans `objet/[rewardId].tsx:44-48`.
- **Aucune donnée inventée** : les blocs viennent de `p3_rewards.payload` (`useReward.ts:20-25`), et les titres et textes reprennent `RewardView.tsx` mot pour mot. **Mais le mobile n'écrit jamais `p3_rewards`** (grep : aucun `insert`). Le web le fait à chaque moment (`apps/web/src/hooks/useP3Moments.ts:224-243`, `buildRewardPayload`). Conséquence : pour une famille qui n'utilise que l'app, N2, N3 et N4 affichent « Rien de noté ici. », et l'objet « La lettre » affiche « La lettre de X se garde sur papier », **même quand la lettre a bien été scellée dans l'app**. Cette phrase est fausse → **C2**.

## 3. Photo du passeport (E2)

| Point | Constat |
|---|---|
| Bucket | `child-avatars`, privé (`passportPhoto.ts:9`). C'est le seul bucket où le mobile écrit (grep `storage.from` : `passportPhoto.ts:121,126,147` ; lecture signée dans `bilanApi.ts:60`). |
| Chemin | `<child_id>/avatar-<horodatage>.<ext>` (`passportPhoto.ts:54-57`), comme le web `<child_id>/avatar-<ts>.jpg` (`apps/web/src/lib/avatar.ts:71`). Le premier segment correspond à la RLS 052 (`private.storage_child_uuid`). `avatar_url` contient le chemin, pas une URL. |
| Limites | 5 Mo et jpeg/png/webp (`passportPhoto.ts:11-12`), identiques à la migration 052 (`file_size_limit 5242880`, `allowed_mime_types`). Contrôlées avant l'envoi et à nouveau après lecture (`:104-115`). |
| Ancien fichier | Supprimé après la mise à jour de la fiche (`:129`, `:143-151`). Si la fiche n'est pas mise à jour, le nouveau fichier est retiré (`:125-127`) : aucune photo orpheline. |
| Permission | Demandée seulement au tap (`:65-68`). Texte iOS dans `app.json` (plugin `expo-image-picker`, caméra et micro désactivés). |
| Loi 25 | Aucune photo d'enfant hors de `child-avatars`. **Écart mineur** : le web réduit l'image à 512 px en JPEG, ce qui retire aussi les métadonnées (`avatar.ts:32-58`). Le mobile envoie le recadrage du sélecteur (`quality 0.6`), sans réduction de taille. Sur Android, il reste à vérifier que les métadonnées EXIF (dont la position GPS) ne restent pas dans le fichier (`NON_VÉRIFIÉ`, à tester sur un appareil). |
| **Écrite dès le choix** | `BilanSheets.tsx:184-200` envoie la photo et met la fiche à jour dès qu'elle est choisie, et « Retirer la photo » agit tout de suite (`:211`). Le web attend « Enregistrer », et « Annuler » n'y change rien. Sur mobile, « Annuler » (`:312`) **ne revient pas** sur la photo. **Avis de la revue : c'est un écart d'UX, pas un problème de sécurité.** Il va contre le principe « l'UX ne change pas ». Je recommande d'aligner sur le web : garder la photo choisie en mémoire, et n'envoyer ou retirer qu'au moment d'« Enregistrer ». → **D1 (À DÉCIDER)** |

## 4. Écritures

- `components/activite/persist.ts:31-34` est le **seul écrivain de `p3_moments`**. Grep dans `apps/mobile/src` : les seuls autres accès sont des `select` (`hooks/useMaison.ts:27`, `visuals/useVisualNotes.ts:21`). `recordMoment` passe par `insertMoment` (`useMaison.ts:72-74`). OK (E6).
- **« Non » n'écrit rien** : `flow.ts:480` ne produit qu'un effet `exit`. OK. D3 : `QuitSheet.tsx` affiche « Ta lettre reste scellée. » quand `letterSealed` est vrai (`moment/[activityId].tsx:381`).
- **Une écriture par moment** : `flow.ts:427` (`recording`/`recorded`), `:434` (une relance seulement après un échec), `:471`. OK. Un seul cas limite : si l'écriture a réussi côté serveur mais que la réponse s'est perdue, « Réessayer » écrit le moment une deuxième fois. `p3_moments` n'a pas de clé d'idempotence, et le web se comporte de la même façon. À noter, ce n'est pas bloquant.
- **Lettre scellée illisible avant sa date** : côté base, la policy `p3_letters_read` exige `deliver_at <= now()`, l'insert exige `deliver_at >= now() + 11 months`, et il n'existe ni update ni delete (`062:164-175`). Côté mobile, l'insert se fait sans relecture (`persist.ts:63-67`) et le texte est effacé de l'état après le scellement (`flow.ts:459-463`). OK.

## 5. Droits — OK

- `lib/packs.ts` réexporte `PACK_ORDER`, `PLAN_FEATURES` et `can` depuis `apps/web/src/lib/packs` : il ne reste aucune copie (grep `PLAN_FEATURES =` : aucun résultat). `rightsFor` (`bilanPage.ts:50-55`) lit `can()` et un test de non-dérive existe (`bilanPage.test.ts:32`).
- Les droits viennent de `access_state()` via `useSubscriptionStore`/`sectionView` (`bilans.tsx:91-95`, `messages.tsx:39`). Aucun nouvel écran ne les recalcule. U2 n'a aucun lien de paiement (`LockedSection.tsx`, `onOffers` → écran Offres de l'app).
- Aucun lien de paiement Maison. « Stripe » n'apparaît plus que dans les programmes en personne (`offres/*`, `AppelView.tsx:205`). X2 suit D2 (`SubscriptionView.tsx:83`).
- `subscription-logic.ts`, `purchases.ts`, `subscription.store.ts`, `programPayments.ts` : **inchangés** depuis `a78501c` (`git diff --quiet`).

## 6. Mode activité

- Toujours sous `<ThemeScope style="veillee" fill>` (`moment/[activityId].tsx:411`). OK.
- Durée plafonnée à 4 h (`flow.ts:516,538`) et sortie possible après un échec d'enregistrement (`flow.ts:431-437`, `SaveFailedSheet` `:377`). `flow.ts` n'a pas changé depuis `fc8dcbe`. **Les corrections G1 n'ont pas régressé.**
- **Keep-awake pas relâché à la sortie → C1.** `useActivityKeepAwake` (`visuals/keepAwake.ts:35-37`) ne relâche le verrou qu'au **démontage**. Or `moment/[activityId]` est un écran du navigateur **Tabs** (`(parent)/_layout.tsx:25,61`). En sortie, `router.replace('/(parent)/maison')` (`moment/[activityId].tsx:106`) est converti en `JUMP_TO` par expo-router 55.0.16 (`node_modules/expo-router/build/layouts/TabRouter.js`, `tabRouterOverride`). `router.back()` change aussi d'onglet. Bottom-tabs 7.16.2 ne démonte pas un onglet quitté (seul `popToTopOnBlur` existe). L'écran reste donc allumé tant que l'app tourne. Pour la même raison, deux défauts **hérités du GO 4** apparaissent :
  - le `BackHandler` (`:134-140`) reste actif : sur Android, le bouton retour est capté par le moment caché, dans tout l'espace parent ;
  - l'état du réducteur (`useState(initialFlow)`, `:78`) n'est pas remis à zéro : un **deuxième moment dans la même session** reprend l'écran « fin » du précédent.
  Ces trois points viennent de la lecture du code des routeurs. Ils ne sont pas reproduits à l'exécution (`NON_VÉRIFIÉ`, il faudrait un compte connecté avec P3 ouvert).

## 7. Pages d'aide (K4/K5)

- Les textes viennent du module partagé (`lib/p3.ts:13` → `PAGE_NON`, `PAGE_CONSULTER`). Les numéros sont **extraits du texte partagé** par `linkify` (`components/aide/logic.ts:53-75`, même expression régulière que la page web). L'ancienne liste en dur de `HealthNotice.tsx` (811, 988, 1 800 668-6868, 911) est supprimée. Il reste un seul repli codé en dur : `{ label: '9-8-8', value: '988' }` (`logic.ts:74`), utilisé seulement si le texte change. Acceptable.
- `A_VALIDER` et `verifyNote` ne s'affichent pas (`logic.ts:80-99`) et ne bloquent rien. **Mais le web cache la page en production tant que le statut vaut `A_VALIDER`** (`apps/web/.../quand-consulter/page.tsx:14,87-89`), alors que le mobile la publie, avec des numéros pas encore validés. Le prompt l'a voulu ainsi (§3.1 K5), mais l'écart est juridique → **D2 (À DÉCIDER)**, à ajouter à `CHECKLIST_TOI.md`.
- K4 : la tranche d'âge de l'enfant d'abord (`logic.ts:13-16`), `pickTonight` avec 2 refus (`:31-41`). La liste filtrée reste accessible (`quand-il-dit-non.tsx:42`). OK.

## 8. Style — OK

`design/styleMigration.ts:10-14` est le seul endroit du code de production où les anciennes clés apparaissent. Dans le reste, grep `'natif'|'nuit'|'carnet'` ne trouve que des tests, la route `carnet` et des mots courants. Défaut : `DEFAULT_STYLE = 'lin'` (`design/tokens.ts:10`).

## 9. Migration 083 — OK

`lin|veillee` (`083:46-50`), conversion des anciennes valeurs (`:37-44`), RPC `set_ui_style` (`:56-86`), commentaire corrigé (E4, `:10-13,53-54`). Le rollback est complet et rejouable (`supabase/rollbacks/20261012_083_ui_style_rollback.sql` : RPC, contrainte, colonne). Tests PGlite verts, y compris le passage GO 3 → GO 4.

## 10. Fidélité (échantillon K-lin, M-veillee, G-lin, N2-veillee, X-lin, D2-veillee)

L'ensemble est fidèle aux maquettes : ordre des blocs, matières papier et feutre, palette et règle du soleil sont respectés. Le titre en Fraunces est un peu plus gras partout.

**Écarts gardés (connus, listés une fois)** : Fraunces sans axe SOFT ; verre natif (rendu web ≠ iOS) ; ombres RN plus diffuses (K, portes et cartes) ; Arch sur web (X : pas de libellé italique « Lin / Veillée » dans l'arche) ; Star sur web (N2 : disque émail sans étoile) ; Texture sur web (papier vergé moins marqué, N2 sans double cadre visible). Autres écarts : D2 met « 299 $ par an » en avant plutôt que « 24,92 $ par mois », et l'option choisie est en sauge (conformité store et règle du soleil, le comportement actuel l'emporte). Sur M, la capture montre une autre position de défilement (étape 1 au lieu de 3), l'anneau du minuteur n'a pas son arc émail, et le bouton dit « Étape suivante » au lieu de « Suivant » (texte actuel conservé).

**À corriger avant fusion (fidélité)** → **C4** :
- `docs/release/go5-captures/index.html` **n'existe pas**, alors que §5 C2 et §6 « Fidélité » le demandent.
- **K4 et K5 n'ont aucune capture**, dans aucun des deux styles. Ils ne sont pas non plus dans la galerie DEV ni dans `/__ecran` : ces deux écrans n'ont jamais été comparés aux maquettes.
- X : les pastilles de `AccountView.tsx:61-63` sont pleines et colorées (`sysOrange`, `sysGreen`, `tint`), alors que la maquette les veut en cercles sauge au trait. Corriger, ou lister l'écart comme gardé.
- Trois captures dépassent légèrement 600 Ko (`K-lin` 606 Ko, `K3-lin` 614 Ko, `K3-veillee` 602 Ko). C'est cosmétique.

## 11. Liste d'actions

### À CORRIGER (bloque la fusion)

| # | Fichier:ligne | Correction |
|---|---|---|
| **C1** | `components/activite/visuals/keepAwake.ts:35-37` ; `app/(parent)/moment/[activityId].tsx:53,78,134-140` ; points d'entrée `app/(parent)/activite/[activityId].tsx:39`, `app/(parent)/maison.tsx:62` | Le verrou d'écran et le `BackHandler` doivent dépendre du **focus** et non du montage : `useFocusEffect(useCallback(() => holdScreenAwake(), []))`, et même chose pour `BackHandler`. Remettre le flot à zéro à chaque nouvelle entrée : ajouter un paramètre `entree: Date.now()` aux deux `router.push` vers le moment et poser `key={entree}` sur `<ActivityFlow>`. Le retour depuis l'objet ou le carnet garde alors l'état. Tests : verrou relâché quand on quitte l'écran, et un deuxième moment repart du check-in. |
| **C2** | `components/activite/persist.ts` (seul écrivain) + `app/(parent)/moment/[activityId].tsx:120-127` + `hooks/useMaison.ts:72-74` | Faire comme le web (`useP3Moments.ts:224-243`) : une fois `insertMoment` réussi, insérer dans `p3_rewards` les objets nouvellement gagnés, avec `buildRewardPayload` (à exposer par `lib/p3.ts` depuis `p3-moments/app.ts`, sans le recopier) et `sealedAt` de la lettre. Ignorer le conflit de clé primaire. Sans cette écriture, les objets restent vides et la lettre affiche « se garde sur papier » alors qu'elle est scellée. |
| **C3** | `app/(parent)/moment/[activityId].tsx:334` | « Voir » (M13) doit ouvrir l'objet, comme le demande §3.1 N2 : `router.push({ pathname: '/(parent)/objet/[rewardId]', params: { rewardId: id, childId } })` (`onViewReward` reçoit déjà `id`). |
| **C4** | `docs/release/go5-captures/` ; galerie DEV / `app/__ecran.tsx` ; `components/account/AccountView.tsx:61-63` | Ajouter K4 et K5 à la galerie avec des fixtures, produire `K4-*` et `K5-*`, générer `index.html` ; corriger les pastilles de X ou les lister comme écart gardé. |

### À DÉCIDER (Lylian)

| # | Sujet | Avis de la revue |
|---|---|---|
| **D1** | La photo du passeport est enregistrée dès qu'elle est choisie, et « Annuler » ne revient pas dessus, alors que le web attend « Enregistrer ». | C'est un écart d'UX. Aligner sur le web est recommandé (petit changement dans `BilanSheets.tsx:184-215` et `bilans.tsx` `onSave`). |
| **D2** | `PAGE_CONSULTER` est au statut `A_VALIDER` : le web la cache en production, le mobile la publie. | Décision juridique : la faire valider par un·e psychologue avant la mise en ligne de l'app, ou appliquer au mobile la même condition que le web. |
| **D3** | Le mot « Stripe » apparaît dans le programme en personne (Offres Y, Y2, Y3, `AppelView.tsx:205`). | Hors Maison, donc conforme à D2. À confirmer dans le cadre de R1 (programmes payés dans l'app iOS). |
| **D4** | Le libellé « 1 mois offert » existe toujours côté web (`RewardView.tsx:190`, `TODO(facturation)`). | Il est masqué sur mobile (D7). Il faut décider s'il reste sur le web tant que la facturation ne l'applique pas. |
| **D5** | Photo du passeport sur Android : métadonnées EXIF et taille non réduite (le web réduit à 512 px). | Vérifier sur un appareil. Si la position GPS reste dans le fichier, réduire et réencoder l'image avant l'envoi. |

---

## 12. Re-vérification (G2 bis, 2026-10-20, branche à `f50c84b`)

**Verdict : OK, la fusion est possible.** C1, C2 et C3 sont corrigés. C4 est corrigé sur le code et l'index. Il reste une réserve qui ne bloque pas : K4 et K5 n'ont toujours pas de capture de l'app.

### C1 — OK (`c619942`)
- `visuals/keepAwake.ts:35-45` : le verrou est pris au focus avec `useFocusEffect(activityFocusEffect)`. La fonction de nettoyage le relâche à la perte de focus et au démontage. L'étiquette reste propre au mode activité. Une erreur native est ignorée.
- `moment/[activityId].tsx:136-144` : `BackHandler` passe par `useFocusEffect(useCallback(…))` et `sub.remove()` est appelé à la perte de focus.
- `moment/[activityId].tsx:404-418,432` : `key={flowResetKey(entry, [activityId, childId, band, duration, lieu])}`. `entry` augmente à chaque retour de focus après une sortie, et la clé change aussi quand les paramètres changent. Le flot repart donc du check-in.
- Différence avec ce que la revue proposait (paramètre `entree` dans les `router.push`) : ici, tout retour de focus remet le flot à zéro. C'est acceptable, car aucun écran ne revient au moment par « retour ». L'objet renvoie au carnet ou à la Maison (`objet/[rewardId].tsx:54-55`), et les feuilles (lettre, visuels, minuteur) sont des modales qui ne retirent pas le focus.
- Pas de régression G1 : la durée réelle reste plafonnée à 4 h (`flow.ts:516,538`, `MAX_REAL_DURATION_S = 14_400`). Après un échec, `record.leave` sort vers la Maison sans rien écrire (`flow.ts:436-437`). Les tests sont dans `keepAwake.test.ts` (focus, nouvelle clé, câblage de la route).

### C2 — OK (`f50c84b`)
- `persist.ts:33-74` : `insertMoment` écrit d'abord le moment, puis appelle `recordRewards`. On retrouve la règle du web (`useP3Moments.ts:224-243`) : `newlyEarned` avec `subscriptionMonths: 0`, puis `buildRewardPayload(id, rows, { earned, sealedAt })` avec la fonction réexportée par `lib/p3.ts:15` (pas de copie). L'insert porte sur les mêmes colonnes `{ child_id, reward_id, payload }`. Les objets déjà gagnés sont relus avant, donc idempotent (clé `(child_id, reward_id)`). Le conflit `23505` est ignoré. Toute erreur est absorbée par `try/catch → []`, donc un moment enregistré n'échoue jamais.
- La lettre : `buildRewardPayload('lettre_un_an', …)` ne produit que `{ sealed_at }` (`p3-moments/app.ts:189-190`). Le texte ne va que dans `p3_letters`, et sans relecture.
- Il n'y a qu'un seul écrivain : `grep` sur `apps/mobile/src` ne trouve aucun insert, upsert, update ou delete sur `p3_moments` ou `p3_rewards` hors de `persist.ts`. `useMaison`, `useVisualNotes` et `useReward` ne font que lire. Un test de garde le vérifie (`persist.test.ts:89-103`). « C'est fait ? » de la Maison passe aussi par `insertMoment`, comme sur le web, où le même `recordMoment` sert aux deux.
- Écart accepté : la ligne `lettre_un_an` est écrite **au scellement** (`persist.ts:114-122`), alors que le web l'écrit à l'enregistrement du moment. C'est acceptable et même plus cohérent avec D3 du GO 4 : un « Non » à « Enregistrer ce moment ? » laisse la lettre scellée dans `p3_letters`. Sur le web, ce cas ne produit aucun objet, et le carnet afficherait « se garde sur papier » pour une lettre pourtant scellée. Il n'y a pas de doublon : si la lettre est déjà gagnée, `recordRewards` ne la réécrit pas. Si l'écriture au scellement échoue, l'enregistrement du moment la rattrape, avec le même `sealedAt`. Une seule fiche (ACT-1302) a une capture de type `lettre`.

### C3 — OK (`a769902`)
`moment/[activityId].tsx:338` : `onViewReward={(rewardId) => router.push({ pathname: '/(parent)/objet/[rewardId]', params: { rewardId, childId } })}`. `EndView.tsx:42,85` appelle ce rappel, ou à défaut ouvre lui-même l'objet. La route lit bien `rewardId` et `childId` (`objet/[rewardId].tsx:21-23`).

### C4 — OK, avec une réserve (`5146449`, `39fa040`, index)
- `AccountView.tsx` : les 5 pastilles (`star`, `home`, `sparkles`, `people`, `bell`) passent par `RoundBadge` : cercle `badgeBg`, glyphe `badgeInk`, en sauge dans les deux styles (`tokens.ts:86-87,144-145`). Les `onPress`, titres et valeurs n'ont pas changé, donc la navigation non plus.
- `dev-gallery/lot-maison.tsx:44-58` expose K4 et K5. Ils utilisent les vraies données : module partagé et vraie fiche du pool.
- `docs/release/go5-captures/index.html` existe. Ses 146 images sont toutes présentes, et la fin de la page liste les lettres sans capture : D3, K4, K5, P, Q, R.
- **Réserve (non bloquante)** : les captures `K4-*` et `K5-*` de l'app n'ont pas été produites. Les maquettes existent dans `ref/`, pas dans `app/`. La galerie est prête : il reste à faire la capture et la comparaison avant la soumission aux stores. Remarque mineure : les 146 PNG de la racine de `go5-captures/` sont en double avec `app/`.

### Batterie
| Commande | Résultat |
|---|---|
| `pnpm typecheck` | OK (mobile + web) |
| `pnpm lint` | 1 erreur, la préexistante (`lib/secure-storage.ts:85`), 10 warnings |
| `pnpm test` (racine) | 426 verts, 5 suites KO préexistantes (access, messaging, notifications, password, program-checkout) |
| `apps/mobile` `vitest run src` | 34 fichiers, **486 verts** |
| `apps/web` `vitest run --root ../mobile src/services` | 5 fichiers, 45 verts |
| `node supabase/tests/local/run-pglite.mjs` | OK (080, 083, rollbacks, passage GO 3 → GO 4). Le lien temporaire a été supprimé. |
| `git status --short` | seuls `GO5_PARITE.md`, `GO5_REVUE.md` et `go5-captures/` ne sont pas suivis |

Les décisions D1 à D5 du §11 restent ouvertes et ne changent pas le verdict.

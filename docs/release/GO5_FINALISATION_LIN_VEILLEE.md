# GO 5 — Finition « Lin » et « Veillée », parité avec l'UX actuelle, fusion dans `main` (ancienne UI archivée)

> **Comment l'utiliser.** Dans Claude Code, à la racine de `thrive APP`, passer la session principale en **Sonnet** (`/model sonnet`), puis écrire :
> `Lis docs/release/GO5_FINALISATION_LIN_VEILLEE.md et exécute-le à la lettre.`
> L'orchestrateur lance Haiku, Sonnet, puis Opus 5.5 pour la revue. **Aucune question à Lylian en cours de route** : toutes les décisions sont prises au §4.
>
> **Ce prompt est le dernier de la série.** GO 3 (`GO3_UI_IOS27_PAIEMENTS.md`) a posé le nouveau design et les paiements ; GO 4 (`GO4_UI_LIN_VEILLEE.md`) a ramené le design à deux styles, **Lin** et **Veillée**, et construit la page Bilan complète et le mode activité. Le GO 5 **termine** : il comble ce qui manque encore par rapport à l'app actuelle, vérifie chaque écran contre les maquettes, tranche les décisions ouvertes, **met l'ancienne interface à l'abri sur une branche d'archive**, puis **fusionne la nouvelle dans `main`**, avec une commande unique pour revenir en arrière.
> Quand ce prompt se tait, GO 4 puis GO 3 puis le dépôt font foi. Quand il contredit le dépôt sur un fait technique, l'agent le dit dans son rapport et suit le dépôt.

---

## 0. Mission en une phrase

Livrer dans `main` l'app finale en **Lin** (clair) et **Veillée** (sombre), **avec exactement l'UX actuelle** — tous les parcours, gestes, textes et règles qui existent aujourd'hui (app mobile de `main` + parcours parent du web dont l'app reprend la logique) — habillés selon les maquettes V4/V5, sans rien perdre, et avec l'ancienne interface conservée intacte sur `archive/ui-avant-ios27`, réactivable par `pnpm ui:ancienne`.

**Principe directeur : l'UX ne change pas, seule l'UI change.** Si une maquette et l'app actuelle divergent sur un comportement (un parcours, une règle, un texte légal, un état), **le comportement actuel gagne** et l'écart est noté au rapport. Si une maquette et l'app divergent sur l'apparence, **la maquette gagne**.

---

## 1. Règles non négociables

Les règles **1 à 12 du GO 3** s'appliquent (additif et réversible, aucune action financière réelle, anti-steering Maison, `access_state()` seule source de vérité, conventions et français, secrets, économie de contexte, périmètre exclusif par agent, autonomie totale, rapport de 15 lignes, une seule correction, honnêteté `NON_VÉRIFIÉ`), avec ces précisions :

1. **Branche de travail** : `feature/ios27-lin-veillee` (worktree `.claude/worktrees/go-4-89318d` s'il existe et répond ; sinon `git worktree add .claude/worktrees/go-5 feature/ios27-lin-veillee`). On continue au-dessus de `fc8dcbe`. Commits atomiques Conventional Commits.
2. **Seule exception à « pas de modification de `main` »** : la phase F (§5), et **seulement si** toutes les vérifications du §6 sont vertes. Sinon : on ne fusionne pas, on écrit pourquoi dans le rapport, et la branche reste prête.
3. **Jamais** de `git push`, `git push --force`, `git reset --hard` sur `main`, `git branch -D`, `eas submit`, `supabase db push`, `apply_migration`, déploiement Vercel, appel Stripe live. On n'efface **aucune branche, aucun tag, aucun worktree**.
4. **Dépendances** : seules celles listées au §5 (lot B) peuvent être ajoutées, via `npx expo install` (versions compatibles Expo 55). Aucune autre.
5. **Aucune donnée de démo en dur** (Léo, Camille, Tremblay, Noah, « La cabane impossible », « 13 octobre 2027 », « 7/13 »…) : formes reprises des maquettes, contenus lus dans les données, ou fixtures de test / galerie DEV uniquement.
6. **Un seul geste soleil** (émail `#F9EB50`) par écran ; les marques d'état (point non lu, coche) n'en sont pas (décision D5).
7. **Mode activité toujours en Veillée** (fond marine), même quand l'utilisateur a choisi Lin — y compris les visuels « Montrer » (§3.1).

---

## 2. État de départ (lu le 2026-10-19)

| Élément | État |
|---|---|
| `main` | `3af7908`, identique à `origin/main`. Ancienne interface mobile (avant iOS 27). Fichiers **non suivis** à la racine : `CLAUDE.md`, `Claude/`, `docs/release/GO3_UI_IOS27_PAIEMENTS.md`, `docs/release/GO4_UI_LIN_VEILLEE.md`, ce fichier, `maquettes-ios27/`. |
| `feature/ios27-ui-paiements` | GO 3, `a78501c`, poussée sur `origin`. |
| `feature/ios27-lin-veillee` | GO 4, `fc8dcbe`, **67 commits au-dessus de `main`**, non poussée. Rapport : `docs/release/GO4_RAPPORT.md` (lots L0–L7 FAIT, L7 partiel, O6 À TOI, rendu natif NON_VÉRIFIÉ). Revue : `GO4_G1_REVUE.md` (remarques R1–R5 ouvertes). Tests mobiles : 26 fichiers, 372 tests verts. Lint : 1 erreur **préexistante** (`lib/secure-storage.ts:85`). |
| Maquettes | `maquettes-ios27/` **à la racine de `main` est plus récente** que la copie suivie dans la branche : elle ajoute le chapitre **« 02 ter »** (16 écrans × 2 styles : MV, VI1–VI8, M16b, M16c, N2, N3, N4, K4, K5) et `apercus/Complements-Lin.png`, `Complements-Veillee.png`. |
| Banc de comparaison | `scripts/design/compare-ecrans.mjs` + route DEV `/__ecran?e=<lettre>&s=lin|veillee` existent, **mais le script compare encore aux références V1–V3** (`natif|nuit|carnet`) : la comparaison avec V4/V5 n'a jamais été faite. |
| Migrations | 081, 082, 083 écrites, **non appliquées**. 083 = `ui_style in ('lin','veillee')`. |

---

## 3. Ce qui manque encore (le delta du GO 5)

### 3.1 Parité avec l'UX actuelle — écrans à construire (maquettes « 02 ter »)

Source de comportement : le web, qui porte aujourd'hui l'UX complète du parent (`apps/web/src/components/parent/p3/{ActivityMode,Visuals,RewardView}.tsx`, `apps/web/src/lib/p3-moments/{index,guide}.ts`, pages `apps/web/src/app/parent/(hub)/fitness/{objets/[rewardId],quand-il-dit-non,quand-consulter}/page.tsx`). Textes repris **mot pour mot** (importés, jamais recopiés à la main quand un module partagé existe, comme `lib/p3.ts` le fait déjà).

| Lettre | Écran | Comportement à reproduire |
|---|---|---|
| **MV** | Bouton « Montrer : {visuel} » | Dans une étape du déroulé quand l'étape a un `visual`, **et** sous les questions du débrief pour chaque `activity.visuals`. Sous-titre « À l'écran, pour qu'il montre du doigt ». |
| **VI1–VI8** | Les 8 visuels | `emotions`, `thermometre`, `colonnes`, `escalier`, `carte`, `sens`, `endroits`, `outils` (libellés `VISUAL_LABELS`, consignes `VISUAL_HINTS`). Feuille plein écran, titre + fermer + consigne + corps + « Revenir à l'activité ». Toucher une case la met en avant (une seule à la fois, re-toucher la retire). **Ses outils** : `TOOLS` des 13 semaines, « Dans ses mots : « … » » quand l'enfant l'a noté (fiches `from`), toucher un outil affiche « Demande : « {ask}, tu pourrais t'en servir où ? » ». Glyphes **dessinés** (SVG), pas d'emoji. |
| M16b / M16c | Lettre scellée / sur papier | **Déjà dans le code** (`SealConfirm.tsx`) : vérifier l'habillage contre la maquette (enveloppe papier vergé, cachet velours). |
| **N2** | Objet · Fiche Identité | Route nouvelle `app/(parent)/objet/[rewardId].tsx`, ouverte depuis le carnet (N) et depuis « Voir » de M13. `rewardTitle()` et `blocksFor()` du web ; papier vergé à double cadre ; « Rien de noté ici. » pour un bloc vide ; pied « À garder. On y revient en semaine 13. » ; étoile émail. Objet pas encore gagné : « Cet objet s'assemble au fil du programme, moment après moment. » + retour Maison. |
| **N3** | Objet · Boîte à Outils | Carte de portefeuille 85 × 55 mm, recto (3 premiers outils) / verso « Et aussi » (outils 4 à 8). |
| **N4** | Objet · Certificat THRIVE Maison | Forces S1 / S13, phrase gardée, date, étoile. **Le badge « 1 mois offert » n'est pas affiché dans le mobile** (la facturation correspondante n'existe pas, `TODO(facturation)` côté web) : décision D7. |
| — | Objet · La lettre | Dates seulement, jamais le texte (`lettre_un_an`) : « Lettre scellée le … Elle te reviendra le … » ou « … se garde sur papier, dans son enveloppe fermée. » |
| N2–N4 | Imprimer · Enregistrer en image · Partager | `expo-print` (HTML de la carte, couleurs de la charte) ; image : `react-native-view-shot` puis feuille de partage (`expo-sharing`), qui propose « Enregistrer l'image ». Bouton Partager en haut à droite. |
| **K4** | Quand il dit non | Page dédiée (aujourd'hui le mobile n'a qu'un filtre de liste) : `PAGE_NON` — intro, **tranche d'âge de l'enfant d'abord**, « Les autres âges » repliable, « Ce qui aggrave », « Ce qui marche », la phrase de sortie sur papier + sa note, puis la fiche anti-refus (`pickTonight` avec 2 refus, comme le web ; la fonction vit dans `apps/web/src/lib/p3-moments`, l'exposer au mobile par `src/lib/p3.ts` comme les autres fonctions P3, sans la recopier). La porte « Quand il dit non » de Maison ouvre cette page ; la liste filtrée existante reste joignable depuis elle. |
| **K5** | Quand consulter | `PAGE_CONSULTER` en page (le composant `HealthNotice` existant devient un lien vers elle là où il est affiché) : « Sans attendre » (boutons Appeler / Texto 9-8-8, `Linking`), signaux, « Vers qui se tourner, au Québec » (lignes appelables), phrase « Aucune activité de l'app ne mesure… ». Le statut `A_VALIDER` et la `verifyNote` du web ne s'affichent pas ; ils vont dans `CHECKLIST_TOI.md`. |

### 3.2 Écarts du GO 4 à fermer

| # | Écart (`GO4_RAPPORT.md` §4, `GO4_G1_REVUE.md` §4) | À faire |
|---|---|---|
| E1 | Pas d'`expo-keep-awake` : l'écran se met en veille pendant le minuteur (le web garde l'écran allumé avec la Wake Lock API) | Ajouter `expo-keep-awake` ; actif pendant tout le mode activité, relâché à la sortie. |
| E2 | J : pas de sélecteur de photo du passeport | `expo-image-picker` ; envoi au **même stockage et même chemin que le web** (`apps/web/src/app/parent/(hub)/bilans/passport-edit.tsx` fait foi), mêmes limites de taille/format, permission demandée au geste. |
| E3 | Éléments web non portés du mode activité | Visuels (§3.1) ; « télécharger / imprimer la récompense » (§3.1, N2–N4). |
| E4 | G1-R1 : commentaire de la colonne 083 imprécis | Corriger le commentaire (la policy `profiles_update_own` autorise aussi l'UPDATE direct, contrainte `lin|veillee`). |
| E5 | G1-R2 : `rightsFor()` recopie `packs.ts` | Importer la matrice de droits partagée (même mécanisme que `lib/p3.ts`), supprimer la copie, test de non-dérive. |
| E6 | G1-R3 : deux écrivains de `p3_moments` | Un seul module (`components/activite/persist.ts`), `useMaison.recordMoment` l'appelle. Mêmes colonnes, mêmes valeurs. |
| E7 | G1-R5 : passage 083 GO 3 → GO 4 testé hors dépôt | Ajouter l'étape à `supabase/tests/local/run-pglite.mjs`. |
| E8 | Captures manquantes (L2, L4, L5, L7) et aucune comparaison avec V4/V5 | Phase C (§5). |
| E9 | Commentaire `components/bilan/BilanCards.tsx:17` (règle du soleil) | Le corriger selon D5. |

### 3.3 Hors périmètre (ne pas construire, le noter au rapport)

Les pages web « cartes À la maison » (`fitness/a-la-maison/**`, `guide`) qui n'existent pas dans l'app mobile actuelle ; les séances vidéo P, Q, R (aperçus, drapeau `VIDEO_SESSIONS_ENABLED=false`) ; D3 (feuille système Apple) ; le pack « Dehors » (`available: false`) ; le côté **coach** de l'app mobile (`app/(coach)/**`) garde son interface — on vérifie seulement qu'il s'affiche toujours (§6).

---

## 4. Décisions prises (ne pas redemander)

| # | Sujet | Décision |
|---|---|---|
| R5 | Style par défaut | **`lin`**. |
| R11 | Anciennes valeurs de style | Normalisées : `natif`, `carnet` → `lin` ; `nuit` → `veillee`. |
| R12 | Fraunces sans axe SOFT, textures en tuiles PNG | Accepté. |
| R13 | Design system artifact « THRIVE iOS 27 » périmé | `maquettes-ios27/final.css` fait foi. Pas de travail sur l'artifact. |
| D1 | Invitation Offres de K3 | Affichée en **Lin et Veillée** (supprimer la condition `styleKey` de `showOffersInvite`, garder `sourceMaison !== 'pack'`), toujours vers l'écran Offres de l'app, jamais un lien web. |
| D2 | Libellé X2 pour un client programme | « **Inclus avec ton programme · aucun abonnement séparé** » (plus de mot « Stripe » côté Maison). |
| D3 | Lettre scellée puis « Non » à « Enregistrer ce moment ? » | La lettre reste scellée, le moment n'est pas compté ; sous le titre de M17 : « **Ta lettre reste scellée.** » quand une lettre a été scellée pendant ce moment. |
| D4 | Lettre dans le Bilan (G9) | Le mobile n'affiche jamais le texte, seulement les dates (comme l'objet « La lettre »). |
| D5 | Règle du soleil | Elle vise le geste principal, pas les marques d'état. |
| D6 | Mode activité | Écran gardé allumé (E1). |
| D7 | Badge « 1 mois offert » du certificat Maison | Masqué dans l'app mobile tant que la facturation ne l'applique pas. Ligne dans `CHECKLIST_TOI.md`. |
| D8 | Fusion | Une fois tout vert : ancienne UI archivée (`archive/ui-avant-ios27` + tag `ui-avant-ios27`), nouvelle UI fusionnée dans `main` par un **commit de fusion unique** (`--no-ff`), tag `ui-lin-veillee-fusion`, bascule par `pnpm ui:ancienne` / `pnpm ui:nouvelle`. |

---

## 5. Équipe d'agents et phases

**Séquence** : A (Haiku) → B (Sonnet, B1–B4 en parallèle) → C (Sonnet, fidélité visuelle) → D (Haiku, vérifications) → E (Opus 5.5, revue) → F (orchestrateur Sonnet, archive + fusion) → G (Haiku, rapport). Chaque phase dans **un seul message** (outil `Agent`, paramètre `model`). Après chaque phase : `pnpm typecheck` et `cd apps/mobile && npx vitest run src` ; un bloquant ⇒ relancer **uniquement** l'agent fautif, 1 itération max.

### Phase A — Haiku (lecture seule, puis un seul commit de maquettes)

**A0 · Maquettes à jour.** Copier `maquettes-ios27/` **de la racine du dépôt principal** (non suivie, plus récente) par-dessus la copie de la branche : `screens-final.js`, `apercus/Complements-Lin.png`, `apercus/Complements-Veillee.png` (vérifier par `diff -rq` qu'il n'y a pas d'autre différence ; s'il y en a, les lister et les copier aussi). Mettre à jour `maquettes-ios27/LISEZMOI.md` (chapitre « 02 ter » ajouté). Copier aussi ce prompt dans la branche (`docs/release/GO5_FINALISATION_LIN_VEILLEE.md`) et le dossier `docs/release/go5/` (script et notice de retour). Commit `docs(design): maquettes complètes Lin et Veillée (02 ter) et prompt GO 5`.

**A1 · Tableau de parité** → `docs/release/GO5_PARITE.md` (seul fichier créé). Deux tableaux :
1. **Maquettes → app** : chaque lettre des chapitres de `maquettes-ios27/screens-final.js` (constante `CH`, v4 et v5) → fichier(s) réel(s) → statut `FAIT | À FAIRE (GO 5) | HORS PÉRIMÈTRE`.
2. **UX actuelle → app** : chaque route et chaque geste de l'app mobile de `main` (`git ls-tree -r main apps/mobile/src/app`) **et** chaque écran/geste parent du web listé au §3.1 → où il vit dans la branche → statut. **Aucune route de `main` ne doit disparaître** : le vérifier ligne par ligne.
3. Empreinte avant GO 5 : typecheck, lint, tests mobiles et web.

### Phase B — Sonnet (UI et logique d'affichage, périmètres disjoints)

**B1 · Visuels du mode activité.** Fichiers : `src/components/activite/visuals/**` (nouveau), `src/components/activite/{DerouleView,DebriefView,parts}.tsx`, `src/app/(parent)/moment/[activityId].tsx` (seulement pour monter la feuille et `expo-keep-awake`). Écrans MV, VI1–VI8 ; E1. Dépendance : `expo-keep-awake`. Tests : sélection unique / désélection, « Dans ses mots » lu depuis les fiches notées, aucune donnée en dur.

**B2 · Objets du carnet.** Fichiers : `src/app/(parent)/objet/[rewardId].tsx` (nouveau), `src/components/maison/objets/**` (nouveau), `src/components/maison/CarnetView.tsx`, `src/components/activite/EndView.tsx` (lien « Voir » seulement). Écrans N2, N3, N4, objet « La lettre » ; Imprimer / Enregistrer en image / Partager. Dépendances : `expo-print`, `expo-sharing`, `react-native-view-shot`. D7.

**B3 · Pages d'aide.** Fichiers : `src/app/(parent)/quand-il-dit-non.tsx`, `src/app/(parent)/quand-consulter.tsx` (nouveaux), `src/components/HealthNotice.tsx`, `src/components/maison/{HomeView,models}.ts(x)` (porte « Quand il dit non » et D1 seulement). Écrans K4, K5.

**B4 · Écarts et décisions.** Fichiers : `src/components/bilan/BilanSheets.tsx` + service d'envoi de photo (E2, dépendance `expo-image-picker`), `src/components/bilan/{BilanCards.tsx,bilanPage.ts}` (E5, E9), `src/components/activite/{persist.ts,QuitSheet.tsx}`, `src/hooks/useMaison.ts` (E6, D3), `src/components/subscription/**` libellé X2 seulement (D2 ; `subscription-logic.ts`, `purchases.ts`, `subscription.store.ts` **interdits**), `supabase/migrations/20261012_083_ui_style.sql` commentaire seulement (E4), `supabase/tests/local/run-pglite.mjs` (E7).

### Phase C — Sonnet (fidélité visuelle, écran par écran)

**C1 · Banc de comparaison V4/V5.** Mettre à jour `scripts/design/compare-ecrans.mjs` : styles `[['v4','lin'],['v5','veillee']]` ; références générées **directement** depuis `maquettes-ios27/v4.html` et `v5.html` (Playwright, chaque `.shot[data-l="<lettre>"] .phone`, polices Inter et Fraunces chargées, mêmes 402 pt) au lieu des anciennes captures V1–V3. Ajouter à la galerie DEV (`src/dev-gallery*`) toute lettre qui manque, avec des **fixtures** (jamais dans le code de production).
**C2 · Passe complète.** `cd apps/mobile && npx expo start --web --port 8091`, puis comparer **toutes les lettres des deux styles** (A à Z, K2, K3, G2–G11, M1–M17, MV, VI1–VI8, M16b, M16c, N2–N4, K4, K5, S2, U2, X2, X2b, Y2, Y3, D2). Corriger chaque écart d'apparence (espacements, tailles, graisses, couleurs, rayons, ordre des blocs, matières, onglet Prominent, bord de défilement) dans les fichiers du lot propriétaire, sans toucher au comportement. Sortie : `docs/release/go5-captures/<lettre>-<style>.png` (maquette à gauche, app à droite, ≤ 600 Ko chacune) et une page `docs/release/go5-captures/index.html` qui les montre toutes. Chaque écart **gardé** (Fraunces SOFT, verre natif vs web, ombres) est listé une fois, pas par écran.
**C3 · iOS, si possible.** Si `xcrun simctl` et un build de développement sont disponibles sur la machine, refaire les captures principales sur le simulateur iOS (K, G, M, VI1, N2, X, D2 dans les deux styles). Sinon `NON_VÉRIFIÉ (pas de simulateur)`.

### Phase D — Haiku (vérifications mécaniques)

**D1** : batterie complète (§6) vs empreinte A1. **D2** : greps d'anti-steering du GO 3 §8 ; plus aucun « Stripe » dans le périmètre Maison/abonnement (D2) ; aucun badge « 1 mois offert » dans le mobile. **D3** : aucune donnée de démo en dur hors fixtures/galerie DEV ; `natif|nuit|carnet` seulement dans la table de migration, son test, la route `carnet` et « verre natif ». **D4** : les routes du côté coach (`app/(coach)/**`) s'affichent toujours en web (une capture chacune, pas de crash).

### Phase E — Opus 5.5 (revue, lecture seule + tests)

**G2 · Revue finale.** (1) **Parité UX** : relire `GO5_PARITE.md` ligne par ligne contre le code ; aucun parcours de `main` perdu. (2) Visuels et objets : textes identiques au web, aucune donnée inventée, la lettre jamais lisible avant sa date. (3) E2 : chemin de stockage, RLS du bucket, taille, type MIME, pas de photo d'enfant hors du stockage prévu (Loi 25). (4) E5/E6 : aucune dérive des droits, une seule écriture par moment. (5) Anti-steering et `access_state()`. (6) Verdict `OK / À CORRIGER` ; `À CORRIGER` ⇒ une itération du lot concerné, puis re-verdict.

### Phase F — Orchestrateur (archive, fusion, bascule) — **seulement si D et E sont verts**

Depuis la racine du dépôt principal (`thrive APP`, où `main` est extrait) :

1. **Archive de l'ancienne interface** (avant toute fusion) :
   `git branch archive/ui-avant-ios27 main` · `git tag -a ui-avant-ios27 main -m "Interface mobile avant iOS 27 (main 3af7908)"`. Vérifier : `git rev-parse archive/ui-avant-ios27` = `git rev-parse main` = `3af7908…`.
2. **Script de bascule** (sur la branche de travail, avant la fusion) : copier `docs/release/go5/basculer-ui.sh` → `scripts/ui/basculer-ui.sh` (exécutable), et `docs/release/go5/RETOUR_ANCIENNE_UI.md` → `docs/release/RETOUR_ANCIENNE_UI.md`. Ajouter au `package.json` racine : `"ui:etat": "bash scripts/ui/basculer-ui.sh etat"`, `"ui:ancienne": "bash scripts/ui/basculer-ui.sh ancienne"`, `"ui:nouvelle": "bash scripts/ui/basculer-ui.sh nouvelle"`, `"ui:voir-ancienne": "bash scripts/ui/basculer-ui.sh voir-ancienne"`. Commit `chore(release): bascule entre l'ancienne et la nouvelle interface`. **Ne pas modifier la logique du script** (testé) ; seule adaptation permise : le chemin `PROBE` s'il ne correspond plus à un fichier qui n'existe que dans la nouvelle UI.
3. **Fichiers non suivis de la racine qui bloqueraient la fusion** (`maquettes-ios27/`, `docs/release/GO3_*.md`, `GO4_*.md`, `GO5_*.md`, `docs/release/go5/`) : pour chacun, `diff` avec la version de la branche ; identiques ⇒ les retirer de la racine ; différents ⇒ les **déplacer** dans `Claude/_avant-fusion-2026-10/` (jamais supprimer un contenu unique) et le noter. `CLAUDE.md` et `Claude/` ne sont pas concernés.
4. **Fusion** : `git switch main` · `git merge --no-ff feature/ios27-lin-veillee -m "feat: nouvelle interface Lin et Veillée (GO 3 à GO 5)"` · `git tag -a ui-lin-veillee-fusion -m "Fusion de la nouvelle interface Lin et Veillée"`.
5. **Preuve que la bascule marche, sans toucher `main`** : `git worktree add ../thrive-essai-bascule -b essai/bascule main`, puis dans ce worktree, avec une copie du script qui remplace `main` par `essai/bascule` : `ancienne` ⇒ `apps/mobile/src/design/` absent et `git diff archive/ui-avant-ios27 -- apps/mobile` vide ; `nouvelle` ⇒ arbre identique à `ui-lin-veillee-fusion`. Noter les deux résultats, puis `git worktree remove ../thrive-essai-bascule` (la branche `essai/bascule` reste, à supprimer par Lylian s'il le veut).
6. Sur `main` : `pnpm ui:etat` ⇒ « nouvelle ». `pnpm typecheck` et tests mobiles verts **sur `main`**.
7. **Rien n'est poussé.** Les commandes de push sont écrites dans `CHECKLIST_TOI.md` (§7).

### Phase G — Haiku (rapport)

`docs/release/GO5_RAPPORT.md` : tableau lot → FAIT / À TOI / BLOQUÉ, résultats de la batterie avant/après, lien vers `go5-captures/index.html`, écarts gardés, NON_VÉRIFIÉ, état de la fusion et de l'archive (hashes), et compléter `CHECKLIST_TOI.md`.

---

## 6. Critères d'acceptation

**Automatiques (tous verts pour passer à la phase F)** :
- `pnpm typecheck` · `pnpm lint` (seule l'erreur préexistante `lib/secure-storage.ts:85` tolérée) · `pnpm test` (mêmes 5 suites KO préexistantes tolérées, cause `@thrive/shared` non construit) · `cd apps/mobile && npx vitest run src` (≥ 372 tests, tous verts, plus les nouveaux).
- `cd apps/web && npx vitest run --root ../mobile src/services` (abonnement, anti-steering).
- `node supabase/tests/local/run-pglite.mjs` (dont 083 GO 3 → GO 4 et rollback).
- Greps D2 et D3.
- Tests nouveaux : visuels (sélection, « Dans ses mots »), objets (titre, blocs, objet non gagné, lettre sans texte), K4 (tranche d'âge d'abord), keep-awake (activé/relâché, mock), photo (refus de permission, type/taille), D1, D3, E5 (non-dérive des droits), E6 (une seule écriture).

**Fidélité** : `docs/release/go5-captures/index.html` couvre toutes les lettres des deux styles ; aucun écart d'apparence non listé.

**Parité** : `GO5_PARITE.md` sans aucune ligne « perdu ».

**Manuels (dans `CHECKLIST_TOI.md`)** : parcours complet sur iPhone (TestFlight ou build de développement) en Lin puis Veillée ; mode activité de bout en bout dans Lin (reste marine, écran allumé) ; un visuel montré à l'enfant ; imprimer et enregistrer un objet ; photo du passeport ; Réduire la transparence / les animations ; Dynamic Type ; VoiceOver sur la barre d'onglets ; `pnpm ui:ancienne` puis `pnpm ui:nouvelle` une fois, à la main.

---

## 7. Actions humaines à ajouter à `CHECKLIST_TOI.md`

1. Relire `GO5_RAPPORT.md` et `go5-captures/index.html`.
2. Pousser quand tu es prêt : `git push origin archive/ui-avant-ios27 ui-avant-ios27 ui-lin-veillee-fusion` puis `git push origin main` (vérifier d'abord la protection de `main`, `scripts/ops/github-protect-main.sh`).
3. Appliquer 081, 082, 083 en préproduction puis en production, après relecture (inchangé depuis GO 3/GO 4), puis `get_advisors`.
4. Faire valider `PAGE_CONSULTER` (statut `A_VALIDER`) et ses numéros par un·e psychologue avant la mise en ligne.
5. Badge « 1 mois offert » du certificat Maison : décider comment l'appliquer (offre App Store / code promo) avant de l'afficher (D7).
6. Décisions encore ouvertes du GO 3 : R1 (programmes payés dans l'app iOS), R2 (taxes), R3 (remboursement), R4 (versement 2 automatique), R9 (prix visio, créneaux d'appel).
7. Pour revenir à l'ancienne interface : `pnpm ui:ancienne` (notice : `docs/release/RETOUR_ANCIENNE_UI.md`).

---

## 8. Message de lancement pour l'orchestrateur (à coller après `/model sonnet`)

```
Lis docs/release/GO5_FINALISATION_LIN_VEILLEE.md en entier puis exécute-le à la lettre (il complète GO4_UI_LIN_VEILLEE.md et GO3_UI_IOS27_PAIEMENTS.md, dont les règles 1 à 12 restent valables) :
1. Travaille sur feature/ios27-lin-veillee (worktree go-4-89318d s'il répond, sinon un nouveau worktree go-5).
2. Phase A : A0 puis A1 (haiku). Phase B : B1, B2, B3, B4 en parallèle (sonnet). Phase C : C1 puis C2, C3 (sonnet).
3. Phase D : D1 à D4 (haiku). Phase E : G2 (opus).
4. Phase F seulement si D et E sont verts : archive de l'ancienne UI, script de bascule, fusion --no-ff dans main, tags, preuve de bascule dans un worktree d'essai. Sinon : ne pas fusionner et dire pourquoi.
5. Phase G : rapport (haiku).
Règles : l'UX actuelle ne change pas, seule l'UI change ; uniquement Lin et Veillée ; aucun push, aucune action live, aucune suppression de branche ni de tag ; aucune donnée de démo en dur ; aucune question. Rapport final de 5 lignes avec les liens vers docs/release/GO5_RAPPORT.md, docs/release/go5-captures/index.html et docs/release/RETOUR_ANCIENNE_UI.md.
```

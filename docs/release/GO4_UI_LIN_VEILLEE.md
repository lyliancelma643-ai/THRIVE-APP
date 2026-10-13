# GO 4 — UI final « Lin » et « Veillée » (remplace les trois styles du GO 3)

> **Comment l'utiliser.** Dans Claude Code, à la racine de `thrive APP`, passer la session principale en **Sonnet** (`/model sonnet`), puis écrire :
> `Lis docs/release/GO4_UI_LIN_VEILLEE.md et exécute-le à la lettre.`
> L'orchestrateur lance Haiku, puis Sonnet, puis Opus 5.5 (uniquement pour la base de données et la revue). Aucune question à Lylian en cours de route (règle 9).
>
> **Ce prompt est un delta sur le GO 3.** Le GO 3 (`docs/release/GO3_UI_IOS27_PAIEMENTS.md`, branche `feature/ios27-ui-paiements`, lots S1–S7 et O1–O5 déjà livrés en local, rendu NON_VÉRIFIÉ) reste la référence pour **tout ce qui n'est pas du visuel** : paiements Stripe / Apple, RevenueCat, droits d'accès, anti-steering, migrations 081–083, règles 1–12. Le GO 4 ne refait rien de cela. Quand le GO 4 se tait, le GO 3 puis le dépôt font foi ; quand il contredit le dépôt sur un fait technique, l'agent le dit dans son rapport et suit le dépôt.

---

## 0. Mission en une phrase

Sur la branche du GO 3, **ne garder que deux styles — `lin` (clair) et `veillee` (sombre)** —, remplacer l'habillage des trois styles `natif | nuit | carnet` par ces deux-là, et implémenter les écrans mis à jour dans les maquettes **V4 « Lin »** et **V5 « Veillée »**, dont deux chantiers nouveaux : la **page Bilan complète** (toutes les cartes de l'app d'origine, en iOS 27) et le **mode activité complet** (« 02 bis · Durant l'activité », 18 écrans M1–M17).

**Les versions V1 (Natif), V2 (Nuit calme) et V3 (Carnet de saison) sont abandonnées.** Ne rien en reprendre, ne rien supprimer des fichiers (on les laisse, marqués obsolètes, §2).

La logique (accès, données, paiements, auth) ne change pas : seul l'habillage et la structure des écrans changent, plus les deux écrans nouveaux.

---

## 1. Règles non négociables

Les règles **1 à 12 du GO 3 s'appliquent mot pour mot** (additif et réversible, aucune action financière réelle, anti-steering pour Maison, `access_state()` seule source de vérité, conventions et français, secrets, économie de contexte, périmètre exclusif par agent, autonomie totale, rapport de 15 lignes, une seule correction, honnêteté `NON_VÉRIFIÉ`). Rappels qui comptent ici :

1. **Branche** : travailler sur `feature/ios27-lin-veillee`, créée **depuis `feature/ios27-ui-paiements`** (`git switch -c feature/ios27-lin-veillee feature/ios27-ui-paiements`, dans le worktree `.claude/worktrees/ios27-liquid-glass-payments-eec615` s'il existe, sinon à la racine). Commits atomiques Conventional Commits (`feat(mobile): …`, `refactor(mobile): …`). **Aucun `git push`, `eas submit`, `supabase db push`, `apply_migration`, déploiement.**
2. **Anti-steering Maison** inchangé : aucun texte, bouton ni lien de paiement web de Maison dans le mobile. `subscription-logic.ts`, `purchases.ts`, `subscription.store.ts` et leurs tests ne sont jamais affaiblis.
3. **Aucune donnée de démo en dur.** Les maquettes utilisent des données inventées (Léo, Camille, Alex Tremblay, ACT-0802 « La cabane impossible », « 7/13 », « 9 nov. », « +23 », la phrase de la fois d'avant…). On reproduit la **forme**, jamais le contenu : tout vient des hooks/stores existants ou de fixtures de test.
4. **Un seul geste « soleil » (émail jaune `#F9EB50`) par écran.** C'est la règle d'identité n° 1 des maquettes. Si un composant en ajoute un second, il passe en sauge (`--sage`) ou en verre.
5. **Pas de terme clinique, pas d'état d'échec, pas de score ni de série** dans l'UI (règles produit du GO 3 §1-5). Le code `P1…P8` d'un thème n'est jamais affiché.
6. **Le mode activité est toujours sur le fond marine** (palette Veillée), **dans les deux styles** (comme l'app d'origine : `bg-night-bg`). Voir §3.5.

---

## 2. Sources de vérité (par ordre de priorité)

| Quoi | Où |
|---|---|
| **Maquettes finales** | `maquettes-ios27/` : `v4.html` (Lin) et `v5.html` (Veillée), `final.css` (**tokens et matières — source de vérité visuelle**, chargé après `ios27.css`), `screens-final.js` (une fonction par lettre `S.A…S.Z`, `S.K2`, `S.G3…G11`, `S.M1…M17`, etc.), `icons.js`, `assets/logo.png`, `assets/vignettes/*.webp` (52). Aperçus : `apercus/Version-4-Lin.png`, `Version-5-Veillee.png`, `Bilan-complet-Lin.png`, `Bilan-complet-Veillee.png`, `Durant-activite-Lin.png`, `Durant-activite-Veillee.png`. |
| **Canevas** | https://claude.ai/artifact/8KWS2yao3sNodDwEB2Y9Kx — lire avec l'outil `Artifact` (action `read`), jamais WebFetch. **Ne regarder que les pages « Lin » et « Veillée »** (les autres pages sont V1–V3 abandonnées). |
| **Design system « THRIVE iOS 27 »** | https://claude.ai/code/artifact/9f22fd7f-ebb3-4045-97c3-fe50b468a8c9 — **PÉRIMÉ** (tokens light / dark / crème = V1–V3). Ne pas s'en servir pour les couleurs ; `final.css` fait foi. |
| **Logique et textes réels** | Web (lecture seule) : `apps/web/src/components/parent/p3/{ActivityMode,TimerRing,StepTimer,Arch,InlineMd,Glyph}.tsx`, `apps/web/src/lib/p3-moments/{guide.ts,index.ts,activities.generated.json}`, `apps/web/src/app/globals.css` (tokens Maison), fichiers du Bilan (`bilan-html.ts`, `page.tsx`, `detail-modal.tsx`, `card-info.tsx`, `passport-edit.tsx`, `sheet.tsx` — les repérer avec Grep). |
| **Base mobile du GO 3** | `apps/mobile/src/design/**` (+ `README.md`), `components/{bilan,maison,offres,subscription}`, `docs/release/GO3_RAPPORT.md`, `GO3_INVENTAIRE.md`, `GO3_O5_STYLE.md`. |
| Monétisation, accès, conformité | Comme GO 3 §2. |

**Premier geste de L1** : copier le dossier `maquettes-ios27/` **courant** de la racine du dépôt (non suivi par git) dans la branche, commit `docs(design): maquettes finales Lin et Veillée (V4/V5)`, et ajouter `maquettes-ios27/LISEZMOI.md` : « Seuls `v4.html`, `v5.html`, `final.css`, `screens-final.js` comptent. `v1.html`–`v3.html`, `screens.js`, `ios27.css` (seul) sont obsolètes. » Ne supprimer aucun fichier.

---

## 3. Le delta à implémenter

### 3.1 Les deux styles

| Clé | Nom affiché | Esprit | Onglets |
|---|---|---|---|
| `lin` | **Lin** | Clair : crème `#F7F5F2`, papier et lin, bleu marine d'accent | Maison · Bilan · Mes séances + Prominent **Coach** (icône bulle) |
| `veillee` | **Veillée** | Sombre : marine `#022539`, halo de lampe, soleil en accent | Maison · Bilan · Mes séances + Prominent **Ce soir** (icône lecture) |

- Identité commune « **Soir de famille** » : halo de lampe (`--lamp`), arche de lin, émail jaune, feutre, velours côtelé, papier vélin/vergé ; **Fraunces SOFT 100** pour les titres éditoriaux, **Inter** pour tout le reste (cible ≥ 44 pt, rangée ≥ 52 pt, marges 16, filet 0,5 pt).
- Structure iOS 27 : Liquid Glass à bordures définies, bord de défilement dur, barre d'onglets flottante avec onglet Prominent (icône seule, libellé = VoiceOver), listes inset grouped, boutons capsule.
- **Tokens** : à reprendre **tels quels** de `maquettes-ios27/final.css`, blocs `[data-v="v4"] .phone` (Lin) et `[data-v="v5"] .phone` (Veillée) : `--bg --bg2 --bg3 --elev --label…label4 --sep --fill…fill4 --tint --tint-ink --tint-soft --tint-text --kid --ok --warn --bad --glass --glass-strong --glass-edge --glass-spec --glass-tint --shadow-card --lamp --nav-active --badge-* --tgl-on --star-glow --bub-in --bub-out`, plus `--accent #F9EB50`, `--sage #A7C4BC`, `--sage-ink #46695F`, `--linen #EFE9DD`, `--paper`, `--paper-ink`.
- **Matières** (blocs `/* Matières */` de `final.css`) à traduire en primitives RN :

| Matière | Sens | Classe CSS | Primitive RN |
|---|---|---|---|
| Papier vélin / vergé | ce qu'on garde (fiches, lettre, certificat) | `.paper`, `.paper.laid`, `.frame` | `<Paper laid? framed?>` — encre toujours marine sur papier, **dans les deux styles** |
| Feutre | ce qu'on touche (portes, chips actifs, Prominent) | `.felt`, `.felt-strong` | `<Felt strong?>` |
| Velours côtelé | la semaine | `.velvet` | `<Velvet>` |
| Émail | le seul geste jaune (Lancer, étoile, bouton principal Veillée) | `.enamel`, `.star-on`, `.star-off` | `<Enamel>`, `<Star on>` |
| Arche de lin | la fenêtre de la mascotte | `.arch`, `.arch.sm` | `<Arch size>` (étend `MascotMedallion`) |

  Textures (grain, feutre, côtes, vélin) : **exporter de petites tuiles PNG** depuis le CSS via Playwright (`assets/brand/textures/*.png`, ≤ 20 Ko chacune) et les poser en `ImageBackground`/`expo-image` répétée avec mode de fusion doux ; repli couleur unie si la texture ne charge pas. Ne jamais animer une texture.
- **Fraunces** : la variation `SOFT 100` n'existe pas en React Native. Utiliser l'instance statique Fraunces la plus proche (500/600 selon l'écran) ; l'écrire comme écart connu dans le rapport.

### 3.2 Réglage du style et migration des valeurs

- **Compte & famille** (écran X) : section « Style de l'app » avec **deux** tuiles-aperçus (Lin : « Clair, papier et lin » ; Veillée : « Sombre, à la lampe »), coche sur l'actif. Texte : « Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes. » Référence : fonction `stylePicker` de `screens-final.js`.
- **Défaut : `lin`** (décision prise seul, à valider — R5).
- **Migration locale** : `StyleKey = 'lin' | 'veillee'`. Toute valeur lue dans AsyncStorage ou renvoyée par le serveur se normalise : `natif → lin`, `carnet → lin`, `nuit → veillee`, inconnue → défaut. Cette table de correspondance est le **seul** endroit du code où les mots `natif`, `nuit`, `carnet` ont le droit d'apparaître (avec son test).
- **Synchro serveur** (lot O6) : la migration `20261012_083_ui_style.sql` du GO 3 n'est **pas appliquée** ⇒ on la **modifie en place** (et son rollback) au lieu d'en créer une 084 : contrainte `check (ui_style in ('lin','veillee'))`, RPC `set_ui_style` qui accepte `lin|veillee` **et** normalise les anciennes valeurs (`natif|carnet → lin`, `nuit → veillee`) pour qu'un vieux client ne casse pas ; `NULL` remet le défaut. Mêmes garanties de sécurité que `GO3_O5_STYLE.md` (SECURITY DEFINER, `search_path = ''`, aucun identifiant en paramètre, EXECUTE retiré à `public`/`anon`). Tests mis à jour dans `supabase/tests/ui_style.sql`.

### 3.3 Écrans — correspondance maquette → app

Les lettres sont celles de `screens-final.js` (chapitres 01 à 09 du canevas). Les fichiers cibles sont **à confirmer par L0** dans `GO4_INVENTAIRE.md` (le GO 3 en a déjà fait la liste : relire `GO3_INVENTAIRE.md`). Les écrans déjà construits au GO 3 sont **redessinés**, pas recréés.

| Ch. | Lettres | Contenu | Lot |
|---|---|---|---|
| 01 Arrivée | A B C D E F | Bienvenue (arche de lin, duo de slogans), connexion, inscription parent/enfants, « Ton espace se prépare », choix du profil (arches-portraits avec numéro de maillot) | L2 |
| 01 | D2 D3 | Essai gratuit de Maison (« 0 $ » Fraunces, frise, formules), feuille Apple (neutre, non construite) | L7 |
| 02 Maison | K K2 L N | Maison « Soir de famille » (affiche du soir, Lancer en émail, 4 portes en feutre, carte velours « moments ensemble », cartes papier), tout le parcours, fiche moment, carnet | L3 |
| **02 bis Durant l'activité** | **M1…M17** | **Nouveau — voir §3.5** | **L4** |
| **03 Bilan & passeport** | **G G11 G3…G10 H I J** | **Refonte complète — voir §3.4** | **L5** |
| 04 Avec le coach | S T U V | Mes séances (carte velours, anneau), bilan du coach, messages (bulles + champ verre), notifications | L6 |
| 05 Offres & paiement | Y Y2 Y3 X2 | Habillage seulement : la logique, les montants et les textes de paiement du GO 3 §3.2–3.3 ne bougent pas | L7 |
| 06 Vidéo | O (P Q R = aperçus, **ne pas construire**) | « Bientôt disponible », drapeau `VIDEO_SESSIONS_ENABLED=false` | L6 |
| 07 Enfant | W | Questionnaire de l'enfant | L6 |
| 08 Compte | X Z | Compte & famille + sélecteur de style ; fin de parcours (certificat papier à double cadre sauge, courbe LSSS) | L2 (X), L6 (Z) |
| 09 États « Maison seul » | K3 G2 S2 U2 X2b | Onglets visibles avec cadenas, aperçus flous, **sans** lien de paiement ; lit `access_state()` | L3 (K3), L5 (G2), L6 (S2 U2), L7 (X2b) |

### 3.4 Chantier Bilan (lot L5)

La page **G** reprend **toutes les cartes de la page d'origine**, dans l'ordre, en iOS 27. Lire d'abord les fichiers web listés au §2 pour l'inventaire exact des cartes, de leurs textes, de leurs états vides et de leurs règles.
- **G** : page complète — % du programme, passeport, Compétences de vie, EPOCH, parcours des 13 séances, outils THRIVE, certificat, etc. **G11** : forfait **Groupe** — mêmes cartes mais compétences détaillées, courbe EPOCH et roue des émotions deviennent des **aperçus floutés** « dès le pack Individuel » (`<LockOverlay>` + `<MutedPreview>`, sans lien de paiement). **G2** : Bilan verrouillé (Maison seul).
- **Feuilles en grand détent** : G3 Identité Athlète, G4 Objectif, G5 Focus Word, G6 Routine pré-tir, G7 Boîte à outils, G8 Prochaines étapes, G9 Lettre à moi-même (papier vergé, scellée jusqu'à la séance 13), G10 Certificat THRIVE (verrouillé jusqu'à S13), **H** Compétences de vie (courbe LSSS Départ → Mi-parcours, 8 compétences), **I** « Comprendre cette carte », **J** Personnaliser le passeport (photo, surnom, n° de maillot, 6 couleurs, confidentialité).
- Fichiers probables : `components/bilan/{BilanView,BilanSheets,CoachDetailSheet,PermaCurve,Ring,Charts}.tsx`, `app/(parent)/bilans.tsx`, `components/access/LockedSection.tsx`. Les données restent celles de `bilanApi.ts` / `bilanModel.ts` ; ne rien recalculer.
- Contrastes de nuit : sur papier (carte claire dans Veillée) utiliser les encres sombres explicites ; liens en `tint-text`, pas en `tint`.

### 3.5 Chantier mode activité (lot L4) — M1 à M17

L'app d'origine n'est **pas** un lecteur pause/lecture : c'est un **flot d'écrans où chaque tap ajoute le contenu suivant en dessous, un pas à la fois, jamais automatique**. Le lot lit **`ActivityMode.tsx`, `StepTimer.tsx`, `TimerRing.tsx`, `guide.ts`** (web) et le code mobile existant (`components/maison/{MomentView,MomentClose}.tsx`, `app/(parent)/{moment,activite}/[activityId].tsx`, `lib/p3.ts`) avant de coder, puis **réutilise la logique existante** (sélection d'activité, durées 10/20/30, extensions, débrief, capture, lettre ACT-1302) et ne change que la présentation et l'enchaînement visuel.

- **Toujours Veillée** : le mode activité s'enveloppe dans un `<ThemeScope style="veillee">` (fond `#022539`, halo de lampe, texte crème) **même si l'utilisateur a choisi Lin**. Le reste de l'app suit le style choisi.
- Écrans, dans l'ordre du canevas : **M1** check-in (trois questions, pictogrammes dessinés, pastille crème choisie, « Passer » toujours possible) · **M2** la fois d'avant · **M3** amorce (affiche en arche, « Ce qu'on travaille » sur papier, phrase d'ouverture, minuteur 20 min) · **M** moment en cours (déroulé, « Si ça bloque », minuteur de jeu, anneau soleil) · **M4** minuteur de jeu plein écran (ton « silence ») · **M5** approfondir (+10 min, Transférer, « Terminer l'activité ») · **M6–M7** en voiture (lire / la route) · **M8** débrief (questions ajoutées une à une, réponse d'un tap) · **M9** pour finir (phrase de clôture) · **M10** « N minutes avec {enfant}. » · **M11** synthèse (étoiles, « Ça a donné quoi ? », phrase à garder, facultatif) · **M12** fin (compteur, 3 étoiles de la semaine, fierté, suite, retour Maison) · **M13** objet débloqué (Voir / Plus tard) · **M14** noter (feuille « À garder ») · **M15** lettre à moi-même (séance 13) · **M16** sceller (irréversible : confirmation) · **M17** quitter (« Enregistrer ce moment ? » Oui compte les minutes, Non ne garde rien).
- Un seul geste soleil par écran : le bouton principal et l'anneau/étoile ne sont **jamais** jaunes en même temps (les badges de lecture et les pastilles d'extension sont en sauge).
- Écran allumé (`expo-keep-awake`) pendant le minuteur si déjà utilisé ailleurs ; sinon le noter, ne pas ajouter de dépendance sans nécessité.

---

## 4. Équipe d'agents

**Séquence** : Vague 0 (Haiku) → Vague 1 (Sonnet : **L1 seul**, puis L2–L7 en parallèle) → Vague 2 (Haiku : vérifs) → Vague 3 (Opus 5.5 : O6) → Vague 4 (revue). Chaque vague dans **un seul message** (outil `Agent`, paramètre `model`). Après chaque vague : `pnpm typecheck` et `pnpm test` ; un bloquant ⇒ relancer **uniquement** l'agent fautif, 1 itération max.

### Vague 0 — Haiku (lecture seule)

**L0 · Inventaire et écarts** → écrit `docs/release/GO4_INVENTAIRE.md` (seul fichier créé).
1. Pour chaque lettre du §3.3, le fichier réel de `apps/mobile/src/**` (existant du GO 3 à redessiner, ou nouveau).
2. Tous les endroits du code qui mentionnent `natif`, `nuit`, `carnet`, `Nuit calme`, `Carnet de saison`, `creme` (Grep, avec comptage par fichier) — c'est la liste à nettoyer par L1/L2.
3. Écrans/cartes de l'app d'origine (Bilan et mode activité) **absents** des maquettes : à signaler, ne pas inventer.
4. Empreinte de `pnpm typecheck` / `pnpm lint` / `pnpm test` avant toute modif. Fonts (Inter, Fraunces) et `expo-glass-effect` déjà présents ? Textures exportables ?

### Vague 1 — Sonnet (UI, périmètres disjoints)

**L1 · Fondations (seul, d'abord).** Fichiers : `apps/mobile/src/design/**`, `apps/mobile/assets/{fonts,brand}/**`, `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/app/(parent)/_layout.tsx`, `maquettes-ios27/**` (copie + LISEZMOI, §2).
- `StyleKey = 'lin' | 'veillee'` ; `tokens.ts` réécrit depuis `final.css` (§3.1) ; `ThemeProvider`/`useStyleChoice()` avec migration (§3.2) ; `<ThemeScope style>` (forçage local) ; `tabConfig.ts` (deux dispositions + Prominent) ; `styleSync.ts` adapté ; `contrast.ts` et `canvasFidelity.test.ts` mis à jour.
- Primitives de matière (§3.1) : `Paper`, `Felt`, `Velvet`, `Enamel`, `Star`, `Arch`, plus l'export des textures. Supprimer le code mort des styles `natif`/`carnet` **dans `design/`** et mettre à jour `design/README.md` (tableau de traduction CSS → RN, onglets).
- Tests : rendu des deux thèmes, contraste AA de toutes les paires (4,5:1 texte, 3:1 gros texte) **y compris texte sur Paper dans Veillée**, migration des valeurs stockées, cible ≥ 44.

**L2 · Arrivée et compte.** Fichiers : `src/app/(auth)/**`, `src/app/welcome.tsx`, `src/app/(parent)/{profile,children}.tsx`, `src/screens/parent/ChildrenScreen.tsx`, `src/components/{account,AccountPrivacySection}**`. Écrans A B C D E F X (§3.3) ; sélecteur à **deux** tuiles (§3.2) ; duo de slogans inchangé (GO 3 §3.1). Auth, MFA, suppression, export, Loi 25 intacts.

**L3 · Maison.** Fichiers : `src/app/(parent)/{maison,parcours,carnet}.tsx`, `src/components/maison/{HomeView,HomeParts,TonightHero,FicheView,ParcoursView,CarnetView}.tsx`, `src/hooks/useMaison.ts`, `src/lib/vignettes.ts`. Écrans K K2 L N K3. Mêmes règles de sélection d'activité que le GO 3.

**L4 · Mode activité.** Fichiers : `src/app/(parent)/{moment,activite}/[activityId].tsx`, `src/components/maison/{MomentView,MomentClose}.tsx`, nouveaux `src/components/activite/**`. Écrans M1…M17 (§3.5). Tests de logique du flot (ajout pas à pas, jamais automatique ; « Passer » à chaque question ; sceller irréversible ; « Non » ne compte rien).

**L5 · Bilan.** Fichiers : `src/app/(parent)/bilans.tsx`, `src/components/bilan/**` (hors `bilanApi.ts`, `bilanModel.ts`, `bilanData.ts`, lecture seule), `src/components/access/LockedSection.tsx`. Écrans G G11 G2 G3…G10 H I J (§3.4).

**L6 · Coach, séances, messages, vidéo, enfant, fin.** Fichiers : `src/app/(parent)/{seances,messages,notifications,dashboard,videos,fin-de-parcours}.tsx`, `src/app/(parent)/chat/**`, `src/components/bilan/{SeancesView,SessionReportView,ThreadView,MessagesListView,NotificationsView,Bubble}.tsx`, `src/screens/child/**`, `src/lib/featureFlags.ts`. Écrans S T U V S2 U2 O W Z. **Conflit de périmètre** avec L5 sur `components/bilan/` : L5 ne touche pas ces six fichiers, L6 ne touche pas les autres.

**L7 · Offres, paywall, abonnement (habillage seulement).** Fichiers : `src/app/(parent)/{offres,abonnement,appel}.tsx`, `src/app/(parent)/offres/[pack].tsx`, `src/components/{offres,subscription}/**` (**sauf** `subscription-logic.ts`, `purchases.ts`, `subscription.store.ts`, `programPayments.ts` : interdits). Écrans D2 D3 Y Y2 Y3 X2 X2b. Textes, montants (32,50 $/mois, 299 $/an, 600/1 500/2 000 $ + tx) et drapeaux inchangés ; ils viennent de RevenueCat / des hooks, jamais codés en dur.

### Vague 2 — Haiku (vérifications mécaniques)

**H1** : `pnpm typecheck`, `pnpm lint`, `pnpm test` vs empreinte L0. **H2** : greps d'anti-steering (GO 3 §8) sur `apps/mobile/src`. **H3** : (a) plus aucun `natif|nuit|carnet|Nuit calme|Carnet de saison` hors table de migration et son test ; (b) aucune donnée de démo en dur (`Léo`, `Camille`, `Alex Tremblay`, `La cabane impossible`, `9 nov`, `7/13` hors fixtures de test) ; (c) textes français (apostrophes `’`, « Maison », « Mes séances »).

### Vague 3 — Opus 5.5

**O6 · Style serveur Lin / Veillée.** Fichiers : `supabase/migrations/20261012_083_ui_style.sql`, `supabase/rollbacks/20261012_083_ui_style_rollback.sql`, `supabase/tests/ui_style.sql`, `docs/release/GO3_O5_STYLE.md` (ajouter un encadré « remplacé par GO 4 »). Spécification au §3.2. Aucune écriture base, aucune application. Vérifier par test SQL : valeurs `lin|veillee` acceptées, anciennes valeurs normalisées, valeur inconnue refusée (22023), `NULL` = défaut, un parent ne peut écrire que sa ligne, rollback complet.

### Vague 4 — Revue

**G1 · Opus 5.5 (lecture seule + tests).** (1) O6 et sécurité RLS/RPC ; (2) anti-steering Maison, droits via `access_state()` (aucun recalcul dans les nouveaux écrans) ; (3) **le mode activité n'enregistre rien quand on choisit « Non »**, la lettre scellée ne peut pas être relue avant sa date ; (4) verdict `OK / À CORRIGER / À DÉCIDER`.
**V1 · Haiku** : relance la batterie (§5), vérifie que `git status` ne contient ni `.env` ni gros binaire, écrit `docs/release/GO4_RAPPORT.md` (tableau lot → FAIT / À TOI / BLOQUÉ, écarts de fidélité connus) et complète `CHECKLIST_TOI.md`.

---

## 5. Critères d'acceptation et tests

**Automatiques** : `pnpm typecheck` · `pnpm lint` · `pnpm test` ; tests anti-steering du GO 3 §8 inchangés et verts ; `supabase/tests/ui_style.sql` ; contraste AA des deux styles ; test de migration des valeurs stockées (`natif|carnet → lin`, `nuit → veillee`) ; test du flot du mode activité ; grep H3.

**Fidélité visuelle** : pour chaque lot, si un simulateur iOS ou `expo start --web` existe, une capture par style des **deux écrans principaux** du lot dans `docs/release/go4-captures/`, à comparer à `apercus/*.png` et au canevas. Sinon `NON_VÉRIFIÉ (pas de simulateur)`. Écarts connus à lister : Fraunces SOFT, textures, verre natif vs repli flou.

**Manuels (à faire par l'humain)** : parcours complet sur simulateur iOS dans Lin puis Veillée ; mode activité de bout en bout dans Lin (doit rester marine) ; passage Lin ↔ Veillée à chaud ; Réduire la transparence / les animations ; Dynamic Type ; VoiceOver sur la barre d'onglets.

**Livrables** : branche locale propre, `GO4_INVENTAIRE.md`, `GO4_RAPPORT.md`, `CHECKLIST_TOI.md` mis à jour, captures, migration 083 modifiée et **non appliquée**.

---

## 6. Points à trancher (décidés seuls, à valider par Lylian)

| # | Sujet | Décision prise | À valider |
|---|---|---|---|
| R5 | Style par défaut | `lin` | Confirmer |
| R10 | Mode activité toujours en Veillée, même en Lin | Oui (fidèle à l'app d'origine et à la demande) | — |
| R11 | Anciennes valeurs de style (`natif`, `nuit`, `carnet`) | Normalisées en `lin`/`veillee`, jamais perdues | Confirmer |
| R12 | Fraunces sans axe SOFT, textures en tuiles PNG | Approximation documentée | Juger sur simulateur |
| R13 | Design system artifact « THRIVE iOS 27 » périmé | `final.css` fait foi ; mise à jour de l'artifact en chantier séparé | Demander la mise à jour si utile |
| R1–R4, R6–R9 | Inchangés du GO 3 §7 | — | — |

---

## 7. Message de lancement pour l'orchestrateur (à coller après `/model sonnet`)

```
Lis docs/release/GO4_UI_LIN_VEILLEE.md en entier puis exécute-le à la lettre (il complète docs/release/GO3_UI_IOS27_PAIEMENTS.md, dont les règles 1 à 12 restent valables) :
1. git switch -c feature/ios27-lin-veillee feature/ios27-ui-paiements (dans le worktree ios27-liquid-glass-payments si présent).
2. Vague 0 : L0 (haiku). Vague 1 : L1 seul (sonnet), puis L2 à L7 en parallèle (sonnet).
3. Vague 2 : H1, H2, H3 (haiku). Vague 3 : O6 (opus). Vague 4 : G1 (opus), puis V1 (haiku).
Règles : uniquement les styles Lin et Veillée (V4/V5), V1–V3 ignorées, aucun push, aucune action live, aucune donnée de démo en dur, aucune question. Rapport final de 5 lignes avec les liens vers docs/release/GO4_RAPPORT.md et CHECKLIST_TOI.md.
```

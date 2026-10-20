# GO 5 — Tableau de parité (A1)

**Date** : 2026-10-19
**Branche** : `feature/ios27-lin-veillee` à **`558bfda`** (HEAD au moment de la mesure)
**`main`** : `3af7908`
**Lignes PERDU** : **0** (aucune route de `main` sans équivalent dans la branche)

Légende des statuts :
- **FAIT** : fichier réel présent sous `apps/mobile/src`. La fidélité visuelle n'est pas revue ici (Phase C).
- **À FAIRE (GO 5)** : absent ou à construire, rattaché au lot B1 (visuels MV/VI1–VI8, E1), B2 (objets N2–N4, « La lettre », impression/partage), B3 (K4/K5) ou B4 (écarts).
- **HORS PÉRIMÈTRE** : §3.3 du prompt GO 5.

Les statuts sont portés par le composant. Le style (Lin / Veillée) est un thème d'exécution : les décomptes sont donc identiques pour les deux styles.

---

## Synthèse

| Périmètre | FAIT | À FAIRE (GO 5) | HORS PÉRIMÈTRE |
|---|---|---|---|
| Lettres CH (79), style Lin | 58 | 17 | 4 |
| Lettres CH (79), style Veillée | 58 | 17 | 4 |
| Routes de `main` (27) | 27 présentes (11 identiques à `main`, 16 réécrites GO 4) | 0 | — |
| Gestes parent du web (2b, §3.1 + écarts maquettes) | 3 | 12 (dont 2 partiels : K4, K5) | 0 |

Compte à rebours des À FAIRE : B1 = 9 (MV, VI1–VI8), B2 = 3 (N2–N4) + « La lettre » + impression/partage, B3 = 2 (K4, K5), B4 = 3 (M16c, W, U2).

---

## Tableau 1 — Maquettes → app (`maquettes-ios27/screens-final.js`, constante `CH`)

`v4.html` et `v5.html` chargent le même `screens-final.js` : la liste `CH` est la même pour les deux.

### 01 · Arrivée

| Lettre | Écran | Fichier(s) réel(s) sous `apps/mobile/src` | Statut |
|---|---|---|---|
| A | Bienvenue | `app/welcome.tsx`, `components/account/WelcomeView.tsx`, `components/account/SloganDuo.tsx` | FAIT |
| B | Connexion | `app/(auth)/login.tsx`, `components/account/LoginView.tsx` | FAIT |
| C | Inscription · le parent | `app/(auth)/register.tsx`, `components/account/RegisterView.tsx` | FAIT |
| D | Inscription · les enfants | `components/account/ChildrenSetupView.tsx` (âge 8–17, `SPORT_OPTIONS`) | FAIT |
| D2 | Essai gratuit de Maison | `app/(parent)/offres.tsx`, `components/offres/MaisonOfferCard.tsx`, `components/subscription/PaywallView.tsx` | FAIT |
| D3 | Confirmation App Store (feuille système) | — | HORS PÉRIMÈTRE (§3.3) |
| E | Ton espace se prépare | `components/account/PreparingSpace.tsx` | FAIT |
| F | Choisir le profil | `components/account/ChildrenListView.tsx`, `components/account/ChildPicker.tsx`, `components/account/JerseyArch.tsx` | FAIT |

### 02 · Maison

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| K | Maison | `app/(parent)/maison.tsx`, `components/maison/HomeView.tsx`, `components/maison/TonightHero.tsx`, `components/maison/HomeParts.tsx` | FAIT |
| K2 | Tout le parcours | `app/(parent)/parcours.tsx`, `components/maison/ParcoursView.tsx` | FAIT |
| L | Fiche moment | `components/maison/FicheView.tsx` | FAIT |
| N | Le carnet | `app/(parent)/carnet.tsx`, `components/maison/CarnetView.tsx` | FAIT |

### 02 bis · Mode activité

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| M1 | Check-in | `components/activite/CheckinView.tsx`, `components/activite/Glyph.tsx` | FAIT |
| M2 | La fois d'avant | `components/activite/RecallView.tsx` | FAIT |
| M3 | Amorce | `components/activite/AmorceView.tsx` | FAIT |
| M | Moment en cours | `components/activite/DerouleView.tsx`, `app/(parent)/moment/[activityId].tsx` | FAIT |
| M4 | Minuteur de jeu | `components/activite/PlayTimer.tsx` | FAIT |
| M5 | Approfondir | `components/activite/DerouleView.tsx`, `components/activite/flow.ts` | FAIT |
| M6 | En voiture · lire | `components/activite/CarView.tsx` (`CarReadView`) | FAIT |
| M7 | En voiture · la route | `components/activite/CarView.tsx` (`CarRoadView`) | FAIT |
| M8 | Débrief | `components/activite/DebriefView.tsx` | FAIT |
| M9 | Pour finir | `components/activite/ClosingView.tsx` | FAIT |
| M10 | « 18 minutes avec Léo. » | `components/activite/ClosingView.tsx` (`MinutesView`) | FAIT |
| M11 | Synthèse | `components/activite/SynthesisView.tsx` | FAIT |
| M12 | Fin | `components/activite/EndView.tsx` | FAIT |
| M13 | Fin · objet débloqué | `components/activite/EndView.tsx` (« Débloqué ») | FAIT |
| M14 | Noter (feuille « À garder ») | `components/activite/KeptSheet.tsx` | FAIT |
| M15 | Lettre à moi-même | `components/activite/LetterView.tsx` | FAIT |
| M16 | Sceller la lettre | `components/activite/LetterView.tsx`, `components/activite/SealConfirm.tsx` | FAIT |
| M17 | Quitter | `components/activite/QuitSheet.tsx` | FAIT |

### 02 ter · Ce que l'app fait déjà, habillé

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| MV | Bouton « Montrer : … » (étape avec visuel, et sous le débrief) | — (aucune occurrence de « Montrer » ni de `VISUAL_LABELS` dans `apps/mobile/src`) | À FAIRE (GO 5) · **B1** |
| VI1 | Visuel · Les six émotions | — | À FAIRE (GO 5) · **B1** |
| VI2 | Visuel · Le thermomètre | — | À FAIRE (GO 5) · **B1** |
| VI3 | Visuel · Les deux colonnes | — | À FAIRE (GO 5) · **B1** |
| VI4 | Visuel · L'escalier | — | À FAIRE (GO 5) · **B1** |
| VI5 | Visuel · La carte de ses personnes | — | À FAIRE (GO 5) · **B1** |
| VI6 | Visuel · Les trois sens | — | À FAIRE (GO 5) · **B1** |
| VI7 | Visuel · Trois endroits | — | À FAIRE (GO 5) · **B1** |
| VI8 | Visuel · Ses outils (« Dans ses mots », question à poser) | — | À FAIRE (GO 5) · **B1** |
| M16b | Lettre scellée (après « Sceller ») | `components/activite/SealConfirm.tsx` (texte « Elle te reviendra par courriel le … ») | FAIT (habillage à vérifier, Phase C) |
| M16c | Lettre sur papier (si l'enregistrement échoue) | `components/activite/QuitSheet.tsx` (`SaveFailedSheet`) existe, mais sans l'habillage « enveloppe fermée, datée » | À FAIRE (GO 5) · **B4** |
| N2 | Objet · Fiche Identité | — (aucun `rewardTitle` / `blocksFor` mobile) | À FAIRE (GO 5) · **B2** |
| N3 | Objet · Boîte à Outils (carte 85 × 55 mm) | — | À FAIRE (GO 5) · **B2** |
| N4 | Objet · Certificat THRIVE Maison | — (badge « 1 mois offert » exclu, décision D7) | À FAIRE (GO 5) · **B2** |
| K4 | Quand il dit non (page dédiée) | — (filtre de liste seulement : `components/maison/models.ts`, `app/(parent)/parcours.tsx`) | À FAIRE (GO 5) · **B3** |
| K5 | Quand consulter (page dédiée) | — (`components/HealthNotice.tsx` existe, sans page dédiée) | À FAIRE (GO 5) · **B3** |

### 03 · Bilan & passeport

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| G | Bilan · la page complète | `app/(parent)/bilans.tsx`, `components/bilan/BilanView.tsx`, `components/bilan/BilanCards.tsx` | FAIT |
| G11 | Bilan · forfait Groupe (aperçus floutés) | `components/bilan/bilanPage.ts`, `components/bilan/BilanCards.tsx` | FAIT |
| G3 | Fiche Identité Athlète | `components/bilan/BilanSheets.tsx`, `components/bilan/CoachDetailSheet.tsx` | FAIT |
| G4 | Fiche Objectif | `components/bilan/CoachDetailSheet.tsx`, `components/bilan/bilanModel.ts` | FAIT |
| G5 | Focus Word | `components/bilan/CoachDetailSheet.tsx`, `components/bilan/bilanModel.ts` | FAIT |
| G6 | Routine pré-tir | `components/bilan/CoachDetailSheet.tsx`, `components/bilan/BilanCards.tsx` | FAIT |
| G7 | Boîte à outils | `components/bilan/BilanCards.tsx`, `components/bilan/CoachDetailSheet.tsx` | FAIT |
| G8 | Prochaines étapes | `components/bilan/BilanCards.tsx`, `components/bilan/CoachDetailSheet.tsx` | FAIT |
| G9 | Lettre à moi-même (bilan, scellée) | `components/bilan/CoachDetailSheet.tsx`, `components/bilan/BilanCards.tsx` | FAIT |
| G10 | Certificat THRIVE (verrouillé jusqu'à S13) | `components/bilan/BilanCards.tsx`, `components/fin-parcours/Certificate.tsx` | FAIT |
| H | Compétences de vie | `components/bilan/BilanSheets.tsx` | FAIT |
| I | Comprendre cette carte | `components/bilan/InfoSheet.tsx`, `components/bilan/cardInfo.ts` | FAIT |
| J | Personnaliser le passeport | `components/bilan/BilanSheets.tsx` (« Personnaliser »), `components/bilan/bilanApi.ts` | FAIT (photo et permission à vérifier en E/D) |

### 04 · Avec le coach

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| S | Mes séances | `app/(parent)/seances.tsx`, `components/bilan/SeancesView.tsx` | FAIT |
| T | Bilan du coach | `components/bilan/SessionReportView.tsx`, `components/bilan/CoachDetailSheet.tsx` | FAIT |
| U | Messages | `app/(parent)/messages.tsx`, `app/(parent)/chat/[conversationId].tsx`, `components/bilan/MessagesListView.tsx`, `components/bilan/ThreadView.tsx` | FAIT |
| V | Notifications | `app/(parent)/notifications.tsx`, `components/bilan/NotificationsView.tsx` | FAIT |

### 05 · Offres & paiement

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| Y | Offres | `app/(parent)/offres.tsx`, `components/offres/OffresView.tsx` | FAIT |
| Y2 | Groupe · paiement | `app/(parent)/offres/[pack].tsx`, `components/offres/ProgrammePaiementView.tsx` | FAIT |
| Y3 | Appel de 15 min | `app/(parent)/appel.tsx`, `components/offres/AppelView.tsx` | FAIT |
| X2 | Mon abonnement | `app/(parent)/abonnement.tsx`, `components/subscription/SubscriptionView.tsx` | FAIT |

### 06 · Séances vidéo (en construction)

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| O | Bientôt disponible | `components/video/ComingSoonView.tsx`, `app/(parent)/videos.tsx` | FAIT |
| P | Prêt avec Léo ? (aperçu) | `components/video/VideoReadyView.tsx` | HORS PÉRIMÈTRE (§3.3, drapeau `VIDEO_SESSIONS_ENABLED=false`) |
| Q | Question en pause (aperçu) | `components/video/VideoQuestionView.tsx` | HORS PÉRIMÈTRE (§3.3) |
| R | Après la séance (aperçu) | `components/video/VideoDoneView.tsx` | HORS PÉRIMÈTRE (§3.3) |

### 07 · L'enfant

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| W | Questionnaire de Léo | `screens/child/QuestionsScreen.tsx` existe, mais **aucune route ne l'importe** (seulement `dev-gallery/lot-parcours.tsx`) | À FAIRE (GO 5) · **B4** (non routé) |

### 08 · Compte & fin de parcours

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| X | Compte & famille | `app/(parent)/profile.tsx`, `components/account/AccountView.tsx`, `components/account/StylePicker.tsx`, `app/(parent)/children.tsx` | FAIT |
| Z | Fin de parcours | `app/(parent)/fin-de-parcours.tsx`, `components/fin-parcours/FinDeParcoursView.tsx`, `components/fin-parcours/Certificate.tsx`, `components/fin-parcours/Curves.tsx` | FAIT |

### 09 · États · abonné Maison seul

| Lettre | Écran | Fichier(s) réel(s) | Statut |
|---|---|---|---|
| K3 | Maison · essai gratuit (bandeau « encore N jours ») | `components/maison/models.ts` (libellé « Essai gratuit · encore N jour(s) »), `components/maison/TonightHero.tsx` | FAIT |
| G2 | Bilan verrouillé | `app/(parent)/bilans.tsx` (`LockedSection section="bilan"`), `components/access/LockedSection.tsx` | FAIT |
| S2 | Mes séances verrouillé | `app/(parent)/seances.tsx` (`LockedSection section="seances"`) | FAIT |
| U2 | Messages verrouillé (aperçu factice + invitation) | — (`LockedSection` ne gère que `bilan` et `seances`) | À FAIRE (GO 5) · **B4** |
| X2b | Mon abonnement · essai | `components/subscription/SubscriptionSettings.tsx`, `components/subscription/SubscriptionView.tsx` (« Gérer dans … », « Restaurer les achats ») | FAIT (date d'essai à vérifier, Phase C) |

### Éléments de §3.1 sans lettre de la constante `CH`

| Élément | Fichier(s) réel(s) | Statut |
|---|---|---|
| « Objet · La lettre » (dates seulement, jamais le texte) | — | À FAIRE (GO 5) · **B2** |
| N2–N4 · Imprimer · Enregistrer en image · Partager (`expo-print`, `react-native-view-shot`, `expo-sharing`) | — (`expo-print`, `view-shot`, `expo-sharing` absents du code ; `CarnetView` n'a qu'un prop `onShare`) | À FAIRE (GO 5) · **B2** |
| Sous-titre « À l'écran, pour qu'il montre du doigt » | — | À FAIRE (GO 5) · **B1** |

---

## Tableau 2 — UX actuelle → app

### 2a. Routes de `main` (`git ls-tree -r main apps/mobile/src/app` : 27 fichiers)

Comparaison : `comm` sur les chemins, puis `git diff --quiet main HEAD -- <fichier>`. **Aucune route absente** : toutes existent dans la branche au même chemin.

| Route de `main` | Équivalent dans la branche | Statut |
|---|---|---|
| `app/_layout.tsx` | `app/_layout.tsx` | Présent, réécrit GO 4 |
| `(auth)/_layout.tsx` | `(auth)/_layout.tsx` | Présent, identique |
| `(auth)/login.tsx` | `(auth)/login.tsx` | Présent, réécrit GO 4 |
| `(auth)/register.tsx` | `(auth)/register.tsx` | Présent, réécrit GO 4 |
| `(auth)/forgot-password.tsx` | `(auth)/forgot-password.tsx` | Présent, réécrit GO 4 |
| `(coach)/_layout.tsx` | `(coach)/_layout.tsx` | Présent, identique (coach inchangé, §3.3) |
| `(coach)/chat/[conversationId].tsx` | `(coach)/chat/[conversationId].tsx` | Présent, identique |
| `(coach)/dashboard.tsx` | `(coach)/dashboard.tsx` | Présent, identique |
| `(coach)/inbox.tsx` | `(coach)/inbox.tsx` | Présent, identique |
| `(coach)/notifications.tsx` | `(coach)/notifications.tsx` | Présent, identique |
| `(coach)/profile.tsx` | `(coach)/profile.tsx` | Présent, identique |
| `(coach)/programs.tsx` | `(coach)/programs.tsx` | Présent, identique |
| `(coach)/sessions.tsx` | `(coach)/sessions.tsx` | Présent, identique |
| `(parent)/_layout.tsx` | `(parent)/_layout.tsx` | Présent, réécrit GO 4 |
| `(parent)/abonnement.tsx` | `(parent)/abonnement.tsx` | Présent, réécrit GO 4 |
| `(parent)/activite/[activityId].tsx` | `(parent)/activite/[activityId].tsx` (+ `(parent)/moment/[activityId].tsx`, mode activité GO 4) | Présent, réécrit GO 4 |
| `(parent)/badges.tsx` | `(parent)/badges.tsx` | Présent, identique |
| `(parent)/bilans.tsx` | `(parent)/bilans.tsx` (Bilan, `components/bilan/*`) | Présent, réécrit GO 4 |
| `(parent)/chat/[conversationId].tsx` | `(parent)/chat/[conversationId].tsx` | Présent, réécrit GO 4 |
| `(parent)/children.tsx` | `(parent)/children.tsx` (re-export de `screens/parent/ChildrenScreen`) | Présent, réécrit GO 4 |
| `(parent)/dashboard.tsx` | `(parent)/dashboard.tsx` (90 lignes contre 115 dans `main`) | Présent, réécrit GO 4 |
| `(parent)/maison.tsx` | `(parent)/maison.tsx` | Présent, réécrit GO 4 |
| `(parent)/messages.tsx` | `(parent)/messages.tsx` | Présent, réécrit GO 4 |
| `(parent)/notifications.tsx` | `(parent)/notifications.tsx` | Présent, réécrit GO 4 |
| `(parent)/profile.tsx` | `(parent)/profile.tsx` | Présent, réécrit GO 4 |
| `(parent)/programs.tsx` | `(parent)/programs.tsx` | Présent, identique |
| `(parent)/seances.tsx` | `(parent)/seances.tsx` | Présent, réécrit GO 4 |

Routes de la branche sans équivalent dans `main` (ajouts GO 3 et GO 4) : `__design.tsx`, `__ecran.tsx`, `index.tsx`, `welcome.tsx`, `(parent)/appel.tsx`, `(parent)/carnet.tsx`, `(parent)/fin-de-parcours.tsx`, `(parent)/moment/[activityId].tsx`, `(parent)/offres.tsx`, `(parent)/offres/[pack].tsx`, `(parent)/parcours.tsx`, `(parent)/video/[step].tsx`, `(parent)/videos.tsx`.

**Lignes PERDU : 0.**

### 2b. Parcours parent du web (§3.1 du prompt)

| Écran / geste web | Où il vit dans la branche mobile | Statut |
|---|---|---|
| `components/parent/p3/ActivityMode.tsx` (mode activité de bout en bout) | `components/activite/*` + `app/(parent)/moment/[activityId].tsx` | FAIT (fidélité Lin : Phase C) |
| `components/parent/p3/Visuals.tsx` · `VisualButton` (« Montrer : … ») | — | À FAIRE (GO 5) · B1 |
| `components/parent/p3/Visuals.tsx` · `VisualSheet` (8 visuels VI1–VI8, « Dans ses mots », « Demande : … ») | — | À FAIRE (GO 5) · B1 |
| `components/parent/p3/RewardView.tsx` · `rewardTitle`, objets (N2–N4) | — | À FAIRE (GO 5) · B2 |
| `app/parent/(hub)/fitness/objets/[rewardId]/page.tsx` | — (route `(parent)/objet/[rewardId]` à créer) | À FAIRE (GO 5) · B2 |
| Bouton « Voir » de M13 (ouvre l'objet) | — (lié à N2) | À FAIRE (GO 5) · B2 |
| `lib/p3-moments/index.ts` (données : semaines, activités, `getActivity`, `activitiesOfWeek`…) | `apps/mobile/src/lib/p3.ts` (`export * from` le module web) | FAIT |
| `lib/p3-moments/guide.ts` · `CHECKIN`, `DEBRIEF`, `SYNTHESIS`, `CLOSING_SCREEN`, `PILLAR_PLAIN`, `PRIDE_LINES`, `OVERTIME_LINE` | `apps/mobile/src/lib/p3.ts` (ré-export) | FAIT |
| `lib/p3-moments/guide.ts` · `PAGE_NON`, `PAGE_CONSULTER`, `BILAN_4_SEMAINES` | — (non exposés par `lib/p3.ts`) | À FAIRE (GO 5) · B3 |
| `app/parent/(hub)/fitness/quand-il-dit-non/page.tsx` (page dédiée, tranche d'âge d'abord, `pickTonight` avec 2 refus) | Porte « Quand il dit non » de Maison (`components/maison/HomeView.tsx`) → filtre de liste `app/(parent)/parcours.tsx` (filtre `non`). **Page dédiée absente** | À FAIRE (GO 5) · B3 (liste filtrée = partiel, FAIT) |
| `app/parent/(hub)/fitness/quand-consulter/page.tsx` (page dédiée, Appeler / Texto 9-8-8, Québec) | `components/HealthNotice.tsx` (bloc sans page), affiché dans `maison.tsx` et `profile.tsx` | À FAIRE (GO 5) · B3 (bloc = partiel) |
| « La lettre » (dates seulement) | — | À FAIRE (GO 5) · B2 |
| Imprimer · Enregistrer en image · Partager (objets) | — (`CarnetView` n'a qu'un prop `onShare`, pas d'impression ni d'image) | À FAIRE (GO 5) · B2 |
| Questionnaire de l'enfant (W) | `screens/child/QuestionsScreen.tsx`, non routé | À FAIRE (GO 5) · B4 |
| Messages verrouillés (U2) | — | À FAIRE (GO 5) · B4 |

### 2c. Hors périmètre (§3.3, à noter au rapport, ne pas construire)

- Pages web « cartes À la maison » (`fitness/a-la-maison/**`, `guide`) : absentes de l'app mobile, comme prévu.
- Séances vidéo P, Q, R (aperçus, `VIDEO_SESSIONS_ENABLED=false`).
- D3 (feuille système Apple).
- Pack « Dehors » (`available: false`).
- Côté coach (`app/(coach)/**`) : interface conservée, vérification d'affichage seulement (§6).

---

## Tableau 3 — Empreinte avant GO 5

Mesure sur `558bfda`, depuis le worktree. `pnpm` 9.15.9 est fourni par un shim corepack créé dans le scratchpad de session (le shim préexistant du scratchpad ne fonctionnait pas).

| Commande | Résultat |
|---|---|
| `pnpm typecheck` (racine, `pnpm -r`) | **OK** : `apps/mobile` et `apps/web`, `tsc --noEmit` sans erreur (exit 0). |
| `pnpm lint` (racine) | **KO, 1 erreur préexistante** : `apps/mobile` → `src/lib/secure-storage.ts:85` (`@typescript-eslint/no-var-requires`), plus 10 warnings. `pnpm -r` s'est arrêté au premier échec (`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`) : les autres workspaces ne sont pas passés dans ce run. Conforme à la tolérance du §6. |
| `pnpm test` (racine) | **KO, cause préexistante** : `apps/web` → 426 tests verts, **5 suites KO** (`src/lib/access.test.ts`, `messaging.test.ts`, `notifications.test.ts`, `password.test.ts`, `program-checkout.test.ts`), cause « Failed to resolve entry for package `@thrive/shared` » (package non construit). Conforme à la tolérance du §6. `pnpm -r` s'est arrêté au premier échec : `apps/mobile` n'a pas été exécuté par ce run racine. |
| `cd apps/mobile && ../web/node_modules/.bin/vitest run src` | **OK** : 26 fichiers verts, **372 tests verts** (plancher du §6 : ≥ 372). |

Le plancher de 372 tests mobiles est atteint sans nouveau test, comme attendu avant GO 5.

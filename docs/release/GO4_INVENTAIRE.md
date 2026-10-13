# GO 4 — Inventaire et écarts (lot L0, lecture seule)

Date : 2026-10-13. Branche : `feature/ios27-lin-veillee` (HEAD `35c7fd7`). Worktree : `.claude/worktrees/go-4-89318d`.
Aucun fichier existant modifié, aucun commit, aucun install. Seul fichier créé : ce document.

Légende : **Existant** = fichier présent à redessiner · **Nouveau** = absent, chemin proposé · **Conflit** = deux lots revendiquent le même fichier.

---

## 0. Points clés pour l'orchestrateur

1. **Empreinte** : `typecheck` mobile OK (0 erreur). `lint` mobile KO (1 erreur, 10 avertissements, préexistant). Tests : aucune suite mobile dans `pnpm test` ; les 19 fichiers de test mobiles passent (160 tests) lancés à la main avec vitest. Web : 5 suites KO (`@thrive/shared` non construit), 426 tests OK.
2. **Dépendances** : `expo-glass-effect` 55.0.11, `@expo-google-fonts/inter` et `fraunces`, `react-native-svg`, `expo-linear-gradient`, `expo-blur` sont **déjà** dans `apps/mobile/package.json`. Il manque `expo-keep-awake` et `expo-image` (utile pour M4, à décider).
3. **Fichiers à créer** : tout le dossier `components/activite/**` (M1 à M17), plus cinq feuilles de Bilan absentes du mobile (G3, G5, G6, G9, G10 ; G10 est partiel). Les routes `passeport`, `espace-pret`, `choisir-profil`, `moment-en-cours` ne sont pas nécessaires : leur contenu existe déjà sous une autre forme (§1).
4. **Conflit de périmètre** : `app/(parent)/activite/[activityId].tsx` est revendiqué par L3 (fiche L) et L4 (§4). Il faut le trancher avant L3/L4.
5. **Grep H3 à scoper** : le mot « carnet » est aussi un mot courant (copie « Le carnet de vos moments », texte imposé « ton carnet » dans `StylePicker.tsx`, nom de route `carnet`), et « natif » désigne aussi le SDK natif (`module natif`). Un grep brut donnera de faux positifs (§2.3).
6. **Écarts maquette / app d'origine** : libellé « EPOCH » (maquette) contre « PERMA » (courbe du web). Mode activité : le web a un flot de « visuels » (8 feuilles) et un repli « papier » absents de M1–M17 (§3.3).
7. **Déjà corrigé depuis le GO 3** : `homeFor()` renvoie `/(parent)/maison` (`app/_layout.tsx:17`) ; la copie `maquettes-ios27/` est déjà suivie par git (commit `35c7fd7`, 66 fichiers). `LISEZMOI.md` existe mais **ne contient pas** la phrase « obsolètes » exigée par §2 : à compléter en L1.

---

## 1. Tableau lettres → lot → fichiers (`apps/mobile/src/**`)

| Lettre | Écran (§3.3) | Lot | Fichiers | Statut |
|---|---|---|---|---|
| A | Bienvenue | L2 | `app/welcome.tsx`, `components/account/WelcomeView.tsx` | Existant. WelcomeView a 3 mises en page par style (l.46, 89, 142) |
| B | Connexion | L2 | `app/(auth)/login.tsx`, `components/account/LoginView.tsx` | Existant |
| C | Inscription parent | L2 | `app/(auth)/register.tsx`, `components/account/RegisterView.tsx` | Existant |
| D | Inscription enfants | L2 | `components/account/ChildrenSetupView.tsx`, `app/(parent)/children.tsx` (masquée), `screens/parent/ChildrenScreen.tsx` | Existant. `register.tsx` n'a pas d'étape enfant (confirmé) |
| E | Ton espace se prépare | L2 | `components/account/PreparingSpace.tsx` | Existant. Route `app/(auth)/espace-pret.tsx` absente : la monter depuis l'inscription, pas de route neuve |
| F | Choisir le profil | L2 | `components/account/ChildPicker.tsx`, `screens/parent/ChildrenScreen.tsx` | Existant. 3 variantes par style (l.47, 94, 157). Route `choisir-profil.tsx` absente |
| X | Compte & famille + sélecteur de style | L2 | `app/(parent)/profile.tsx`, `components/account/AccountView.tsx`, `components/account/StylePicker.tsx`, `components/AccountPrivacySection.tsx` | Existant. StylePicker passe de 3 tuiles à 2 |
| D2 | Essai gratuit Maison | L7 | `components/subscription/Paywall.tsx`, `components/subscription/PaywallView.tsx`, `components/offres/MaisonOfferCard.tsx` | Existant (habillage seul) |
| D3 | Feuille Apple | — | aucun (feuille système) | Non construit |
| K | Maison « Soir de famille » | L3 | `app/(parent)/maison.tsx`, `components/maison/HomeView.tsx`, `HomeParts.tsx`, `TonightHero.tsx`, `palette.ts` | Existant (refonte) |
| K2 | Parcours (13 semaines) | L3 | `app/(parent)/parcours.tsx`, `components/maison/ParcoursView.tsx` | Existant |
| K3 | Maison « seul » (états) | L3 | `app/(parent)/maison.tsx`, `components/maison/HomeView.tsx`, `components/access/LockedSection.tsx` | Existant. `maison.tsx:107-108` : l'invitation Offres dépend de `style === 'nuit'` : garder la condition (devient `veillee`) |
| L | Fiche moment | L3 (**conflit L4**) | `app/(parent)/activite/[activityId].tsx`, `components/maison/FicheView.tsx` | Existant. Trancher la propriété du fichier |
| N | Le carnet | L3 | `app/(parent)/carnet.tsx`, `components/maison/CarnetView.tsx` | Existant. Comparer avec `app/(parent)/badges.tsx` (masquée) |
| M (moment en cours) | Déroulé | L4 | `components/maison/MomentView.tsx`, `app/(parent)/moment/[activityId].tsx` | Existant à redessiner |
| M12 | Fin (compteur, étoiles) | L4 | `components/maison/MomentClose.tsx` (réutilisable) | Existant |
| M1 | Check-in | L4 | `components/activite/CheckinView.tsx` | Nouveau |
| M2 | La fois d'avant | L4 | `components/activite/RecallView.tsx` | Nouveau |
| M3 | Amorce | L4 | `components/activite/AmorceView.tsx` | Nouveau |
| M4 | Minuteur de jeu plein écran | L4 | `components/activite/PlayTimer.tsx` | Nouveau (keep-awake absent) |
| M5 | Approfondir (+10 min, Ancrer, Transférer) | L4 | `components/activite/ExtensionsView.tsx` | Nouveau |
| M6–M7 | En voiture (lire / la route) | L4 | `components/activite/CarView.tsx` | Nouveau |
| M8 | Débrief | L4 | `components/activite/DebriefView.tsx` | Nouveau |
| M9 | Pour finir | L4 | `components/activite/ClosingView.tsx` | Nouveau |
| M10 | « N minutes avec {enfant} » | L4 | `components/activite/MinutesView.tsx` | Nouveau |
| M11 | Synthèse | L4 | `components/activite/SynthesisView.tsx` | Nouveau |
| M13 | Objet débloqué | L4 | `components/activite/RewardView.tsx` | Nouveau |
| M14 | Noter (feuille « À garder ») | L4 | `components/activite/KeptSheet.tsx` | Nouveau |
| M15 | Lettre à moi-même | L4 | `components/activite/LetterView.tsx` | Nouveau |
| M16 | Sceller (confirmation) | L4 | `components/activite/SealConfirm.tsx` | Nouveau |
| M17 | Quitter (« Enregistrer ce moment ? ») | L4 | `components/activite/QuitSheet.tsx` | Nouveau |
| G | Bilan | L5 | `app/(parent)/bilans.tsx`, `components/bilan/BilanView.tsx` | Existant (refonte) |
| G11 | Bilan forfait Groupe | L5 | `components/bilan/BilanView.tsx` (variante), `components/access/LockedSection.tsx` | Existant |
| G2 | Bilan verrouillé | L5 | `components/access/LockedSection.tsx`, `BilanView.tsx` (lecture seule) | Existant |
| G3 | Fiche Identité Athlète | L5 | `components/bilan/IdentitySheet.tsx` | Nouveau (le passeport est en ligne dans BilanView) |
| G4 | Fiche Objectif THRIVE | L5 | `components/bilan/CoachDetailSheet.tsx` (kind `smart`) | Existant (partiel) |
| G5 | Focus Word | L5 | `components/bilan/FocusWordSheet.tsx` | Nouveau (seul un Tag « Mot-focus » existe) |
| G6 | Routine pré-tir | L5 | `components/bilan/RoutineSheet.tsx` | Nouveau |
| G7 | Boîte à outils | L5 | `components/bilan/CoachDetailSheet.tsx` (kind `toolbox`) | Existant |
| G8 | Prochaines étapes | L5 | `components/bilan/CoachDetailSheet.tsx` (kind `steps`) | Existant |
| G9 | Lettre à moi-même (scellée) | L5 | `components/bilan/LetterSheet.tsx` | Nouveau |
| G10 | Certificat THRIVE (verrouillé jusqu'à S13) | L5 | `components/bilan/CoachDetailSheet.tsx` (kind `docs`, partiel) ; certificat réel : `components/fin-parcours/Certificate.tsx` (L6) | Nouveau (partiel) |
| H | Compétences de vie (courbe LSSS, 8 compétences) | L5 | `components/bilan/BilanSheets.tsx` (`LifeSkillsSheet`), `components/bilan/Charts.tsx` (`LsssCurve`), `components/bilan/Ring.tsx` | Existant |
| I | Comprendre cette carte | L5 | `components/bilan/BilanSheets.tsx` (`UnderstandSheet`) | Existant |
| J | Personnaliser le passeport | L5 | `components/bilan/BilanSheets.tsx` (`PersonalizeView`) | Existant (feuille ; pas de route `passeport.tsx`, inutile) |
| S | Mes séances | L6 | `app/(parent)/seances.tsx`, `components/bilan/SeancesView.tsx` | Existant |
| S2 | Mes séances verrouillées | L6 | `app/(parent)/seances.tsx`, `components/access/LockedSection.tsx` | Existant |
| T | Bilan du coach | L6 | `components/bilan/SessionReportView.tsx` (+ `seances.tsx`) | Existant |
| U | Messages | L6 | `app/(parent)/messages.tsx`, `components/bilan/MessagesListView.tsx`, `app/(parent)/chat/[conversationId].tsx`, `components/bilan/ThreadView.tsx`, `components/bilan/Bubble.tsx` | Existant |
| U2 | Messages verrouillés | L6 | `app/(parent)/messages.tsx`, `components/access/LockedSection.tsx` | Existant |
| V | Notifications | L6 | `app/(parent)/notifications.tsx`, `components/bilan/NotificationsView.tsx` | Existant |
| W | Questionnaire de l'enfant | L6 | `screens/child/QuestionsScreen.tsx`, `screens/child/palette.ts` | Existant, sans route (ne pas en créer) |
| O | Séances vidéo « Bientôt disponible » | L6 | `app/(parent)/videos.tsx`, `components/video/ComingSoonView.tsx` | Existant |
| P, Q, R | Aperçus, ne pas construire | — | `components/video/VideoReadyView.tsx`, `VideoQuestionView.tsx`, `VideoDoneView.tsx` | Déjà présents : à décider (ne pas étendre) |
| Z | Fin de parcours (certificat, courbe) | L6 | `app/(parent)/fin-de-parcours.tsx`, `components/fin-parcours/{FinDeParcoursView,Certificate,Curves,AngledGradient}.tsx` | Existant. Les `components/fin-parcours/**` ne sont pas listés dans §4 L6 : à ajouter |
| Y | Offres | L7 | `app/(parent)/offres.tsx`, `components/offres/OffresView.tsx`, `ProgramCard.tsx` | Existant |
| Y2 | Programme · paiement | L7 | `app/(parent)/offres/[pack].tsx`, `components/offres/ProgrammePaiementView.tsx` | Existant |
| Y3 | Appel de 15 min | L7 | `app/(parent)/appel.tsx`, `components/offres/AppelView.tsx` | Existant |
| X2 | Mon abonnement | L7 | `app/(parent)/abonnement.tsx`, `components/subscription/SubscriptionSettings.tsx`, `SubscriptionView.tsx` | Existant |
| X2b | Abonnement « Maison seul » | L7 | `app/(parent)/abonnement.tsx` | Existant |

Fichiers interdits à L7 (§4) et leur contenu style : `services/subscription-logic.ts` (1 occurrence, « store natif » : technique), `services/purchases.ts` (2, « module natif » : technique), `stores/subscription.store.ts` (0), `services/programPayments.ts` (0). Aucun changement de style n'y est nécessaire.

---

## 2. Occurrences de `natif | nuit | carnet | creme | crème` (grep `-wi`, `apps/mobile/src`)

Total : **276 lignes** (221 hors tests, 55 dans les tests). Plus 7 dans `design/README.md`. Le grep sans `-w` ajoute les faux positifs « incrément/décrément » (`creme`) : ignorés ici.

### 2.1 Par lot propriétaire (hors tests)

| Lot | Fichiers et nombre de lignes | Total |
|---|---|---|
| L1 Fondations | `design/tokens.ts` 30 · `tabConfig.ts` 10 · `MascotMedallion.tsx` 8 · `Card.tsx` 3 · `ListRow.tsx` 2 · `GlassSurface.tsx` 2 · `typography.ts` 1 · `fonts.ts` 1 · `ThemeProvider.tsx` 1 · `Sheet.tsx` 1 · `Section.tsx` 1 · `NavBar.tsx` 1 · `Avatar.tsx` 1 · `app/(parent)/_layout.tsx` 3 · `app/__ecran.tsx` 1 | 66 |
| L2 Arrivée & compte | `components/account/StylePicker.tsx` 14 · `ChildPicker.tsx` 8 · `WelcomeView.tsx` 6 · `kidAvatar.ts` 4 · `LoginView.tsx` 2 · `AccountView.tsx` 1 · dev `dev-gallery/lot-arrivee.tsx` 6 | 41 |
| L3 Maison | `components/maison/HomeView.tsx` 8 · `palette.ts` 7 · `CarnetView.tsx` 5 · `viewModels.ts` 3 · `models.ts` 3 · `FicheView.tsx` 2 · `logic.ts` 2 · `hooks/useMaison.ts` 1 · `app/(parent)/maison.tsx` 6 · `app/(parent)/carnet.tsx` 2 · dev `fixtures/maison.ts` 5 · `lot-maison.tsx` 2 | 46 |
| L4 Mode activité | aucune | 0 |
| L5 Bilan | `components/bilan/BilanView.tsx` 14 · dev `lot-bilan.tsx` 5 · `fixtures/bilan.ts` 1 | 20 |
| L6 Séances, messages, vidéo, enfant, fin | `components/video/ComingSoonView.tsx` 9 · `VideoReadyView.tsx` 6 · `components/bilan/SeancesView.tsx` 3 · `screens/child/QuestionsScreen.tsx` 4 · `screens/child/palette.ts` 3 · `fin-parcours/Certificate.tsx` 5 · `components/bilan/SessionReportView.tsx` 1 · `video/scene.ts` 1 · `video/VideoMascot.tsx` 1 | 33 |
| L7 Offres & abonnement | dev `dev-gallery/lot-offres.tsx` 5 · `components/offres/brand.ts` 1 (« fond crème », couleur) · `services/trialReminder.ts` 3 (technique) · `components/subscription/SubscriptionSettings.tsx` 1 (technique, « réglages natifs ») | 10 (dont 4 techniques) |
| Hors lot (technique, à ne pas toucher) | `services/purchases.ts` 2 et `services/subscription-logic.ts` 1 (interdits L7) · `lib/secure-storage.ts` 1 · `lib/sentry.ts` 1 (« crashs JS et natifs ») | 4 |
| Lot L3, compté à part | `hooks/useMaison.ts` 1 (« carnet » comme mot courant) | (dans L3) |

Tests (55 lignes, à mettre à jour avec leur lot) : `design/canvasFidelity.test.ts` 23 (L1) · `design/design.test.ts` 18 (L1) · `design/styleSync.test.ts` 9 (L1) · `components/maison/models.test.ts` 3 (L3) · `components/maison/logic.test.ts` 1 (L3) · `services/subscription-logic.test.ts` 1 (technique : « réglages natifs », interdit L7).

### 2.2 Clés de style : définition et stockage

| Élément | Où | Valeur actuelle |
|---|---|---|
| Type `StyleKey` | `design/tokens.ts:7` | `'natif' \| 'nuit' \| 'carnet'` |
| Liste `STYLE_KEYS` | `design/tokens.ts:8` | `['natif','nuit','carnet']` (testée `design.test.ts:14`) |
| Défaut `DEFAULT_STYLE` | `design/tokens.ts:9` | `'natif'` (R5 : devient `lin`) |
| Libellés `STYLE_LABELS` | `design/tokens.ts:11-15` | « Natif », « Nuit calme », « Carnet de saison » |
| Garde `isStyleKey` | `design/tokens.ts:17-19` | refuse toute autre valeur (sans normalisation) |
| Palettes par style | `design/tokens.ts:21` (`natifColors`), `:76` (`nuitColors`), `:131` (`carnetColors`), `:188` (`COLORS`) | à réécrire depuis `final.css` |
| Géométrie par style | `design/tokens.ts:290` (`STYLE_METRICS`) | 3 entrées |
| Clé AsyncStorage | `design/ThemeProvider.tsx:9` `UI_STYLE_STORAGE_KEY = 'thrive.uiStyle'` ; lecture l.34, 53 ; écriture l.56, 81 | valeur brute `natif`/`nuit`/`carnet` |
| Synchro serveur | `design/styleSync.ts` (`fetchServerStyle`, `pushServerStyle`) ; colonne `profiles.ui_style` | `natif`/`nuit`/`carnet` |
| Migration SQL (non appliquée) | `supabase/migrations/20261012_083_ui_style.sql:16` (contrainte `profiles_ui_style_check`), `:35` (contrôle dans `set_ui_style`) ; rollback `..._083_ui_style_rollback.sql` ; test `supabase/tests/ui_style.sql` | O6 remplace par `lin|veillee` + normalisation |
| Libellés du sélecteur | `components/account/StylePicker.tsx:8-9` : « Natif », « Nuit calme », « Carnet » ; sous-titres « Clair, iOS », « Sombre », « Crème, éditorial » | **divergent** de `STYLE_LABELS` |
| Texte imposé | `StylePicker.tsx:6` « Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes. » | « carnet » = mot courant, à conserver |
| Maps par style | `design/tabConfig.ts:30` (`TAB_LAYOUTS`) ; `components/maison/palette.ts:56` (`HOME_PALETTES`), `:102` (`MOMENT_BACKGROUND` : `#0B2233` / `#000000` / `#022539` en dur) ; `screens/child/palette.ts:49` (`epochPalette`) | à refaire en `lin`/`veillee` |
| Conditions sensibles | `app/(parent)/maison.tsx:107-108` (`invite: style === 'nuit' && sourceMaison !== 'pack'`, invitation Offres) ; `app/(parent)/_layout.tsx:26` (route `'carnet'` masquée : nom de route, à garder) ; `app/(parent)/maison.tsx:125` (route `carnet`, à garder) | L3 / L1 |
| Consommateurs du type | `design/{typography,ThemeProvider,styleSync,tabConfig,index}.ts` ; `components/account/{StylePicker,kidAvatar,AccountView}` ; `components/maison/palette.ts` ; `screens/child/palette.ts` ; `dev-gallery/fixtures/maison.ts` ; `app/__design.tsx` ; `app/__ecran.tsx` (routes de dev, lisent `STYLE_KEYS`) | à renommer en même temps que `StyleKey` |

### 2.3 Faux positifs à exclure du grep H3

- « module natif », « store natif », « SDK natif », « runtime natif », « réglages natifs », « natifs » (pluriel), « Modal natif », « verre natif iOS » : `services/trialReminder.ts:26,74,101`, `services/purchases.ts:18`, `services/subscription-logic.ts:48`, `services/subscription-logic.test.ts:20`, `components/subscription/SubscriptionSettings.tsx:17`, `lib/secure-storage.ts:83`, `lib/sentry.ts:1`, `design/Sheet.tsx:31`, `design/GlassSurface.tsx:18,30`.
- « carnet » comme mot courant : `components/account/WelcomeView.tsx:18` (« Le carnet de vos moments »), `app/(parent)/carnet.tsx:36` (partage « Le carnet de … »), `components/maison/logic.ts:2,98`, `StylePicker.tsx:6` (texte imposé).
- Noms de composants, de routes et de variables : `CarnetView`, `carnetObjects`, `buildCarnetVM`, `const carnet = style === 'carnet'`. Ce sont des identifiants du lot N ; les renommer est un choix, pas une obligation.
- « crème » comme couleur décrite : `components/video/VideoMascot.tsx:19`, `components/offres/brand.ts:11`.
- Les commentaires de `design/*` citent « Natif / Nuit calme / Carnet » comme styles : ils doivent être réécrits (ce ne sont pas des faux positifs).

Recommandation H3 : grep limité à `'natif'|"natif"|natif:|'nuit'|'carnet'|STYLE_LABELS|Nuit calme|Carnet de saison|creme` (avec guillemets ou deux-points), puis liste blanche des lignes de §2.3.

---

## 3. Écarts entre les maquettes et l'app d'origine

### 3.1 Bilan web (`apps/web/src/app/parent/(hub)/bilans/`) : ordre des cartes (→ L5)

Source : `bilan-html.ts` (ordre du gabarit, commentaires `<!-- … -->`), `card-info.tsx` (`CARD_INFO`), `detail-modal.tsx` (`DETAIL_KEYS`), `page.tsx` (rappel), `passport-edit.tsx` (modale passeport).

| # | Carte (titre affiché) | Composant / clé | Ligne | Feuille détaillée |
|---|---|---|---|---|
| 0 | Rappel « Questionnaire LSSS en attente » | `page.tsx` (bandeau) | 269-279 | — |
| 1 | Programme complété (en-tête, sans carte) | `programme` | 444 | info |
| 2 | Passeport athlète (rangée réduite) | `passeport` ; passport-edit.tsx (Personnaliser) | 455-458 | ouvre Fiche Identité |
| 3 | Compétences de vie | `competences` / `lsss` (`CARD_INFO` l.153, l.102) | 473 | info (« Comprendre cette carte ») |
| 4 | Progression du bien-être (courbe PERMA) | `perma` (l.75), `permaGraphHtml` | 494 | info |
| 5 | Parcours des 13 séances | `parcours` (l.128) | 523 | info |
| 6 | Boîte à outils | `boite` | 541 | oui |
| 7 | Prochaines étapes | `etapes` | 556 | oui |
| 8 | « Mes outils THRIVE » (titre de section) | — | 585-587 | — |
| 9 | Fiche Objectif THRIVE | `objectif` | 594 | oui |
| 10 | Focus Word | `focus` | 617 | oui |
| 11 | Roue des Émotions | `emotions` | 624 | info seulement |
| 12 | Routine pré-tir | `routine` | 653 | oui |
| 13 | Contrat de confiance | `contrat` | 675 | document signé |
| 14 | Lettre à moi-même dans 1 an | `lettre` | 698 | oui + document |
| 15 | Certificat THRIVE | `certificat` | 719 | oui + document |
| — | Fiche Identité Athlète | `identite` (l.226) | 425 (gabarit), 458 | oui |

Feuilles (`DETAIL_KEYS`) : boite, etapes, identite, objectif, focus, routine, lettre, certificat. Les 8 correspondent exactement aux écrans G3–G10 de la maquette.

### 3.2 Bilan : maquette `S.G` et fonctions `S.G3…S.G11`, `S.H`, `S.I`, `S.J`

- `S.G3…S.G10` **existent** : générées en boucle (`screens-final.js`, `forEach` l.~530) sur `identite, objectif, focus, routine, boite, etapes, lettre, certificat`. Elles couvrent les 8 feuilles web.
- `S.G`, `S.G11` (variante Groupe), `S.G2` (verrouillé), `S.H`, `S.I`, `S.J` : présentes.
- Cartes de `S.G` absentes de la liste web : **aucune**. Toutes les cartes web ont un équivalent dans `S.G`.
- Écarts :
  - **« EPOCH » (maquette, et texte de verrou web `bilan-html.ts:516`) contre « PERMA » (courbe dessinée, `permaGraphHtml`, `card-info.tsx` l.75)**. Décision à prendre avant L5 : le libellé et la courbe doivent suivre le produit (PERMA selon la mémoire projet).
  - `S.H` (Compétences de vie : courbe LSSS « Départ → Mi-parcours », segment « Global / Par compétence », 8 compétences) : **pas de feuille web** ; le web n'écrit que la répartition par compétence dans la carte (`bilan-html.ts:304-329`) et décrit la courbe LSSS à 3 mesures (S1, S7, S13) dans le texte `card-info.tsx:120`. Aucune courbe LSSS n'est dessinée sur la page web. Le mobile en a une (`Charts.tsx` `LsssCurve`).
  - Le flag `ent.lsssCurve` (`bilan-html.ts:245`, `499-505`) gouverne en réalité la courbe PERMA floutée.
- Cartes web absentes de la page mobile actuelle (`BilanView.tsx`, `bilans.tsx`) : Parcours des 13 séances, Focus Word (seul un tag « Mot-focus » existe), Roue des Émotions, Routine pré-tir, Contrat de confiance (seulement une ligne « Documents »), Lettre à moi-même, Certificat THRIVE, Fiche Identité (détail). `PermaCurve.tsx` existe dans `components/bilan/` ; son usage dans `BilanView` est à confirmer par L5.

### 3.3 Mode activité : web `components/parent/p3/ActivityMode.tsx` et `lib/p3-moments/guide.ts` contre `S.M` et `S.M1…S.M17`

Écrans web (`type Screen`, `ActivityMode.tsx:70-81`) et leur équivalent maquette :

| Écran web | Équivalent maquette | Note |
|---|---|---|
| `checkin` | M1 | |
| `rappel` (« La fois d'avant ») | M2 | |
| `amorce` (« Ce qu'on travaille », minuteur) | M3 | |
| `deroule` (+ « Si ça bloque », `StepTimer`) | M (moment en cours), M4 | |
| extensions (« +10 min », Approfondir / Ancrer / Transférer) | M5 | |
| `lecture` / `route` (« En voiture ») | M6, M7 | |
| `debrief` | M8 | |
| `cloture` | M9 | |
| `minutes` | M10 | |
| `synthese` (notation, « Ça a donné quoi ? », « À garder ») | M11, M14 | |
| `fin` (+ `RewardView`, « Débloqué ») | M12, M13 | |
| `letterStep` `write` / `confirm` / `sealed` | M15, M16 | |
| sortie (« Enregistrer ce moment ? ») | M17 | `ActivityMode.tsx` |

Éléments web **absents** de la maquette (à ne pas inventer, à décider) :

1. **Feuille « visuel »** (`VisualButton` / `VisualSheet`, `components/parent/p3/Visuals.tsx`, appelée depuis `ActivityMode.tsx` l.608, 753, 1103). Huit visuels : Les six émotions, Le thermomètre, Les deux colonnes, L'escalier, La carte de ses personnes, Les trois sens, Trois endroits, Ses outils.
2. **Repli « papier » de la lettre** (`letterStep === 'paper'`, `ActivityMode.tsx` l.985-987, quand le scellement échoue). Ne doit pas devenir un état d'échec visible (règle 5 du GO 4) : à décider.
3. **Actions de la récompense** (`RewardView.tsx` : télécharger en image, imprimer, `downloadImage`, `PRINT_CSS`). La maquette M13 ne montre que « Voir / Plus tard ».

Hors mode activité, non concernés par M1–M17 : pages `fitness/quand-consulter`, `fitness/quand-il-dit-non`, `fitness/sources` (web). Le mobile a déjà `components/maison/SourcesSheet.tsx`.

---

## 4. Empreinte avant modification (HEAD `35c7fd7`)

| Commande | Résultat |
|---|---|
| `corepack pnpm --filter mobile typecheck` | **OK**, exit 0, 0 erreur TypeScript |
| `corepack pnpm --filter mobile lint` | **KO**, exit 1 : **1 erreur**, **10 avertissements** (11 problèmes). Erreur : `apps/mobile/src/lib/secure-storage.ts:85:23` (`no-var-requires`). Préexistant. Avertissements : `any` implicites |
| Tests mobile (`apps/mobile` n'a **pas** de script `test`, donc `pnpm test` ne les lance pas) | Lancés à la main avec vitest (binaire de `apps/web`, depuis `apps/mobile`) : `src/design src/components src/services src/lib` : **19 fichiers OK, 160 tests OK**, exit 0. Inclut `services/access.test.ts` et `services/subscription-logic.test.ts` (anti-steering) |
| `corepack pnpm -r --if-present test` (racine) | **KO**, exit 1. `apps/web` : **5 suites KO** (`messaging`, `notifications`, `program-checkout`, `access`, `password` : `Failed to resolve entry for "@thrive/shared"`, `packages/shared/dist` non construit), 19 suites OK, **426 tests OK**, 0 test en échec |

Remarques sur l'empreinte :
- `pnpm` n'est pas dans le PATH. Un shim vers corepack, placé dans le scratchpad, a servi aux appels imbriqués (`pnpm -r` appelle `pnpm`).
- Le total web (5 suites KO) est un de plus que le GO 3 (4 KO) : `program-checkout.test.ts` a rejoint la liste.
- La règle « pnpm test vert » ne couvre pas encore le mobile : le script `test` manque (GO 3, point 6).

---

## 5. Polices, dépendances, textures

| Élément | État |
|---|---|
| `@expo-google-fonts/inter` ^0.4.2 et `@expo-google-fonts/fraunces` ^0.4.1 | Déclarées dans `apps/mobile/package.json` et installées dans `node_modules` (**GO 3 les disait absentes : corrigé**) |
| Chargement | `design/fonts.ts` : Inter 400/500/600/700/800 ; Fraunces 400/500/600 (pas de 700). `app/_layout.tsx:22` : `useFonts(FONT_ASSETS)` |
| `expo-glass-effect` | `55.0.11` (version exacte) dans `package.json` (**corrigé**) |
| `react-native-svg` 15.15.3, `expo-linear-gradient` ~55.0.14, `expo-blur` ~55.0.14 | Présents |
| `expo-keep-awake` | **Absent**. Nécessaire seulement pour M4 si le minuteur doit garder l'écran allumé ; à ajouter par install humain, ou abandonner |
| `expo-image` | **Absent**. Non indispensable (images en `Image` React Native) |
| `apps/mobile/assets/fonts` | Absent (inutile : polices fournies par les paquets Expo) |
| `apps/mobile/assets/brand/` | Présent (`logo.png` seul). Le dossier `textures/` est à créer en L1 |
| Playwright | Disponible : `apps/web/node_modules/@playwright/test` et `playwright`. Navigateur chromium-1228 présent dans le cache (`~/Library/Caches/ms-playwright`). **Export des textures possible sans installation** |
| Maquettes | `maquettes-ios27/` déjà suivi par git (66 fichiers, commit `35c7fd7`). `apercus/` est ignoré (`.gitignore:92`), donc les PNG d'aperçu ne sont pas versionnés. `LISEZMOI.md` existe (12 lignes), mais sans la phrase « obsolètes » exigée (§2) |

---

## 6. Écarts avec le GO 3 et anomalies relevées

- **Corrigé depuis le GO 3** : `homeFor()` mène à `maison` (`app/_layout.tsx:17`) ; les fonts et `expo-glass-effect` sont déclarés ; les écrans `welcome`, `parcours`, `carnet`, `videos`, `offres`, `appel`, `fin-de-parcours` existent.
- **Toujours ouvert** : lint `secure-storage.ts:85` ; 5 suites web KO ; pas de script `test` mobile ; `packages/shared/dist` non construit.
- **Fichiers réclamés par deux lots** : `app/(parent)/activite/[activityId].tsx` (L3 et L4).
- **Périmètre incomplet dans §4** : `components/fin-parcours/**` (Z, L6) n'est pas listé ; à ajouter à L6. Pour `components/bilan/**`, §4 donne la répartition exacte (L5 : `BilanView`, `BilanSheets`, `CoachDetailSheet`, `PermaCurve`, `Ring`, `Charts` ; L6 : `SeancesView`, `SessionReportView`, `ThreadView`, `MessagesListView`, `NotificationsView`, `Bubble`). Les fichiers non cités (`Chrome.tsx`, `ScreenScaffold.tsx`) ne sont dans aucun lot : à attribuer à L5.
- **Dev-gallery** (`src/dev-gallery/**`) n'est attribué à aucun lot dans §4 : proposition, lot-arrivee → L2, lot-maison + fixtures/maison → L3, lot-bilan + fixtures/bilan → L5, lot-offres → L7.
- **Dev routes** `app/__design.tsx` et `app/__ecran.tsx` lisent `STYLE_KEYS` : à mettre à jour par L1.
- **Libellé incohérent** : `STYLE_LABELS` (« Carnet de saison ») contre `StylePicker` (« Carnet ») ; le GO 4 demande « Lin » / « Veillée » : tout est à réécrire.
- **Contrôle d'accès** : la condition `style === 'nuit'` de `maison.tsx:107-108` règle l'invitation vers Offres. La traduction en `veillee` doit garder `sourceMaison !== 'pack'` et ne rien ajouter (anti-steering inchangé).
- **Entrée de Maison** : les écrans `S.K3`, `G2`, `S2`, `U2`, `X2b` s'appuient sur `access_state()` via `components/access/LockedSection.tsx` (L3, L5, L6, L7) : ne rien recalculer.

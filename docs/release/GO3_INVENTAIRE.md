# GO 3 — Inventaire et plan de correspondance (lot H0, lecture seule)

Date de lecture : 2026-10-12. Branche : `feature/ios27-ui-paiements`. Aucune modification de code, aucun install, aucun commit.

Légende statut cible : **EXISTANT** = fichier présent à redessiner · **NOUVEAU** = fichier absent à créer · **À CONFIRMER** = correspondance proposée, à valider en S1–S6 · **NON CONSTRUIT** = aperçu de maquette, pas d'écran.

---

## 1. Écrans des maquettes (`maquettes-ios27/screens.js`)

Titres et rôles repris de la table des chapitres (`CH`, l. 765-814) ; chaque lettre de `S.A` à `S.Z` a une fonction `S.X = () => …` dans le fichier.

| Lettre | Titre / rôle | Fichier cible (apps/mobile/src) | Statut |
|---|---|---|---|
| A | Bienvenue (mascotte, trois promesses, slogans en alternance) | `app/welcome.tsx` | NOUVEAU |
| B | Connexion | `app/(auth)/login.tsx` | EXISTANT |
| C | Inscription · le parent (étape 1 sur 2) | `app/(auth)/register.tsx` | EXISTANT |
| D | Inscription · les enfants (étape 2 sur 2, âge et sport) | `app/(parent)/children.tsx` (base du §5) ; `register.tsx` ne contient aucune étape « enfant » | EXISTANT, à confirmer |
| D2 | Essai gratuit de Maison (« 0 $ » d'abord, formules) | `components/subscription/Paywall.tsx` | EXISTANT |
| D3 | Confirmation App Store (feuille système) | aucun fichier : feuille système, non construite | NON CONSTRUIT |
| E | Ton espace se prépare (après l'appel) | `app/(auth)/espace-pret.tsx` | NOUVEAU, à confirmer |
| F | Choisir le profil (liste système, coche, avatars) | `app/(auth)/choisir-profil.tsx` ou `screens/parent/ChildrenScreen.tsx` | NOUVEAU, à confirmer |
| G | Bilan (passeport, jauges, travail du coach) | `app/(parent)/bilans.tsx` | EXISTANT |
| H | Compétences de vie (feuille, courbe LSSS) | feuille dans `app/(parent)/bilans.tsx` (pas de route) | EXISTANT (sous-composant), à confirmer |
| I | Comprendre l'outil (feuille flottante LSSS) | feuille dans `app/(parent)/bilans.tsx` | EXISTANT (sous-composant), à confirmer |
| J | Personnaliser le passeport (photo, surnom, numéro, poste, couleurs) | `app/(parent)/passeport.tsx` | NOUVEAU (aucune trace `surnom`/`passeport` dans apps/mobile ; web seulement) |
| K | Maison « Soir de famille » (refonte) | `app/(parent)/maison.tsx` | EXISTANT (refonte) |
| K2 | Tout le parcours (13 semaines, 53 activités) | `app/(parent)/parcours.tsx` | NOUVEAU |
| L | Fiche moment (vignette, durée, étapes) | `app/(parent)/activite/[activityId].tsx` | EXISTANT |
| M | Moment en cours (minuteur plein écran) | `app/(parent)/moment-en-cours.tsx` | NOUVEAU, à confirmer |
| N | Le carnet (souvenirs, objet gagné, collection) | `app/(parent)/carnet.tsx` (`badges.tsx` existant, à comparer) | NOUVEAU, à confirmer |
| O | Séances vidéo « Bientôt disponible » (flag `VIDEO_SESSIONS_ENABLED=false`) | `app/(parent)/videos.tsx` | NOUVEAU |
| P | Prêt avec Léo ? (aperçu, bandeau « pas disponible ») | aucun | NON CONSTRUIT |
| Q | Question en pause (aperçu) | aucun | NON CONSTRUIT |
| R | Après la séance (aperçu, slider Liquid Glass) | aucun | NON CONSTRUIT |
| S | Mes séances (anneau 7/13, phases, verrouillé si Maison seul) | `app/(parent)/seances.tsx` | EXISTANT |
| T | Bilan du coach (message, bilan détaillé, observations) | `app/(parent)/seances.tsx` (sous-écran à créer si besoin) | À CONFIRMER |
| U | Messages (coach en onglet Prominent) | `app/(parent)/messages.tsx` + `app/(parent)/chat/[conversationId].tsx` | EXISTANT |
| V | Notifications (groupées par jour) | `app/(parent)/notifications.tsx` | EXISTANT |
| W | Questionnaire de l'enfant (EPOCH, boutons 1–5, FR/EN) | `screens/child/QuestionsScreen.tsx` | EXISTANT, sans route (voir §5) |
| X | Compte & famille (style de l'app, abonnement, 2FA) | `app/(parent)/profile.tsx` (+ `components/AccountPrivacySection.tsx`) | EXISTANT |
| X2 | Mon abonnement (Maison, App Store, co-parent) | `app/(parent)/abonnement.tsx` (+ `components/subscription/SubscriptionSettings.tsx`) | EXISTANT |
| Y | Offres (Maison, Groupe, Individuel, Complet) | `app/(parent)/offres.tsx` | NOUVEAU |
| Y2 | Programme · paiement (Stripe, 2 versements) | `app/(parent)/offres/[pack].tsx` | NOUVEAU |
| Y3 | Appel de 15 min (vidéo ou téléphone) | `app/(parent)/appel.tsx` | NOUVEAU |
| Z | Fin de parcours (certificat, courbe LSSS, bien-être) | `app/(parent)/fin-de-parcours.tsx` | NOUVEAU |

Vérification des fichiers de base proposés en §5 H0 : tous les fichiers marqués EXISTANT ci-dessus existent (Glob). Aucun chemin proposé en §5 n'est faux, sauf : `D → children` (la logique d'inscription enfant n'est pas dans `register.tsx`) et `W → screens/child` (le dossier existe, mais aucun `app/` ne le route).

Hors maquettes : `src/design/**`, `src/lib/vignettes.ts`, `src/lib/featureFlags.ts`, `src/services/programPayments.ts`, `src/hooks/useTrialReminder.ts`, `src/services/trialReminder.ts`, `src/components/offres/**`, `src/components/account/**` : tous absents, à créer (S1, S5, S6, S7).

---

## 2. Vérifications

### 2.1 expo-glass-effect
- Présent dans le store pnpm : `expo-glass-effect@55.0.11` (`node_modules/.pnpm/expo-glass-effect@55.0.11_expo@55.0.26_…`).
- Déjà dans `pnpm-lock.yaml` comme dépendance transitive de `expo-router@55.0.16` (l. 11080). **Absent de `apps/mobile/package.json`**.
- Peer dependencies : `expo: *`, `react: *`, `react-native: *` ⇒ compatible avec `expo ~55.0.24` (installé 55.0.26) et RN 0.83.6.
- Action S1 : déclarer la dépendance directe (`expo install expo-glass-effect`, version 55.0.11). Repli : `expo-blur` (`~55.0.14`, déjà présent).

### 2.2 Polices Inter et Fraunces
- `@expo-google-fonts/inter` et `@expo-google-fonts/fraunces` : **absents** de `node_modules/.pnpm` (seul `@expo-google-fonts/material-symbols` est présent).
- Aucun fichier `.ttf`, `.otf` ou `.woff2` dans le dépôt (hors node_modules).
- Côté web, Inter et Fraunces sont chargées par `next/font/google` (`apps/web/src/app/layout.tsx` l. 2-8) : pas de fichier local réutilisable pour mobile.
- Action S1 : ajouter `@expo-google-fonts/inter` et `@expo-google-fonts/fraunces` (install humain ou Vague 1 autorisée). Disponibilité npm : NON_VÉRIFIÉ (aucun install lancé).

### 2.3 Vignettes et logo
- `maquettes-ios27/assets/vignettes/` : **52 fichiers .webp** (attendu 52). Conforme.
- Liste : 51 ids `ACT-*` (`ACT-0101` à `ACT-1303`, par tranches de 2 à 5) + `BON-01`.
- `ACT-0603` (mascotte de base) : **présent**.
- `ACT-0704` : **absent** (la séquence passe de `ACT-0703` à `ACT-0801`). Repli sur `ACT-0603` à coder dans `VignetteImage`.
- `maquettes-ios27/assets/logo.png` : **présent** (39 Ko).

### 2.4 Empreinte de base (AVANT toute modification)

pnpm n'est pas dans le PATH de ce shell ; `pnpm` a été exécuté via la copie cache de corepack (`pnpm@9.15.9`, version du `packageManager`) placée dans un shim hors dépôt (dossier scratchpad). Aucun install.

| Commande | Résultat | Détail |
|---|---|---|
| `pnpm typecheck` | **OK** (exit 0, 6 s) | `apps/mobile` (`tsc --noEmit`) et `apps/web` : 0 erreur TS. `packages/shared` n'a pas de script typecheck. |
| `pnpm lint` | **KO** (exit 1) | `apps/mobile` : **1 erreur**, 12 avertissements (13 problèmes). `apps/web` : OK seul (`next lint`, exit 0, message de dépréciation uniquement). |
| `pnpm test` | **KO** (exit 1) | `apps/web` : **4 suites en échec sur 23** (`access`, `messaging`, `notifications`, `password`), **426 tests passés**. `apps/mobile` : aucun script `test`, donc non exécuté. |

Les 3 premières erreurs résumées :
- Lint : `apps/mobile/src/lib/secure-storage.ts:85:23` — `@typescript-eslint/no-var-requires` (require hors import). Avertissements fréquents : `Unexpected any` (login.tsx, register.tsx, chat, programs, sessions), `'useEffect' is defined but never used` (`app/(parent)/dashboard.tsx:1`).
- Test : 4 × `Failed to resolve entry for package "@thrive/shared"` (`src/lib/access.test.ts`, `messaging.test.ts`, `notifications.test.ts`, `password.test.ts`). Cause : `packages/shared/package.json` pointe vers `./dist/index.js`, dossier `dist/` non construit.
- Test (mobile) : `apps/mobile/src/services/access.test.ts` et `subscription-logic.test.ts` existent mais ne sont pas lancés par `pnpm test` (pas de script `test` dans `apps/mobile/package.json`). Ce sont les tests anti-steering à protéger (§1 règle 3).

---

## 3. Écrans et routes existants ABSENTS des maquettes (à ne pas supprimer)

| Fichier | Rôle actuel | Note |
|---|---|---|
| `app/(parent)/dashboard.tsx` | Onglet Accueil actuel, `homeFor()` y envoie le parent | Conservé, masqué de la barre (§3.1) |
| `app/(parent)/programs.tsx` | Route masquée (`HIDDEN`) | Pas de lettre |
| `app/(parent)/children.tsx` | Route masquée, gestion des enfants | Partiellement couvert par D |
| `app/(parent)/badges.tsx` | Route masquée | Comparer avec N (carnet) |
| `app/(auth)/forgot-password.tsx` | Mot de passe oublié | Aucune lettre |
| `app/(coach)/*` (dashboard, inbox, notifications, profile, programs, sessions, chat) | Espace coach | Hors périmètre parent |
| `screens/child/HomeScreen.tsx`, `screens/child/BadgesScreen.tsx` | Écrans enfant | Hors maquettes ; sans route dans `app/` |
| `screens/parent/DashboardScreen.tsx`, `screens/parent/ProgramScreen.tsx` | Écrans parent | Sans route directe ; à vérifier avant suppression |

Anomalies relevées pour S1 et S3 :
- `apps/mobile/src/app/_layout.tsx` l. 15 : `homeFor()` renvoie `/(parent)/dashboard`. Le plan (§3.1) veut `maison` comme arrivée : il faut modifier cette ligne, car il n'existe ni `app/index.tsx` ni `app/(parent)/index.tsx`.
- `app/(parent)/_layout.tsx` l. 6-14 : liste `HIDDEN` à étendre aux nouvelles routes (`parcours`, `carnet`, `videos`, `offres`, `appel`, `fin-de-parcours`, `passeport`, `moment-en-cours`) sinon elles apparaissent dans la barre.

---

## 4. Composants et hooks existants utiles

| Fichier | Rôle (1 ligne) |
|---|---|
| `components/subscription/Paywall.tsx` | Paywall RevenueCat (`onSubscribed`, `onClose`) ; base de D2 |
| `components/subscription/PremiumGate.tsx` | Enveloppe qui n'affiche le contenu que si premium ; sert au verrouillage |
| `components/subscription/SubscriptionLoader.tsx` | Indicateur de chargement de l'abonnement |
| `components/subscription/SubscriptionSettings.tsx` | Réglages d'abonnement (base de X2) |
| `components/subscription/theme.ts` | Constantes de thème du paywall (à fusionner avec les tokens S1) |
| `components/access/LockedSection.tsx` | Section verrouillée `bilan` / `seances` + `ReadOnlyNotice` : base de l'état flouté + cadenas |
| `hooks/useEntitlement.ts` | Lit les droits (`EntitlementState`) : à brancher sur `access_state()`, ne rien recalculer |
| `hooks/useMaison.ts` | Données de Maison pour un enfant + `recordMoment()` ; base de K, L, M |
| `lib/p3.ts` | Ré-exporte la logique des moments P3 depuis le web (`p3-moments`) ; lecture seule, extension additive seulement |
| `services/subscription-logic.ts` | `managementMode`, `isNativeStoreManagementUrl`, `legalLinks`, etc. ; anti-steering, ne jamais affaiblir |
| `services/purchases.ts` | Achats RevenueCat côté app (base pour O2/S6) |
| `services/access.ts` | Accès parent côté mobile (test `access.test.ts`) |
| `components/AccountPrivacySection.tsx` | Section confidentialité et compte (à conserver dans X) |
| `components/BillingIssueBanner.tsx` | Bandeau d'échec de facturation (ne pas le réécrire en état d'échec visible) |
| `components/HealthNotice.tsx` | Mention de santé existante |
| `components/OfflineState.tsx`, `ErrorBoundary.tsx` | États hors ligne et erreur existants |
| `stores/subscription.store.ts` | État d'abonnement (à ne modifier que par ajouts) |

---

## 5. Points à traiter par les lots suivants

1. Déclarer `expo-glass-effect` (S1) et ajouter les deux polices Expo Google Fonts (S1, install humain).
2. Modifier `homeFor()` (`app/_layout.tsx` l. 15) pour que l'arrivée parent soit `maison`.
3. Étendre `HIDDEN` dans `app/(parent)/_layout.tsx` à chaque route nouvelle.
4. Corriger le lint `secure-storage.ts:85` (no-var-requires) avant le lot de revue ; ce n'est pas une régression de GO 3.
5. Construire `packages/shared/dist` (ou corriger la résolution Jest/Vitest) pour que les 4 suites web passent ; ce n'est pas une régression de GO 3.
6. Ajouter un script `test` à `apps/mobile` pour que `access.test.ts` et `subscription-logic.test.ts` tournent dans `pnpm test`.
7. Passeport personnalisable (J) : aucune implémentation mobile, la logique `avatar_url` → `resolveAvatarUrl()` côté web est à porter.

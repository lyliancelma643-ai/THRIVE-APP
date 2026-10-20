# GO 3 — Nouveau UI iOS 27 de la section client + paiements Stripe / Apple

> **Comment l'utiliser.** Dans Claude Code, à la racine de `thrive APP`, passer la session principale en **Sonnet** (`/model sonnet`), puis écrire :
> `Lis docs/release/GO3_UI_IOS27_PAIEMENTS.md et exécute-le à la lettre.`
> L'orchestrateur lance les agents Haiku et Sonnet d'abord, puis Opus 5.5 pour tout ce qui touche à l'argent, à la base de données et aux webhooks. Aucune question à Lylian en cours de route (voir §1, règle 9).
>
> **Ce prompt est la clé maîtresse** : il résume ce qui a été décidé pendant la conversation de design (maquettes iOS 27, trois styles, slogans, paiements) et le croise avec l'état réel du dépôt, de RevenueCat et de Supabase lus le 2026-10-12. Quand il se tait, le dépôt fait foi. Quand il contredit le dépôt sur un fait technique, l'agent le dit dans son rapport et suit le dépôt.

---

## 0. Mission en une phrase

**Ajouter** à l'app mobile THRIVE (`apps/mobile`, Expo) le nouveau design iOS 27 « Liquid Glass » validé en maquette, avec **trois styles au choix** (Natif · Nuit calme · Carnet de saison), les deux slogans en alternance sur l'accueil, la page **Maison** comme page principale, et brancher les paiements ainsi : **Maison = Apple (App Store) dans l'app**, **programmes Groupe / Individuel / Complet = Stripe**, sans casser ce qui marche déjà.

**On n'enlève rien d'existant.** Chaque changement est additif ou remplace un écran par sa version redessinée, avec la même logique d'accès, de données et de sécurité derrière.

---

## 1. Règles non négociables

1. **Additif et réversible.** Branche `feature/ios27-ui-paiements` depuis `main`. Commits atomiques Conventional Commits (`feat(mobile): …`). **Pas de `git push`**, pas de `eas submit`, pas de `supabase db push`, pas d'`apply_migration` sur THRIVE-CA (`kkdcgzvdmipmrgkawnky`), pas de déploiement Vercel. On écrit les fichiers, l'humain applique.
2. **Aucune action financière réelle.** Aucun paiement, remboursement, produit créé en mode live. Stripe : mode test / sandbox uniquement, ou scripts écrits mais non lancés (§6).
3. **Anti-steering (Apple 3.1.1 / Google Play)** pour **Maison** : l'app mobile ne contient aucun texte, bouton ni lien qui renvoie vers un paiement web de Maison. Un abonnement pris ailleurs est seulement *reconnu*. Les helpers `managementMode` et `isNativeStoreManagementUrl` (`apps/mobile/src/services/subscription-logic.ts`) et leurs tests ne sont jamais affaiblis. Un test de grep automatisé le vérifie (§8).
4. **Droits d'accès : une seule source de vérité** = RPC `public.access_state()` (web `lib/access.ts`, mobile `useEntitlement`). Le nouveau UI *affiche* les droits, il ne les recalcule jamais. Maison seul ⇒ Bilan et Mes séances visibles mais verrouillés (flou + cadenas). Un pack programme ouvre Maison, Bilan, Mes séances. Voir `docs/acces-parents.md`.
5. **Conventions** : `CONVENTIONS.md` (nommage, Zod pour toute validation), UI en **français**, aucun terme clinique dans l'UI, aucun état d'échec, aucun score ni série (règles produit des cartes « À la maison », `docs/design/prompt-claude-design-a-la-maison.md` §2). Le code `P1…P8` d'un thème n'est jamais affiché.
6. **Secrets** : ne jamais lire à voix haute, afficher, committer ni recopier `.env`, `.env.local`, clés `sk_`, `rk_`, `whsec_`, `strp_`, `appl_`, `goog_`. Les secrets restent dans les secrets Supabase / EAS.
7. **Économie de contexte** (comme GO 2) : Grep/Glob d'abord, Read avec `offset`/`limit`, jamais un fichier > 300 lignes en entier, pas d'exploration générale du dépôt. L'orchestrateur ne donne à chaque agent que son lot (§5) et ses fichiers.
8. **Périmètre de fichiers exclusif** par agent. Si un agent doit toucher un autre fichier, il s'arrête, le note dans son rapport, et continue le reste.
9. **Autonomie totale.** Pas de question, pas d'attente de validation. Information manquante ⇒ `[À COMPLÉTER]` dans le code et une ligne dans `CHECKLIST_TOI.md`. Blocage ⇒ le noter dans le rapport et passer au lot suivant. Les règles 1 à 3 restent valables.
10. **Rapport de 15 lignes maximum par agent** : fichiers touchés, fait, reste, commande de test et résultat. Pas de code recopié.
11. **Une seule tentative de correction** si un test échoue ; au-delà, rapporter sans boucler.
12. **Honnêteté** : ce qui n'a pas pu être vérifié (store, Stripe, simulateur) est écrit `NON_VÉRIFIÉ`, jamais présenté comme fait.

---

## 2. Sources de vérité

| Quoi | Où |
|---|---|
| **Canevas des maquettes** (96 écrans = 32 × 3 styles, avec commentaires résolus) | https://claude.ai/artifact/8KWS2yao3sNodDwEB2Y9Kx — le lire avec l'outil `Artifact` (action `read`), jamais avec WebFetch |
| **Design system « THRIVE iOS 27 »** (tokens clair / sombre / crème, README, composants TabBar, GlassButton, ListRow, Sheet, Cover) | https://claude.ai/code/artifact/9f22fd7f-ebb3-4045-97c3-fe50b468a8c9 — fichiers `tokens.json`, `README.md`, `components/` |
| **Maquettes locales (source des écrans)** | `maquettes-ios27/` : `screens.js` (les écrans, une fonction par lettre `S.A`…`S.Z`), `ios27.css` (primitives et thèmes), `icons.js`, `activities.js`, `assets/logo.png`, `assets/vignettes/*.webp` (52), `apercus/*.png`, `v1.html` `v2.html` `v3.html` |
| Monétisation | `docs/monetisation-hybride.md`, `docs/audit-abonnement-2026-10.md`, `docs/PLAN-REVENUECAT.md` |
| Droits d'accès | `docs/acces-parents.md`, `docs/segmentation-forfaits.md`, migrations 068, 070, 075, 080 |
| Conformité stores | `docs/conformite-stores/`, `docs/store/` |
| Gamme produit (prix, garantie, 2 versements) | `THRIVE_Gamme_Produits_V3_2026-10-02.md` du projet « produit » + §3.2 ci-dessous |

**Pour voir une maquette** : ouvrir `maquettes-ios27/v1.html` (Natif), `v2.html` (Nuit calme), `v3.html` (Carnet de saison) dans Chromium (Playwright) et capturer l'écran voulu ; ou lire les PNG de `apercus/`. Les captures de comparaison faites par les agents vont dans `docs/release/go3-captures/` (pas de binaire lourd).

---

## 3. Ce qui a été décidé (le « delta » à implémenter)

### 3.1 Design

- **Langage iOS 27** : Liquid Glass (bordures définies + reflet), bord de défilement dur (*hard scroll edge*), barre d'onglets flottante avec un onglet **Prominent**, curseur Liquid Glass, styles de texte SF, cibles tactiles ≥ 44 pt. Verre via `expo-glass-effect` (présent dans le store pnpm en `55.0.11`, **à ajouter** aux dépendances de `apps/mobile`, compatible Expo 55) ; repli propre sur `expo-blur` si indisponible (Android, vieil iOS, réduction de transparence).
- **Marque** : marine `#004E7A` / `#022539`, crème `#F7F5F2`, soleil `#F9EB50` (un seul accent par écran), sauge `#A7C4BC` / `#46695F`. Mascotte = bouc bleu marine ; **52 vignettes webp, une par activité** ; `ACT-0603` = mascotte de base (accueil, connexion) ; `ACT-0704` n'a pas d'image (repli sur la mascotte de base).
- **Polices** : **Inter** pour le texte et l'interface (l'utilisateur a explicitement demandé de garder l'ancienne police), **Fraunces** pour les titres éditoriaux du style Carnet. Un titre « classe » en serif (type Times) pour le gros « 0 $ » de l'essai gratuit (§3.4).
- **Trois styles** (le code et le design system les nomment) :

| Clé | Nom affiché | Esprit | Onglets de la maquette |
|---|---|---|---|
| `natif` | Natif | Clair, iOS pur, liste groupée | Maison · Bilan · Mes séances + Prominent **Coach** |
| `nuit` | Nuit calme | Sombre, anneaux Activity jaune/sauge | Maison · Bilan · Mes séances + Prominent **Ce soir** |
| `carnet` | Carnet de saison | Crème + marine, Fraunces, cartes-maillots, esprit « soir de famille » | Ce soir · Bilan · Mes séances + Prominent **recherche** |

  Les six routes existantes (`dashboard`, `maison`, `bilans`, `seances`, `messages`, `profile`) **restent toutes joignables** ; seule la barre d'onglets visible change selon le style. **Maison devient la page d'arrivée** du parent (`index` redirige vers `maison`) ; `dashboard` est conservé, masqué de la barre.
- **Réglage du style** : écran **Compte & famille** (`profile.tsx`), section « Style de l'app » avec trois aperçus (Natif / Nuit calme / Carnet) et une coche ; remplace l'ancienne ligne « Ambiance ». Texte : « Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes. » Persistance locale (AsyncStorage) d'abord ; synchro serveur seulement si le lot O5 la livre (§5). **Style par défaut : `natif`** (décision prise seul, à valider).
- **Accueil (Bienvenue)** : deux slogans en alternance toutes les ~9 s (fondu + léger flou + glissement vertical, 4,5 s chacun), avec deux petits traits indicateurs :
  1. « **Grandir par le sport, réussir pour la vie.** » (marque, programme)
  2. « **Moins de temps, plus de bons moments.** » (Maison)
  Si l'utilisateur a activé *Réduire les animations* (`AccessibilityInfo.isReduceMotionEnabled`), on n'affiche que le premier. Implémentation Reanimated 4. Référence : fonction `sloganDuo` de `maquettes-ios27/screens.js`.
- **Maison** : refonte « Soir de famille » reprise de l'app d'origine (`apps/web/src/app/globals.css`) avec les nouveaux assets : image de l'activité recommandée en **fond plein écran fondu** (flou + dégradé vers le fond), capsule verre « Recommandé pour {enfant} ce soir », titre Fraunces 40 pt, ligne de raison, pastilles, boutons **Lancer · 20 min** (jaune émail), **Voir la fiche**, **…** ; puis : pastille durée/lieu, 4 « portes » en feutrine (+ rangée vidéo marquée **Bientôt**), carte velours « 14 moments ensemble » avec 3 étoiles, rangées « poster », bouton « Voir les 53 activités », cartes papier du carnet, pied de page. Écran long **K2 « Tout le parcours »** (13 semaines et toutes leurs activités).
- **Séances vidéo** : **pas disponibles pour l'instant** ⇒ écran **O « Bientôt disponible »** (mascotte avec la pellicule, « En construction », « Me prévenir », retour vers Maison, séances à venir grisées). **P, Q, R** sont des *aperçus de maquette* avec le bandeau « pas disponible » : **ne pas les construire**, seulement prévoir le drapeau `VIDEO_SESSIONS_ENABLED=false`.
- **Connexion / inscription** : mascotte de base incrustée de façon premium (A, B), logo, même logique d'auth.
- **Données de démo des maquettes** (Léo, Inès, « Alex Tremblay », « vague d'automne », créneaux d'appel, « 9 novembre », « 24 j ») sont **inventées** : jamais codées en dur, toujours lues dans les vraies données.

### 3.2 Produit et prix (gamme V3)

| Produit | Prix | Paiement |
|---|---|---|
| **THRIVE Maison** | **32,50 $ / mois** ou **299 $ / an** (−23 %), **1 mois d'essai gratuit** (une fois par compte), partagé avec le co-parent | **App Store dans l'app** (RevenueCat), Google Play sur Android, Stripe sur le web (existant) |
| **THRIVE Groupe** (phare) | **600 $ + tx** — 13 séances en petit groupe (4 à 6 enfants) | **Stripe**, 2 versements : 300 $ + tx à l'inscription, 300 $ + tx à la séance 7 |
| **THRIVE Individuel** | **1 500 $ + tx** — 13 séances 1:1 de 60 à 70 min + Book THRIVE | **Stripe**, 750 $ + 750 $ |
| **THRIVE Complet** | **2 000 $ + tx** — 13 séances 1:1 puis intégration au groupe | **Stripe**, 1 000 $ + 1 000 $ |

- Taxes Québec : TPS 5 % + TVQ 9,975 % ⇒ coefficient **×1,14975**. Versement 1 TTC : Groupe 344,93 $ · Individuel 862,31 $ · Complet 1 149,75 $. Les montants Maison sont **TTC** (`tax_behavior=inclusive`) ; ceux des programmes sont **hors taxes** (`exclusive`) et affichés « + tx ».
- **Garantie** : les 2 premières séances ne sont pas facturées si le parent n'est pas convaincu. Le 1er versement est remboursable pendant la garantie. **Règle de calcul du remboursement : `[À COMPLÉTER]` par Lylian** (montant libre saisi par l'admin, journalisé, jamais automatique).
- **Un pack programme ouvre déjà Maison** (migration 075) : un client programme ne paie jamais Maison en plus (`create-checkout-session` le refuse déjà, migration 080).
- Maison inclus avec le programme « pendant tout le programme », puis option de continuer (32,50 $/mois ou 299 $/an).
- Hors île de Montréal : Individuel aussi en visio, prix `[À COMPLÉTER]`.

### 3.3 Écrans « offres et paiement » (Y, Y2, Y3, X2) — ce qui change

- **Y Offres** : Maison en tête (carte avec mascotte, deux prix, essai 1 mois, « Abonnement géré par l'App Store »), puis les trois programmes, puis carte « **Paiement des programmes par Stripe** : 1er versement à l'inscription, le 2ᵉ à la séance 7 », puis garantie, puis bouton « Réserver un appel de 15 min ».
- **Y2 Programme · paiement** : bascule « En 2 versements / En une fois », détail (aujourd'hui remboursable pendant la garantie · à la séance 7 prélevé automatiquement), total TTC, moyens de paiement **traités par Stripe** : Apple Pay (traité par Stripe), carte, **lien de paiement par courriel**. Bouton noir « Payer {montant} · Apple Pay ». Pied : « Paiement sécurisé par Stripe. Le 2ᵉ versement est prélevé sur le même moyen à la séance 7 ; reçu par courriel. »
- **Y3 Appel de 15 min** : vidéo ou téléphone, jours, créneaux, ajout au calendrier. « Rien n'est payé avant l'appel. Ensuite, le 1er versement se règle par Stripe, dans l'app ou par le lien reçu par courriel. »
- **X2 Mon abonnement (Maison)** : état d'essai, fin d'essai, renouvellement, partage co-parent, ligne « Payé via l'App Store » ; pour un client programme : « Programme réglé par Stripe · aucun abonnement séparé ». « Gérer dans l'App Store » et « Restaurer les achats » seulement si l'achat vient du store de ce téléphone. « Déjà abonné ailleurs ? Connecte-toi avec la même adresse : ton accès est reconnu partout » (**sans** lien ni mention de Stripe/web côté Maison).

### 3.4 Paywall de Maison (D2) — essai gratuit en vedette

Hiérarchie voulue par Lylian (Apple 3.1.2 respecté) : le **mois gratuit d'abord**, le prix facturé **jamais caché**.
1. Gros « **0 $** » en serif classe (Fraunces/Times, graisse 400, 58 pt) + « par mois, pendant 1 mois » en italique sur la même ligne.
2. Frise : Aujourd'hui **0 $** → date d'avis (J-3) « On te prévient » → date du 1er paiement.
3. Deux formules : **Annuel 24,92 $ / mois** avec, juste dessous et bien lisible, « **299 $ facturés une fois par an** » + étiquette −23 % ; **Mensuel 32,50 $**.
4. Bouton « Commencer mon mois gratuit » ; « Restaurer les achats », conditions, confidentialité, renouvellement automatique.
5. Prix, périodes et essais **lus dans l'offering RevenueCat** (jamais en dur) ; 24,92 $ = 299 / 12 calculé, jamais saisi.
6. **Écart connu** : la notification « ton essai se termine dans 3 jours » n'existe pas encore dans l'app. Voir lot S7.

---

## 4. État réel des connecteurs et du dépôt (lu le 2026-10-12)

| Élément | État | Conséquence |
|---|---|---|
| **RevenueCat** `proj1bf9001e` | Accessible (MCP). Entitlement actif `thrive_moments`. Offering courant `principal` (`$rc_monthly`, `$rc_annual`, **même `position: 1`**). Apps : iOS `appc8563a624d`, Android `app7a6cc384b4`, Web Stripe `appa704c361ff`, 2ᵉ app Stripe `app47af3332e6` (sans produit), Test Store `appece1a9b826`. Produits `thrive_moments_mensuel` / `_annuel` sur chaque plateforme. | Lots O3 |
| **RevenueCat iOS / Android** | `app_store_connect_api_key_configured: false`, `subscription_key_configured: false` ; compte de service Play absent. | Impossible de lire/pousser l'état des produits dans les stores : **action humaine** (§9). |
| **Supabase** THRIVE-CA | Accessible (MCP). 85 migrations, dernière `20261010_080`. Edge functions : `create-checkout-session`, `create-portal-session`, `billing-plans`, `billing-sync`, `stripe-webhook`, `revenuecat-webhook`, etc. | Migrations nouvelles **081 à 084** réservées (§5). |
| **Stripe** | Connecteur installé mais **`needs_reconnect` (non connecté)** : aucun outil Stripe disponible. Compte `acct_1Tl50KGSblkODz4J`. Maison existe déjà (produits `prod_VLRWz0fbMvfyEO` / `prod_VLRX6Of4uUnMEp`, webhook `we_1UKklbGSblkODz4Jro24Yaam`). **Stripe Tax actif, 0 inscription fiscale ; Checkout sans `automatic_tax`.** | Lylian reconnecte le connecteur (Réglages › Connecteurs) avant la vague 3, sinon l'agent livre un **script idempotent** `scripts/ops/stripe-setup-programmes.mjs` + une procédure, sans rien lancer. |
| **Vercel** | Accessible (MCP), lecture seule pour nous. | Aucun déploiement. |
| **App Store Connect / Play Console** | Pas de connecteur. | `CHECKLIST_TOI.md`. |
| **App mobile** | Expo 55, RN 0.83, expo-router, NativeWind, Reanimated 4, `react-native-purchases` 10. Onglets actuels : Accueil, Maison, Bilans, Séances, Messages, Profil. Aucune dépendance `expo-glass-effect`. Écrans en classes NativeWind (`bg-black`, `bg-gray-50`…). | Le nouveau UI remplace l'habillage, pas la logique. |
| **Dépôt** | Branche `main`. `CLAUDE.md`, `Claude/`, `maquettes-ios27/` non suivis par git. | Les maquettes sont versionnées dans un commit `docs(design): maquettes iOS 27` au début du lot S1. |
| **Audit** | `docs/audit-abonnement-2026-10.md` marque **A2** (forfaits coachés dans l'app mobile) comme point ouvert : « ne jamais vendre ni mentionner un forfait dans l'app mobile », « séances de groupe = IAP obligatoire ». | **Tension avec le design voulu** → drapeau, §7. |

---

## 5. Équipe d'agents

**Séquence** : Vague 0 (Haiku) → Vague 1 (Sonnet, d'abord S1 seul, puis S2–S7 en parallèle) → Vague 2 (Haiku : vérifs de base) → Vague 3 (Opus 5.5 : argent, base, webhooks, RevenueCat) → Vague 4 (revue Opus + Haiku). L'orchestrateur lance chaque vague dans **un seul message** (outil `Agent`, paramètre `model` : `haiku`, `sonnet`, `opus`). Après chaque vague : `pnpm typecheck` et `pnpm test` ; un bloquant ⇒ relancer **uniquement** l'agent fautif, 1 itération max.

### Vague 0 — Haiku (lecture seule)

**H0 · Inventaire et plan de correspondance** → écrit `docs/release/GO3_INVENTAIRE.md` (seul fichier créé).
1. Pour chaque lettre `A…Z` de `maquettes-ios27/screens.js` (et `K2`, `Y2`, `Y3`, `X2`, `D2`, `D3`), proposer le fichier réel de `apps/mobile/src/app/**` ou `src/screens/**` (existant à rédesigner, ou nouveau à créer). Base de départ : A→`welcome` (nouveau), B→`(auth)/login`, C→`(auth)/register`, D→`children`, D2→`components/subscription/Paywall`, D3→feuille système (non construite), E/F→à confirmer, G→`bilans`, K→`maison`, L→`activite/[activityId]`, S→`seances`, U→`messages`, V→`notifications`, W→`screens/child`, X→`profile`, Y→`offres` (nouveau), Y2→`offres/[pack]` (nouveau), Y3→`appel` (nouveau), X2→`abonnement`, Z→`fin-de-parcours` (nouveau).
2. Vérifier : `expo-glass-effect` installable sur Expo 55 ; Inter et Fraunces disponibles pour `expo-font` ; les 52 vignettes + logo présents ; `ACT-0704` sans image ; empreinte actuelle de `pnpm typecheck` / `pnpm test` / `pnpm lint` (nombre d'erreurs avant toute modif).
3. Lister les écrans existants **absents** des maquettes (ne pas les supprimer ni les casser).

### Vague 1 — Sonnet (UI, périmètres disjoints)

**S1 · Fondations du design (d'abord, seul).** Fichiers : `apps/mobile/src/design/**` (nouveau), `apps/mobile/package.json`, `apps/mobile/tailwind.config.js`, `apps/mobile/assets/{fonts,vignettes,brand}/**`, `apps/mobile/src/app/_layout.tsx` (monter le fournisseur), `apps/mobile/src/app/(parent)/_layout.tsx` (barre d'onglets).
- Commit des maquettes (`maquettes-ios27/`, `docs/release/`).
- `tokens` des trois styles lus depuis le design system (`tokens.json` : light / dark / creme) ⇒ `ThemeProvider`, hook `useTheme()`, `useStyleChoice()` (persistance AsyncStorage, défaut `natif`).
- Primitives : `GlassSurface`, `GlassButton`, `ListRow`, `Sheet`, `FloatingTabBar` (avec onglet Prominent), `Capsule`, `Pill`, `Slider` Liquid Glass, `VignetteImage` (map id → asset, repli ACT-0603), `MascotHero`. Repli `expo-blur` si pas de verre.
- Barre d'onglets conditionnée par le style (§3.1) en gardant les six routes ; `index` du parent → `maison`.
- Tests : rendu des trois thèmes, contraste AA des paires texte/fond (4,5:1 texte, 3:1 gros texte), cible tactile ≥ 44.

**S2 · Arrivée et compte.** Fichiers : `src/app/(auth)/**`, `src/app/welcome.tsx` (nouveau), `src/app/(parent)/profile.tsx`, `src/app/(parent)/children.tsx`, `src/screens/parent/ChildrenScreen.tsx`, `src/components/AccountPrivacySection.tsx`, `src/components/account/**` (nouveau).
- A (Bienvenue + `SloganDuo` animé, §3.1), B (connexion), C (inscription parent), D (enfants), E (« Ton espace se prépare »), F (choisir le profil, 3 variantes selon le style).
- **X Compte & famille** + **Style de l'app** (sélecteur à trois aperçus branché sur `useStyleChoice()`).
- La logique d'auth, MFA, suppression de compte, export, Loi 25 restent inchangées.

**S3 · Maison.** Fichiers : `src/app/(parent)/maison.tsx`, `src/app/(parent)/activite/[activityId].tsx`, `src/app/(parent)/parcours.tsx` (K2, nouveau), `src/app/(parent)/carnet.tsx` (N, nouveau), `src/hooks/useMaison.ts`, `src/lib/vignettes.ts` (nouveau ; `src/lib/p3.ts` en lecture seule, extension additive seulement).
- K (page Maison « Soir de famille », fond plein écran de l'activité recommandée), K2, L (fiche moment), M (moment en cours : minuteur), N (le carnet).
- Même sélection d'activité, même règles que `maison.tsx` actuel (semaine N+1 ouverte quand les 3 fiches de la semaine N sont vécues, filtre de tranche d'âge, aucun échec, aucune série). Les 4 « portes » mènent aux routes existantes.

**S4 · Bilan, séances, messages, notifications.** Fichiers : `src/app/(parent)/{bilans,seances,messages,notifications,dashboard}.tsx`, `src/app/(parent)/chat/**`, `src/components/access/LockedSection.tsx`.
- G/H/I/J (Bilan, compétences de vie, comprendre l'outil, personnaliser), S/T (Mes séances, bilan du coach), U, V.
- États verrouillés (Maison seul) : aperçu flouté + cadenas, texte neutre, **sans** lien de paiement. Lit `access_state()`.

**S5 · Vidéo « en construction », fin de parcours, questionnaire enfant.** Fichiers : `src/app/(parent)/videos.tsx` (O, nouveau), `src/app/(parent)/fin-de-parcours.tsx` (Z, nouveau), `src/screens/child/**` (W), `src/lib/featureFlags.ts` (nouveau : `VIDEO_SESSIONS_ENABLED=false`).
- O uniquement (P, Q, R = aperçus, non construits). Z : certificat partageable, courbe LSSS, bien-être sur 13 séances (données existantes).

**S6 · Offres et abonnement Maison (UI, sans logique d'argent).** Fichiers : `src/app/(parent)/offres.tsx`, `src/app/(parent)/offres/[pack].tsx` (Y2), `src/app/(parent)/appel.tsx` (Y3), `src/components/offres/**`, `src/components/subscription/{Paywall,SubscriptionSettings,theme}.tsx`, `src/app/(parent)/abonnement.tsx`, `src/services/programPayments.ts` (**interface + stub** `startProgramCheckout(pack, mode)` qui renvoie `not_implemented`, que O2 remplira).
- Y, Y2, Y3 en UI complète ; **D2** (Paywall, §3.4) ; **X2**.
- **Contrainte dure** : `subscription-logic.ts`, `purchases.ts`, `subscription.store.ts` et leurs tests ne sont modifiés que par des **ajouts** (ex. `perMonthFromAnnual()`), jamais affaiblis.
- Tout le bloc programmes (Y, Y2, Y3) est derrière le drapeau `EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP` : **`true` en dev et preview, `false` en production iOS** tant que Lylian n'a pas tranché le §7-R1.

**S7 · Rappel de fin d'essai.** Fichiers : `src/hooks/useTrialReminder.ts` (nouveau), `src/services/trialReminder.ts` (nouveau).
- Notification locale (`expo-notifications`) programmée à J-3 de la fin d'essai (date lue dans `customerInfo`), annulée si l'utilisateur résilie ou si l'accès change ; texte neutre, sans lien. Tests unitaires de la logique de date.

### Vague 2 — Haiku (vérifications mécaniques)

**H1** : `pnpm typecheck`, `pnpm lint`, `pnpm test` ; compare à l'empreinte de H0 ; liste les écarts. **H2** : greps d'anti-steering (§8) sur `apps/mobile/src`. **H3** : cohérence des textes français (orthographe, apostrophes `’`, « Maison », « Mes séances »), absence de données de démo codées en dur (`Alex Tremblay`, `9 novembre`, `Léo` hors fixtures).

### Vague 3 — Opus 5.5 (argent, base de données, webhooks)

Les agents Opus **lisent d'abord** `docs/monetisation-hybride.md`, `docs/audit-abonnement-2026-10.md`, `docs/acces-parents.md`, `supabase/functions/_shared/billing*.ts`, `create-checkout-session/index.ts`, `stripe-webhook/index.ts`, `revenuecat-webhook`, migrations 064, 065, 068, 070, 075, 080. Ils écrivent des tests Deno pour tout ce qui touche à l'argent.

**O1 · Programmes payés par Stripe (serveur).** Fichiers : `supabase/migrations/20261012_081_*.sql` (+ rollback dans `supabase/rollbacks/`), `supabase/functions/{create-program-checkout,program-installment-charge,admin-refund-program-payment}/**`, `supabase/functions/stripe-webhook/index.ts` (extension additive), `supabase/functions/_shared/program_billing*.ts`, `supabase/tests/program_payments.sql`, `scripts/ops/stripe-setup-programmes.mjs`.
- **Modèle** : tables `program_orders` (parent, pack, total HT, statut, `stripe_customer_id`, mode `deux_versements` | `une_fois`) et `program_installments` (rang 1/2, montant HT, taxe, statut `due|payee|echouee|remboursee`, `stripe_payment_intent_id`, `due_when` = « inscription » | « séance 7 ») ; RLS : un parent ne lit que les siennes ; écriture réservée au `service_role` ; idempotence par `stripe_event_id` unique.
- **Stripe** : produits `THRIVE Groupe / Individuel / Complet`, prix par versement en CAD, `tax_behavior=exclusive`, `lookup_key` stables (`thrive_groupe_v1_versement`, etc.). Checkout `mode=payment` avec `setup_future_usage=off_session` (carte conservée pour le versement 2), `client_reference_id` et `metadata.app_user_id`, `metadata.kind='program'`, `metadata.pack`, `metadata.installment`. `automatic_tax` piloté par l'environnement `STRIPE_TAX_ENABLED` (défaut `false` tant qu'aucune inscription TPS/TVQ n'existe — §9).
- **Webhook** : `checkout.session.completed` (kind=program) ⇒ marque le versement 1 payé et **pose `parent_access.program_pack`** par le chemin service_role autorisé (trigger `enforce_pack_change_authority`), ce qui ouvre Maison via 075 ; `payment_intent.succeeded|payment_failed` pour le versement 2 ; `charge.refunded` ⇒ statut `remboursee` (le pack n'est **pas** retiré automatiquement : décision admin).
- **Versement 2 (« séance 7 »)** : déclenché par la complétion de la séance 7 (voir `20261008_071_complete_session_with_report.sql`) qui crée une ligne `due` ; `program-installment-charge` la prélève hors session. **Garde-fou : `PROGRAM_AUTOCHARGE_ENABLED` (défaut `false`)** — tant qu'il est faux, la ligne `due` crée une alerte admin (centre de notifications, migration 060) et un courriel au parent avec un lien Checkout ; rien n'est prélevé sans action explicite. Gérer l'authentification forte (SCA) : si le paiement exige une action, envoyer le lien et ne rien réessayer en boucle.
- **Remboursement** : `admin-refund-program-payment` (rôle ADMIN/SUPER_ADMIN seulement), montant **saisi**, motif obligatoire, écriture dans `audit_logs`. Aucune politique automatique (§3.2).
- Rien n'est lancé en live. Le script `stripe-setup-programmes.mjs` est idempotent (recherche par `lookup_key`) et accepte `--mode test|live`, `--dry-run` par défaut.

**O2 · Programmes payés par Stripe (client).** Fichiers : `apps/mobile/src/services/programPayments.ts` (remplace le stub de S6), `apps/web/src/app/parent/(hub)/programme/**` (page web de retour/choix), `apps/web/src/app/admin/**` (bouton « Envoyer le lien de paiement » dans la fiche parent, additif), `apps/web/src/lib/program-packs.ts` (ajouts seulement), `packages/shared/**` (types Zod des commandes/versements).
- Trois entrées, une seule vérité serveur : (1) **lien envoyé par le coach/l'admin** par courriel (toujours disponible) ; (2) **dans l'app** (Y2) derrière le drapeau `OFFRES_PROGRAMMES_IN_APP` : ouvre Stripe Checkout dans `expo-web-browser`, au retour relit `access_state()` ; (3) page web `/parent/programme/[pack]`.
- Jamais de montant calculé côté client : le client envoie `pack` + `mode`, le serveur décide du montant.
- Aucun lien ni texte de paiement web de **Maison** dans le mobile (règle 3).

**O3 · RevenueCat et Maison.** Utilise le MCP RevenueCat (projet `proj1bf9001e`).
- Offering `principal` : positions **Annuel = 0, Mensuel = 1** (corrige l'audit R5) ; vérifier que chaque package pointe les trois plateformes ; ne rien supprimer.
- Vérifier (lecture) que l'essai d'1 mois est bien déclaré pour Maison côté Stripe web ; côté App Store / Play, **NON_VÉRIFIÉ** tant que les identifiants stores manquent (R1/R2) — l'écrire dans la checklist, ne pas inventer.
- Confirmer que **les programmes ne passent pas par RevenueCat** (le droit « programme » vit dans `parent_access.program_pack`), et que Maison reste le seul entitlement `thrive_moments`.
- Vérifier le Paywall D2 contre Apple 3.1.2 : prix facturé visible, période, renouvellement automatique, essai, conditions, confidentialité, restaurer.
- Sortie : section « RevenueCat » dans `docs/release/GO3_RAPPORT.md`.

**O4 · Appel de 15 minutes (Y3) côté serveur.** Fichiers : migration `20261012_082_call_requests.sql` (+ rollback), `supabase/functions/request-intro-call/**`, test SQL. Table `call_requests` (parent, enfant, mode vidéo|téléphone, créneau, statut), RLS parent propriétaire + staff, alerte admin à la création, **aucun paiement**. Le service mobile `appel` de S6 appelle cette fonction.

**O5 (optionnel, après O1–O4) · Synchro serveur du style.** Migration `20261012_083_ui_style.sql` : colonne `profiles.ui_style text check (ui_style in ('natif','nuit','carnet'))`, RLS existante de `profiles` respectée. Si le risque dépasse le bénéfice, ne pas faire et l'écrire.

### Vague 4 — Revue

**G1 · Opus 5.5 (revue sécurité et conformité, lecture seule + tests).** Relit O1–O5 : RLS des nouvelles tables (un parent ne voit jamais celles d'un autre ; aucun `GRANT` d'écriture à `authenticated`), idempotence des webhooks, signature Stripe vérifiée, absence de montant côté client, `search_path` des fonctions `SECURITY DEFINER`, journalisation, Loi 25 (données en `ca-central-1`, pas de donnée d'enfant dans Stripe : seuls courriel, nom, adresse du parent), aucun secret dans le code. Confronte le résultat aux Review Guidelines Apple 3.1.1, 3.1.2, 3.1.3(d)(e) (texte officiel, sources citées) et écrit un verdict `OK / À CORRIGER / À DÉCIDER`.
**V1 · Haiku** : relance toute la batterie (§8), vérifie que `git status` ne contient ni `.env` ni binaire lourd, écrit `docs/release/GO3_RAPPORT.md` (tableau lot → FAIT / À TOI / BLOQUÉ) et complète `CHECKLIST_TOI.md`.

---

## 6. Règles d'implémentation du design (pour tous les lots S)

1. **Ne pas recopier le HTML.** Les maquettes sont la référence visuelle ; on les traduit en composants React Native à partir des tokens (`useTheme()`), jamais de couleur codée en dur quand un token existe.
2. **Verre avec retenue** : un seul empilement de verre par zone, jamais verre sur verre ; en mode *Réduire la transparence* ou sans support, surface opaque du token.
3. **Texte** : Inter partout sauf titres éditoriaux du style Carnet (Fraunces) et le « 0 $ » du paywall. Chiffres en `tabular-nums`. Titres jamais en capitales forcées.
4. **Accessibilité** : `accessibilityRole`/`Label` sur chaque contrôle, cibles ≥ 44 pt, Dynamic Type respecté, contraste AA dans **les trois** styles, animations coupées si *Réduire les animations*.
5. **Une seule animation d'attention à la fois** par écran (le duo de slogans compte comme une).
6. **Aucun état d'échec visible** dans Maison et les cartes ; erreurs réseau : `OfflineState` existant.
7. **Données** : toutes les valeurs affichées viennent des hooks/stores existants ou de fixtures de test ; les maquettes servent à la forme, pas au contenu.
8. **Capture de preuve** : chaque lot S fournit, si un simulateur iOS ou un rendu web (`expo start --web`) est disponible, une capture par style de ses 2 écrans principaux dans `docs/release/go3-captures/`. Sinon `NON_VÉRIFIÉ (pas de simulateur)`.

---

## 7. Points sensibles décidés ou à trancher

| # | Sujet | Décision prise dans ce prompt | À valider par Lylian |
|---|---|---|---|
| **R1** | **Apple 3.1.3(d)/(e) et les programmes dans l'app iOS.** Le design montre les offres et le paiement Stripe *dans* l'app. L'audit du 1ᵉʳ octobre note que les séances de groupe (« un à quelques-uns ») pourraient relever de l'achat intégré, alors que le 1:1 en personne et les services consommés hors de l'app (3.1.3(d)/(e)) autorisent un autre moyen de paiement. **Lecture à confirmer sur le texte officiel avant soumission.** | Tout le bloc programmes est derrière `EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP`, **désactivé en production iOS**. Le lien de paiement par courriel et la page web marchent dans tous les cas. G1 rend un verdict argumenté. | Activer ou non le drapeau en prod iOS après lecture du verdict. |
| R2 | Taxes (TPS/TVQ) | Prix programmes hors taxes (`exclusive`), affichés « + tx » ; `STRIPE_TAX_ENABLED=false` par défaut car **0 inscription fiscale** dans Stripe Tax. | Inscription TPS/TVQ et activation de Stripe Tax avant le 1er paiement réel. |
| R3 | Remboursement de garantie | Montant libre saisi par l'admin, journalisé. | Règle exacte (part de 2/13 ? versement 1 entier ?). |
| R4 | Prélèvement automatique du versement 2 | `PROGRAM_AUTOCHARGE_ENABLED=false` : alerte + lien, rien d'automatique. | Activer quand le parcours est rodé. |
| R5 | Style par défaut | `natif`. | Confirmer. |
| R6 | Accueil → Maison | Maison devient la page d'arrivée ; `dashboard` conservé, masqué. | Confirmer. |
| R7 | Web (PWA Next.js) | **Hors périmètre visuel** : son design « Nuit calme / Jour clair » et ses règles (`DESIGN_TOKENS.md`, « zéro verre ») ne changent pas. Le web reçoit seulement les pages de paiement des programmes et le bouton admin. | Dire si le web doit aussi passer au nouveau UI (chantier séparé). |
| R8 | Maison payé sur le web | Existant inchangé (Stripe Checkout via `create-checkout-session`), jamais mentionné dans le mobile. | — |
| R9 | Prix de la visio Individuel, créneaux d'appel réels, agenda du coach | `[À COMPLÉTER]` | Fournir. |

---

## 8. Critères d'acceptation et tests

**Automatiques** (tous verts, sinon `BLOQUÉ` avec la raison) :
- `pnpm typecheck` · `pnpm lint` · `pnpm test`
- `cd apps/web && npx vitest run --root ../mobile src/services` (logique d'abonnement mobile, anti-steering)
- `deno test supabase/functions/_shared/ supabase/functions/stripe-webhook/verify.test.ts` + nouveaux tests programmes (montants, taxes ×1,14975 en affichage, idempotence webhook, refus d'un montant venu du client, refus d'un second pack, SCA)
- SQL : `supabase/tests/program_payments.sql` (RLS), `access_matrix.sql` et `access_rights_080.sql` inchangés et verts.
- **Anti-steering (grep)** sur `apps/mobile/src` : aucune occurrence de `stripe`, `checkout.stripe`, `billing.stripe`, « payer sur le site », « sur notre site » dans le périmètre **Maison / abonnement** ; les mentions « Stripe » sont autorisées **uniquement** dans le bloc programmes et protégées par le drapeau. Résultat commenté dans le rapport.
- Fixtures de contraste AA pour les trois styles.

**Manuels (listés dans le rapport, à faire par l'humain)** : parcours complet sur simulateur iOS dans les trois styles ; achat Maison en Sandbox Apple ; Checkout Stripe test (carte `4242 4242 4242 4242`), versement 1 puis versement 2 (Test Clocks) ; remboursement admin ; abonné App Store qui ouvre le web.

**Livrables** : branche locale propre, `docs/release/GO3_RAPPORT.md`, `docs/release/GO3_INVENTAIRE.md`, `CHECKLIST_TOI.md` mis à jour, captures dans `docs/release/go3-captures/`, migrations 081–083 et leurs rollbacks **non appliquées**.

---

## 9. Actions humaines à ajouter à `CHECKLIST_TOI.md`

1. **Reconnecter le connecteur Stripe** dans Claude (Réglages › Connecteurs) avant la vague 3 ; sinon lancer soi-même `scripts/ops/stripe-setup-programmes.mjs --mode test`.
2. **Stripe** : inscription TPS/TVQ (Revenu Québec) puis activer Stripe Tax ; liens confidentialité / conditions du portail client ; créer le webhook programmes (ou étendre `we_1UKklbGSblkODz4Jro24Yaam`) vers `/functions/v1/stripe-webhook` avec les événements ajoutés ; clé restreinte avec les droits PaymentIntents / Refunds / Invoices.
3. **RevenueCat** : clé App Store Connect + clé In-App Purchase (iOS) ; compte de service Google Play (Android) — sans elles, aucun produit ne peut être lu ni validé (audit R1/R2).
4. **App Store Connect / Play Console** : produits `thrive_moments_mensuel` / `_annuel`, offre d'introduction 1 mois, prix CAD, localisations FR/EN, notes de revue : mentionner que les programmes sont des services en personne.
5. **Secrets Supabase** : `PROGRAM_AUTOCHARGE_ENABLED`, `STRIPE_TAX_ENABLED`, `PROGRAM_SUCCESS_URL`/`CANCEL_URL` (via `APP_ORIGINS`).
6. **Décisions** : §7 R1, R3, R5, R6, R7, R9.
7. **Appliquer** les migrations 081–083 en préproduction puis en production, après relecture.
8. Fournir **prix visio**, **règle de garantie**, **créneaux d'appel**.

---

## 10. Message de lancement pour l'orchestrateur (à coller après `/model sonnet`)

```
Lis docs/release/GO3_UI_IOS27_PAIEMENTS.md en entier puis exécute-le à la lettre :
1. git checkout -b feature/ios27-ui-paiements (depuis main).
2. Vague 0 : H0 (haiku). Vague 1 : S1 seul (sonnet), puis S2 à S7 en parallèle (sonnet).
3. Vague 2 : H1, H2, H3 (haiku). Vague 3 : O1, O3, O4 en parallèle, puis O2, puis O5 (opus).
4. Vague 4 : G1 (opus), puis V1 (haiku).
Règles : §1 à la lettre, aucun push, aucune action live, aucune question. Rapport final de 5 lignes avec les liens vers docs/release/GO3_RAPPORT.md et CHECKLIST_TOI.md.
```

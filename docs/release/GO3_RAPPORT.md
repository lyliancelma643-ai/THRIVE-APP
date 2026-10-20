# GO 3 : rapport de chantier (UI iOS 27 et paiements)

- **Branche** : `feature/ios27-ui-paiements` (répertoire `.claude/worktrees/ios27-liquid-glass-payments-eec615`)
- **Commits** : 31 au-dessus de `main` avant ce rapport (32 après le commit de V1)
- **Date** : 2026-10-12
- **Rien poussé, rien appliqué en prod, aucun appel Stripe.** Migrations 081 à 083 et fonctions non déployées. Aucune écriture en base.

Documents liés : `GO3_INVENTAIRE.md` (correspondance maquettes, écrans), `GO3_O1_PROGRAMMES.md`, `GO3_O3_REVENUECAT.md`, `GO3_O5_STYLE.md`, `GO3_G1_REVUE.md`, `CHECKLIST_TOI.md` (section GO 3 en fin de fichier).

## 1. Statut par lot

Légende : **FAIT** = livré en local et vérifié par la batterie ; **À TOI** = il reste une action humaine ; **BLOQUÉ** = impossible sans accès externe.

| Lot | Statut | Résumé |
|---|---|---|
| H0 | FAIT | Inventaire écrit (`GO3_INVENTAIRE.md`), empreinte des tests et du lint avant chantier. |
| S1 | FAIT | Tokens des trois styles (natif, nuit, carnet), primitives verre (`expo-glass-effect`), 52 vignettes, logo, Inter et Fraunces. |
| S2 | FAIT (partiel) | Bienvenue (SloganDuo) = écran d'arrivée non connecté ; profil « Compte & famille » et « Style de l'app ». Composants E (PreparingSpace) et F (ChildPicker) prêts mais **non branchés**. |
| S3 | FAIT | Maison (K), parcours (K2), fiche moment (L), moment en cours (M), carnet (N). |
| S4 | FAIT | Bilan G/H/I/J, Mes séances S/T, Messages U, Notifications V. LockedSection avec « Écrire à mon coach », sans lien de paiement. |
| S5 | FAIT (partiel) | Vidéos O « Bientôt » (`VIDEO_SESSIONS_ENABLED=false`), fin de parcours Z, questionnaire enfant W. La logique à jeton lsss n'est **pas branchée** côté mobile (préexistant). |
| S6 | FAIT | Offres Y, Y2, Y3, Paywall D2, X2. Drapeau `OFFRES_PROGRAMMES_IN_APP` à `false` en production. |
| S7 | FAIT | Rappel local J-3 de fin d'essai, monté dans le layout parent. |
| H1 | FAIT | Batterie relancée, comparée à l'empreinte (section 2). |
| H2 | FAIT | Anti-steering : aucune nouvelle mention de paiement hors du bloc programmes (section 2). |
| H3 | À VÉRIFIER | Cohérence des textes FR et des données de démo : non relancé dans ce lot. |
| O1 | FAIT (code) · À TOI | Tables 081, 4 fonctions, webhook additif, script Stripe en dry-run. Droit programme écrit dans `pack_enrollments` (écart avec le prompt, 080 fait foi). |
| O2 | FAIT (code) · À TOI | Mobile (`services/programPayments.ts`), page web `/parent/programme/[pack]`, lien admin (`admin-create-program-link`). |
| O3 | À TOI | RevenueCat : positions Annuel/Mensuel **non modifiées** (le MCP ne sait pas réordonner) ; procédure manuelle. Essai iOS/Android NON_VÉRIFIÉ. |
| O4 | FAIT (code) · À TOI | `call_requests` (082) + `request-intro-call`. Aucun paiement. |
| O5 | FAIT (code) · À TOI | Colonne `ui_style` (083) + RPC `set_ui_style`. Repli local si la migration n'est pas posée. |
| G1 | FAIT | Revue sécurité et conformité : serveur solide ; 11 constats, la plupart corrigés depuis (section 4). |
| Correctifs post-G1 | FAIT | Prix facturé en vedette ; montants HT « + tx » au bouton ; libellé séance 7 ; détection du pack Stripe ; 082 limité aux familles suivies ; anti double prélèvement du versement 2 ; courriel d'authentification pour le lien admin. |
| V1 | FAIT | Batterie, rapport et checklist (ce document). |
| Stripe réel | BLOQUÉ | Connecteur Stripe déconnecté : aucun appel, prix Stripe NON_VÉRIFIÉ. |
| Stores | BLOQUÉ | Identifiants App Store Connect, Play et RevenueCat iOS/Android absents. |

## 2. Résultats des tests

Commandes lancées depuis la racine du worktree, pnpm 9.15.9.

| Commande | Empreinte avant chantier | Résultat (2026-10-12) |
|---|---|---|
| `pnpm typecheck` | OK | **OK** (mobile et web, 0 erreur TS) |
| `pnpm lint` | mobile : 1 erreur + 12 avertissements ; web OK | **mobile : 1 erreur + 11 avertissements** (erreur inchangée : `secure-storage.ts:85`, `no-var-requires`). Web OK, relancé seul : 0 avertissement. Le lint racine s'arrête au premier échec mobile. |
| `pnpm test` (web) | 4 suites KO sur 23 (`@thrive/shared` non résolu), 426 tests OK | **24 suites sur 24, 466 tests OK** |
| `pnpm test` (mobile) | aucun script `test` | inchangé : aucun script `test`, les tests mobile tournent via vitest côté web |
| `npx vitest run --root ../mobile src` | non mesuré | **13 fichiers, 111 tests OK** |
| `deno test` (`_shared/`, `verify.test.ts`, `admin-create-program-link/`) | non mesuré | **58 OK, 0 échec** |
| PGlite `run-pglite.mjs` | non mesuré | **14 étapes ✓, 0 ✗** (081, 082, 083, rollbacks, `access_matrix`, `access_rights_080`, `security_rls_regression`) |

**Anti-steering** (`grep -rniE "stripe|sur le web|site web|payer sur" apps/mobile/src`, hors tests) : **15 occurrences**.
- Bloc programmes (9) : `appel.tsx:112`, `offres.tsx:15` et `:42`, `offres/[pack].tsx:118`, `:119`, `:123`, `lib/offresFlags.ts:3`, `services/programPayments.ts:4` et `:64`. Protégées par `OFFRES_PROGRAMMES_IN_APP`.
- Ligne X2 (2) : `SubscriptionSettings.tsx:17` (commentaire) et `:135` (« Programme réglé par Stripe · aucun abonnement séparé », affiché seulement à un client programme, sans lien).
- Autre (4), **affichées comme écarts à relire** :
  - `app/_layout.tsx:66` : « L'administration de THRIVE se fait sur le web ». Préexistant (ligne 60 sur `main`). Ce n'est pas une incitation à payer.
  - `components/bilan/notificationRoute.ts:1` : commentaire ajouté dans ce lot (chemins web du `data.path`). Faux positif.
  - `services/subscription-logic.ts:49` et `:139` : logique d'abonnement STRIPE, préexistante, non modifiée dans ce lot. Aucun lien de paiement Maison.
- Conclusion : **aucun nouvel écart de steering**.

**`eas.json`, `OFFRES_PROGRAMMES_IN_APP`** : `true` en development et preview, `false` en production.

**Hygiène du dépôt** :
- `git status` : propre, aucun fichier non suivi.
- Aucun `.env` ajouté (seulement `.env.example`, préexistants).
- Aucun fichier ajouté de plus de 1 Mo ; le plus gros est `maquettes-ios27/screens.js` (124 Ko).
- Lien `supabase/tests/local/node_modules` (PGlite) supprimé après le test.

## 3. RevenueCat (résumé de `GO3_O3_REVENUECAT.md`)

- **Offering `principal`** (`ofrngaffd492c34`, courant, actif) : packages `$rc_annual` (Annuel) et `$rc_monthly` (Mensuel). Chacun couvre iOS, Android, Web Stripe et Test Store : aucun trou.
- **Positions** : Annuel = 1 et Mensuel = 1 (à réordonner, Annuel avant Mensuel). **Non appliqué** : le MCP n'expose pas de mise à jour de position, et supprimer/recréer casserait l'offering servi aux apps. Procédure manuelle (Lylian, 1 min) dans `GO3_O3_REVENUECAT.md` §2.
- **Essai d'un mois** : côté web, posé au Checkout (`TRIAL_DAYS = 30`, une fois par compte). Côté App Store et Play : **NON_VÉRIFIÉ** (identifiants absents). Le Paywall n'affiche l'essai que si le store le déclare.
- **Entitlement** : `thrive_moments` seul actif. Les programmes ne passent **pas** par RevenueCat : le droit vit dans `pack_enrollments` (080).
- **Paywall D2 contre Apple 3.1.2** : corrections décrites dans O3 (prix facturé en vedette, ligne de prix sous le « 0 $ », frise « On te prévient » sans J-3 réel). Les commits `dda83a3` et `cf9ade8` portent la correction du prix facturé ; **à revérifier à l'écran** (NON_VÉRIFIÉ).

## 4. Revue G1

**Verdict** : serveur (081, 082, 083, fonctions, webhook) **solide** : RLS, privilèges, `search_path`, idempotence, signature et montant côté serveur conformes. Côté client, les constats bloquants ont été corrigés après G1 (section 1).

**Conformité stores** : le paiement Stripe des programmes en personne est conforme à Apple 3.1.3(e) et 3.1.3(d) et à l'exception « physical services » de Google. Maison reste en achat intégré.

**Constats restants, À DÉCIDER** :
1. **Paywall « 0 $ »** : réduire la mise en avant du « 0 $ » si App Review le demande (Apple 3.1.2).
2. **`profiles_update_own`** (G1 #6) : le parent peut modifier `agreed_at`, `email`, etc. Pas d'élévation de droits, mais lot séparé à prévoir (révocation et `grant update` par colonne).
3. **Drapeau programmes iOS** : `false` pour la première soumission (examen centré sur Maison). Activation dans une 1.0.x, avec note à App Review, selon R1.

Détail : `docs/release/GO3_G1_REVUE.md`.

## 5. NON_VÉRIFIÉ

- **Rendu des écrans** (simulateur iOS et web, trois styles) : aucune capture produite. `docs/release/go3-captures/` ne contient que `.gitkeep`.
- **Stripe réel** : Checkout, webhooks, Test Clocks, remboursement. Connecteur déconnecté.
- **Stores** : RevenueCat iOS et Android, App Store Connect, Play Console, essai et offres d'introduction.
- **Migrations 081 à 083 sur THRIVE-CA** : jamais appliquées. Vérifiées seulement sur PGlite.
- **PostgREST réel** : RPC `set_ui_style` et RLS non testées sur l'API.
- **Examen App Review** et Apple Pay.

## 6. Tests manuels à faire (§8 du prompt, à faire par un humain)

1. Parcours complet sur simulateur iOS, dans les trois styles (natif, nuit, carnet), contraste et cibles tactiles.
2. Achat Maison en Sandbox Apple.
3. Checkout Stripe en mode test (carte `4242 4242 4242 4242`) : versement 1 réglé, pack ouvert.
4. Versement 2 (Test Clocks, horloge avancée de 7 semaines), puis lien envoyé si `PROGRAM_AUTOCHARGE_ENABLED=false`.
5. Remboursement admin partiel puis total : `audit_logs` (REQUESTED puis DONE), versement `remboursee`, pack toujours actif.
6. Second achat du même parent : attendu 409 `pack_active`.
7. Rejeu d'un événement webhook depuis le tableau Stripe : attendu `program: duplicate`.
8. Abonné App Store qui ouvre le web : aucun lien de paiement vers un prix.

## 7. Liste des `[À COMPLÉTER]` (grep sur `apps/mobile/src`, `apps/web/src`, `supabase`, `docs/release`, `scripts`)

**Mobile**
- `app/(parent)/fin-de-parcours.tsx:20-21` : nom du coach, date de fin, PDF et documents du parcours.
- `app/(parent)/videos.tsx:10-11, 31` : synchro de la préférence vidéo, liste « Ce qui viendra », lecteur P/Q/R.
- `screens/child/QuestionsScreen.tsx:7` : brancher la route à jeton existante.
- `screens/child/HomeScreen.tsx:5`, `BadgesScreen.tsx:5` : contenu neutre à définir.
- `components/bilan/BilanSheets.tsx:59` : photo du passeport (bucket `child-avatars`).

**Supabase**
- `functions/program-installment-charge/index.ts:9, 128` : courriel au parent avec le lien du versement 2 (aucun service d'envoi dans le dépôt).
- `functions/program-installment-charge/index.ts:165` : taxes du versement 2 hors session via Stripe Tax Calculations.
- `functions/admin-refund-program-payment/index.ts:8` : règle de garantie (R3).

**Docs**
- `docs/release/GO3_UI_IOS27_PAIEMENTS.md:91` : prix de la visio Individuel hors Montréal. Le `:236` (R9) reprend les trois valeurs à fournir (prix visio, créneaux, agenda du coach).
- `docs/release/GO3_O1_PROGRAMMES.md:48` : titre de section, aucune valeur.
- Les lignes `:29`, `:88` du prompt et `docs/release/GO2.md:11, 35` sont des consignes de méthode, pas des valeurs à compléter.

## 8. Fichiers écrits

- `docs/release/GO3_RAPPORT.md` (ce fichier).
- `CHECKLIST_TOI.md` : section « GO 3 : UI iOS 27 et paiements (2026-10-12) » ajoutée à la fin, contenu existant conservé.

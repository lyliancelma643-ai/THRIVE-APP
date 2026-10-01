# Audit abonnements et paiements — CTRL_2 (Lydia) — 1er octobre 2026

Périmètre : abonnement P3 « Le moment qui compte » (entitlement RevenueCat `thrive_moments`)
sur le web (Stripe), iOS (App Store) et Android (Google Play), et forfaits coaching
(ESSENTIEL / AVANCÉ / PERFORMANCE). Code : `apps/mobile`, `apps/web`, `supabase/functions`,
`supabase/migrations`. Consoles lues **en lecture seule** : RevenueCat (projet `proj1bf9001e`)
et Stripe live (`acct_1Tl50…`). Aucune écriture dans une console, aucun paiement réel,
aucune donnée client lue (0 abonnement Stripe live, 0 abonné RevenueCat actif).

Branche des correctifs : `claude/lucid-volta-rfz25w`.

## Sources officielles consultées le 2026-10-01

| Réf. | Source | Accès |
|---|---|---|
| [AppleRG] | App Store Review Guidelines, « Last Updated: June 8, 2026 » — https://developer.apple.com/app-store/review/guidelines/ (§2.1, 3.1.1, 3.1.1(a), 3.1.2(a)(b)(c), 3.1.3(b)(d)(e), 5.1.1(v), 1.3, 5.1.4) | Texte intégral lu |
| [GPpay] | Google Play — Payments policy — https://support.google.com/googleplay/android-developer/answer/9858738 et « Understanding Google Play's Payments policy » (answer/10281818) | **NON_VERIFIE en texte intégral** : `support.google.com` est bloqué par le proxy de cet environnement ; extraits obtenus par moteur de recherche uniquement |
| [GPsub] | Google Play — Subscriptions policy — https://support.google.com/googleplay/android-developer/answer/9900533 | **NON_VERIFIE en texte intégral** (même raison) |
| [GPus] | Google Play — mise à jour US (programmes de liens externes, frais au 1er octobre 2026) — https://support.google.com/googleplay/android-developer/answer/15582165 | Extrait via moteur de recherche |
| [RCgrace] | RevenueCat — Billing Issues & Grace Periods — https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work | Extrait via moteur de recherche (site bloqué par le proxy) |

## Inventaire du système

```
Web     /parent/abonnement → create-checkout-session → Stripe Checkout (CAD, TTC)
        → billing-sync / stripe-webhook → RevenueCat (POST /v1/receipts) → miroir billing_subscriptions
iOS     Paywall RN (offering RevenueCat « principal ») → StoreKit → RevenueCat
Android Paywall RN → Google Play Billing → RevenueCat
Tous    RevenueCat → revenuecat-webhook → relecture GET /v1/subscribers → miroir → RLS p3_* + access_state()
```

| Élément | Code | RevenueCat (lu) | Stripe (lu) |
|---|---|---|---|
| Entitlement | `thrive_moments` | `thrive_moments` actif, 8 produits attachés ✅ | metadata `revenuecat_entitlement=thrive_moments` ✅ |
| iOS | `thrive_moments_mensuel`, `_annuel` | présents (app `appc8563a624d`) ✅ — **clés App Store Connect et In-App Purchase absentes** ❌ | — |
| Android | `thrive_moments:mensuel`, `:annuel` | présents (app `app7a6cc384b4`) ✅ — **compte de service Play absent** ❌ | — |
| Web | lookup_keys `thrive_moments_mensuel/annuel` | `price_1UKkdy…`, `price_1UKke2…` (app `appa704c361ff`) ✅ | 32,50 $ / mois, 299 $ / an, CAD, `tax_behavior=inclusive` ✅ |
| Offering courant | `principal`, `$rc_monthly` / `$rc_annual` | `principal` courant ✅ (les 2 packages ont `position: 1`) | — |
| Webhooks | `revenuecat-webhook`, `stripe-webhook` | 1 webhook → Supabase, tous environnements ✅ | `we_1UKklb…` 7 événements, activé ✅ |
| Portail client | `create-portal-session` | — | `bpc_1UKkeI…` : annulation fin de période ✅ ; liens confidentialité / CGU **vides** ❌ |
| Taxes | — | — | Stripe Tax actif, siège Montréal QC, **0 inscription fiscale**, Checkout **sans `automatic_tax`** ❌ |

## Tableau principal

Gravité : 🔴 Bloquant (rejet ou perte de revenu certaine) · 🟠 Majeur · 🟡 Mineur · 🟢 Conforme.
Statut : CORRIGÉ (sur la branche) · OUVERT · ACTION_HUMAINE · NON_VERIFIE · CONFORME.

| ID | Zone | Constat | Règle officielle | Gravité | Preuve | Statut | Correctif |
|---|---|---|---|---|---|---|---|
| A1 | Architecture | RevenueCat + StoreKit / Play Billing pour le contenu numérique P3 sur mobile, Stripe sur le web, même App User ID (id Supabase) partout. | AppleRG 3.1.1 (IAP obligatoire pour débloquer du contenu), 3.1.3(b) (accès multiplateforme si aussi vendu en IAP) | 🟢 | `apps/mobile/src/services/purchases.ts`, `docs/monetisation-hybride.md` | CONFORME | — |
| A2 | Architecture | Forfaits coaching (13 séances 1:1 avec un coach humain, en présentiel) : relèvent du paiement externe. Mais ces forfaits débloquent AUSSI des fonctions numériques (bilans détaillés, exports PDF/CSV, messagerie). Ils ne sont pas vendus dans l'app mobile aujourd'hui. | AppleRG 3.1.3(d) (service en temps réel entre deux personnes, ex. « fitness training » : autre moyen de paiement permis ; « one-to-few / one-to-many » : IAP), 3.1.3(e) (services consommés hors de l'app : paiement hors IAP obligatoire) | 🟠 | `docs/segmentation-forfaits.md` §2 | OUVERT (règle à respecter) | Ne jamais vendre ni mentionner un forfait dans l'app mobile ; si l'app mobile affiche un jour les fonctions réservées aux forfaits, les présenter comme partie du service de coaching 1:1 (3.1.3(d)) et préparer la justification ci-dessous (H). Séances de groupe = IAP obligatoire. |
| A3 | Architecture | Anti-steering : aucun texte, lien ou bouton vers le paiement web dans l'app mobile ; un abonnement pris ailleurs est seulement reconnu ; le repli `managementURL` est filtré (jamais le portail Stripe). | AppleRG 3.1.1(a), 3.1.3 (« cannot, within the app, encourage users to use a purchasing method other than in-app purchase », hors vitrine US) ; GPpay | 🟢 | `subscription-logic.ts` (`managementMode`, `isNativeStoreManagementUrl`) + tests | CONFORME | Nouveau texte de suppression de compte vérifié par test (aucune mention web/Stripe). |
| M1 | App mobile | **L'app mobile vend l'abonnement mais ne contient pas le contenu payé** : aucune vue P3 / Maison dans `apps/mobile`, `PremiumGate` n'est utilisé nulle part. Un abonné iOS ne reçoit rien dans l'app. | AppleRG 2.1(b) (IAP « complete, up-to-date, visible to the reviewer and functional »), 3.1.2(a) (« ongoing value », « must work on all of the user's devices where the app is available »), 2.3 | 🔴 | `grep PremiumGate apps/mobile` → définition seule | OUVERT | Développer Maison dans l'app mobile (ou l'y intégrer) **avant** toute soumission avec achat intégré. Décision produit. |
| M2 | App mobile | L'arborescence active `apps/mobile/app/` n'a **aucun écran de connexion** ; login / register sont dans `src/app/`, ignoré par expo-router (déjà signalé dans `AUDIT_REPORT.md` §6.6). Le reviewer ne peut pas se connecter avec le compte de démo. | AppleRG 2.1(a) (démo fonctionnelle, compte de démo) | 🔴 | `app/_layout.tsx` déclare `(auth)` absent de `app/` | OUVERT | Fusionner les routes dans `app/` (chantier déjà identifié, décision produit). |
| R1 | RevenueCat iOS | Clé API App Store Connect et clé In-App Purchase **non configurées** : RevenueCat ne peut ni lire les produits ni valider correctement les transactions StoreKit 2. | Documentation RevenueCat (configuration App Store) ; AppleRG 2.1(b) | 🔴 | `list-apps` : `app_store_connect_api_key_configured: false`, `subscription_key_configured: false` ; `get-product-store-state` → 422 « credentials are missing » | ACTION_HUMAINE | Voir action 3. |
| R2 | RevenueCat Android | Identifiants du compte de service Google Play **absents** : RevenueCat ne peut pas valider les achats Play (accès jamais ouvert, revenus non suivis). | Documentation RevenueCat (Google Play service credentials) | 🔴 | `play_service_account_credentials_configured: false` ; 422 « Missing credentials for the store » | ACTION_HUMAINE | Voir action 4. |
| R3 | Stores | Existence des produits dans App Store Connect / Play Console, groupe d'abonnement, prix par territoire, essai d'1 mois, localisations FR/EN : **impossibles à lire** sans R1/R2. | AppleRG 2.1(b), 3.1.2(b) ; GPsub | 🟠 | Erreurs 422 ci-dessus | NON_VERIFIE | Après actions 3 et 4, relancer Lydia : `get-product-store-state` vérifie tout. |
| R4 | RevenueCat | Deux apps Stripe : « THRIVE Web (Stripe) » (utilisée, produits attachés) et « thrive sport positive - APP (Stripe) » (sans produit). Si `REVENUECAT_STRIPE_PUBLIC_KEY` vient de la seconde, les achats web n'ouvrent aucun droit. | — | 🟡 | `list-apps`, `list-products` | NON_VERIFIE (le secret n'est pas lisible, et ne doit pas l'être) | Action 6. |
| R5 | RevenueCat | Les deux packages de l'offering `principal` ont la même `position: 1`. Sans effet sur l'app (tri dans le code), gênant pour un paywall RevenueCat futur. | — | 🟡 | `list-offerings` | OUVERT | Mettre Annuel = 0, Mensuel = 1 dans le dashboard. |
| P1 | Paywall mobile | Le lien « Politique de confidentialité » **disparaissait** si `EXPO_PUBLIC_PRIVACY_URL` était vide (aucune valeur par défaut). | AppleRG 3.1.2(c) → Schedule 2 du DPLA (liens fonctionnels confidentialité + conditions/EULA) ; GPsub | 🔴 | ancien `theme.ts` : `privacy: … \|\| ''` | CORRIGÉ | `legalLinks()` : sans URL de confidentialité (ou de conditions sur Android), le paywall n'affiche plus d'offre et ne vend pas ; les deux liens sont toujours rendus quand ils existent. Tests. |
| P2 | Paywall mobile | Sur Android, les « Conditions » renvoyaient vers l'EULA standard **d'Apple**. | GPsub (transparence de l'offre) | 🟠 | ancien `theme.ts` | CORRIGÉ | EULA Apple en repli sur iOS seulement. |
| P3 | Paywall mobile | Aucun bouton de fermeture visible (en-têtes masqués partout) : sortie uniquement par geste système. | AppleRG 3.1.2(a) (pas de pratiques trompeuses), Apple HIG ; GPsub (pas de dark pattern) | 🟠 | `app/_layout.tsx` `headerShown: false` | CORRIGÉ | Bouton « ✕ » (libellé « Fermer ») sur l'écran Abonnement. |
| P4 | Paywall mobile | Titre de l'abonnement absent près du prix ; mention « renouvellement automatique » seulement en petit texte. | AppleRG 3.1.2(c) + Schedule 2 (titre, durée, prix) | 🟠 | ancien `Paywall.tsx` | CORRIGÉ | Titre « THRIVE — Le moment qui compte », « abonnement mensuel/annuel à renouvellement automatique » dans le texte d'information. |
| P5 | Paywall mobile | Prix, période et essai lus dans le store (jamais en dur), échec de chargement géré (« Réessayer »), éligibilité à l'essai vérifiée (iOS), « Restaurer les achats » sur le paywall et dans les paramètres. | AppleRG 3.1.1 (restauration), 3.1.2(c) | 🟢 | `Paywall.tsx`, `SubscriptionSettings.tsx` | CONFORME | — |
| P6 | Paywall mobile | Accessibilité : options sans libellé complet pour VoiceOver/TalkBack ; liens légaux 12 pt avec petite zone tactile. | Apple HIG / WCAG 2.2 (2.5.8) | 🟡 | ancien `Paywall.tsx` | CORRIGÉ | `accessibilityLabel` complet par option (nom, prix, période, renouvellement), en-tête annoncé, liens 13 pt + zone tactile agrandie ; Dynamic Type laissé actif. |
| P7 | Paywall mobile | Achat réussi mais droit pas encore visible (validation RevenueCat lente) : aucun retour à l'utilisateur. | AppleRG 2.1(b) | 🟡 | ancien `onBuy` | CORRIGÉ | Message « Achat enregistré… Restaurer les achats ». |
| P8 | Paywall | L'app et les textes du paywall sont en français uniquement ; les stores exigent des métadonnées par langue de vente. | GPsub (nom de l'abonnement exact) ; App Store Connect (localisations) | 🟡 | — | ACTION_HUMAINE | Action 5 (nom + description FR et EN des produits et du groupe). |
| W1 | Paywall web | Pas de lien conditions / confidentialité à côté du bouton de paiement Stripe ; portail Stripe sans ces liens. | Loi sur la protection du consommateur du Québec (information avant contrat à distance) — à confirmer par un juriste | 🟠 | `abonnement/page.tsx`, portail `bpc_…` (URLs `null`) | CORRIGÉ (code) / ACTION_HUMAINE (URLs) | Liens affichés si `NEXT_PUBLIC_TERMS_URL` / `NEXT_PUBLIC_PRIVACY_URL` sont posés ; action 1 et 8. |
| W2 | Paywall web | En cas d'échec de paiement, la page annonçait « sans renouvellement » ou « prochain renouvellement » en plus de l'alerte. | — (clarté, perte de revenu) | 🟡 | `ActiveSubscription` | CORRIGÉ | Message unique : accès ouvert jusqu'à la fin de la grâce + où mettre à jour le moyen de paiement (portail, Apple, Google). |
| D1 | Droits serveur | RevenueCat source de vérité ; miroir `billing_subscriptions` écrit par le service role seulement (RLS lecture de sa ligne, INSERT/UPDATE/DELETE/TRUNCATE révoqués) ; RLS des tables `p3_*` et `access_state()` basées sur `active && expires_at > now()` (fermeture automatique à l'échéance même si un webhook manque). Statut premium non falsifiable côté client. | — | 🟢 | migrations 064, 065 | CONFORME | — |
| D2 | Webhooks | RevenueCat : secret partagé comparé à temps constant ; l'événement n'est jamais cru, l'état est relu chez RevenueCat → idempotent, insensible à l'ordre et au rejeu ; 500 → RevenueCat réessaie. Stripe : HMAC-SHA256, tolérance 5 min. | — | 🟢 | `revenuecat-webhook`, `stripe-webhook` | CONFORME | — |
| D3 | Webhook Stripe | Signature : en-tête avec plusieurs `v1` (rotation du secret) → seule la dernière était testée : refus possible de vrais événements pendant 24 h. | Documentation Stripe (vérification des signatures) | 🟠 | ancien `verify.ts` (`Object.fromEntries`) | CORRIGÉ | Toutes les `v1` testées à temps constant + test. Commentaire corrigé (Stripe réessaie tout non-2xx). |
| D4 | Checkout web | Le refus « déjà abonné » se fiait au miroir : un abonnement App Store dont le webhook n'est pas encore arrivé permettait un 2ᵉ abonnement web (double prélèvement, remboursement). | AppleRG 3.1.2(a) (« designed to avoid duplicate payment ») ; 3.1.2(b) | 🟠 | ancien `create-checkout-session` | CORRIGÉ | Relecture RevenueCat avant tout Checkout (repli sur miroir + historique Stripe si RevenueCat est indisponible). |
| D5 | Offre web | `billing-plans` pouvait annoncer « 1 mois gratuit » alors que le Checkout refusait l'essai (historique Stripe). | GPsub / pratiques trompeuses ; LPC Québec | 🟠 | `billing-plans` vs `create-checkout-session` | CORRIGÉ | Même règle d'éligibilité des deux côtés. |
| D6 | Partage familial | Un abonné P3 donne l'accès à tout profil qu'il ajoute dans `family_members` ; la limite suit le forfait coaching (`maxParents` : 1 / 2 / **illimité** en PERFORMANCE). Un compte PERFORMANCE peut partager un seul abonnement P3 avec un nombre illimité de comptes. | — (perte de revenu) | 🟠 | `has_p3_subscription()` (064), quota (039) | ACTION_HUMAINE (décision) | Décision 10 : plafonner le partage P3 (ex. 2 adultes). Correctif SQL prêt à écrire. |
| D7 | Droits serveur | `private.has_p3_subscription(uuid)` exécutable par tout compte connecté avec n'importe quel id : révèle si un autre compte est abonné (il faut connaître son UUID). | Loi 25 (minimisation) | 🟡 | migration 064 | OUVERT | Migration recommandée : renvoyer `false` si `auth.uid()` n'est ni `p_user` ni admin (non appliquée : je n'écris pas en production). |
| D8 | Résilience | Pas de resynchronisation périodique : si un webhook de renouvellement est perdu (après les nouvelles tentatives RevenueCat), l'accès se ferme à l'échéance jusqu'au prochain « Actualiser mon accès » / ouverture de l'app mobile. Échec « fermé » (pas de perte d'argent) mais ticket de support. | — | 🟡 | — | OUVERT | Tâche planifiée quotidienne : `syncFromRevenueCat` pour les lignes dont `expires_at` est dans les 48 h. |
| D9 | Sandbox | Les achats sandbox (App Review, TestFlight) ouvrent l'accès en production (`is_sandbox` mémorisé). Nécessaire pour la revue Apple ; les testeurs TestFlight ont l'accès gratuitement. | AppleRG 2.1(b) | 🟢 | `deriveBillingStatus` | CONFORME | Surveiller `is_sandbox` dans les rapports de revenu. |
| E1 | Cycle de vie | 17 scénarios vérifiés côté serveur (tests unitaires), voir matrice ci-dessous ; aucun test en sandbox Apple / licence Google possible (R1, R2, pas d'accès aux consoles). | — | 🟠 | `billing_lifecycle.test.ts` | CORRIGÉ (serveur) / NON_VERIFIE (stores) | Actions 3, 4, 7. |
| F1 | Gestion | « Gérer mon abonnement » ouvre les réglages natifs (achat de ce store) ; message neutre sinon ; web : portail Stripe, annulation en fin de période. | GPsub (annulation facile) ; AppleRG 3.1.2 | 🟢 | `SubscriptionSettings.tsx`, portail `bpc_…` | CONFORME | — |
| F2 | Suppression de compte | **Aucune suppression de compte dans l'app** (parent : rien ; coach : « Contactez le support »). La fonction `request-account-deletion` existe mais n'était appelée nulle part (ni mobile ni web). | AppleRG 5.1.1(v) (« must also offer account deletion within the app ») ; politique Google Play de suppression de compte | 🔴 | `grep request-account-deletion apps` → 0 | CORRIGÉ (mobile) / OUVERT (web) | Bouton « Supprimer mon compte » (parent et coach) → demande enregistrée. Ajouter le même bouton au web (`/parent/compte`). Délai de traitement à fixer (décision 9). |
| F3 | Suppression vs abonnement | Avant confirmation, l'utilisateur est averti qu'un abonnement App Store / Google Play continue d'être facturé tant qu'il ne l'a pas annulé (avec le bouton « Gérer mon abonnement » juste au-dessus) ; un abonnement web est arrêté côté serveur (`admin-delete-user`). | Apple, « Offering account deletion in your app » (informer de la facturation continue) | 🟠 | `deletionSubscriptionWarning` + tests | CORRIGÉ | — |
| G1 | Analytics | Aucun événement de funnel (vue paywall, début d'achat, succès, essai, annulation, échec de paiement). | — | 🟠 | aucun SDK analytics | OUVERT | Voir « Pilotage du revenu » ci-dessous. |
| G2 | Relances | Grâce de facturation Apple / Google : non vérifiable (R3). Stripe : réglages de relance (Smart Retries, courriels d'échec) non lisibles par l'API. | — | 🟠 | — | NON_VERIFIE | Action 7. |
| G3 | Taxes | Stripe Tax actif mais **0 inscription** et Checkout **sans `automatic_tax`** : aucune TPS/TVQ calculée ni affichée sur les factures web ; le prix « TTC » est donc entièrement compté comme revenu. | Loi sur la taxe d'accise / Loi sur la TVQ — à valider par un comptable | 🟠 | `GetTaxRegistrations` → `[]` ; `create-checkout-session` | ACTION_HUMAINE | Action 8, puis ajouter `automatic_tax: { enabled: true }` au Checkout (1 ligne). |

## Synthèse

**Risque de rejet Apple, par motif**
- 2.1(a) / 2.1(b) — app incomplète, achat non fonctionnel : **certain** tant que M1 (contenu absent), M2 (pas de connexion) et R1 (clés RevenueCat) ne sont pas réglés.
- 3.1.2(a) — l'abonnement ne fonctionne pas sur l'appareil : **certain** (M1).
- 5.1.1(v) — suppression de compte : corrigé dans l'app (F2) ; il reste à fixer le délai de traitement.
- 3.1.2(c) / Schedule 2 — informations du paywall : corrigé (P1–P4), **sous réserve** de poser `EXPO_PUBLIC_PRIVACY_URL` (sinon le paywall n'affiche plus d'offre → rejet 2.1(b)).
- 3.1.1 / 3.1.3 — anti-steering : conforme.

**Risque de rejet Google, par motif**
- Achats non validés (R2) et contenu absent (M1) : rejet ou avis négatifs certains.
- Abonnements (GPsub) : informations d'essai et d'annulation présentes ; conditions propres à Android corrigées (P2). Texte intégral de la politique **NON_VERIFIE** (proxy).
- Suppression de compte : corrigé dans l'app ; la fiche Play exige aussi un **lien web** de demande de suppression (action 2).

**Risques de perte de revenu**
1. Achats mobiles impossibles à valider (R1, R2) → 100 % du revenu mobile.
2. Partage P3 illimité par la famille en PERFORMANCE (D6).
3. Double abonnement web + store → remboursements (D4, corrigé).
4. Taxes non perçues sur le web (G3) → dette fiscale prélevée sur la marge.
5. Absence de funnel et de relances mesurées (G1, G2) → churn involontaire non piloté.

**Verdict**
- **Web (Stripe) : GO conditionnel** — après actions 1 (URLs légales), 8 (taxes) et déploiement des edge functions corrigées.
- **iOS et Android : NO-GO** — M1, M2, R1, R2 bloquants. Ne pas soumettre de build avec achat intégré avant leur résolution.

## Matrice des scénarios testés

« Serveur » = test automatisé sur la logique RevenueCat → miroir → accès (`supabase/functions/_shared/billing_lifecycle.test.ts`, exécuté : 17/17 ✅). « Store » = test réel en sandbox Apple / licence Google, **NON_VERIFIE** (R1, R2, pas d'accès consoles).

| # | Scénario | Attendu | Serveur | Store |
|---|---|---|---|---|
| E01 | Premier achat iOS mensuel | Accès, renouvellement prévu | ✅ | NON_VERIFIE |
| E02 | Essai gratuit (Android) | Accès, `period_type=trial` | ✅ | NON_VERIFIE |
| E03 | Conversion de l'essai | `normal`, nouvelle échéance | ✅ | NON_VERIFIE |
| E04 | Renouvellement | Échéance repoussée ; sans webhook, fermeture à l'échéance | ✅ | NON_VERIFIE |
| E05 | Échec de paiement, période de grâce | Accès conservé + alerte `billing_issue_at` | ✅ | NON_VERIFIE (grâce à activer, action 7) |
| E06 | Grâce épuisée (nouvelles tentatives en cours) | Accès fermé, plus d'essai | ✅ | NON_VERIFIE |
| E07 | Nouvelle tentative réussie | Accès rouvert, alerte levée | ✅ | NON_VERIFIE |
| E08 | Annulation | Accès jusqu'à la **fin de la période payée**, `will_renew=false` | ✅ | NON_VERIFIE |
| E09 | Expiration | Accès fermé, historique conservé | ✅ | NON_VERIFIE |
| E10 | Réabonnement | Accès rouvert | ✅ | NON_VERIFIE |
| E11 | Remboursement / révocation (dont partage familial retiré) | Accès fermé | ✅ | NON_VERIFIE |
| E12 | Changement de forfait mensuel → annuel | Produit suivi, accès continu | ✅ | NON_VERIFIE |
| E13 | Achat différé (Ask to Buy / paiement en attente) | Pas d'accès ; message « Paiement en attente » côté app | ✅ | NON_VERIFIE |
| E14 | Achat interrompu (réseau) puis restauration | Même état que l'achat | ✅ | NON_VERIFIE |
| E15 | Accès offert (promotionnel) | Accès sans échéance | ✅ | — |
| E16 | Achat sandbox (App Review) | Accès, `is_sandbox=true` | ✅ | NON_VERIFIE |
| E17 | Transfert d'achat entre comptes | Les deux comptes resynchronisés | ✅ | NON_VERIFIE |
| W-a | Signature Stripe en rotation (2 × v1) | Accepté | ✅ (`verify.test.ts`) | — |
| W-b | Essai web déjà consommé | Pas d'essai annoncé ni accordé | logique partagée testée (`stripeHistoryVerdict`) | NON_VERIFIE (Stripe test mode) |
| W-c | Abonné App Store qui ouvre le Checkout web | Refus 409 | code relu (D4) | NON_VERIFIE |
| X-a | Abonné iOS qui se connecte sur Android / le web | Droits retrouvés (même App User ID) | logique `managementMode` testée | NON_VERIFIE |

Tests exécutés sur la branche : Deno 42/42 (`_shared/`, `stripe-webhook/verify.test.ts`, `admin-delete-user/billing_cleanup.test.ts`), web 353/353 (`vitest run`), mobile 14/14 (`vitest --root ../mobile src/services`), `tsc` web OK, `tsc` mobile : aucune nouvelle erreur (5 erreurs de résolution de modules préexistantes), ESLint mobile : 0 erreur.

## Pilotage du revenu (proposition)

- **Tableau de bord** : RevenueCat Charts (MRR, churn, conversion essai → payant, rétention par cohorte, remboursements) couvre les trois canaux sans développement — à condition de régler R1/R2. Activer l'intégration Stripe → RevenueCat déjà en place.
- **Événements de funnel** à émettre (web et mobile) : `paywall_viewed`, `purchase_started`, `purchase_succeeded`, `trial_started`, `purchase_cancelled`, `purchase_failed`, `restore_tapped`. Les événements store (`trial_converted`, `cancellation`, `billing_issue`) viennent déjà du webhook RevenueCat : les journaliser dans une table `billing_events` (service role) pour l'analyse. L'app s'adresse aux parents, mais concerne des enfants de 8–17 ans : éviter les SDK publicitaires (AppleRG 5.1.4) et préférer un outil hébergé au Canada ou les données RevenueCat.
- **Relances** : courriel « fin d'essai dans 3 jours » (Stripe `customer.subscription.trial_will_end`, déjà reçu par le webhook mais non exploité) ; courriel / push à `billing_issue_at` ; activer la grâce Apple et Google (action 7).

## Livrable 1 — Review Notes (App Store Connect › App Review Information › Notes)

> À copier une fois M1, M2, R1 réglés et les comptes de démo créés (action 11).

```
THRIVE is a parent companion app for THRIVE's sport-based psycho-educational
program for children aged 8–17. The app is used by parents and coaches; children
do not purchase anything.

DEMO ACCOUNTS
- Parent (no subscription, to test the purchase):  <email> / <password>
- Parent (active subscription via sandbox):          <email> / <password>
- Coach (staff role, full access, no paywall):       <email> / <password>

HOW TO REACH THE SUBSCRIPTION SCREEN
1. Sign in with the "Parent (no subscription)" account.
2. Open the "Profil" tab › section "ABONNEMENT" › "Découvrir l'abonnement".
3. The screen shows both auto-renewable plans (monthly / yearly) with title,
   duration and price loaded from StoreKit, the 1-month free trial when
   eligible, "Restaurer les achats", and links to the Terms of Use (EULA) and
   Privacy Policy.

WHAT THE SUBSCRIPTION UNLOCKS ("THRIVE — Le moment qui compte")
- "Maison": a new 10-minute parent–child activity every day, personalised to
  the child's age and the family's feedback, and a journal of shared moments.
  New activities are added continuously.

OTHER INFORMATION
- All digital content is sold exclusively through in-app purchase in this app.
  Subscribers who subscribed on another platform with the same THRIVE account
  keep their access (guideline 3.1.3(b)); the app contains no link or call to
  action to any other purchase method.
- One-to-one coaching programs with a human coach (in-person sessions) are
  arranged directly with the coach outside the app and are not sold in the app
  (guidelines 3.1.3(d) and 3.1.3(e)).
- Account deletion: Profil › COMPTE › "Supprimer mon compte".
- The app is in French.
```

**Message type — rejet 3.1.1 (achat hors IAP présumé)**

```
Hello, and thank you for the review.

All digital content and features of THRIVE ("Maison" daily activities) are
sold exclusively through auto-renewable in-app purchase subscriptions
(product IDs thrive_moments_mensuel and thrive_moments_annuel), reachable from
Profil › ABONNEMENT › "Découvrir l'abonnement".

The app contains no button, external link or other call to action directing
users to a purchasing mechanism other than in-app purchase. Customers who
subscribed on another platform with the same account keep access, as permitted
by guideline 3.1.3(b), and these items are also available as in-app purchases.

One-to-one programs with a human coach consist of real-time, in-person sessions
between the coach and one family; they are consumed outside of the app and are
not sold in the app (guidelines 3.1.3(d) and 3.1.3(e)).

Could you tell us the exact screen or text that raised the concern? We will
correct it right away. Screenshots of the purchase flow are attached.
```

**Message type — rejet 3.1.2 (informations d'abonnement)**

```
Hello, and thank you for the feedback.

Build <version> displays, on the subscription screen and before purchase:
- the subscription title ("THRIVE — Le moment qui compte"),
- the length of each plan (1 month / 1 year) and the price loaded from StoreKit
  for the customer's storefront,
- the free-trial length and the price charged afterwards, when eligible,
- that the subscription renews automatically unless cancelled at least 24 hours
  before the end of the current period, and how to manage or cancel it,
- functional links to the Terms of Use (EULA) and the Privacy Policy,
- a "Restaurer les achats" button and a visible close button.

The Privacy Policy URL is set in App Store Connect › App Privacy, and the Terms
of Use (EULA) link is included in the App Description. Screenshots attached.
Please let us know if any element is still missing.
```

## Livrable 2 — Textes du paywall (en place dans le code)

- En-tête : **THRIVE — LE MOMENT QUI COMPTE**
- Promesse : « Ce n'est pas le nombre d'heures qui compte. C'est la qualité du moment. »
- Options : « Annuel — 299,00 $ / an — soit 24,92 $ par mois — −23 % » · « Mensuel — 32,50 $ / mois » (montants lus dans le store, exemple CAD)
- Bouton : « Commencer mon essai de 1 mois » (si éligible) sinon « M'abonner »
- Information (iOS) : « THRIVE — Le moment qui compte — abonnement annuel à renouvellement automatique. Gratuit pendant 1 mois, puis 299,00 $ / an. Le paiement est prélevé sur votre compte Apple à la confirmation de l'achat (à la fin de l'essai s'il y en a un). L'abonnement se renouvelle automatiquement, sauf annulation au moins 24 heures avant la fin de la période en cours. Gérez ou annulez-le dans les réglages de votre compte Apple. »
- Information (Android) : idem, « … prélevé sur votre compte Google Play … se renouvelle automatiquement jusqu'à annulation. Gérez ou annulez-le dans Google Play › Paiements et abonnements. »
- Boutons secondaires : « Restaurer les achats » · « ✕ Fermer »
- Liens : « Conditions d'utilisation (EULA) » · « Politique de confidentialité »

Métadonnées App Store Connect à aligner : *Privacy Policy URL* (App Privacy) et lien EULA dans la description (ou EULA personnalisé). Fiche Play : URL de politique de confidentialité + URL de suppression de compte.

## ACTIONS_REQUISES_DE_LYLIAN

| N° | Action | Où exactement | Étapes précises | Pourquoi | Ce que je dois renvoyer à Lydia |
|---|---|---|---|---|---|
| 1 | Publier les Conditions d'utilisation et la Politique de confidentialité | Site public (thrivesportpositive.com) ; Vercel ; EAS / `.env` mobile ; App Store Connect ; Play Console | 1. Faire rédiger/valider les deux textes (juriste, Loi 25). 2. Les publier à une URL https stable. 3. Vercel › projet web › Settings › Environment Variables : `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_PRIVACY_URL` (Production + Preview). 4. Variables du build mobile : `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`. 5. App Store Connect › App › App Privacy › Privacy Policy URL ; ajouter le lien des conditions dans la description. 6. Play Console › Contenu de l'application › Règles de confidentialité. | Sans URL de confidentialité, le paywall mobile ne vend plus (P1) ; exigée par Apple 3.1.2(c) et Google. | Les deux URL. |
| 2 | Lien web de demande de suppression de compte (fiche Play) | Play Console › Contenu de l'application › Suppression des données | Indiquer une URL publique expliquant comment demander la suppression (ou une page web dédiée) et les données conservées (factures). | Exigence Google Play pour les apps avec création de compte. | L'URL. |
| 3 | Brancher RevenueCat à App Store Connect | App Store Connect › Utilisateurs et accès › Intégrations › (a) **Clés API App Store Connect** (rôle *App Manager*) et (b) **Achat intégré** › générer une clé ; puis RevenueCat › Project settings › Apps › THRIVE iOS | Créer les deux clés, téléverser les fichiers `.p8` dans RevenueCat (avec Issuer ID et Key ID), renseigner le *Vendor number*. Ne jamais m'envoyer les clés. | R1 : sans elles, achats iOS non validés et produits illisibles. | « fait » + capture de la page RevenueCat montrant les deux clés configurées (sans valeur). |
| 4 | Brancher RevenueCat à Google Play | Google Cloud › compte de service + Play Console › Utilisateurs et autorisations ; RevenueCat › Apps › THRIVE Android | Suivre le guide RevenueCat « Google Play service credentials » : créer le compte de service, lui donner les droits financiers dans Play Console, téléverser le JSON dans RevenueCat (attendre jusqu'à 36 h la propagation). Activer aussi les notifications en temps réel (RTDN) via le topic Pub/Sub fourni par RevenueCat. | R2 : sans ça, aucun achat Android n'ouvre de droit. | « fait » + capture montrant les identifiants configurés. |
| 5 | Vérifier / créer les produits dans les stores | App Store Connect › Abonnements ; Play Console › Monétiser › Abonnements | iOS : un **seul groupe** contenant `thrive_moments_mensuel` et `thrive_moments_annuel` (annuel au-dessus = niveau supérieur ou même niveau selon votre choix), offre d'introduction **gratuite 1 mois** pour les nouveaux abonnés, nom + description **FR et EN**, capture du paywall pour la revue. Android : abonnement `thrive_moments`, base plans `mensuel` et `annuel` (renouvellement automatique), offre d'essai 1 mois « nouveaux clients », nom FR/EN. Choisir le palier de prix le plus proche de 32,50 $ / 299 $ CAD (le montant exact peut ne pas exister chez Apple). Décider : partage familial Apple **désactivé** (le partage passe déjà par les co-parents, D6). | R3 : identifiants à aligner sur le code ; essai et prix. | Rien (je vérifie moi-même via RevenueCat une fois 3 et 4 faits). |
| 6 | Vérifier la clé Stripe publique RevenueCat | RevenueCat › Apps › **THRIVE Web (Stripe)** (`appa704c361ff`) ; Supabase › Edge Functions › Secrets | Vérifier que `REVENUECAT_STRIPE_PUBLIC_KEY` est la clé de **cette** app (pas de « thrive sport positive - APP (Stripe) »), puis archiver l'app Stripe inutilisée. | R4 : sinon les achats web n'ouvrent aucun droit. | « vérifié ». |
| 7 | Grâce de facturation et relances | App Store Connect › App › Abonnements › Billing Grace Period ; Play Console › Abonnements › Période de grâce / suspension ; Stripe › Paramètres › Billing › Abonnements et e-mails | Activer la grâce (Apple : 16 jours recommandé ; Google : ex. 7 jours + suspension de compte). Stripe : Smart Retries activés, courriels « paiement échoué » et « fin d'essai » activés. Créer les comptes **Sandbox Apple** (App Store Connect › Utilisateurs et accès › Sandbox) et les **testeurs de licence** Google (Play Console › Paramètres › Test de licence). | G2 / E1 : churn involontaire ; tests réels du cycle de vie. | Les adresses des comptes de test (sans mot de passe) pour que la matrice soit rejouée. |
| 8 | Taxes et mentions de vente | Comptable ; Stripe › Taxes › Inscriptions ; Stripe › Paramètres › Public details | Faire valider par un comptable : obligation d'inscription TPS/TVH et TVQ (seuil de petit fournisseur, ventes numériques aux consommateurs québécois et canadiens hors Québec) ; ce que perçoivent et remettent Apple et Google pour les ventes in-app au Canada ; mentions obligatoires des factures ; règles de la LPC du Québec sur les essais gratuits et le renouvellement automatique. Puis ajouter les inscriptions dans Stripe Tax ; renseigner les URL de conditions et de confidentialité dans le portail client Stripe. Me dire « go » pour activer `automatic_tax` dans le Checkout. | G3, W1 : taxes non perçues sur le web. | La décision du comptable + « go » pour `automatic_tax`. |
| 9 | Délai de suppression de compte | Décision (Loi 25) | Fixer le délai maximum de traitement d'une demande de suppression (ex. 30 jours) et la procédure côté admin (`admin-delete-user`). | F2 : Apple et Google attendent un délai clair ; le message de l'app pourra l'afficher. | Le délai retenu. |
| 10 | Plafond du partage familial P3 | Décision tarifaire | Choisir combien de comptes adultes partagent un abonnement P3 (recommandation : 2, quel que soit le forfait coaching). | D6 : un compte PERFORMANCE partage aujourd'hui sans limite. | Le nombre retenu (j'écris la migration). |
| 11 | Débloquer l'app mobile (M1, M2) et comptes de démo | Décision produit + Supabase Auth | Valider la fusion des routes mobiles (`src/app` → `app/`) et l'ajout de Maison dans l'app mobile. Créer 3 comptes de démo dédiés (parent sans abonnement, parent abonné sandbox, coach). | Rejet certain 2.1 / 3.1.2(a) sinon. | « go » pour les deux chantiers + identifiants des comptes de démo par un canal sûr (pas dans le dépôt). |
| 12 | Programme petites entreprises Apple et frais Google | App Store Connect › Accords, taxes et banque ; Play Console › Configuration des paiements | Vérifier que le **Paid Apps Agreement** est actif avec infos fiscales et bancaires ; s'inscrire au **App Store Small Business Program** (15 %). Côté Google : profil de paiement complet (le taux de 15 % sur les abonnements s'applique sans inscription — à confirmer dans la Play Console). | Sans accord payant, aucun achat ne peut être vendu ; commission 30 % → 15 %. | « fait » pour chacun. |

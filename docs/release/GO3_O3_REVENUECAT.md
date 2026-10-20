# GO 3 — O3 · RevenueCat et Maison (lu le 2026-10-12, projet `proj1bf9001e`)

Lecture seule via le MCP RevenueCat, sauf mention contraire. Aucune clé recopiée, aucun achat, aucun grant.

## 1. Offering `principal` (`ofrngaffd492c34`, courant, actif)

| Package | id | Position | iOS `appc8563a624d` | Android `app7a6cc384b4` | Web Stripe `appa704c361ff` | Test Store `appece1a9b826` |
|---|---|---|---|---|---|---|
| `$rc_annual` « Annuel » | `pkge432017778f` | **1** | `thrive_moments_annuel` | `thrive_moments:annuel` | `price_1UKke2…` | `thrive_moments_annuel` (P1Y) |
| `$rc_monthly` « Mensuel » | `pkge4c79420198` | **1** | `thrive_moments_mensuel` | `thrive_moments:mensuel` | `price_1UKkdy…` | `thrive_moments_mensuel` (P1M) |

- Les deux packages couvrent les **trois plateformes** (+ Test Store) : aucun trou.
- 2ᵉ app Stripe `app47af3332e6` : 0 produit (confirmé `list-products`). Sans effet ; à archiver un jour ou à laisser.
- Durée/essai des produits iOS, Android et Web : `duration: null`, `trial_duration: null` — RevenueCat ne lit pas les stores (identifiants absents, §3) et ne porte pas l'essai Stripe dans son catalogue.
- Offering `default` (`ofrng148c3974fc`) : `inactive` (archivé), produits Test Store inactifs. Rien à faire.

## 2. Positions (audit R5) — NON APPLIQUÉ, procédure manuelle

- **Avant** : Annuel = 1, Mensuel = 1. **Après** : inchangé.
- Raison : le MCP n'expose aucun outil de mise à jour d'un package (`update-offering` ne modifie que `display_name`, `is_current`, `metadata`). Le seul chemin outillé serait supprimer/recréer les packages, interdit (casserait l'offering courant servi aux apps).
- Impact : nul pour l'app (le Paywall trie lui-même Annuel puis Mensuel, `Paywall.tsx:80-84`) ; utile seulement pour un futur paywall RevenueCat.
- **Procédure (Lylian, 1 min)** : RevenueCat › Product catalog › Offerings › `principal` › Edit › glisser **Annuel** au-dessus de **Mensuel** › Save. Vérifier ensuite (agent, lecture) : `list-packages` sur `ofrngaffd492c34` → `$rc_annual` position 0, `$rc_monthly` position 1. Retour arrière : réordonner dans l'autre sens.

## 3. Essai d'1 mois

| Canal | Constat | Statut |
|---|---|---|
| Web (Stripe) | Essai posé **au Checkout**, pas sur le prix : `trial_period_days: TRIAL_DAYS` (`create-checkout-session/index.ts:170-173`), `TRIAL_DAYS = 30` (`_shared/billing_core.ts:14`), une fois par compte (`ever_subscribed`), annulation si pas de moyen de paiement. RevenueCat n'expose pas d'essai pour `price_1UKk…` (`trial_duration: null`, normal). Prix Stripe lui-même : connecteur Stripe déconnecté. | OK côté code ; prix Stripe **NON_VÉRIFIÉ**. Note : 30 jours ≠ « 1 mois » calendaire (écart de 0 à 1 jour, libellé à garder « 1 mois » ou passer à `P1M`). |
| App Store | `app_store_connect_api_key_configured: false`, `subscription_key_configured: false` (get-app). Offre d'introduction gratuite 1 mois illisible. | **NON_VÉRIFIÉ** (R1, action humaine 3) |
| Google Play | `play_service_account_credentials_configured: false`. Phase gratuite de l'offre de base illisible. | **NON_VÉRIFIÉ** (R2, action humaine 4) |

Le Paywall n'affiche l'essai que si le store le déclare (`useMaisonOffering.ts:7-11`) : sans offre d'introduction créée dans les consoles, il bascule seul sur le prix réel (`Paywall.tsx:187-196`).

## 4. Entitlements et programmes

- Entitlements : `thrive_moments` (`entl6c9fca6b2a`) **seul actif**, 8 produits (Mensuel + Annuel × iOS, Android, Web, Test Store) ; `thrive_sport_positive_pro` **inactif** (archivé). Le serveur lit `RC_ENTITLEMENT = "thrive_moments"` (`_shared/billing_core.ts:11`).
- Programmes (Groupe / Individuel / Complet) : **aucun** produit, package ni entitlement RevenueCat ; `revenuecat-webhook` ne les mentionne pas. Le droit programme vit côté Supabase. **Précision** : depuis la migration 080 la source est `public.pack_enrollments` (packs datés, « remplace parent_access.program_pack », `20261010_080_droits_acces_unifies.sql:62`) — O1 doit écrire là, pas dans `parent_access.program_pack`.

## 5. Paywall D2 contre Apple 3.1.2 (`apps/mobile/src/components/subscription/Paywall.tsx`)

| Exigence | Statut | Où |
|---|---|---|
| Prix facturé visible et lisible | OK — « 299 $ facturés une fois par an » / « … chaque mois » en `subheadline` | 242-246, 278 |
| Période | OK | 241, 282, 300 |
| Renouvellement automatique + annulation 24 h | OK (iOS et Android distincts) | 300-306 |
| Durée de l'essai + montant facturé après | OK dans le pied (`caption1`) et sous le bouton | 301-303, 371-375 |
| EULA + confidentialité, liens fonctionnels | OK — `WebBrowser.openBrowserAsync`, vente bloquée si URL manquantes (`LEGAL.complete`) ; existence réelle des pages `/conditions` et `/confidentialite` **NON_VÉRIFIÉ** | 132, 323-347 ; `services/legal.ts:11-12` |
| Restaurer les achats | OK, visible même sans offre | 312-321 |
| **Prix facturé = élément de prix le plus visible** | **À CORRIGER** | 281 vs 278 ; 178 |
| Promesse exacte | **À CORRIGER** | 141 |

Corrections décrites (non appliquées) :
1. **Carte Annuel (l. 240, 278, 281)** : le chiffre le plus grand (`title3`) est le mensualisé 24,92 $, le montant facturé est plus petit. Apple 3.1.2(c) exige que le montant facturé soit l'élément de prix le plus clair. Inverser pour l'annuel : `title3` = `p.priceString` + « par an », et « soit 24,92 $ / mois » en `caption1` ; garder le mensuel tel quel.
2. **Vedette « 0 $ » 58 pt (l. 178-185)** : aucun prix facturé à proximité ; le seul rappel est en `caption1` (l. 302). Ajouter sous « Un mois complet, gratuit… » une ligne `subheadline` lisible : « Puis {priceString} {perPeriodFr(période)}, sans engagement ». Garde la hiérarchie voulue (gratuit d'abord) tout en rendant le prix facturé conspicu.
3. **Frise « On te prévient » (l. 141)** : la notification J-3 n'existe pas encore (§3.4.6, lot S7). Tant que S7 n'est pas livré, remplacer par « Rappel possible » ou retirer l'étape, sinon promesse inexacte (2.3.1).
4. Mineur : tutoiement (l. 184, 141, 373) et vouvoiement (l. 104-124, 305) mélangés ; l. 300 déduit annuel/mensuel d'un libellé (`=== '1 an'`) — préférer `selected.packageType`.

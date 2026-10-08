# Plan RevenueCat : facturation P3 (A12) — lecture seule

Date du constat : 2026-10-08. Projet `proj1bf9001e`. Outils utilisés : `list-*` / `get-*` uniquement. Aucune écriture.
Non vérifié dans ce passage : logs Supabase (`stripe-webhook`, `revenuecat-webhook`, `billing-sync`, `create-checkout-session`), présence des secrets, en-tête Authorization du webhook (non lisible via l'API).

## 1. État constaté

| Élément | Constat | Attendu | Statut |
|---|---|---|---|
| Apps | iOS `appc8563a624d`, Android `app7a6cc384b4`, Web Stripe `appa704c361ff`, Stripe `app47af3332e6`, Test Store `appece1a9b826` | idem | OK (app Stripe en double, voir §3) |
| iOS | clé App Store Connect : **absente** ; clé d'abonnement : **absente** | configurées | BLOQUANT |
| Android | compte de service Play : **absent** | configuré | BLOQUANT |
| Produits iOS | `thrive_moments_mensuel` (`prod734fbcac62`), `thrive_moments_annuel` (`prod77eb9283a3`) | idem | OK côté RC |
| Produits Android | `thrive_moments:mensuel` (`prod6a0ee6d4d8`), `thrive_moments:annuel` (`prod7b54e71f7e`) | base plans `mensuel`/`annuel` | OK côté RC (format sujet:base plan) |
| Produits Web | `price_1UKkdy…` (`prod3a125ffe2a`), `price_1UKke2…` (`prod939e97a118`) | prix Stripe de `monetisation-hybride.md` | OK |
| Produits Test Store | `thrive_moments_mensuel` (`prod1d72131cdc`), `thrive_moments_annuel` (`prode0ec4b10d8`) | aucun en prod | À ÉCARTER (§3) |
| Entitlement `thrive_moments` (`entl6c9fca6b2a`) | actif, 8 produits : iOS×2, Android×2, Web×2, Test Store×2 | iOS×2, Android×2, Web×2 | Test Store en trop |
| Entitlement `thrive_sport_positive_pro` | inactif, produits démo | à archiver | déjà inactif |
| Offering `principal` (`ofrngaffd492c34`) | actif, `is_current=true`, paywall null | idem | OK |
| Offering `default` (`ofrng148c3974fc`) | inactif | archivé | déjà inactif |
| Package `$rc_monthly` (`pkge4c79420198`) | `position: 1` ; produits Test Store + Web + Android + iOS | position 0 | ÉCART position |
| Package `$rc_annual` (`pkge432017778f`) | `position: 1` ; produits iOS + Android + Web + Test Store | position 1 | Les deux packages ont position 1 : à corriger |
| Produits démo `monthly`, `yearly`, `lifetime` | inactifs | archivés | déjà inactifs |
| Webhook `whintgr2447da83d9` | URL `https://kkdcgzvdmipmrgkawnky.supabase.co/functions/v1/revenuecat-webhook`, environnement null, événements null (tous), app null (toutes) | idem | URL OK ; en-tête Authorization à vérifier dans le dashboard |
| Stripe `acct_1Tl50KGSblkODz4J` | lié à `app47af3332e6` et `appa704c361ff` | un seul lien utile | doublon |

Note Web : le code et la doc attendent une clé publique Stripe `strp_…` (prod). Non vérifiable ici : la clé publique Stripe est lue par `list-app-public-api-keys` (non appelé dans ce passage, à faire si besoin).

## 2. Écarts avec le code

- `apps/mobile/src/components/subscription/Paywall.tsx` lit `offering.monthly` / `offering.annual` (SDK : `$rc_monthly` / `$rc_annual`). Compatible, mais les deux packages doivent avoir des produits pour chaque plateforme ; sans clé iOS/Android, l'offre ne se charge pas sur ces stores.
- `supabase/functions/_shared/billing_core.ts` attend `thrive_moments_mensuel` / `thrive_moments_annuel` comme identifiants. Côté Android, RC stocke `thrive_moments:mensuel` ; le mappage doit gérer le format `sujet:base plan`. Test à faire dans `billing_core.test.ts` (déjà présent avec `thrive_moments:mensuel`).
- `billing_core.test.ts` et `billing_lifecycle.test.ts` mentionnent `thrive_moments_lifetime` : produit absent de RC pour P3. Vérifier qu'il ne s'applique à aucun chemin en prod.
- Prix affichés (32,50 $ CAD / mois, 299 $ CAD / an, essai 1 mois) : non comparés ici aux produits (les prix sont dans les stores / Stripe, non lus).

## 3. Actions proposées (au feu vert uniquement)

Ordre d'exécution. Chaque action : outil exact, effet, vérification, retour arrière.

1. **Corriger la position du package `$rc_monthly`** : outil `update-package`-équivalent non présent dans la liste lue ; le plus proche : `update-offering` (ou dashboard si l'outil ne permet pas de changer la position). Effet : position 0. Vérif : `list-packages` offering `ofrngaffd492c34`, `$rc_monthly` position 0 et `$rc_annual` position 1. Retour : remettre l'ancienne valeur.
2. **Retirer les produits Test Store de l'entitlement et des packages** : `detach-products-from-package` (package `pkge4c79420198`, produit `prod1d72131cdc`) puis (package `pkge432017778f`, produit `prode0ec4b10d8`), puis `detach-products-from-entitlement` (entitlement `entl6c9fca6b2a`, produits `prod1d72131cdc`, `prode0ec4b10d8`). Effet : seuls iOS/Android/Web restent. Vérif : `get-products-from-entitlement` = 6 produits. Retour : `attach-products-to-package` / `attach-products-to-entitlement` avec les mêmes IDs. Pré-requis : confirmer que la Test Store n'est pas utilisée pour les tests de l'app (sinon garder en sandbox séparé).
3. **Archiver les produits Test Store `thrive_moments_*`** (`prod1d72131cdc`, `prode0ec4b10d8`) après l'étape 2 : `archive-product`. Vérif : `get-product` state `inactive`. Retour : `unarchive-product`.
4. **Archiver l'app Stripe en double `app47af3332e6`** seulement si aucun produit ni abonnement ne l'utilise (aucun produit dans `list-products` n'a `app_id` = `app47af3332e6` : condition remplie). Outil : pas d'outil d'archivage d'app dans la liste ; passer par le dashboard RC (Apps › supprimer) ou `update-app` si applicable. Vérif : `list-apps` ne la renvoie plus. Retour : recréer l'app Stripe liée au compte `acct_1Tl50KGSblkODz4J`.
5. **Déjà fait, rien à faire** : `default` inactif, produits démo inactifs, `thrive_sport_positive_pro` inactif.
6. **Paywall RevenueCat** : non requis (paywall dans le code). Ne rien créer.
7. **Webhook** : pas d'écriture. Vérifier dans le dashboard que l'en-tête `Authorization` correspond à `REVENUECAT_WEBHOOK_AUTH` (secret Supabase). Si on doit le changer : `update-webhook-integration` (retour : ancienne valeur, qui n'est pas relisible, donc noter la valeur avant).

## 4. Points bloquants avant publication

- Clé App Store Connect + clé d'abonnement iOS (propriétaire, voir `docs/actions-proprietaire.md`).
- Compte de service Google Play (propriétaire).
- Test de bout en bout sur sandbox iOS et Android avant d'ouvrir les paywalls.

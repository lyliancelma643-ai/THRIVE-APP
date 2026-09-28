# Monétisation hybride — P3 « Le moment qui compte »

Un seul droit d'accès, trois façons de payer :

| Canal | Paiement | Gestion / annulation |
|---|---|---|
| Web (app.thrivesportpositive.com) | Stripe Checkout | Portail client Stripe |
| iPhone | App Store (SDK RevenueCat) | Réglages iOS › Abonnements |
| Android | Google Play (SDK RevenueCat) | Google Play › Abonnements |

**Règle n° 1 — App User ID = `auth.users.id` (Supabase), partout.**
Web : `client_reference_id` + `metadata.app_user_id` de la session Checkout et de l'abonnement.
Mobile : `Purchases.logIn(user.id)` à la connexion, `Purchases.logOut()` à la déconnexion
(`apps/mobile/src/hooks/useRevenueCatIdentity.ts`, branché sur la session Supabase).

## Identifiants

| Élément | Valeur |
|---|---|
| Entitlement RevenueCat | `thrive_moments` |
| Offering courant | `principal` — packages `$rc_monthly`, `$rc_annual` |
| Prix | 32,50 $ CAD / mois · 299 $ CAD / an · essai 1 mois (une fois par compte) |
| Stripe — produits | `prod_VLRWz0fbMvfyEO` (mensuel), `prod_VLRX6Of4uUnMEp` (annuel) |
| Stripe — prix (lookup_key) | `thrive_moments_mensuel` (`price_1UKkdyGSblkODz4JL0LGaNfb`), `thrive_moments_annuel` (`price_1UKke2GSblkODz4JlxWvvRmJ`) — `tax_behavior=inclusive` |
| Stripe — portail client | `bpc_1UKkeIGSblkODz4JawaOyyEd` (par défaut) : annulation fin de période, carte, factures, mensuel ↔ annuel |
| Stripe — webhook | `we_1UKklbGSblkODz4Jro24Yaam` → `/functions/v1/stripe-webhook` |
| RevenueCat — apps | Web Stripe `appa704c361ff` · iOS `appc8563a624d` (`app.thrive.mobile`) · Android `app7a6cc384b4` (`app.thrive.mobile`) · Test Store `appece1a9b826` |
| Produits iOS | `thrive_moments_mensuel`, `thrive_moments_annuel` (groupe d'abonnement unique) |
| Produits Android | abonnement `thrive_moments`, base plans `mensuel` et `annuel` |
| RevenueCat — webhook | `whintgr2447da83d9` → `/functions/v1/revenuecat-webhook` |

## Flux

```
Web    : /parent/abonnement → create-checkout-session → Stripe Checkout
         → retour ?checkout=success&session_id → billing-sync
              (vérifie la session, POST RevenueCat /v1/receipts, relit RevenueCat)
         → billing_subscriptions (miroir) → access_state().p3_access → Maison
Stripe : stripe-webhook (checkout, abonnement, factures) → RevenueCat → miroir
Mobile : Paywall (offering RevenueCat) → achat App Store / Google Play
         → RevenueCat → revenuecat-webhook → miroir (le web voit l'abonnement)
```

RevenueCat est la **source de vérité**. `billing_subscriptions` n'en est que le
miroir, écrit uniquement par le service role ; la RLS des tables `p3_*` s'appuie
dessus (`private.parent_p3_access`).

## Secrets des edge functions (Supabase › Edge Functions › Secrets)

| Secret | Où le trouver |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe › Développeurs › Clés API (clé restreinte conseillée : Checkout, Customers, Prices, Billing Portal, Subscriptions en écriture/lecture) |
| `STRIPE_WEBHOOK_SECRET` | Stripe › Développeurs › Webhooks › endpoint `stripe-webhook` › Clé de signature |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat › Project settings › API keys › clé secrète **v1** (`sk_…`) |
| `REVENUECAT_STRIPE_PUBLIC_KEY` | RevenueCat › app « THRIVE Web (Stripe) » › clé publique (`strp_…`) |
| `REVENUECAT_WEBHOOK_AUTH` | Valeur aléatoire choisie par vous, recopiée dans RevenueCat › Integrations › Webhooks › Authorization header |
| `APP_ORIGINS` | `https://app.thrivesportpositive.com` (+ `http://localhost:3001` en dev) |

Mobile (`.env`, clés **publiques**) : `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` (`appl_…`),
`EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` (`goog_…`), `EXPO_PUBLIC_TERMS_URL`,
`EXPO_PUBLIC_PRIVACY_URL`.

## Règles stores (à ne jamais casser)

- **Anti-steering** : l'app mobile ne contient AUCUN texte, bouton ou lien vers un
  paiement web. Un abonnement pris ailleurs est seulement reconnu (accès ouvert)
  avec un message neutre, sans lien.
- **Restaurer les achats** : sur le paywall et dans les paramètres (`Purchases.restorePurchases()`).
- **Gérer mon abonnement** : uniquement si l'achat vient du store de ce téléphone
  (`Purchases.showManageSubscriptions()`).
- Paywall : prix, période, essai, renouvellement automatique, conditions et
  politique de confidentialité visibles (exigences Apple 3.1.2).

## Tester

1. **Web, sans vraie carte** : un Sandbox Stripe + une app Stripe « sandbox » dans
   RevenueCat, puis `STRIPE_SECRET_KEY=sk_test_…` et le webhook du sandbox sur un
   projet Supabase de préproduction. Carte `4242 4242 4242 4242`.
   Scénarios : abonnement (essai) → accès Maison ; portail → annulation →
   « sans renouvellement » ; fin d'essai / expiration (Stripe Test Clocks) → Maison
   se referme ; second essai refusé ; abonné App Store qui ouvre le web → accès
   reconnu, pas de bouton Stripe.
2. **Mobile** : development build (EAS) — le Test Store RevenueCat (`test_…`) simule
   les achats ; puis Sandbox Apple / testeurs de licence Google Play.
3. **Tests automatisés** :
   - `deno test supabase/functions/_shared/billing_core.test.ts supabase/functions/stripe-webhook/verify.test.ts`
   - `cd apps/web && npx vitest run` (dont `src/lib/billing.test.ts`)
   - `cd apps/web && npx vitest run --root ../mobile src/services`

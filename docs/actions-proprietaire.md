# Actions propriétaire — facturation P3 (RevenueCat, App Store, Play, Stripe)

Ce que seul Lylian peut faire. Une étape à la fois. Les identifiants ci-dessous doivent être exacts.

## 1. App Store Connect (iPhone)

1. Ouvrir App Store Connect › Utilisateurs et accès › Clés › **In-App Purchase** : créer une clé.
2. Noter : **Issuer ID**, **Key ID**, et télécharger le fichier `.p8` (une seule fois).
3. Ouvrir la même page de clés, onglet « Clés d'abonnement » (Subscription key, notifications serveur) : créer ou réutiliser la clé.
4. Créer le groupe d'abonnements et les produits avec **ces identifiants exacts** :
   - `thrive_moments_mensuel` (mensuel)
   - `thrive_moments_annuel` (annuel)
   Prix : 32,50 $ CAD / mois, 299 $ CAD / an, essai 1 mois (une fois par compte).
5. Dans RevenueCat › app iOS (`appc8563a624d`) : coller Issuer ID, Key ID, fichier `.p8`, et la clé d'abonnement. Ne pas les envoyer par chat.
6. Dans RevenueCat, copier la clé publique iOS (`appl_…`) vers le `.env` mobile : `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`.

## 2. Google Play (Android)

1. Play Console › Configuration › Accès à l'API : créer ou lier un compte de service Google Cloud.
2. Donner au compte de service les droits financiers (voir l'aide Play sur les rôles pour RevenueCat).
3. Télécharger la clé JSON du compte de service (la garder privée, ne pas la coller dans le chat).
4. Dans RevenueCat › app Android (`app7a6cc384b4`) : téléverser le JSON du compte de service.
5. Play Console › Produits d'abonnement : créer l'abonnement **`thrive_moments`** avec deux base plans :
   - `mensuel` (mensuel)
   - `annuel` (annuel)
   Mêmes prix que iOS.
6. Activer les notifications temps réel Play (Pub/Sub) et pointer vers RevenueCat si demandé par le guide RevenueCat.
7. Copier la clé publique Android (`goog_…`) vers `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`.

## 3. Stripe (web)

1. Stripe, mode **live** : vérifier que le webhook `we_1UKklbGSblkODz4Jro24Yaam` (vers `/functions/v1/stripe-webhook`) est actif, sans échecs récents.
2. Vérifier les prix `thrive_moments_mensuel` et `thrive_moments_annuel` (lookup keys, TTC).
3. Clé restreinte `rk_live_…` : confirmer les droits listés dans `docs/monetisation-hybride.md` (Checkout, Customers, Prices, Products, Customer portal, Subscriptions).

## 4. Vérifications finales (vous)

- Supabase : secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_STRIPE_PUBLIC_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `APP_ORIGINS` présents.
- RevenueCat › Integrations › Webhooks : l'en-tête Authorization correspond à `REVENUECAT_WEBHOOK_AUTH`.
- Vercel (web) : `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_PRIVACY_URL` posés.
- Mobile `.env` : `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` posés (sans eux, le paywall n'affiche rien).

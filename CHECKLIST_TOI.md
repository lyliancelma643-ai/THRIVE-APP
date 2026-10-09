# CHECKLIST_TOI : actions humaines, dans l'ordre d'exécution

Ces actions ne peuvent pas être faites par Claude : elles demandent tes comptes, tes banques, tes consoles et tes décisions.
Ordre : coche chaque case quand l'action est faite et vérifiée. Ne saute pas l'ordre : plusieurs étapes en dépendent.
Référence des identifiants (P0-x, P1-x, P2-x) : `docs/release/AUDIT_360.md`.

## Store et paiements

- [ ] **1. P0-11 Apple : signer le contrat « Paid Applications », banque et fiscalité.**
  Console : App Store Connect › Accords, fiscalité et opérations bancaires.

- [ ] **2. P1-1 Apple Small Business Program : s'inscrire AVANT la première vente** (15 % au lieu de 30 %).
  Console : developer.apple.com/app-store/small-business-program.

- [ ] **3. P0-10 Google Play : vérifier le type et la date du compte.**
  Si le compte est personnel et a été créé après le 13/11/2023, lancer un test fermé avec 12 testeurs pendant 14 jours avant la production.
  Compléter ensuite : vérification d'identité, Data safety, classification IARC, déclaration santé, public cible 18 ans et plus.
  Console : Play Console › Contenu de l'appli.

- [ ] **4. P1-2 Google : inscrire le palier 15 % (groupe de comptes).**
  Console : Play Console › Paramètres › Programme de frais de service.

- [ ] **5. P0-3 Produits d'abonnement.**
  iOS : créer `thrive_moments_mensuel` et `thrive_moments_annuel` dans un seul groupe d'abonnement.
  Play : créer l'abonnement `thrive_moments` avec les forfaits de base `mensuel` et `annuel`.
  Essai gratuit d'un mois sur les deux stores (art. 4 des conditions).
  Joindre les achats intégrés à la PREMIÈRE version soumise.
  Console : App Store Connect › App › Abonnements ; Play Console › Monétiser › Abonnements.

- [ ] **6. P1-4 Périodes de grâce.**
  Apple : Billing Grace Period de 16 jours.
  Console : App Store Connect › App › Abonnements.
  Google : période de grâce et suspension de compte.
  Console : Play Console › Monétiser › Abonnements.

## RevenueCat

- [ ] **7. P0-1 RevenueCat iOS : créer la clé API App Store Connect et la clé In-App Purchase (.p8), noter le vendor number.**
  Console : App Store Connect › Utilisateurs et accès › Intégrations, puis RevenueCat › THRIVE iOS.

- [ ] **8. P0-2 RevenueCat Android : compte de service Google Cloud.**
  Inviter le compte dans la Play Console (droits finances et commandes), charger le JSON dans RevenueCat, activer les notifications temps réel (Pub/Sub).
  Console : Google Cloud › IAM ; Play Console › Accès aux API / Utilisateurs ; RevenueCat › Apps › THRIVE Android.

- [ ] **9. P1-14 Signature HMAC du webhook RevenueCat.**
  Activer la signature sur l'intégration webhook, puis poser le secret correspondant dans les secrets Supabase Edge Functions.
  Nom du secret : `REVENUECAT_WEBHOOK_HMAC_SECRET` (affiché une seule fois par RevenueCat). Tant qu'il est absent, la vérification HMAC est sautée (fail-open volontaire). L'en-tête secret existant reste `REVENUECAT_WEBHOOK_AUTH` et ne doit pas être retiré.
  Console : RevenueCat › Integrations › Webhooks ; Supabase › Edge Functions › Secrets (projet THRIVE-CA, kkdcgzvdmipmrgkawnky).

- [ ] **10. P1-3 Fiscalité.**
  TPS/TVQ : Apple et Google perçoivent sur les achats intégrés ; Stripe web passe par Stripe Tax.
  Formulaire W-8BEN ou W-8BEN-E selon l'entité.
  À valider avec le comptable.
  Console : App Store Connect › Accords, fiscalité ; Play Console › Paiements ; Stripe › Tax.

## Supabase (projet THRIVE-CA kkdcgzvdmipmrgkawnky)

- [ ] **11. P1-6 Protection des mots de passe compromis.**
  Console : Supabase › Auth › Password security.

- [ ] **12. P1-12 Confirmation par e-mail.**
  Vérifier que « Confirm email » est activé et que le lien ramène bien dans l'app.
  Console : Supabase › Auth › Sign In / Providers › Email, puis Auth › URL Configuration.

- [ ] **13. Migrations prod 076, 077, 078, 079** (fichiers `supabase/migrations/20261009_07*.sql`).
  Décider l'interrupteur `accept_sandbox_purchases` de la migration 076 (P0-4) : `false` par défaut.
  **Avant la 079** : vérifier quelle valeur de `deletion_requests.status` signifie « traitée » en prod (`select status, count(*) from deletion_requests group by status;`). Le code de `process-due-deletions` écrit `'COMPLETED'` (constante dans `claim`, non vérifiée) : l'ajuster si ta valeur diffère.
  Secrets de la 079 : Vault `deletions_cron_secret` (≥ 16 caractères ; `edge_functions_url` existe déjà depuis la 047) et secret Edge Function `DELETIONS_CRON_SECRET` avec **la même valeur**.
  Interrupteur 076 : le passer à `true` seulement pendant les revues stores, puis le remettre à `false` (sinon tout testeur TestFlight débloque Maison).
  Après chaque migration RLS : exécuter `supabase/tests/audit_rls_simulation.sql`.
  Console : Supabase › SQL Editor (ou `supabase db push` après contrôle).

- [ ] **14. Redéployer les Edge Functions modifiées** : `revenuecat-webhook`, `billing-sync`, `request-account-deletion`, `export-my-data`, `send-push-notification`, `process-due-deletions`.
  `process-due-deletions` se déploie avec `--no-verify-jwt` (déjà déclaré dans `supabase/config.toml`).
  Console : Supabase › Edge Functions, ou CLI `supabase functions deploy <nom>`.

- [ ] **15. P0-5 Comptes de revue.**
  Exécuter `supabase/seed/review_accounts.sql` avec un vrai mot de passe.
  Créer `parent-abonnement@thrivesportpositive.com` (confirmé).
  Contrôle : requête S5 (3 lignes confirmées).
  Console : Supabase › SQL Editor ; Supabase › Authentication › Users › Add user.

## Build mobile (EAS)

- [ ] **16. P0-6 EAS.**
  Lancer `eas init` dans `apps/mobile`, puis compléter `projectId`, `ascAppId`, `appleTeamId` dans la configuration.
  Poser dans l'environnement EAS « production » : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`, `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_URL`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_SENTRY_DSN` (et `EXPO_PUBLIC_APP_ENV`, optionnelle).
  Placeholders à remplacer : `extra.eas.projectId` (`apps/mobile/app.json`), `ascAppId` et `appleTeamId` (`apps/mobile/eas.json`).
  Console : expo.dev › projet › Environment variables.

- [ ] **17. P1-10 et valeurs du §0 manquantes.**
  Fournir `APPLE_TEAM_ID` (Apple Developer › Membership) et `ANDROID_SHA256_PLAY_SIGNING` (Play Console › Intégrité de l'appli › Signature d'applications).
  Ces valeurs remplacent les `[À COMPLÉTER]` dans `apps/web/public/.well-known/` et dans la config mobile.

## Déploiement web

- [ ] **18. Redéployer le web.**
  Merger `release/go2` dans `main` ; Vercel projet « thrive-app » déploie automatiquement vers app.thrivesportpositive.com. Vérifier ensuite les pages légales.
  Console : GitHub (pull request) ; Vercel › thrive-app › Deployments.

## Builds et tests de bout en bout

- [ ] **19. Build EAS production, puis envoi vers TestFlight et la piste interne Play.**
  Faire le parcours complet à la main sur iPhone et sur Android, y compris en mode avion.
  Console : expo.dev › Builds ; App Store Connect › TestFlight ; Play Console › Test interne.

- [ ] **20. P0-9 Test d'achat, EN DERNIER.**
  Un achat sandbox iOS (TestFlight) et un achat test Android (piste interne).
  Vérifier : webhook reçu, puis `access_state().p3_access = true` dans Supabase.
  Puis annuler, attendre l'expiration, et vérifier le reverrouillage.
  Console : RevenueCat › Customers ; Supabase › SQL Editor.

## Notes de revue

- [ ] **21. Coller les notes de revue dans les consoles** (mots de passe dans les champs sécurisés).
  Apple : `docs/store/notes-revue-apple.md` dans App Store Connect › App Review Information.
  Google : `docs/store/notes-revue-play.md` dans Play Console › Contenu de l'appli.
  Note : `notes-revue-play.md` n'existe pas encore dans `docs/store/` ; à créer ou à demander avant ce collage.

---

## Confort (P2, non bloquant)

- [ ] **P2-4 RevenueCat.** Supprimer l'app Stripe en double vide ; archiver l'offering `default` ; mettre les packages en positions 1 et 2.
  Console : RevenueCat › Apps ; RevenueCat › Offerings.

- [ ] **P2-5 Base de données.** Déplacer l'extension `pg_net` hors du schéma `public`.
  Console : Supabase › SQL Editor (cosmétique, sans urgence).

- [ ] **P2-8 Observabilité RevenueCat.** Brancher les événements RevenueCat sur un tableau de bord.
  Console : RevenueCat › Integrations.

- [ ] **P2-1 Paywall.** Ajouter l'essai gratuit dans le titre, une preuve sociale, et un test A/B RevenueCat sur le prix annuel.
  Console : RevenueCat › Paywalls ; RevenueCat › Experiments.

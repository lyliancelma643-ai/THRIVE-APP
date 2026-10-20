# CHECKLIST_TOI : actions humaines, dans l'ordre d'exécution

Ces actions ne peuvent pas être faites par Claude : elles demandent tes comptes, tes banques, tes consoles et tes décisions.
Coche chaque case quand l'action est faite et vérifiée. Ne saute pas l'ordre : chaque phase dépend de la précédente.
Identifiants (P0-x, P1-x, P2-x) : `docs/release/AUDIT_360.md`. Durées = estimation de ton temps actif (hors délais d'attente des stores).
Projet Supabase de prod : THRIVE-CA (`kkdcgzvdmipmrgkawnky`). Ne colle jamais un secret dans un fichier du dépôt ni dans un chat.

> **Ce qui bloque la soumission**
> 1. Contrat « Paid Applications » Apple non signé (étape 1) : aucun produit d'abonnement possible.
> 2. Produits d'abonnement non créés, ou non joints à la première version (étape 5).
> 3. Clés RevenueCat iOS/Android absentes : aucun achat ne débloquerait l'accès (étapes 8 et 9).
> 4. Migrations 076 à 079 et comptes de revue non posés : les relecteurs ne peuvent pas se connecter (étapes 11 et 12).
> 5. Variables EAS, `projectId`, `ascAppId`, `appleTeamId` non renseignés : pas de build de production (étapes 16 et 19). Test d'achat P0-9 à faire en dernier (étape 23).

## Phase 1. Comptes stores et contrats (aucune dépendance)

- [ ] **1. P0-11 Apple : signer le contrat « Paid Applications », renseigner banque et fiscalité.** (30 à 45 min, validation Apple : 1 à 3 jours)
  Console : App Store Connect › Accords, fiscalité et opérations bancaires.

- [ ] **2. P1-1 Apple Small Business Program : s'inscrire AVANT la première vente** (15 % au lieu de 30 %). (10 min)
  Console : developer.apple.com/app-store/small-business-program.

- [ ] **3. P0-10 Google Play : vérifier le type et la date du compte, puis compléter les déclarations.** (1 h)
  Si le compte est personnel et créé après le 13/11/2023 : test fermé avec 12 testeurs pendant 14 jours avant la production (à lancer le plus tôt possible, le délai est incompressible).
  Compléter : vérification d'identité, Data safety, classification IARC, déclaration santé, public cible 18 ans et plus.
  Console : Play Console › Contenu de l'appli.

- [ ] **4. P1-2 Google : inscrire le palier 15 % (groupe de comptes).** (10 min)
  Console : Play Console › Paramètres › Programme de frais de service.

- [ ] **5. P0-3 Produits d'abonnement (après l'étape 1 pour Apple).** (45 min)
  iOS : créer `thrive_moments_mensuel` et `thrive_moments_annuel` dans un seul groupe d'abonnement.
  Play : créer l'abonnement `thrive_moments` avec les forfaits de base `mensuel` et `annuel`.
  Essai gratuit d'un mois sur les deux stores (art. 4 des conditions).
  Joindre les achats intégrés à la PREMIÈRE version soumise.
  Console : App Store Connect › App › Abonnements ; Play Console › Monétiser › Produits › Abonnements.

- [ ] **6. P1-4 Périodes de grâce.** (10 min)
  Apple : Billing Grace Period de 16 jours (App Store Connect › App › Abonnements › Grace period).
  Google : activer la période de grâce et la suspension de compte (Play Console › Monétiser › Abonnements › forfait de base).

- [ ] **7. P1-3 Fiscalité.** (30 min, avec le comptable)
  TPS/TVQ : Apple et Google perçoivent sur les achats intégrés ; le web Stripe passe par Stripe Tax.
  Formulaire W-8BEN ou W-8BEN-E selon l'entité.
  Console : App Store Connect › Accords, fiscalité ; Play Console › Paiements ; Stripe › Tax.

## Phase 2. RevenueCat (après l'étape 5 : les produits doivent exister)

- [ ] **8. P0-1 RevenueCat iOS : clé API App Store Connect et clé In-App Purchase (.p8), noter le vendor number.** (20 min)
  Console : App Store Connect › Utilisateurs et accès › Intégrations ; puis RevenueCat › THRIVE iOS.

- [ ] **9. P0-2 RevenueCat Android : compte de service Google Cloud.** (40 min)
  Créer le compte de service, l'inviter dans la Play Console (droits finances et commandes), charger le JSON dans RevenueCat, activer les notifications temps réel (Pub/Sub).
  Console : Google Cloud › IAM ; Play Console › Utilisateurs et autorisations ; RevenueCat › Apps › THRIVE Android.

## Phase 3. Supabase (THRIVE-CA) : réglages, migrations, fonctions

- [ ] **10. Réglages Auth : mots de passe compromis (P1-6) et confirmation par e-mail (P1-12).** (10 min)
  Activer la protection contre les mots de passe compromis ; vérifier que « Confirm email » est activé et que le lien de confirmation ramène dans l'app.
  Console : Supabase › Authentication › Sign In / Providers › Email ; Authentication › URL Configuration.

- [ ] **11. Appliquer les migrations prod 076, 077, 078, 079** (`supabase/migrations/20261009_07*.sql`). (30 min)
  Avant la 079 : exécuter `select status, count(*) from deletion_requests group by status;` pour savoir quelle valeur signifie « traitée » en prod. Le code de `process-due-deletions` écrit `'COMPLETED'` (constante dans `claim`, non vérifiée) : l'ajuster si ta valeur diffère.
  Secrets de la 079 : Vault `deletions_cron_secret` (16 caractères ou plus ; `edge_functions_url` existe déjà depuis la 047) et secret Edge Function `DELETIONS_CRON_SECRET` avec la même valeur.
  Interrupteur `accept_sandbox_purchases` (076, P0-4) : laisser `false` ; le passer à `true` seulement pendant les revues stores, puis le remettre à `false`.
  Après chaque migration RLS : exécuter `supabase/tests/audit_rls_simulation.sql`.
  Console : Supabase › SQL Editor (ou `supabase db push` après contrôle).

- [ ] **12. P0-5 Comptes de revue.** (20 min)
  Exécuter `supabase/seed/review_accounts.sql` avec un vrai mot de passe (saisi seulement dans l'éditeur, jamais commité).
  Créer `parent-abonnement@thrivesportpositive.com` (confirmé).
  Console : Supabase › SQL Editor ; Authentication › Users › Add user.

- [ ] **13. Contrôle après migrations : requêtes S1, S2 et S5** de `supabase/tests/audit_inventaire_surveillance.sql`. (10 min)
  S1 (suppressions en retard) : attendu 0 ligne. S2 (abonnement actif mais expiré) : attendu 0 ligne. S5 (comptes de revue) : attendu 3 lignes avec `confirmed = true`.
  Console : Supabase › SQL Editor.

- [ ] **14. Redéployer les Edge Functions modifiées** (après les migrations) : `revenuecat-webhook`, `billing-sync`, `request-account-deletion`, `export-my-data`, `send-push-notification`, `process-due-deletions`. (15 min)
  `process-due-deletions` se déploie avec `--no-verify-jwt` (déjà déclaré dans `supabase/config.toml`).
  Console : CLI `supabase functions deploy <nom>`, ou Supabase › Edge Functions.

- [ ] **15. P1-14 Signature HMAC du webhook RevenueCat (après l'étape 14).** (15 min)
  Activer la signature sur l'intégration webhook RevenueCat, puis poser le secret `REVENUECAT_WEBHOOK_HMAC_SECRET` (affiché une seule fois) dans les secrets Supabase. Tant qu'il est absent, la vérification HMAC est sautée (fail-open volontaire). L'en-tête `REVENUECAT_WEBHOOK_AUTH` existant ne doit pas être retiré.
  Console : RevenueCat › Integrations › Webhooks ; Supabase › Edge Functions › Secrets.

## Phase 4. Valeurs d'identité, merge et déploiement web

- [ ] **16. P0-6 et P1-10 : EAS et identifiants (avant le merge).** (30 min)
  Lancer `eas init` dans `apps/mobile` ; noter `projectId`, `ascAppId`, `appleTeamId` (Apple Developer › Membership) et `ANDROID_SHA256_PLAY_SIGNING` (Play Console › Intégrité de l'appli › Signature d'applications).
  La config mobile est dynamique (`apps/mobile/app.config.ts`) : `eas init` ne peut pas écrire le `projectId` lui-même. Pose-le comme variable `EAS_PROJECT_ID` (environnement EAS « production » + `.env` local, modèle dans `apps/mobile/.env.example`).
  Remplacer ensuite `ascAppId` et `appleTeamId` dans `apps/mobile/eas.json`, et les `[À COMPLÉTER]` de `apps/web/public/.well-known/`.
  Le profil `development` a `developmentClient: true` mais `expo-dev-client` n'est pas installé : `npx expo install expo-dev-client` avant un build de dev (nécessaire pour lancer les flux Maestro).
  Console : expo.dev ; developer.apple.com ; Play Console.

- [ ] **17. Relire et merger `release/go2b` dans `main`.** (30 à 60 min)
  Relire la pull request (au minimum le diff des migrations et des Edge Functions), vérifier que la CI est verte, puis merger.
  Console : GitHub › Pull requests.

- [ ] **18. Vérifier le déploiement web.** (10 min)
  Vercel (projet « thrive-app ») déploie `main` vers app.thrivesportpositive.com. Contrôler que le déploiement est « Ready », puis ouvrir les pages légales (conditions, confidentialité, support) et `/.well-known/`.
  Console : Vercel › thrive-app › Deployments.

## Phase 5. Build, notes de revue, test d'achat

- [ ] **19. Variables d'environnement EAS « production » (après l'étape 18, les URL existent).** (15 min)
  Poser : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`, `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` (clés publiques du SDK RevenueCat), `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_URL`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_SENTRY_DSN` (et `EXPO_PUBLIC_APP_ENV`, optionnelle).
  Console : expo.dev › projet › Environment variables.

- [ ] **20. Build EAS production, puis envoi vers TestFlight et la piste interne Play.** (1 h, plus la file de build)
  Console : expo.dev › Builds ; App Store Connect › TestFlight ; Play Console › Tests › Test interne.

- [ ] **21. Parcours complet à la main** sur iPhone et sur Android, y compris en mode avion. (1 h)

- [ ] **22. Coller les notes de revue dans les consoles** (mots de passe dans les champs sécurisés prévus). (15 min)
  Apple : `docs/store/notes-revue-apple.md` dans App Store Connect › App › App Review Information.
  Google : `docs/store/notes-revue-play.md` dans Play Console › Contenu de l'appli › Accès à l'appli.
  Rappel : passer `accept_sandbox_purchases` à `true` pendant la revue, puis à `false` après.

- [ ] **23. P0-9 Test d'achat, EN DERNIER.** (1 h, plus l'attente d'expiration sandbox)
  Un achat sandbox iOS (TestFlight) et un achat test Android (piste interne).
  Vérifier : webhook reçu, puis `access_state().p3_access = true` dans Supabase.
  Puis annuler, attendre l'expiration, vérifier le reverrouillage ; relancer S2 : attendu 0 ligne.
  Console : RevenueCat › Customers ; Supabase › SQL Editor.

---

## Confort (P2, non bloquant, après la soumission)

- [ ] **P2-4 RevenueCat.** Supprimer l'app Stripe en double vide ; archiver l'offering `default` ; mettre les packages en positions 1 et 2. (15 min)
  Console : RevenueCat › Apps ; RevenueCat › Offerings.

- [ ] **P2-5 Base de données.** Déplacer l'extension `pg_net` hors du schéma `public` (cosmétique). (10 min)
  Console : Supabase › SQL Editor.

- [ ] **P2-8 Observabilité RevenueCat.** Brancher les événements RevenueCat sur un tableau de bord. (20 min)
  Console : RevenueCat › Integrations.

- [ ] **P2-1 Paywall.** Ajouter l'essai gratuit dans le titre, une preuve sociale, et un test A/B sur le prix annuel. (1 h)
  Console : RevenueCat › Paywalls ; RevenueCat › Experiments.

---

## GO 3 : UI iOS 27 et paiements (2026-10-12)

Rapport complet : `docs/release/GO3_RAPPORT.md`. Rien n'est appliqué en prod ni poussé à ce stade.

### Décisions à trancher

- [ ] **R1. Drapeau programmes iOS.** `EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP` reste `false` en production pour la 1re soumission. Décider si et quand l'activer (Apple 3.1.3(e) et (d), voir `GO3_G1_REVUE.md` §3).
- [ ] **R3. Règle de remboursement de la garantie** (part de 2/13, ou versement 1 entier). Aujourd'hui : montant libre saisi par l'admin.
- [ ] **R4. Prélèvement automatique du versement 2.** `PROGRAM_AUTOCHARGE_ENABLED=false` ; l'activer quand le parcours est rodé.
- [ ] **R5. Style par défaut de l'app.** Proposé : `natif`. À confirmer.
- [ ] **R6. Maison comme page d'arrivée parent.** Proposé : oui (`dashboard` conservé, masqué). À confirmer.
- [ ] **R7. Web.** Hors périmètre visuel de GO 3 (Nuit calme / Jour clair inchangés). Dire si le web doit suivre le nouveau UI dans un chantier séparé.
- [ ] **R9. Prix de la visio Individuel, créneaux d'appel réels, agenda du coach.** À fournir.
- [ ] **Paywall « 0 $ ».** Réduire la mise en avant du « 0 $ » si App Review le demande (Apple 3.1.2).
- [ ] **Lot séparé `profiles_update_own`** (G1 #6) : révoquer l'UPDATE global et n'accorder que les colonnes utiles. Non bloquant pour GO 3.

### Base de données et fonctions (THRIVE-CA)

- [ ] **Appliquer 081, 082, 083** (`supabase/migrations/20261012_08*.sql`) : d'abord en préproduction, puis en production, après relecture. Vérifier `get_advisors` (0 erreur attendue). Rollbacks disponibles dans `supabase/rollbacks/`.
- [ ] **Déployer les edge functions** : `create-program-checkout`, `program-installment-charge`, `admin-refund-program-payment`, `admin-create-program-link`, `request-intro-call`, et `stripe-webhook` (`verify_jwt = false`, inchangé).
- [ ] **Secret `PROGRAM_CRON_SECRET`** (16 caractères ou plus), puis planifier un appel de `program-installment-charge` (pg_cron + pg_net, comme la 079) avec l'en-tête `x-cron-secret`.
- [ ] **Secrets Supabase** : `PROGRAM_AUTOCHARGE_ENABLED=false`, `STRIPE_TAX_ENABLED=false` (passer à `true` seulement après l'inscription TPS/TVQ), `APP_ORIGINS` (retours vers `/parent/programme/{pack}`). Ne jamais coller une valeur dans un fichier du dépôt.

### Stripe

- [ ] **Reconnecter le connecteur Stripe** dans Claude (Réglages › Connecteurs) avant la vague 3. Sinon lancer soi-même `node scripts/ops/stripe-setup-programmes.mjs --mode test` (dry-run par défaut), puis `--mode test --apply` avec `STRIPE_SECRET_KEY_TEST` dans le terminal seulement.
- [ ] **Inscription TPS/TVQ** (Revenu Québec), puis activer Stripe Tax. Liens confidentialité et conditions du portail client.
- [ ] **Webhook** `we_1UKklbGSblkODz4Jro24Yaam` (vers `/functions/v1/stripe-webhook`) : **ajouter** les événements `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` (`checkout.session.completed` y est déjà). Même secret de signature.
- [ ] **Clé restreinte** (si utilisée) : écriture sur Checkout Sessions, PaymentIntents, Refunds, Customers ; lecture sur Prices.

### RevenueCat

- [ ] **Réordonner l'offering principal** : Annuel avant Mensuel (`GO3_O3_REVENUECAT.md` §2 : glisser Annuel au-dessus de Mensuel, Save, puis vérifier `$rc_annual` en position 0). Retour arrière possible.
- [ ] **Clés RevenueCat iOS et Android** : voir les étapes 8 et 9 ci-dessus. Sans elles, l'essai et les achats ne sont pas lisibles (NON_VÉRIFIÉ).

### Stores

- [ ] **App Store Connect / Play Console** : produits `thrive_moments_mensuel` et `thrive_moments_annuel` (prix CAD), offre d'introduction d'un mois, localisations FR et EN. Notes de revue : mentionner que les programmes sont des services en personne (voir étape 22).

### Tests manuels (simulateur et Stripe test)

- [ ] **Parcours complet sur simulateur iOS dans les trois styles** (natif, nuit, carnet).
- [ ] **Achat Maison en Sandbox Apple.**
- [ ] **Checkout Stripe test** (carte `4242 4242 4242 4242`) : versement 1, puis versement 2 (Test Clocks).
- [ ] **Remboursement admin** partiel puis total, `audit_logs` vérifié.
- [ ] **Abonné App Store qui ouvre le web** : aucun lien de paiement vers un prix.

## GO 4 : Lin et Veillée (UI finale, branche locale `feature/ios27-lin-veillee`)

Rapport complet : `docs/release/GO4_RAPPORT.md`. Rien n'est poussé ni appliqué en prod. La branche est locale et non poussée.

### Base de données

- [ ] **Appliquer la migration 083 modifiée** (`supabase/migrations/20261012_083_ui_style.sql`, commit `a51f52b`), **en même temps que 081 et 082** (GO 3), seulement après validation du rapport et relecture. Contrôler `get_advisors` (0 erreur attendue). Rollback : `supabase/rollbacks/20261012_083_ui_style_rollback.sql`.

### Décisions à trancher

- [ ] **R5. Style par défaut `lin`** (décidé seul). Confirmer, ou choisir `veillee`.
- [ ] **R11. Anciennes valeurs normalisées** (`natif` et `carnet` vers `lin`, `nuit` vers `veillee`). Confirmer.
- [ ] **R12. Fraunces sans axe SOFT, textures en tuiles PNG.** Accepter l'écart, après avoir jugé sur simulateur.
- [ ] **R13. Design system artifact « THRIVE iOS 27 » périmé.** `final.css` fait foi. Demander la mise à jour de l'artifact si utile.
- [ ] **D1. Invitation Offres de K3** (« Envie d'aller plus loin ? ») : la limiter à Veillée ou l'afficher dans les deux styles. Recommandation : les deux (supprimer la condition `styleKey` dans `apps/mobile/src/components/maison/models.ts:88-90`).
- [ ] **D2. Libellé X2** « Programme réglé par Stripe · aucun abonnement séparé ». Recommandation : garder, ou écrire « Inclus avec ton programme · aucun abonnement séparé » pour un risque nul en revue Apple.
- [ ] **D3. Lettre scellée puis « Non »** au moment de quitter. Recommandation : garder, et ajouter « Ta lettre reste scellée » sous le titre de M17.
- [ ] **D4. Lettre du Bilan (G9)** : le mobile ne montre jamais le texte, le web oui. Recommandation : garder le mobile, aligner le web plus tard. Décider si la lettre se descelle après 12 mois (aucune date n'est stockée).
- [ ] **D5. Règle « un seul soleil »** sur V (points non lus) et G en Veillée (marques d'état). Recommandation : accepter, comme sur la maquette, et corriger le commentaire de `apps/mobile/src/components/bilan/BilanCards.tsx:17`.
- [ ] **Décider `expo-keep-awake`.** Absent : l'écran peut se mettre en veille pendant le minuteur du mode activité. Ajouter la dépendance (écran allumé pendant le minuteur), ou accepter le risque. La vibration remplace le bip (expo-haptics).
- [x] **Capture trop lourde** : `docs/release/go4-captures/L3-K2-lin-long.png` recompressée (359 Ko).

### Tests manuels (simulateur iOS)

- [ ] **Parcours complet sur simulateur iOS en Lin**, puis en Veillée : arrivée, Maison, mode activité, Bilan, Mes séances, messages, Offres, Compte.
- [ ] **Mode activité en Lin** : il doit rester sur le fond marine (Veillée).
- [ ] **Bascule Lin et Veillée à chaud** (sans relancer l'app).
- [ ] **Réduire la transparence et Réduire les animations** (Réglages › Accessibilité).
- [ ] **Dynamic Type** à la taille la plus grande.
- [ ] **VoiceOver sur la barre d'onglets** : l'onglet central s'annonce « Coach » en Lin, « Ce soir » en Veillée.
- [ ] **Mode activité hors ligne** : si l'enregistrement échoue, « Réessayer » et « Quitter sans enregistrer » doivent être visibles et fonctionner.

### Pousser la branche

- [ ] **Pousser `feature/ios27-lin-veillee`** seulement quand les décisions ci-dessus sont prises, la capture corrigée, et la migration 083 traitée avec le GO 3. Cette branche part de `feature/ios27-ui-paiements` : pousser les deux dans le bon ordre.

---

## GO 5 : finition Lin et Veillée (2026-10-20)

Détail : `docs/release/GO5_RAPPORT.md`. Branche `feature/ios27-lin-veillee` (tête `6dc5cf8`), non poussée.

- [ ] **Fusion dans `main` non faite** (refusée par le classifieur de permissions). Si tu la valides : `git merge --no-ff feature/ios27-lin-veillee -m "feat: nouvelle interface Lin et Veillée (GO 3 à GO 5)"` depuis le dépôt principal, puis `git tag -a ui-lin-veillee-fusion -m "Fusion de la nouvelle interface Lin et Veillée"`.
- [ ] Archive déjà créée : `archive/ui-avant-ios27` et tag `ui-avant-ios27` sur `3af7908`.
- [ ] Décider la photo du passeport : enregistrée dès le choix (mobile) ou à « Enregistrer » (web). Recommandation : aligner sur le web.
- [ ] Faire valider `PAGE_CONSULTER` (statut `A_VALIDER`) par un·e psychologue avant la mise en ligne, ou la masquer.
- [ ] « Stripe » dans le programme en personne (`ProgrammePaiementView`) : garder ou reformuler.
- [ ] « 1 mois offert » côté web (`lib/p3-moments/index.ts:259`, `RewardView.tsx:192`) : décider.
- [ ] Appliquer 081, 082, 083 (modifiée pour `lin|veillee`), après relecture, en préproduction puis en production. Puis `get_advisors`.
- [ ] Tests manuels sur iPhone (TestFlight ou build de développement) : parcours complet en Lin puis Veillée ; mode activité de bout en bout en Lin (fond marine, écran allumé) ; un visuel montré à l'enfant ; imprimer et enregistrer un objet ; photo du passeport ; Réduire la transparence et les animations ; Dynamic Type ; VoiceOver sur la barre d'onglets ; `pnpm ui:ancienne` puis `pnpm ui:nouvelle`.
- [ ] Captures iOS des écrans clés (K, G, M, VI1, N2, X, D2) dans les deux styles : NON_VÉRIFIÉ.
- [ ] Pousser quand tout est validé : `git push origin archive/ui-avant-ios27 ui-avant-ios27 ui-lin-veillee-fusion` puis `git push origin main` (vérifier d'abord la protection de `main`).
- [ ] Décisions GO 3 encore ouvertes : R1 (programmes payés dans l'app iOS), R2 (taxes), R3 (remboursement), R4 (versement 2), R9 (prix visio, créneaux d'appel).

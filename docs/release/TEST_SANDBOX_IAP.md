# Test sandbox / TestFlight : paiement Apple, 1er mois offert, accès automatique

Identifiants en place (RevenueCat, projet « thrive sport positive - APP »)
- Entitlement : `thrive_moments` (code : `ENTITLEMENT_ID`, serveur : `RC_ENTITLEMENT`).
- Offering courant : `principal` (packages `$rc_monthly`, `$rc_annual`).
- Produits iOS : `thrive_moments_mensuel` (Maison mensuel), `thrive_moments_annuel`.
- Webhook RevenueCat -> `https://kkdcgzvdmipmrgkawnky.supabase.co/functions/v1/revenuecat-webhook` (déjà créé).
- App User ID RevenueCat = id Supabase du parent (`logIn` à la connexion).

## 0. À créer / vérifier s'il manque (actions manuelles, rien n'est fait par le code)

App Store Connect
1. App > Abonnements > groupe « THRIVE Maison » (un seul groupe, les deux produits dedans).
2. Produit `thrive_moments_mensuel`, durée 1 mois, prix du palier voulu, localisation FR.
3. Sur ce produit : Offres promotionnelles > Offre d'introduction > Type « Gratuit », durée « 1 mois », tous territoires, pour les nouveaux abonnés. Idem sur `thrive_moments_annuel` si on le garde.
4. Statut des produits : « Prêt à soumettre » puis joints à la version soumise.
5. Notifications du serveur App Store V2 (App > Informations sur l'app) : coller l'URL fournie par RevenueCat (RevenueCat > Apps > iOS > « Apple Server Notifications URL »), production ET sandbox.
6. Clé In-App Purchase (.p8) + Issuer ID téléversés dans RevenueCat (App iOS > In-app purchase key).
7. Testeurs sandbox : Utilisateurs et accès > Sandbox > Testeurs (adresse e-mail distincte, jamais un vrai compte Apple).

RevenueCat
1. Produits iOS rattachés à l'entitlement `thrive_moments` et aux packages de l'offering `principal` (déjà le cas).
2. Intégrations > Webhooks : URL ci-dessus, en-tête Authorization = valeur du secret Supabase `REVENUECAT_WEBHOOK_AUTH` ; signature HMAC recommandée = secret `REVENUECAT_WEBHOOK_HMAC_SECRET`. Environnement : Production ET Sandbox (laisser vide = les deux).
3. Secrets Supabase de la fonction : `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_API_KEY` (lecture de l'abonné), optionnel `REVENUECAT_WEBHOOK_HMAC_SECRET`.
4. EAS : `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` (clé SDK publique iOS).

Supabase (IMPORTANT pour TestFlight)
- Un achat TestFlight/sandbox est marqué `is_sandbox = true`. `private.has_p3_subscription` (migrations 076/080) ne l'honore que si le compte est QA OU si `app_settings.accept_sandbox_purchases = true`. Pour tester de bout en bout avec un compte normal, activer ce réglage le temps du test (écriture prod, à faire par Lylian), puis le remettre OFF hors revue Apple. Les achats réels (production) n'en dépendent pas.

## 1. Test local sans compte Apple (simulateur, StoreKit Configuration)
1. Xcode : ouvrir `apps/mobile/ios`, Product > Scheme > Edit Scheme > Run > Options > StoreKit Configuration = `apps/mobile/storekit/THRIVE.storekit`.
2. Les prix du fichier (32,50 / 299) sont des valeurs de test ; les vrais prix viennent de l'App Store.
3. Debug > StoreKit > Manage Transactions pour accélérer le temps, annuler, rembourser. (Ce mode n'envoie pas de reçu à RevenueCat : il valide l'UI et la feuille Apple ; l'accès serveur se valide en section 2.)

## 2. Test sandbox / TestFlight (build EAS preview ou TestFlight)
Connexion : compte Supabase parent de test (famille créée, enfant confirmé non requis pour Maison). Appareil : réglages > App Store > Compte Sandbox = testeur sandbox.

A. Achat avec mois offert
1. Menu Abonnement (ou carte Maison) > paywall.
2. Vérifier : « 0 $ par mois, pendant 1 mois », « Puis X $ par mois », frise avec dates, bouton « Commencer mon mois gratuit », mention légale + Conditions / Confidentialité + Restaurer.
3. Toucher le bouton : la feuille Apple s'ouvre, affiche « 1 mois gratuit puis X $/mois ». Confirmer (Face ID / mot de passe sandbox).
4. Attendu : retour dans l'app, accès Maison ouvert SANS action admin ni redémarrage (au plus quelques secondes). Écran Mon abonnement : « Essai gratuit », date de fin.
5. Contrôles : RevenueCat > Customers > (id Supabase) : entitlement `thrive_moments` actif, période « trial ». Supabase : ligne `billing_subscriptions` (active, `period_type = trial`, `is_sandbox = true`). Logs de la fonction `revenuecat-webhook` : INITIAL_PURCHASE reçu, 200.
6. Double appui rapide sur le bouton : une seule feuille Apple, un seul achat.

B. Annulation de la feuille : fermer la feuille Apple. Attendu : retour au paywall, AUCUN message d'erreur.
C. Échec : mode avion pendant l'achat. Attendu : alerte française « Connexion indisponible… ».
D. Ask to Buy (compte sandbox enfant / réglage `_askToBuyEnabled`) : alerte « Paiement en attente… ». À l'approbation, l'accès s'ouvre seul (listener CustomerInfo + webhook + temps réel `access_versions`).
E. Restaurer : réinstaller l'app, se reconnecter avec le même compte, paywall > Restaurer. Attendu : « Achats restaurés », accès ouvert. Sans achat : « Aucun achat trouvé ».
F. Annulation d'abonnement : Réglages iOS > Abonnements > annuler (ou « Gérer mon abonnement »). Attendu : accès conservé jusqu'à la fin de l'essai, `will_renew = false` (événement CANCELLATION).
G. Expiration accélérée : en sandbox, 1 mois = ~5 minutes, renouvellements limités à 6 par jour. Laisser passer ~5 min après l'annulation. Attendu : EXPIRATION reçu, `billing_subscriptions.active = false`, accès Maison fermé (app au premier plan : mise à jour en direct ; sinon au retour au premier plan), paywall de nouveau proposé SANS mois offert (éligibilité Apple : un seul essai par groupe).
H. Renouvellement : sans annuler, après ~5 min : RENEWAL, `period_type = normal`, accès continu.

## 3. Ce qui garantit « aucune validation manuelle »
- Client : `purchasePackage` -> `confirmAccessAfterPurchase` (CustomerInfo, `billing-sync`, relecture `access_state()` jusqu'à 4 fois) -> ouverture.
- Serveur : `revenuecat-webhook` relit l'abonné chez RevenueCat pour chaque App User ID de l'événement (achat, renouvellement, annulation, expiration, facturation, changement de produit, transfert) puis met à jour `billing_subscriptions` (idempotent : état relu, pas de cumul). Le trigger bump `access_versions` -> la ligne temps réel pousse la mise à jour à l'app.
- Calcul d'accès (080) : override > pack daté > abonnement `billing_subscriptions`, sans étape admin.

# Notes pour la revue Google Play (Play Console › Contenu de l'appli › Accès à l'appli)

À coller dans Play Console : choisir « Tout ou partie des fonctionnalités sont soumises à restrictions », puis ajouter les trois instructions ci-dessous. Les mots de passe ne se mettent **jamais** dans ce fichier : ils vont dans les champs sécurisés de la console.

Prérequis : « Signaler » / « Bloquer la conversation » (appui long sur un message) sont livrés dans le code (GO 2, migration 077) ; vérifier que la 077 est appliquée en prod avant soumission.

```text
Account 1 - Subscription test: parent-abonnement@thrivesportpositive.com. Sign in > tab "Maison" shows the Google Play Billing paywall (monthly / annual, 1-month free trial). After purchase, Maison unlocks. Add a child via "Mes enfants" (tab "Accueil") to see activities.

Account 2 - Full parent experience: parent-test@thrivesportpositive.com. Sample children, session reports (tab "Bilans"), coach messages (tab "Messages" > open the conversation > long-press a message > "Signaler" to report, or "Bloquer la conversation").

Account 3 - Coach: coach-test@thrivesportpositive.com.

No 2FA, SMS or email code required. All data is fictional. App for adults (parents and coaches) only; children have no account. Account deletion: Profil > Confidentialité et compte > Supprimer mon compte et mes données, or https://app.thrivesportpositive.com/suppression-compte.

URLs to declare:
Privacy policy: https://app.thrivesportpositive.com/confidentialite
Terms: https://app.thrivesportpositive.com/conditions
Support: https://app.thrivesportpositive.com/support
Account deletion: https://app.thrivesportpositive.com/suppression-compte
```

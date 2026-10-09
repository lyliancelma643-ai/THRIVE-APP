# Notes pour la revue Apple (App Store Connect › App Review Information › Notes)

À coller dans le champ Notes. Les mots de passe ne se mettent **jamais** dans ce fichier ni dans les notes : ils vont dans les champs sécurisés « Sign-In Information » d'App Store Connect.

Points à résoudre avant soumission (hors texte à coller) :
- « Signaler » / « Bloquer la conversation » (appui long sur un message) sont livrés dans le code (GO 2, migration 077) : vérifier que la 077 est appliquée en prod avant soumission.
- Vérifier que le paywall affiche bien « Restaurer les achats », les conditions et la politique (présents dans le code mobile) avant soumission.

```text
THRIVE is a sport-based psychoeducation program for families. The app is for ADULTS only (parents and coaches). Children never have an account; a parent enters their child's first name and birth date. The interface is in French.

DEMO ACCOUNTS (passwords in the Sign-In Information fields)
1) parent-abonnement@thrivesportpositive.com - parent WITHOUT any plan. Use it to test the in-app subscription.
2) parent-test@thrivesportpositive.com - parent enrolled in an in-person coaching program, with sample data (2 fictional children, session reports, coach messages, activity journal).
3) coach-test@thrivesportpositive.com - coach view.
No 2FA or SMS code is required. All data is fictional.

HOW TO TEST THE SUBSCRIPTION (account 1)
Sign in > tab "Maison". The paywall shows the auto-renewable subscription "THRIVE - Le moment qui compte" (monthly and annual, 1-month free trial for new subscribers), price and renewal terms, "Restaurer les achats" (Restore Purchases), Terms of Use (EULA) and Privacy Policy. After purchase the "Maison" content unlocks within seconds. Add a child in "Mes enfants" to receive the daily activities. Subscription status and "Gérer mon abonnement" are in tab "Profil".

PAYMENTS
Digital content ("Maison" activities) is sold only through In-App Purchase. Families enrolled in our in-person coaching sessions with a real coach (a person-to-person service delivered outside the app, guideline 3.1.3(e)) get the same content included, as does a subscription bought on our website (3.1.3(b)); both remain available as In-App Purchase. The app contains no link, button or text pointing to any other payment method.

MESSAGING
Private messaging only between a parent and the coach assigned by THRIVE; no public or anonymous content. Long-press any message > "Signaler" to report it or block the conversation. Reports are reviewed within 24 hours (support@thrivesportpositive.com).

ACCOUNT DELETION
Tab "Profil" > "Confidentialité et compte" > "Supprimer mon compte et mes données". Data is deleted within 30 days; the app reminds users to cancel their App Store subscription in Settings.

HEALTH
Educational content only: no diagnosis or treatment. Maison and Profil display a reminder to consult a professional and Canadian crisis resources.

PERMISSIONS
Notifications only, requested after sign-in and optional. No camera, microphone, location, contacts or tracking.

URLS
Privacy Policy: https://app.thrivesportpositive.com/confidentialite
Terms of Use: https://app.thrivesportpositive.com/conditions
Support: https://app.thrivesportpositive.com/support
Account deletion (web): https://app.thrivesportpositive.com/suppression-compte

Contact: support@thrivesportpositive.com
```

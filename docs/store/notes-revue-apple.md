# Notes pour la revue (App Store Review et Google Play)

À coller dans App Store Connect › App Review Information (notes) et Play Console › Accès à l'app. Les mots de passe ne sont **jamais** écrits ici : ils sont choisis à l'exécution de `supabase/seed/review_accounts.sql` et transmis dans le champ sécurisé de la console.

## Comptes de démonstration
- Parent : `parent-test@thrivesportpositive.com` · mot de passe : [À TRANSMETTRE DANS LE CHAMP SÉCURISÉ]
  Famille fictive avec deux enfants, séances complétées, bilans du coach, fil de messages avec le coach, carnet Maison.
- Coach : `coach-test@thrivesportpositive.com` · mot de passe : [À TRANSMETTRE DANS LE CHAMP SÉCURISÉ]
  Athlètes fictifs, séances et fil de messages.

## Test de l'abonnement
Créer un nouveau compte parent dans l'app puis ouvrir l'onglet « Maison » : le paywall présente les abonnements mensuel et annuel à renouvellement automatique (« Le moment qui compte », essai gratuit pour les nouveaux abonnés), la restauration des achats, les conditions d'utilisation et la politique de confidentialité.

## Fonction de l'app
THRIVE est un programme psychoéducatif par le sport. L'app est réservée aux **adultes** : les parents créent leur compte, les coachs sont approuvés par THRIVE. **Les enfants n'ont jamais de compte** ; le parent saisit leur prénom et leur date de naissance.

## Paiements
- Le contenu numérique (« Le moment qui compte ») est vendu dans l'app par achat intégré (StoreKit / Google Play Billing).
- Les familles inscrites au programme d'accompagnement en personne (séances en temps réel avec un coach) reçoivent le même contenu inclus. Ces services humains sont vendus et contractés **hors de l'app**. L'app ne contient ni lien, ni bouton, ni texte renvoyant vers un achat externe.
- Un abonnement souscrit sur le site web est reconnu dans l'app avec le même compte. **Point à faire valider par Lylian** : ce paragraphe décrit une reconnaissance multiplateforme (guideline 3.1.3) ; s'il pose question à la revue, le retirer des notes.

## Messagerie
Messagerie privée entre un parent et le coach assigné par THRIVE. Pas de contenu public ni anonyme.
Signalement : **à implémenter dans l'app avant soumission** (rapport A-02 : signalement et blocage des messages, guideline 1.2). Tant que ce n'est pas livré, le texte suivant est le seul disponible : « Les signalements se font à support@thrivesportpositive.com et sont traités sous 24 heures. » Ce point est **bloquant** pour la soumission.

## Suppression de compte
Compte › « Supprimer mon compte et mes données ». La demande est traitée dans un délai de 30 jours. Les abonnements App Store ou Google Play se résilient dans les réglages du store, comme indiqué dans l'app.

## Santé
Contenu éducatif uniquement, sans diagnostic ni traitement. L'onglet Maison et l'écran Profil rappellent de consulter un professionnel et affichent les ressources de crise canadiennes.

## Notifications
Demandées après la connexion, facultatives. L'app fonctionne sans elles.

## Permissions
Aucune permission sensible (pas de caméra, micro, localisation, contacts) dans le binaire actuel. Vérifier après toute mise à jour native.

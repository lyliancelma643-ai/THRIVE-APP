# Déclarations prêtes à copier — App Store Connect et Play Console

> Réponses établies d'après le **binaire actuel** (branche `claude/hopeful-goldberg-xfnhpi`, 2 octobre 2026). Ce binaire contient : inscription et connexion, enfants, Maison (activités et carnet), Bilans (lecture), messagerie coach ↔ parent, abonnement (RevenueCat), notifications, suppression du compte.
> Les questionnaires LSSS et EPOCH s'ouvrent dans le navigateur (web app) : ils ne sont **pas** collectés par l'app. Si un jour ils sont intégrés à l'app, passer « Santé » à **Oui**.


## 1. Google Play — Sécurité des données (grille de saisie)

Play Console › Contenu de l'application › Sécurité des données. Saisir dans l'ordre des écrans.

### 1.1 Collecte et sécurité

| Question | Réponse |
|---|---|
| Votre application collecte-t-elle ou partage-t-elle l'un des types de données utilisateur requis ? | **Oui** |
| Toutes les données utilisateur collectées par votre application sont-elles chiffrées en transit ? | **Oui** |
| Proposez-vous aux utilisateurs un moyen de demander la suppression de leurs données ? | **Oui** |
| URL de suppression du compte | `https://app.thrivesportpositive.com/suppression-compte` (page à publier avant la soumission) |
| Les utilisateurs peuvent-ils demander la suppression de certaines données sans supprimer leur compte ? | **Non** |
| Validation de sécurité indépendante (MASA) | **Non** |

### 1.2 Types de données

Pour chaque type coché : **Collectées = Oui · Partagées = Non** (Supabase, Expo, RevenueCat sont des fournisseurs de services) · **Traitées de façon éphémère = Non**.

| Catégorie | Type | Coché | Collecte obligatoire ou facultative | Finalités à cocher |
|---|---|---|---|---|
| Informations personnelles | Nom | **Oui** | Obligatoire | Fonctionnement de l'application · Gestion du compte |
| | Adresse e-mail | **Oui** | Obligatoire | Fonctionnement de l'application · Gestion du compte · Communications du développeur |
| | ID utilisateur | **Oui** | Obligatoire | Fonctionnement de l'application · Gestion du compte |
| | Adresse | Non | — | — |
| | Numéro de téléphone | Non (pas de saisie dans l'app) | — | — |
| | Origine ethnique, opinions, religion, orientation sexuelle | Non | — | — |
| | Autres informations (date de naissance, genre et sport de l'enfant) | **Oui** | Facultative (ajout d'un enfant) | Fonctionnement de l'application · Personnalisation |
| Informations financières | Infos de paiement de l'utilisateur | Non (traitées par Google Play) | — | — |
| | Historique des achats | **Oui** | Facultative | Fonctionnement de l'application · Gestion du compte |
| | Cote de solvabilité, autres infos financières | Non | — | — |
| Santé et remise en forme | Informations de santé | **Oui** — allergies ou besoins particuliers saisis par le parent, scores de bien-être (PERMA, LSSS) affichés dans les bilans *(corrigé le 8/10 : non déclaré à tort ; à confirmer par Lylian)* | Facultative | Fonctionnement de l'application · Personnalisation |
| | Informations sur la remise en forme | Non | — | — |
| Messages | E-mails | Non | — | — |
| | SMS ou MMS | Non | — | — |
| | Autres messages dans l'application | **Oui** | Facultative | Fonctionnement de l'application |
| Photos et vidéos | Photos · Vidéos | **Oui** — photo de profil de l'enfant, facultative *(corrigé le 8/10)* | Facultative | Fonctionnement de l'application · Gestion du compte |
| Fichiers audio | tous | Non | — | — |
| Fichiers et documents | | Non | — | — |
| Agenda | | Non | — | — |
| Contacts | | Non | — | — |
| Activité dans l'application | Interactions avec l'application | Non (aucun outil d'analytics) | — | — |
| | Historique des recherches | Non | — | — |
| | Applications installées | Non | — | — |
| | Autre contenu généré par l'utilisateur (carnet Maison, notes de séance du coach) | **Oui** | Facultative | Fonctionnement de l'application |
| | Autres actions (moments vécus) | **Oui** | Facultative | Fonctionnement de l'application · Personnalisation |
| Navigation Web | | Non | — | — |
| Infos et performances de l'application | Journaux de plantage · Diagnostics | **Oui** — Sentry (mobile et web), identifiant utilisateur opaque, sans courriel ni capture d'écran *(corrigé le 8/10 : le SDK Sentry est présent dans `apps/mobile/src/lib/sentry.ts`)* | Obligatoire | Fonctionnement de l'application · Analyses |
| Identifiants de l'appareil ou autres | Identifiant de l'appareil (jeton de notification) | **Oui** | Facultative | Fonctionnement de l'application |
| Position | Approximative · Précise | Non | — | — |

## 2. Apple — App Privacy (grille de saisie)

App Store Connect › l'app › Confidentialité de l'app › Commencer.

| Question | Réponse |
|---|---|
| Vous ou vos partenaires tiers collectez-vous des données depuis cette app ? | **Oui** |
| Utilisez-vous des données pour suivre (« tracking ») les utilisateurs ? | **Non**, pour tous les types |

Pour chaque type coché : **Liée à l'identité de l'utilisateur = Oui · Utilisée pour le suivi = Non**.

> Corrections du 8 octobre 2026 (revue A10) : Santé, photos de profil et diagnostics Sentry étaient déclarés « Non » alors que le code les traite. Voir `docs/store/` pour les points à trancher.

| Catégorie Apple | Type | Collecté | Finalités à cocher |
|---|---|---|---|
| Coordonnées | Nom | **Oui** | Fonctionnalité de l'app |
| | Adresse e-mail | **Oui** | Fonctionnalité de l'app |
| | Numéro de téléphone · Adresse physique · Autres coordonnées | Non | — |
| Santé et forme | Santé · Forme | **Oui** — allergies ou besoins particuliers, scores de bien-être (PERMA, LSSS) *(corrigé le 8/10 ; à confirmer par Lylian)* | Fonctionnalité de l'app · Personnalisation |
| Informations financières | Infos de paiement · Solvabilité · Autres | Non | — |
| Localisation | Précise · Approximative | Non | — |
| Informations sensibles | | Non | — |
| Contacts | | Non | — |
| Contenu utilisateur | E-mails ou messages texte | **Oui** (messagerie in-app) | Fonctionnalité de l'app |
| | Photos ou vidéos | **Oui** — photo de profil de l'enfant, facultative | Fonctionnalité de l'app |
| | Contenu audio · Gameplay · Service client | Non | — |
| | Autre contenu utilisateur (carnet Maison, notes de séance du coach) | **Oui** | Fonctionnalité de l'app |
| Historique de navigation · Historique de recherche | | Non | — |
| Identifiants | Identifiant utilisateur | **Oui** | Fonctionnalité de l'app |
| | Identifiant de l'appareil (jeton push) | **Oui** | Fonctionnalité de l'app |
| Achats | Historique des achats | **Oui** | Fonctionnalité de l'app · Analyses (usage par RevenueCat) |
| Données d'utilisation | Interactions · Publicité · Autres | Non | — |
| Diagnostics | Plantages · Performances | **Oui** — Sentry, identifiant utilisateur opaque, liée à l'identité = Oui, suivi = Non *(corrigé le 8/10)* | Fonctionnalité de l'app |
| Environnement | | Non | — |
| Corps | | Non | — |
| Autres données | Autres types de données (date de naissance, genre, sport de l'enfant) | **Oui** | Fonctionnalité de l'app · Personnalisation du produit |

URL de la politique de confidentialité : `https://app.thrivesportpositive.com/confidentialite`.
Contrôle après le premier build EAS : Xcode › Organizer › archive › « Generate Privacy Report » doit correspondre à ce tableau.


## 3. Textes de permissions

### 3.1 iOS (Info.plist)

Aucune clé `NS…UsageDescription` n'est requise par le binaire actuel : l'app n'utilise ni caméra, ni photothèque, ni localisation, ni contacts, ni micro, ni suivi. **N'en ajoutez pas tant que la fonction n'existe pas** (Apple rejette les chaînes de permissions inutilisées ou vagues).

Si une fonction photo est ajoutée plus tard (photo de l'enfant, pièce jointe), utiliser de préférence le sélecteur système (PHPicker, sans permission). Sinon :

| Clé | Texte FR (langue principale) |
|---|---|
| `NSPhotoLibraryUsageDescription` | « THRIVE accède à vos photos uniquement lorsque vous choisissez une image à joindre à un message ou comme photo de profil de votre enfant. » |
| `NSCameraUsageDescription` | « THRIVE utilise l'appareil photo uniquement lorsque vous prenez une photo à joindre à un message ou comme photo de profil de votre enfant. » |

### 3.2 Écran explicatif avant la demande de notifications (iOS et Android 13+)

> **Restez informé**
> Recevez une notification quand le coach de votre enfant vous écrit, quand une séance approche ou quand un bilan est prêt. Aucune publicité. Vous pourrez changer d'avis à tout moment dans les réglages.
> [Activer les notifications] [Plus tard]

### 3.3 Android

| Permission | Justification (pour mémoire ; aucune déclaration Play requise) |
|---|---|
| `POST_NOTIFICATIONS` | Notifications de service (messages, séances, bilans) |
| `INTERNET` | Accès au service |
| `com.android.vending.BILLING` | Abonnement Google Play |
| `RECEIVE_BOOT_COMPLETED`, `VIBRATE` | Ajoutées par `expo-notifications` |

Bloquées par `android.blockedPermissions` : localisation, caméra, micro, stockage externe, état du téléphone, alarmes exactes, superposition.

---

## 4. Déclarations Play Console complémentaires

| Formulaire | Réponse proposée |
|---|---|
| Public cible | **18 ans et plus** uniquement (parents et coachs) |
| L'app pourrait-elle attirer involontairement les enfants ? | Non (visuels et textes adressés aux parents) |
| Annonces | L'app ne contient **pas** d'annonces |
| Accès à l'app | Accès limité : fournir les identifiants de démonstration (§7) |
| Applications de santé | Fonctions : bien-être / santé mentale (contenu psychoéducatif, questionnaires de bien-être) ; pas de Health Connect ; pas de dispositif médical ; pas de recherche sur des sujets humains |
| Application gouvernementale, financière, VPN, etc. | Non |
| Actualités | Non |

---

## 5. Classification d'âge

### 5.1 App Store Connect (questionnaire en vigueur depuis le 31/01/2026)

| Question | Réponse |
|---|---|
| Violence (réaliste, cartoon, horreur) | Aucune |
| Contenu sexuel, nudité | Aucun |
| Grossièretés, humour vulgaire | Aucun |
| Alcool, tabac, drogues | Aucun |
| Jeux d'argent simulés, concours | Non |
| Sujets médicaux ou de bien-être | **Oui — rares / légers** (contenu psychoéducatif, questionnaires de bien-être, pas de traitement) |
| Accès web non restreint | Non |
| Contenu généré par les utilisateurs / messagerie | **Oui** si la messagerie est embarquée (binaire cible) ; sinon non |
| Publicité | Non |
| Contrôles parentaux intégrés | Non |
| Assurance de l'âge (age assurance) | Non |

La note est calculée par Apple (probablement entre 9+ et 13+). Ne pas choisir la catégorie Enfants.

### 5.2 Google Play (IARC)

Catégorie : « Référence, actualités ou éducation ». Violence, sexualité, langage, substances, jeux d'argent : non. Interactions entre utilisateurs : **oui** (messagerie) dans le binaire cible. Partage de la position : non. Achats numériques : oui (abonnement). Résultat attendu : tout public (PEGI 3 / ESRB Everyone) avec mentions « Interactions entre utilisateurs », « Achats intégrés ».

---

## 6. Fiches des stores (à adapter au binaire réellement soumis)

> Règles : aucune mention « pour enfants » ou « for kids » (Apple 2.3.8), aucun prix dans le nom ni le sous-titre (2.3.7), aucune promesse invérifiable, aucune marque tierce, aucune mention du paiement web (anti-steering).

### Français (Canada) — langue principale

- **Nom (≤ 30)** : `THRIVE Sport Positive` *(sous réserve de la recherche de marque)*
- **Sous-titre iOS (≤ 30)** : `Le sport qui fait grandir`
- **Description courte Play (≤ 80)** : `Accompagnez votre jeune sportif avec son coach et 10 min en famille chaque jour.`
- **Mots-clés iOS (≤ 100)** : `sport,parent,coach,ado,motivation,confiance,famille,émotions,bien-être,habiletés,programme,bilan`
- **Catégorie** : Santé et forme (principale) ; Éducation (secondaire)
- **Description** :

> THRIVE accompagne les parents de jeunes sportifs de 8 à 17 ans, avec le coach de leur jeune, tout au long de la Méthode THRIVE, un programme psychoéducatif de 13 séances par le sport.
>
> POUR LES PARENTS
> • Suivez le parcours de votre jeune et consultez les bilans de son coach.
> • Échangez avec son coach dans une messagerie privée.
> • Le moment qui compte : une activité de 10 minutes par jour à vivre en famille, sans rien à préparer, et un carnet pour garder vos moments. (abonnement)
>
> POUR LES COACHS
> • Retrouvez vos jeunes, vos programmes et vos séances.
> • Notez vos observations et préparez les bilans.
>
> CONFIDENTIALITÉ
> • Données hébergées au Canada.
> • Aucun compte pour les jeunes, aucune publicité.
> • Suppression du compte possible à tout moment depuis l'app.
>
> THRIVE est un programme éducatif. Il ne remplace pas un avis médical ou psychologique.
>
> ABONNEMENT « LE MOMENT QUI COMPTE »
> Abonnement mensuel ou annuel à renouvellement automatique, avec essai gratuit pour les nouveaux abonnés. Le paiement est prélevé sur votre compte App Store / Google Play. Annulez à tout moment dans les réglages de votre compte, au moins 24 heures avant la fin de la période en cours.
> Conditions d'utilisation : [URL] · Politique de confidentialité : [URL]

### English (Canada)

- **Name**: `THRIVE Sport Positive`
- **Subtitle (≤ 30)**: `Sport that builds young people`
- **Play short description**: `Support your young athlete with their coach and 10 minutes a day as a family.`
- **Description**: translation of the above.

### URL

| Champ | Valeur à publier |
|---|---|
| URL de support | `[https://app.thrivesportpositive.com/support]` |
| URL marketing | `[https://thrivesportpositive.com]` |
| URL de confidentialité | `[https://app.thrivesportpositive.com/confidentialite]` |
| Conditions (EULA) | `[https://app.thrivesportpositive.com/conditions]` |
| Suppression de compte (Google) | `[https://app.thrivesportpositive.com/suppression-compte]` |

### Visuels

- iOS : icône 1024×1024 PNG sans transparence ; captures iPhone 6,9 po (1320×2868 ou 1290×2796) ou 6,5 po (1284×2778 ou 1242×2688), 1 à 10, de l'app réelle, avec des familles et des enfants **fictifs**. Pas d'iPad (`supportsTablet: false`).
- Android : icône 512×512, image de présentation 1024×500, au moins 2 captures (à confirmer dans la Play Console).

---

## 7. Notes pour le reviewer (App Store Connect › App Review Information ; Play Console › Accès à l'app)

Comptes créés par `supabase/seed/review_accounts.sql` (mot de passe choisi à l'exécution, jamais committé).

> **Demo accounts** (production backend, active during review)
> • Parent: `parent-test@thrivesportpositive.com` / `[password]` — fictional family with two children, completed sessions, coach reports, a message thread with the coach and Home activity journal. This family is enrolled in an in-person coached plan, so the "Home" tab is included and no purchase is required.
> • Coach: `coach-test@thrivesportpositive.com` / `[password]` — assigned fictional athletes, sessions and the message thread.
>
> **To test the in-app subscription**, please create a new parent account in the app (Create an account) and open the "Maison" tab: the paywall shows the monthly and annual auto-renewable subscriptions ("Le moment qui compte", free trial for new subscribers), Restore Purchases, Terms of Use and Privacy Policy.
>
> **About the app.** THRIVE is a sport-based psychoeducational program. The app is used by **adults only**: parents (who create their own account) and coaches (approved by THRIVE). **Children never have an account**; parents add their child's first name and date of birth to receive age-appropriate content.
>
> **Payments.** Digital content ("Le moment qui compte") is sold in the app through In-App Purchase. Families enrolled in our in-person coaching program (real-time sessions with a coach, Guideline 3.1.3(d)/(e)) get the same content included, and a subscription bought on our website is recognized in the app (3.1.3(b)). The app contains no link, button or text pointing to an external purchase.
>
> **Messaging.** Private one-to-one messaging between a parent and the coach assigned by THRIVE (no public or anonymous content). Reports can be sent to support@thrivesportpositive.com and are reviewed within 24 hours. *(Remplacer cette phrase par le parcours in-app dès que signalement et blocage sont implémentés — rapport A-02.)*
>
> **Account deletion.** Profile › Supprimer mon compte. The request is processed within 30 days; App Store subscriptions must be cancelled by the user in Settings, as stated in the app.
>
> **Health.** Educational content only; no diagnosis or treatment. The Home tab and the Profile screen show a reminder to consult a professional and Canadian crisis resources.
>
> **Notifications.** Requested only after sign-in; optional, the app works fully if declined.

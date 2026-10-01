# Déclarations prêtes à copier — App Store Connect et Play Console

> Réponses établies d'après le code au 1er octobre 2026 (branche `claude/hopeful-goldberg-xfnhpi`).
> Deux colonnes quand cela change : **binaire actuel** (`src/app` seul) et **binaire cible** (avec abonnement, messagerie, questionnaires et onboarding de `app/`, une fois le routeur fusionné). **Déclarez le binaire réellement soumis.** Une déclaration plus large que le binaire est tolérée ; une déclaration plus étroite est un motif de rejet ou de retrait.

---

## 1. Google Play — formulaire « Sécurité des données »

### 1.1 Questions générales

| Question | Réponse |
|---|---|
| Votre app collecte-t-elle ou partage-t-elle des types de données utilisateur obligatoires ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS / TLS vers Supabase, Expo, RevenueCat) |
| Proposez-vous un moyen de demander la suppression des données ? | **Oui** — dans l'app (Profil › Supprimer mon compte) et via l'URL web : `[URL de la page de suppression]` |
| Les comptes peuvent-ils être créés dans l'app ? | **Oui** (courriel + mot de passe) |
| URL de suppression du compte | `[https://app.thrivesportpositive.com/suppression-compte]` (à publier) |
| Données partagées avec des tiers ? | **Non** : Supabase, Expo, RevenueCat agissent comme fournisseurs de services pour notre compte (exclus de la notion de « partage » selon Google). Apple/Google traitent les paiements eux-mêmes |
| Avez-vous fait valider vos pratiques par un organisme indépendant (MASA) ? | Non |

### 1.2 Types de données (tous : **collectés**, **non partagés**, **non éphémères**)

| Catégorie Google | Type | Binaire actuel | Binaire cible | Obligatoire ? | Finalités |
|---|---|---|---|---|---|
| Informations personnelles | Nom | ✔ (parent, coach, enfant) | ✔ | Obligatoire | Fonctionnement de l'app ; Gestion du compte |
| Informations personnelles | Adresse e-mail | ✔ | ✔ | Obligatoire | Fonctionnement de l'app ; Gestion du compte ; Communications du développeur (courriels de service) |
| Informations personnelles | ID utilisateur | ✔ (ID Supabase) | ✔ (aussi ID RevenueCat) | Obligatoire | Fonctionnement de l'app ; Gestion du compte |
| Informations personnelles | Numéro de téléphone | — | ✔ (onboarding, profil) | Facultatif | Fonctionnement de l'app ; Gestion du compte |
| Informations personnelles | Autres informations (date de naissance et âge de l'enfant) | ✔ | ✔ | Obligatoire pour ajouter un enfant | Fonctionnement de l'app ; Personnalisation |
| Informations financières | Historique des achats | — | ✔ (RevenueCat / Google Play Billing) | Facultatif | Fonctionnement de l'app ; Gestion du compte |
| Santé et remise en forme | Informations de santé (réponses aux questionnaires de bien-être LSSS / EPOCH) | — | ✔ si le questionnaire est embarqué | Facultatif | Fonctionnement de l'app ; Personnalisation |
| Messages | Autres messages dans l'application | — | ✔ (messagerie coach ↔ parent) | Facultatif | Fonctionnement de l'app |
| Activité dans l'application | Autre contenu généré par l'utilisateur (notes de séance du coach, carnet) | ✔ (notes de séance, côté coach) | ✔ | Facultatif | Fonctionnement de l'app |
| Identifiants de l'appareil ou autres | Jeton de notification push (Expo / FCM) | ✔ | ✔ | Facultatif (refus possible) | Fonctionnement de l'app (notifications) |
| Informations et performances de l'app | Journaux de plantage, diagnostics | — | — (aucun SDK de crash sur mobile) | — | Ajouter si Sentry React Native est intégré |
| Position, contacts, photos et vidéos, fichiers, agenda, audio, historique web, applis installées | — | — | — | — | Non collectés |

---

## 2. Apple — App Privacy (« Nutrition Labels »)

**Suivi (tracking) : NON** pour tous les types. Aucune donnée n'est utilisée pour la publicité ni combinée avec des données de tiers.

| Catégorie Apple | Type | Binaire actuel | Binaire cible | Lié à l'identité | Finalités |
|---|---|---|---|---|---|
| Coordonnées | Nom | ✔ | ✔ | Oui | Fonctionnalité de l'app |
| Coordonnées | Adresse e-mail | ✔ | ✔ | Oui | Fonctionnalité de l'app |
| Coordonnées | Numéro de téléphone | — | ✔ | Oui | Fonctionnalité de l'app |
| Santé et forme | Santé | — | ✔ si questionnaires embarqués | Oui | Fonctionnalité de l'app ; Personnalisation du produit |
| Achats | Historique des achats | — | ✔ | Oui | Fonctionnalité de l'app ; Analyses (usage par RevenueCat, cf. sa documentation) |
| Contenu utilisateur | E-mails ou messages texte (messagerie in-app) | — | ✔ | Oui | Fonctionnalité de l'app |
| Contenu utilisateur | Autre contenu (notes de séance, carnet) | ✔ | ✔ | Oui | Fonctionnalité de l'app |
| Identifiants | Identifiant utilisateur | ✔ | ✔ | Oui | Fonctionnalité de l'app |
| Identifiants | Identifiant de l'appareil (jeton push) | ✔ | ✔ | Oui | Fonctionnalité de l'app — déclaration prudente |
| Autres données | Autres types (date de naissance, genre et sport de l'enfant) | ✔ | ✔ | Oui | Fonctionnalité de l'app ; Personnalisation du produit |
| Diagnostics | — | — | — | — | Non collecté (pas de SDK de crash sur mobile) |

URL de la politique de confidentialité : `[https://app.thrivesportpositive.com/confidentialite]`.

Contrôle à faire après le premier build EAS : Xcode › Organizer › archive › « Generate Privacy Report » doit être cohérent avec ce tableau (RevenueCat déclare « Purchase History » dans son propre manifeste).

---

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
- **Description courte Play (≤ 80)** : `Accompagnez votre jeune sportif avec son coach et 10 minutes par jour en famille.`
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
| URL de support | `[https://app.thrivesportpositive.com/aide]` |
| URL marketing | `[https://thrivesportpositive.com]` |
| URL de confidentialité | `[https://app.thrivesportpositive.com/confidentialite]` |
| Conditions (EULA) | `[https://app.thrivesportpositive.com/conditions]` |
| Suppression de compte (Google) | `[https://app.thrivesportpositive.com/suppression-compte]` |

### Visuels

- iOS : icône 1024×1024 PNG sans transparence ; captures iPhone 6,9 po (1320×2868 ou 1290×2796) ou 6,5 po (1284×2778 ou 1242×2688), 1 à 10, de l'app réelle, avec des familles et des enfants **fictifs**. Pas d'iPad (`supportsTablet: false`).
- Android : icône 512×512, image de présentation 1024×500, au moins 2 captures (à confirmer dans la Play Console).

---

## 7. Notes pour le reviewer (App Store Connect › App Review Information ; Play Console › Accès à l'app)

> **Demo accounts** (production backend, active during review)
> • Parent: `review-parent@thrivesportpositive.com` / `[mot de passe]` — family with two fictional children, sessions, coach reports and an active complimentary subscription.
> • Coach: `review-coach@thrivesportpositive.com` / `[mot de passe]` — assigned fictional athletes, programs and sessions.
>
> **About the app.** THRIVE is a sport-based psychoeducational program. The app is used by **adults only**: parents (who create their own account) and coaches (approved by THRIVE). **Children never have an account**; parents add their child's first name and date of birth to receive age-appropriate content.
>
> **Subscription.** "Le moment qui compte" (monthly / annual auto-renewable, free trial for new subscribers) is sold in the app through In-App Purchase. The same subscription can also be purchased on our website; a subscriber who bought on the web is recognized in the app (Guideline 3.1.3(b)). The app contains no link, button or text pointing to the web purchase. To test the purchase flow, sign in with the parent account, open Profile › Subscription.
>
> **[N'inclure qu'une fois le signalement implémenté — A-02]** **Messaging.** Private one-to-one messaging between a parent and the coach assigned by THRIVE. Users can report a message; reports are reviewed by THRIVE staff within 24 hours. Contact: `[support email]`.
>
> **Account deletion.** Profile › Delete my account. The request is processed within 30 days; App Store subscriptions must be cancelled by the user in Settings, as stated in the app.
>
> **[N'inclure qu'une fois l'avertissement affiché dans l'app — A-04]** **Health.** Educational content only; no diagnosis or treatment. The app displays a reminder to consult a professional and crisis resources.
>
> **Notifications.** Optional; the app works fully if declined.

Adapter ce texte si la messagerie ou l'abonnement ne sont pas dans le binaire soumis (ne pas décrire une fonction absente : Apple 2.3.1).

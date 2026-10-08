# Audit de conformité App Store / Google Play — THRIVE (app mobile Expo)

| | |
|---|---|
| Audit | CTRL_3 — Conformité stores, protection des données, documents légaux |
| Date de la veille réglementaire | 1er octobre 2026 |
| Périmètre | `apps/mobile` (Expo SDK 55, RN 0.83, `app.thrive.mobile`), backend Supabase partagé (`supabase/`), web Next.js pour les pages légales et la suppression de compte |
| Branche | `claude/hopeful-goldberg-xfnhpi` |
| Nature | Recommandations de conformité. **Ce n'est pas un avis juridique** : chaque point marqué ⚖️ doit être validé par un juriste (droit québécois et, au besoin, européen). |

Livrables associés (même dossier) :

- [`politique-confidentialite.md`](./politique-confidentialite.md) — brouillon FR + EN ⚖️
- [`conditions-utilisation.md`](./conditions-utilisation.md) — brouillon FR + EN (abonnement, avertissement santé) ⚖️
- [`conditions-coachs.md`](./conditions-coachs.md) — brouillon ⚖️
- [`declarations-stores.md`](./declarations-stores.md) — réponses Data Safety, App Privacy (Nutrition Labels), textes de permissions, classification d'âge, fiches, notes pour le reviewer

---

## 0. Avancement au 2 octobre 2026

| ID | Statut | Ce qui a été fait |
|---|---|---|
| T-01 | 🔧 Corrigé | Écrans déplacés dans `src/app` (racine unique), layout racine unique. Bundles iOS et Android générés avec `expo export` : routes Maison, Bilans et Messages présentes |
| A-13 / 4.2 | 🔧 Corrigé (MVP) | Onglets parent : Accueil, **Maison** (activités de la semaine selon l'âge, fiche, « C'est fait », carnet), **Bilans** (13 séances, coach, bilans du coach, questionnaires), **Messages**, Profil (abonnement, notifications) |
| T-02 | 🔧 Partiel | Icônes sans transparence, écran de démarrage, `eas.json` (AAB, numéros de build gérés par EAS). Reste : `eas init` (projectId) avec le compte Expo |
| T-03 / T-04 | 🔧 Corrigé | Session persistée (AsyncStorage) ; redirection selon le rôle ; admin renvoyé vers le web |
| T-05 | 🔧 Corrigé | Permission de notification demandée après connexion |
| T-06 | 🔧 Corrigé | Typecheck mobile ajouté à la CI ; dépendances manquantes déclarées |
| A-04 / D-03 | 🔧 Corrigé | Avertissement santé et ressources (811, 9-8-8, Jeunesse, J'écoute, 9-1-1) dans Maison et les profils |
| A-12 | 🔧 Corrigé | L'app reconnaît l'accès accordé par le serveur (forfait accompagné, abonnement web) : pas de paywall pour une famille qui a déjà accès |
| C-02 / D-01 / D-04 | 🔧 Rédigé | Politique, conditions et conditions coachs complétées (Thrive Sport Positive, support@, confidentialite@). **Restent : NEQ et adresse du siège, puis publication des pages web** |
| C-03 | 🔧 Rédigé | Responsable = dirigeant (art. 3.1) ; EFVP (`efvp.md`) ; politique de conservation (`politique-conservation.md`) |
| A-18 / C-07 | 🔧 Figé | Délai de suppression : 30 jours, identique dans l'app et la politique |
| D-05 | 🔧 Rédigé | `docs/legal/ip-registry.md` (52 vignettes + 11 visuels + polices + instruments) et courriels LSSS / EPOCH |
| E-07 | 🔧 Rédigé | `supabase/seed/review_accounts.sql` (parent-test, coach-test) ; notes au reviewer mises à jour |
| F-02 | ✅ Tranché | Identifiant conservé : `app.thrive.mobile` (iOS et Android), déjà configuré dans RevenueCat et la documentation |
| **A-02** | ❌ **Reste bloquant** | Messagerie embarquée sans signalement ni blocage dans l'app (Apple 1.2) |
| EFVP M1 | ❌ À faire | Les notifications de message envoient un extrait du contenu hors Québec (Expo, APNs, FCM) |

## 1. Synthèse

### Verdict : **NO-GO** pour les deux stores à ce jour

| Store | Probabilité de passage en l'état | Après correction des bloquants |
|---|---|---|
| Apple App Store | ≈ 0 % (binaire non constructible et non soumissible) | ≈ 75 % au premier passage, puis ≈ 90 % |
| Google Play | ≈ 0 % (même raison, plus test fermé probable) | ≈ 85 % |

Ces probabilités sont des estimations d'auditeur, pas des garanties.

### Bloquants (à lever avant toute soumission)

1. **L'app mobile embarquée n'est pas celle qu'on croit (T-01).** Expo Router prend `src/app/` comme racine dès que ce dossier existe ([code source Expo](https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/start/server/metro/router.ts)). Tout le dossier `apps/mobile/app/` est donc **ignoré** : paywall et abonnement RevenueCat, messagerie, onboarding, questionnaires, badges, notifications, et même le branchement de l'identité RevenueCat (`useRevenueCatIdentity`). Le binaire réel ne contient que 4 onglets parent et 4 onglets coach (prototype).
2. **Fonctionnalité minimale (Apple 4.2 / Google « Minimum functionality »).** Le binaire réel n'offre ni la Maison (P3), ni les bilans, ni les vidéos, ni la messagerie. Ce qu'il reste est très en deçà de la web app. Risque élevé de rejet 4.2 et 2.1.
3. **Aucune politique de confidentialité ni condition publiée (C-02, D-01).** Aucune page légale dans le web, `EXPO_PUBLIC_PRIVACY_URL` et `EXPO_PUBLIC_TERMS_URL` vides. Bloquant chez Apple (5.1.1(i)) et chez Google (Données utilisateur).
4. **Suppression de compte.** Elle était absente de l'app. **Corrigée sur la branche** (bouton dans les deux écrans Profil), mais il reste à publier l'**URL web de suppression** exigée par Google et à tenir le délai annoncé (30 jours) côté traitement admin.
5. **Binaire non constructible / non soumissible (T-02).** Pas d'icône, d'écran de démarrage, d'`eas.json`, d'`extra.eas.projectId`. Les jetons push Expo ne peuvent pas être obtenus sans `projectId`.
6. **Bugs visibles par le reviewer (T-03, T-04).** Session non persistée sur mobile (déconnexion à chaque lancement), coach redirigé vers l'espace parent après connexion, administrateur redirigé vers une route inexistante.
7. **Compte développeur et entité (F-01), test fermé Google (B-08)** : NON_VERIFIE, dépend de Lylian.

### Contexte produit à trancher (décision de Lylian)

Le cahier des charges client indique : « Aucune application native sur l'App Store ou Google Play. Le prototype mobile n'est pas déployé » (`CAHIER_DES_CHARGES_CLIENT.md` §18, §21). Le cahier technique et `docs/monetisation-hybride.md` préparent pourtant une publication avec achats intégrés. **La décision de publier, et avec quel périmètre fonctionnel, conditionne tout le reste.**

### Recommandation de distribution au lancement

Publier d'abord **au Canada uniquement** (et éventuellement en France, voir C-04). Cela retire du périmètre, au lancement : la loi texane SB 2420 (en vigueur depuis le 4 juin 2026) et les lois d'État similaires, ainsi que l'essentiel de l'exposition COPPA. ⚖️ À confirmer avec le juriste.

---

## 2. Inventaire

### 2.1 Ce que contient réellement le binaire (`apps/mobile/src/app`)

| Rôle | Écrans | Données saisies ou transmises |
|---|---|---|
| Visiteur | Connexion, inscription | Courriel, mot de passe, prénom, nom |
| Parent | Accueil, Mes enfants, Programmes, Profil | Prénom, nom et date de naissance de l'enfant ; famille |
| Coach | Tableau de bord, Programmes, Séances, Profil | Programmes, notes de séance (« Observations, points forts… ») |
| Tous | — | Jeton push Expo (`profiles.expo_push_token`) |

Code présent mais **non embarqué** (`apps/mobile/app/`) : abonnement (RevenueCat), messagerie coach ↔ parent, onboarding parent (téléphone, prénom et âge de l'enfant) et coach (bio, bouton photo inactif), questionnaires enfant, badges, notifications.

### 2.2 Permissions

| Plateforme | Permission | Origine | Justifiée | Statut |
|---|---|---|---|---|
| iOS | Notifications (autorisation système, pas de clé Info.plist) | `expo-notifications` | Oui : messages du coach, séances | Demandée **au lancement, avant connexion** (`src/app/_layout.tsx` appelle `usePushNotifications` sans condition) → à déplacer après connexion, avec un écran explicatif |
| Android | `POST_NOTIFICATIONS`, `INTERNET`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED` | Expo / `expo-notifications` | Oui | OK |
| Android | `com.android.vending.BILLING` | `react-native-purchases` | Oui si abonnement | OK |
| Android | Localisation, caméra, micro, stockage, état du téléphone, alarmes exactes, superposition | — | Non utilisées | **Bloquées sur la branche** (`android.blockedPermissions`) |
| iOS | Caméra, photothèque, localisation, contacts, suivi (ATT) | — | Non utilisées | Aucune chaîne `NS…UsageDescription` à ajouter |

### 2.3 SDK tiers et destinataires

| Service | Où | Données | Région / transfert hors Québec | Rôle |
|---|---|---|---|---|
| Supabase (auth, base, stockage, fonctions) | Mobile + web | Toutes les données du service | `ca-central-1` (Montréal). Supabase Inc. est américaine (accès support possible) | Sous-traitant |
| Expo Push Service → APNs / FCM | Mobile | Jeton push, contenu des notifications | États-Unis | Sous-traitant |
| RevenueCat | Mobile (si abonnement) + edge functions | ID utilisateur Supabase, historique d'achat | États-Unis | Sous-traitant |
| Apple App Store / Google Play Billing | Mobile | Achat (Apple/Google sont responsables du paiement) | Variable | Tiers indépendants |
| Stripe | Web uniquement | Courriel, nom, adresse de facturation | États-Unis | Sous-traitant |
| Sentry | Web + edge functions (pas sur mobile) | Erreurs, IP, navigateur ; pas de Session Replay | États-Unis (selon la région du projet Sentry, NON_VERIFIE) | Sous-traitant |
| Vercel | Web | Journaux d'accès (IP) | États-Unis / mondial | Sous-traitant |
| Wistia | Web (vidéos) | Lecture vidéo, IP, cookies du lecteur possibles | États-Unis | Sous-traitant |
| Analytics / publicité / IA tierce | — | **Aucun** SDK d'analytics, de publicité ni d'IA tierce détecté | — | — |

Conséquence : **pas de suivi au sens d'Apple** (pas d'ATT nécessaire), mais **des transferts hors Québec** (Expo, RevenueCat, Stripe, Sentry, Vercel, Wistia) qui exigent une évaluation des facteurs relatifs à la vie privée (EFVP, Loi 25 art. 17).

### 2.4 Données personnelles (service complet, mobile + web)

| Catégorie | Exemples (tables) | Personnes concernées | Sensibilité | Finalité | Base légale RGPD (si UE) ⚖️ | Conservation proposée ⚖️ |
|---|---|---|---|---|---|---|
| Compte | courriel, mot de passe (haché), nom, téléphone, rôle, préférences de notification (`profiles`) | Parents, coachs | Normale | Fournir le service, authentifier | Contrat | Durée du compte + 30 jours |
| Famille | nom de famille, ville/province, co-parents (`families`, `family_members`) | Parents | Normale | Organiser le suivi | Contrat | Durée du compte |
| Enfant | prénom, nom, date de naissance, genre, sport, surnom, numéro de maillot, couleur, photo (`children`, bucket `child-avatars`) | Mineurs 8–17 ans | **Élevée** (mineur) | Personnaliser le programme | Consentement du parent (art. 8 RGPD si service direct à l'enfant ; Loi 25 art. 4.1) | Durée du compte |
| Mesures psychoéducatives | réponses LSSS, EPOCH, PERMA, émotions, objectifs, scores, RPE, bilans, notes et observations du coach, documents (`athlete-documents`) | Mineurs | **Sensible** (bien-être psychologique, possiblement santé) | Suivi du programme, bilans au parent | Consentement explicite (art. 9 RGPD) ; Loi 25 art. 12 (consentement exprès) | Durée du programme + délai à définir ⚖️ |
| Messagerie | messages, pièces jointes | Parents, coachs | Moyenne à élevée | Communication coach ↔ parent | Contrat | Durée du compte |
| Activités « Maison » (P3) | activités faites, carnet des moments, retours | Parents, enfants | Moyenne | Proposer des activités adaptées | Contrat | Durée du compte |
| Abonnement | statut, produit, dates, ID RevenueCat ; client Stripe | Parents | Normale | Gérer l'accès payant | Contrat ; obligation légale (comptabilité) | Données de facturation : 6 ans (obligation fiscale, à confirmer ⚖️) |
| Technique | jeton push, journaux, erreurs Sentry, IP | Tous | Normale | Sécurité, notifications, débogage | Intérêt légitime | 90 jours (à paramétrer) |
| Prospects (liste d'attente) | `waitlist` | Prospects | Normale | Prospection | Consentement | 24 mois max ⚖️ |

---

## 3. Tableau principal

Légende des statuts : ✅ CONFORME · ⚠️ À RISQUE · ❌ NON CONFORME · 🔧 CORRIGÉ SUR LA BRANCHE · ❓ NON_VERIFIE

### 3.1 Bloquants techniques communs

| ID | Store | Règle (numéro + source) | Constat | Risque de rejet | Statut | Correctif |
|---|---|---|---|---|---|---|
| T-01 | Les deux | Apple 2.1, 2.1(b), 4.2 [AG] ; Google « Minimum functionality » | `src/app/` existe, donc Expo Router ignore `app/` (racine choisie dans `getRouterDirectory`). Paywall, messagerie, onboarding, questionnaires, badges, notifications et `useRevenueCatIdentity` ne sont pas dans le binaire. Les produits d'abonnement créés dans App Store Connect seraient introuvables dans l'app (2.1(b)) | **Élevé** | ❌ | Fusionner les deux arbres dans `src/app/` (ou supprimer `src/app/` et migrer les écrans prototypes dans `app/`), puis monter `useRevenueCatIdentity` dans le layout racine retenu. Chantier d'ingénierie, hors périmètre de cet audit |
| T-02 | Les deux | Apple 2.1(a) ; Play Console (icône 512 px, AAB) | Pas d'icône, d'écran de démarrage, d'`eas.json`, d'`extra.eas.projectId`. `getExpoPushTokenAsync` échoue sans `projectId` | **Bloquant** | ❌ | Créer les assets (icône 1024×1024 sans transparence pour iOS), `eas init`, `eas.json` avec profil `production` (AAB, `autoIncrement`) |
| T-03 | Les deux | Apple 2.1(a) | Le client Supabase partagé n'a pas de stockage React Native : la session est en mémoire, l'utilisateur est déconnecté à chaque relance | Moyen | ❌ | Passer un `storage` AsyncStorage (ou SecureStore) au client sur mobile |
| T-04 | Les deux | Apple 2.1(a) | `login.tsx` envoie toujours vers `/(parent)/dashboard` (un coach voit l'espace parent) ; le layout redirige ADMIN vers `/(admin)/dashboard`, route inexistante | Moyen | ❌ | Rediriger selon `user.role` après connexion ; pour ADMIN, écran « Espace administrateur disponible sur le web » ou blocage propre. Ne pas fournir de compte admin au reviewer tant que l'espace n'existe pas |
| T-05 | Les deux | Apple 5.1.2(i) « may not require … push notifications » ; bonnes pratiques | Permission de notification demandée au premier lancement, avant toute connexion et sans explication | Faible | ⚠️ | Demander après connexion, précédée d'un écran expliquant l'usage (messages du coach, rappels de séance) ; l'app doit rester utilisable en cas de refus (c'est le cas) |
| T-06 | Les deux | — | `apps/mobile` exclu de la CI (`.github/workflows/ci.yml`) : aucun typecheck ni test sur le code soumis | Indirect | ⚠️ | Réintégrer `pnpm --filter mobile typecheck` dans la CI avant soumission |

### 3.2 A — Apple App Review Guidelines

Source [AG] : [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), consultées le 2026-10-01.

| ID | Store | Règle (numéro + source) | Constat | Risque de rejet | Statut | Correctif |
|---|---|---|---|---|---|---|
| A-01 | iOS | **1 Sécurité** — 1.1 contenu choquant [AG] | Contenu psychoéducatif, aucun contenu choquant | Nul | ✅ | — |
| A-02 | iOS | 1.2 Contenu généré par les utilisateurs [AG] | Messagerie coach ↔ parent (texte + pièces jointes sur le web) sans signalement, sans blocage, sans coordonnées de contact publiées. Absente du binaire actuel (T-01) mais présente dès que `app/` sera embarqué | Élevé dès que la messagerie est embarquée | ⚠️ | Ajouter : « Signaler ce message » (envoi à l'admin, traitement sous 24 h), « Bloquer / ne plus recevoir de messages » (ou mise en sourdine + signalement à l'admin, puisque le coach est assigné), filtre de mots, adresse de contact dans l'app et la fiche. Mentionner dans les notes au reviewer que la messagerie est privée, 1 à 1, entre un parent et un coach vérifié par THRIVE |
| A-03 | iOS | 1.3 Catégorie Enfants ; 5.1.4 Enfants ; 2.3.8 [AG] | L'app est destinée aux **parents et aux coachs (adultes)**, pas aux enfants. Pas de catégorie Enfants. Aucun SDK d'analytics ou de publicité. Mais l'app traite des données de mineurs (5.1.4 : politique de confidentialité et conformité aux lois sur les enfants obligatoires) | Moyen (métadonnées) | ⚠️ | Catégorie « Santé et forme » ou « Éducation » (pas Enfants). Interdire « pour enfants », « for kids » dans nom, sous-titre, icône, captures, description (2.3.8). Écrire « pour les parents de jeunes sportifs de 8 à 17 ans » |
| A-04 | iOS | 1.4.1 Applications médicales [AG] | Psychoéducation et bien-être des jeunes (mesures LSSS, EPOCH). Pas d'allégation de diagnostic. Le web a une page « Quand consulter » (811, 9-8-8, 9-1-1) ; **le mobile n'a aucun avertissement** | Moyen | ⚠️ | Ajouter un écran ou une ligne « THRIVE ne remplace pas un avis médical ou psychologique » + accès « Quand consulter » dans le Profil. Ne jamais écrire « diagnostic », « traitement », « thérapie » dans les métadonnées. Texte prêt dans `conditions-utilisation.md` §8 |
| A-05 | iOS | 1.5 Informations du développeur [AG] | Aucune adresse de support publiée | Élevé (URL de support obligatoire dans ASC) | ❌ | Publier une page Aide et contact ; renseigner `EXPO_PUBLIC_SUPPORT_URL` (ajouté sur la branche) |
| A-06 | iOS | **2 Performance** — 2.1(a) app complète [AG] | Voir T-01 à T-04. Écrans prototypes en dur (emoji « 👶 », libellés « Brouillon »), aucun contenu « bientôt », pas de lien cassé connu dans `src/app` | **Élevé** | ❌ | Voir T-01 à T-04. Backend de production actif et compte démo pendant la revue |
| A-07 | iOS | 2.1(b) achats intégrés visibles [AG] | Si des abonnements sont soumis avec le binaire, le paywall doit être atteignable : il ne l'est pas (T-01) | **Bloquant si IAP soumis** | ❌ | Embarquer le paywall ou ne pas soumettre les IAP avec cette version |
| A-08 | iOS | 2.3 / 2.3.1 / 2.3.3 / 2.3.7 métadonnées [AG] | Pas encore de fiche. Le nom « THRIVE » seul a de fortes chances d'être déjà pris et entre en conflit avec des marques existantes (voir D-06) ; 30 caractères max | Élevé | ❓ | Nom distinctif, p. ex. « THRIVE Sport Positive » (à valider par recherche de marque). Captures de l'app réelle uniquement, avec données fictives (2.3.9). Textes proposés dans `declarations-stores.md` |
| A-09 | iOS | 2.3.6 classification d'âge (nouveau questionnaire, réponses requises depuis le 31/01/2026) [UR] | Questionnaire à remplir : « Sujets médicaux ou de bien-être » = oui (rare/léger), messagerie entre utilisateurs = oui (si embarquée), publicité = non, contrôles parentaux = non | Moyen | ❓ | Réponses proposées dans `declarations-stores.md` §5 |
| A-10 | iOS | 2.5.x conformité technique ; Xcode 26 + SDK iOS 26 obligatoires depuis le 28/04/2026 ; cible ≥ iOS 13 depuis le 09/09/2026 [UR] | Expo SDK 55 : Xcode 26.2 par défaut sur EAS, iOS minimum 15.1 [EXPO55] | Nul | ✅ | Construire avec l'image EAS par défaut |
| A-11 | iOS | **3 Business** — 3.1.1 / 3.1.2 abonnements [AG] | Paywall (non embarqué) bien conçu : prix, période, essai, renouvellement automatique, annulation 24 h avant, restauration, liens légaux, aucun lien vers Stripe (anti-steering). **Mais** le lien « Politique de confidentialité » est masqué tant que l'URL est vide, et la gestion d'abonnement depuis le Profil n'est pas dans `src/app` | Élevé si embarqué sans URL | ⚠️ | Renseigner les URL légales ; renseigner aussi le lien des Conditions (EULA) dans la description de l'app ou le champ EULA d'App Store Connect (exigence 3.1.2(c)) |
| A-12 | iOS | 3.1.3(b) services multiplateformes [AG] | Abonnement achetable sur le web (Stripe) et reconnu dans l'app : autorisé car aussi proposé en achat intégré | Faible | ✅ | Garder la parité : tout ce qui se vend sur le web doit exister en achat intégré |
| A-13 | iOS | **4 Design** — 4.2 fonctionnalité minimale [AG] | App React Native native (pas un wrapper WebView) ; mais périmètre embarqué très pauvre (T-01) | **Élevé** | ❌ | Embarquer au minimum : Maison (activités du soir, minuteur, carnet), bilans de l'enfant, messagerie, notifications push natives. Valeur native à documenter : notifications push, retour haptique, mode activité plein écran, accès hors ligne au carnet (si implémenté) |
| A-14 | iOS | 4.8 services de connexion [AG] | Connexion courriel + mot de passe uniquement (pas de Google/Facebook) | Nul | ✅ | Si un jour Google Sign-In est ajouté, ajouter Sign in with Apple ou équivalent |
| A-15 | iOS | **5 Légal** — 5.1.1(i) politique de confidentialité [AG] | Aucune politique publiée, aucun lien dans le binaire actuel | **Bloquant** | 🔧 partiel | Lien ajouté dans les Profils et à l'inscription (`AccountPrivacySection`, `register.tsx`), actif dès que `EXPO_PUBLIC_PRIVACY_URL` est renseignée. Reste : publier la politique (brouillon fourni) |
| A-16 | iOS | 5.1.1(ii) consentement [AG] | Aucun consentement recueilli à l'inscription | Moyen | 🔧 | Case à cocher obligatoire (≥ 18 ans, parent/tuteur, acceptation des textes) + version et date enregistrées dans les métadonnées du compte |
| A-17 | iOS | 5.1.1(iii) minimisation [AG] | Nom de famille de l'enfant et date de naissance complète demandés ; le web n'utilise que la tranche d'âge | Faible | ⚠️ | Envisager prénom + mois/année de naissance ⚖️ |
| A-18 | iOS | 5.1.1(v) suppression de compte dans l'app [AG] | Absente | **Bloquant** | 🔧 | Bouton « Supprimer mon compte » (Profils parent et coach) → `request-account-deletion`, avec confirmation, délai de 30 jours annoncé et rappel d'annuler l'abonnement App Store / Google Play. **À tenir côté opérations** : traiter les demandes via `admin-delete-user` dans le délai annoncé |
| A-19 | iOS | 5.1.2(i) partage, IA tierce, ATT [AG] | Aucun partage publicitaire, aucune IA tierce (`generate-parent-report` n'appelle aucun modèle externe) | Nul | ✅ | — |
| A-20 | iOS | 5.1.3 santé [AG] | Pas de HealthKit ; données de bien-être stockées sur Supabase (pas iCloud) ; non utilisées à des fins publicitaires | Faible | ✅ | Ne jamais utiliser ces données pour du marketing ; toute recherche (cahier des charges §« Recherche & mesure d'impact ») exigera consentement des parents et comité d'éthique (5.1.3(iii)-(iv)) |
| A-21 | iOS | 5.1.4 enfants [AG] | Traite des données de mineurs → politique obligatoire et conformité aux lois sur l'enfance | Moyen | ⚠️ | Politique (brouillon fourni) + C-05 |
| A-22 | iOS | Privacy Manifest — raisons approuvées des API obligatoires depuis le 01/05/2024 [UR] | Absent de `app.json` | Moyen (avertissement ITMS-91053 puis rejet) | 🔧 | `ios.privacyManifests` ajouté (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1, `NSPrivacyTracking: false`). À contrôler après le premier build EAS (rapport de confidentialité Xcode). Les SDK RevenueCat et Expo embarquent leurs propres manifestes [RC] |
| A-23 | iOS | App Tracking Transparency [AG 5.1.2(i)] | Aucun suivi | Nul | ✅ | Ne pas ajouter `NSUserTrackingUsageDescription` |
| A-24 | iOS | Chiffrement à l'export | Pas de clé `ITSAppUsesNonExemptEncryption` (question bloquante à chaque envoi) | Faible | 🔧 | `ITSAppUsesNonExemptEncryption: false` (HTTPS standard uniquement) |
| A-25 | iOS | Loi texane SB 2420 (en vigueur le 04/06/2026, API Declared Age Range) [TX] | Si distribuée aux États-Unis, obligations pour les développeurs (signal d'âge, consentement parental, information des parents) | Juridique | ❓ ⚖️ | Lancement au Canada uniquement, ou implémenter Declared Age Range avant une sortie américaine |
| A-26 | iOS | DSA — statut de commerçant obligatoire pour l'UE [UR] | Requis si distribution en France / UE | Bloquant UE | ❓ | Déclarer le statut dans App Store Connect si la France est visée |

### 3.3 B — Google Play

Sources : [TSDK] [PLAYTEST] [PLAYDEL] [PLAYHEALTH] [PLAYFAM] [ADV] (voir §6). Le centre d'aide Play Console (`support.google.com`) est bloqué par le réseau de cet environnement : les points qui en dépendent sont vérifiés par sources secondaires et marqués comme tels.

| ID | Store | Règle (numéro + source) | Constat | Risque de rejet | Statut | Correctif |
|---|---|---|---|---|---|---|
| B-01 | Android | Policy Center — contenu restreint, comportement trompeur | Rien de restreint ; vigilance sur les promesses (« de mieux en mieux au fil de vos retours ») | Faible | ✅ | Garder des formulations vérifiables |
| B-02 | Android | Niveau d'API cible : **Android 16 (API 36)** pour nouvelles apps et mises à jour depuis le **31/08/2026** (prolongation possible jusqu'au 01/11/2026) [TSDK] | Expo SDK 55 : `targetSdkVersion` 36, `compileSdkVersion` 36 [EXPO55] | Nul | ✅ | Vérifier dans l'AAB généré (`bundletool dump manifest`) |
| B-03 | Android | Android App Bundle, Play App Signing, `versionCode` | `versionCode` absent ; pas d'`eas.json` | Bloquant | 🔧 partiel | `versionCode: 1` ajouté ; utiliser `autoIncrement` d'EAS ; activer Play App Signing à la création de l'app |
| B-04 | Android | Données utilisateur — formulaire Data Safety | À remplir ; doit couvrir aussi les SDK (RevenueCat, Expo Push) | Élevé si incohérent | ❓ | Réponses prêtes dans `declarations-stores.md` §1 |
| B-05 | Android | Permissions sensibles | Aucune permission sensible ni restreinte ; alarmes exactes bloquées | Nul | 🔧 | `android.blockedPermissions` ajouté |
| B-06 | Android | Politique de confidentialité dans la Play Console **et** dans l'app | Absente | **Bloquant** | 🔧 partiel | Voir A-15 |
| B-07 | Android | Suppression de compte : chemin **dans l'app** + **lien web** (application depuis le 15/04/2024) [PLAYDEL] | Chemin in-app ajouté ; **aucune URL web** | **Bloquant** | 🔧 partiel | Publier une page web « Supprimer mon compte THRIVE » (formulaire ou procédure) et la déclarer dans la Play Console |
| B-08 | Android | Test fermé : comptes **personnels** créés après le 13/11/2023 → au moins **12 testeurs** inscrits sans interruption pendant **14 jours** avant la production [PLAYTEST] | Type et date du compte inconnus | Bloquant si applicable | ❓ | Si compte personnel récent : recruter 12 testeurs (parents pilotes, coachs) et lancer le test fermé 14 jours. Un compte **organisation** en est exempté |
| B-09 | Android | Questionnaire de classification (IARC), public cible, annonces | À remplir | Moyen | ❓ | Public cible : **18 ans et plus** uniquement (app pour parents et coachs). « Contient des annonces » : non. Voir `declarations-stores.md` §5 |
| B-10 | Android | Familles [PLAYFAM] | Si l'on ne coche pas de tranche < 13 ans, la politique Familles ne s'applique pas ; l'app ne doit pas être « involontairement attrayante » pour les enfants (icône, captures) | Moyen | ⚠️ | Visuels orientés parents ; aucune mention « pour enfants » |
| B-11 | Android | Déclaration des applications de santé (tous les développeurs, même sans fonction santé) [PLAYHEALTH] | À remplir | Moyen | ❓ | Déclarer : bien-être / santé mentale (contenu psychoéducatif), pas de Health Connect, pas de dispositif médical |
| B-12 | Android | Vérification d'identité du développeur [ADV] | Play enregistre automatiquement 99 % des apps ; protections actives au Brésil, en Indonésie, à Singapour et en Thaïlande depuis le 30/09/2026, extension mondiale en 2027 | Faible pour Play | ❓ | Vérification d'identité de la Play Console à terminer (coordonnées, pièce d'identité ou D-U-N-S pour une organisation) |
| B-13 | Android | Paiements — Google Play Billing | Abonnement via Google Play Billing (RevenueCat), sans lien vers Stripe | Faible | ✅ (code) | Pas de mention du prix web dans l'app |

### 3.4 C — Données personnelles et lois

| ID | Store | Règle (numéro + source) | Constat | Risque | Statut | Correctif |
|---|---|---|---|---|---|---|
| C-01 | Les deux | Inventaire (Loi 25 art. 8 ; RGPD art. 30) | Inventaire établi §2.4 | — | ✅ (ce rapport) | Tenir un registre à jour |
| C-02 | Les deux | Politique de confidentialité FR + EN, URL stable, accessible dans l'app et les fiches (Loi 25 art. 3.2 et 8.2 ; Apple 5.1.1(i) ; Google Données utilisateur) | Inexistante | **Bloquant** | ❌ | Brouillon FR + EN fourni ; publier sur p. ex. `https://app.thrivesportpositive.com/confidentialite` (route publique : le `matcher` du middleware ne la protège pas) ⚖️ |
| C-03 | — | Loi 25 : responsable de la protection des renseignements personnels, titre et coordonnées publiés (art. 3.1) ; politiques et pratiques de gouvernance (art. 3.2) ; registre des incidents et avis à la CAI (art. 3.5 à 3.8) ; EFVP avant communication hors Québec (art. 17) [L25] | Non publié ; aucun registre ni EFVP connus | Juridique | ❌ ⚖️ | Désigner le responsable (par défaut la personne ayant la plus haute autorité) et publier ses coordonnées ; mettre en place le registre des incidents ; réaliser l'EFVP pour Expo, RevenueCat, Stripe, Sentry, Vercel, Wistia |
| C-04 | — | RGPD (utilisateurs en France / UE) : base légale, droits, transferts hors UE, sous-traitants, représentant UE (art. 27) | Le web vise aussi la France (placeholders `+33`) ; aucune information RGPD | Juridique | ❌ ⚖️ | Si la France est visée : section RGPD de la politique (fournie), clauses contractuelles types avec chaque sous-traitant, représentant dans l'UE, statut DSA dans App Store Connect. Sinon, limiter la distribution au Canada |
| C-05 | — | Mineurs : Loi 25 art. 4.1 (moins de 14 ans → consentement du titulaire de l'autorité parentale), art. 12 (renseignement sensible → consentement exprès), art. 9.1 (confidentialité par défaut) ; RGPD art. 8 ; COPPA modifiée (conformité exigée depuis le 22/04/2026) [L25] [COPPA] | Pas de compte enfant (bon choix). Le parent ajoute l'enfant ; les questionnaires sont remplis par l'enfant via un lien envoyé au parent (web). Aucun consentement parental explicite enregistré | Juridique | 🔧 partiel ⚖️ | Case de consentement à l'inscription + mention dans l'ajout d'un enfant (branche). À compléter : consentement **exprès et distinct** pour les mesures psychoéducatives (LSSS, EPOCH, PERMA), tracé dans la table `consents` ; politique de conservation écrite (COPPA modifiée) ; exclure les États-Unis au lancement |
| C-06 | Les deux | Bandeau de consentement analytics / marketing | Aucun traceur d'analytics ou de marketing dans l'app mobile → pas de bandeau requis. Sur le web, Wistia peut déposer des témoins : à vérifier | Faible | ❓ | Configurer Wistia sans témoins de suivi (option « privacy mode » / `doNotTrack`) ou ajouter une gestion du consentement sur le web |
| C-07 | Les deux | Suppression effective des données et information sur l'abonnement (Apple 5.1.1(v), Google [PLAYDEL]) | `admin-delete-user` : cascade complète, annulation Stripe, suppression de l'abonné RevenueCat ; un abonnement Apple/Google ne peut être annulé que par l'utilisateur | Moyen | 🔧 partiel | Message in-app ajouté (rappel d'annuler l'abonnement du store). Reste : SLA de traitement, confirmation par courriel, page web pour Google |
| C-08 | — | Portabilité (Loi 25 art. 27, en vigueur depuis le 22/09/2024 ; RGPD art. 20) | Edge function `export-my-data` présente mais **aucun bouton** dans le web ni le mobile | Faible pour les stores, juridique | ⚠️ | Ajouter « Télécharger mes données » dans Profil / Compte |
| C-09 | — | Sécurité | RLS stricte, buckets privés, URL signées, en-têtes de sécurité web (audits `docs/`) | — | ✅ | — |

### 3.5 D — Documents légaux

| ID | Store | Règle | Constat | Risque | Statut | Correctif |
|---|---|---|---|---|---|---|
| D-01 | Les deux | Conditions d'utilisation / EULA (Apple 3.1.2(c), Schedule 2 du DPLA) | Inexistantes ; repli sur l'EULA standard d'Apple (acceptable sur iOS seulement, insuffisant pour le web et Android) | Élevé | ❌ ⚖️ | Brouillon fourni : abonnement, renouvellement, annulation, remboursement (Apple/Google/Stripe), limites de responsabilité, loi applicable (Québec), Loi sur la protection du consommateur du Québec |
| D-02 | Les deux | Mentions légales, contact, support | Absentes ; seules adresses trouvées : exemples fictifs (`marie.dupont@thrive.com`) et `mailto:contact@thrive.app` dans `.env.example` (domaine `thrive.app` probablement non détenu) | Élevé | ❌ | Raison sociale, NEQ, adresse, courriel de support sur un domaine détenu (`thrivesportpositive.com`) |
| D-03 | Les deux | Avertissement santé / sport (Apple 1.4.1) | Présent sur le web (page « Quand consulter »), absent du mobile | Moyen | ⚠️ | Texte fourni (`conditions-utilisation.md` §8) à afficher dans l'app |
| D-04 | — | Conditions pour les coachs | Inexistantes | Juridique | ❌ ⚖️ | Brouillon fourni (`conditions-coachs.md`) : statut, vérification des antécédents, confidentialité, usage de la messagerie, signalement de situations de compromission (DPJ) |
| D-05 | Les deux | Propriété intellectuelle (Apple 2.3.9, 5.2) | 53 vignettes WebP (`apps/web/public/p3/vignettes`), logo, contenus des 13 semaines, questionnaires **LSSS** et **EPOCH** (instruments publiés par des tiers), vidéos Wistia : provenance et licences non documentées. Aucun fichier de licences open source | Moyen | ❓ ⚖️ | Registre des actifs : auteur, licence ou cession, usage IA (outil et conditions d'utilisation). Autorisation écrite des auteurs du LSSS et de l'EPOCH (ou licence). Générer un fichier `THIRD_PARTY_LICENSES` |
| D-06 | Les deux | Marque (Apple 2.3.7, 5.2.1 ; Google « Impersonation ») | « THRIVE » est un terme très utilisé (nombreuses applis et marques « Thrive » existantes) | Élevé (refus du nom, opposition) | ❓ ⚖️ | Recherche de marque (OPIC Canada, USPTO, EUIPO) ; nom de fiche distinctif ; dépôt de « THRIVE Sport Positive » si disponible |

### 3.6 E — Fiches des stores

| ID | Store | Règle | Constat | Risque | Statut | Correctif |
|---|---|---|---|---|---|---|
| E-01 | Les deux | Textes de fiche (Apple 2.3 ; Google Métadonnées) | Inexistants | — | 🔧 | Proposés dans `declarations-stores.md` §6, sans promesse non tenue ni « pour enfants » |
| E-02 | iOS | Captures d'écran : jeu iPhone 6,9 po (1320×2868 / 1290×2796) ou 6,5 po (1284×2778 / 1242×2688), 1 à 10, sans transparence [SS] ; iPad non requis (`supportsTablet: false`) | Inexistantes | Bloquant | ❌ | Captures de l'app réelle, avec données fictives |
| E-03 | Android | Icône 512×512, image de présentation 1024×500, au moins 2 captures | Inexistantes | Bloquant | ❌ ❓ | Specs à confirmer dans la Play Console (centre d'aide inaccessible d'ici) |
| E-04 | iOS | Icône 1024×1024 PNG sans transparence | Inexistante | Bloquant | ❌ | À produire |
| E-05 | Les deux | Classification d'âge cohérente | — | Moyen | ❓ | iOS : note calculée par Apple, probablement entre 9+ et 13+ (bien-être + messagerie) ; Google : IARC « Tout public » probable. Voir §5 du fichier déclarations |
| E-06 | Les deux | URL support / marketing / confidentialité fonctionnelles | Aucune | Bloquant | ❌ | Publier les trois pages |
| E-07 | Les deux | Comptes de démonstration par rôle + données de démo (Apple 2.1(a)) | Inexistants | **Bloquant** | ❌ | Créer `review-parent@…` (famille + 2 enfants fictifs + abonnement offert) et `review-coach@…` (athlètes fictifs, séances). **Pas de compte admin** (espace absent du mobile). Notes au reviewer prêtes (§7 du fichier déclarations) |

### 3.7 F — Compte développeur et entité

| ID | Store | Règle | Constat | Risque | Statut | Correctif |
|---|---|---|---|---|---|---|
| F-01 | Les deux | Compte organisation (Apple : D-U-N-S ; Google : vérification d'organisation) | Inconnu. Les apps RevenueCat existent déjà pour `app.thrive.mobile` (iOS et Android), donc des comptes existent probablement | Bloquant si mauvais type | ❓ | Vérifier que les comptes sont au nom de l'entité légale (et pas d'une personne), pour l'exemption du test fermé Google et le nom du vendeur affiché |
| F-02 | Les deux | Identifiants définitifs | `app.thrive.mobile` partout (Expo, RevenueCat, docs). Domaine inversé `thrive.app` vraisemblablement non détenu. **Immuable** une fois la première version envoyée | Faible (pas une règle de rejet) | ⚠️ | Décider maintenant : garder `app.thrive.mobile` (déjà configuré) ou passer à `com.thrivesportpositive.app` avant le premier envoi |

---

## 4. Correctifs appliqués sur la branche

| Fichier | Changement | Règles visées |
|---|---|---|
| `apps/mobile/src/components/AccountPrivacySection.tsx` (nouveau) | Liens Politique / Conditions / Aide ; « Supprimer mon compte » → `request-account-deletion`, confirmation, délai annoncé, rappel d'annuler l'abonnement du store | Apple 5.1.1(i), 5.1.1(v) ; Google Données utilisateur, suppression de compte |
| `apps/mobile/src/app/(parent)/profile.tsx`, `(coach)/profile.tsx` | Intègrent la section ci-dessus | idem |
| `apps/mobile/src/app/(auth)/register.tsx` | Case obligatoire « 18 ans ou plus, parent ou tuteur, accepte les conditions et la politique » ; version et date du consentement enregistrées dans les métadonnées du compte | Loi 25 art. 4.1 et 14 ; RGPD art. 7 ; Apple 5.1.1(ii) |
| `apps/mobile/src/app/(parent)/children.tsx` | Mention de consentement parental à l'ajout d'un enfant | Loi 25 art. 4.1, 8 |
| `apps/mobile/src/services/legal.ts` (nouveau) | URL légales et de support centralisées (`EXPO_PUBLIC_*`), version des textes | — |
| `apps/mobile/src/components/subscription/theme.ts` | Réexporte `LEGAL` depuis `services/legal.ts` | — |
| `apps/mobile/app.json` | `ios.buildNumber`, `ITSAppUsesNonExemptEncryption: false`, `ios.privacyManifests`, `android.versionCode`, `android.blockedPermissions` | Apple Privacy Manifest, export ; Google permissions |
| `.env.example` | `EXPO_PUBLIC_SUPPORT_URL` | Apple 1.5 |

Vérification faite : contrôle syntaxique esbuild des fichiers modifiés (OK). **Non fait** : typecheck et lancement sur appareil (dépendances non installées ; l'app mobile est hors CI).

Hors périmètre, à planifier : fusion des routeurs (T-01), assets et EAS (T-02), stockage de session (T-03), redirections par rôle (T-04), signalement et blocage dans la messagerie (A-02), avertissement santé dans l'app (A-04), export des données (C-08), pages web légales et de suppression (C-02, B-07).

---

## 5. Ordre de marche recommandé

1. Décision : publier ou non l'app native, et avec quel périmètre (cf. cahier client).
2. Lever T-01 à T-04 et A-13 (périmètre fonctionnel embarqué).
3. Publier politique, conditions, aide et contact, page de suppression (après validation du juriste).
4. Créer assets, EAS, comptes de démo ; remplir les formulaires (Data Safety, App Privacy, âge, santé) avec `declarations-stores.md`.
5. Google : test fermé 14 jours si compte personnel récent. Apple : TestFlight interne.
6. Soumission (par Lylian).

---

## 6. Sources (consultées le 2026-10-01)

- [AG] Apple — App Review Guidelines : https://developer.apple.com/app-store/review/guidelines/
- [UR] Apple — Upcoming Requirements : https://developer.apple.com/news/upcoming-requirements/
- [SS] Apple — Screenshot specifications : https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- [AGE] Apple — Age ratings values and definitions : https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- [TX] Texas SB 2420 en vigueur le 4 juin 2026 : https://www.macrumors.com/2026/06/03/apple-app-store-texas-sb-2420/ ; https://9to5mac.com/2026/06/03/apple-says-texas-app-store-age-assurance-rules-start-tomorrow-after-court-ruling/
- [TSDK] Android — Target API level requirements : https://developer.android.com/google/play/requirements/target-sdk
- [ADV] Android — Developer verification : https://developer.android.com/developer-verification
- [PLAYTEST] Play Console — App testing requirements for new personal developer accounts : https://support.google.com/googleplay/android-developer/answer/14151465 (bloqué depuis cet environnement ; contenu confirmé par sources secondaires, p. ex. https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
- [PLAYDEL] Play Console — Account deletion requirements : https://support.google.com/googleplay/android-developer/answer/13327111 (bloqué ; confirmé par https://android-developers.googleblog.com/2024/03/designing-your-account-deletion-experience-google-play.html)
- [PLAYHEALTH] Play Console — Health apps declaration : https://support.google.com/googleplay/android-developer/answer/14738291 (bloqué ; confirmé par recherche)
- [PLAYFAM] Play Console — Families policies : https://support.google.com/googleplay/android-developer/answer/9893335 (bloqué)
- [EXPO55] Expo SDK 55 : https://expo.dev/changelog/sdk-55 ; https://expo.dev/blog/app-store-connect-minimum-sdk-26
- [ROUTER] Expo CLI, `getRouterDirectory` : https://github.com/expo/expo/blob/main/packages/%40expo/cli/src/start/server/metro/router.ts
- [RC] RevenueCat — Apple App Privacy : https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy (bloqué ; confirmé par recherche)
- [L25] Loi sur la protection des renseignements personnels dans le secteur privé (RLRQ c. P-39.1) : https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1 (bloqué ; texte des art. 3.1, 4.1 et 17 confirmé via https://lpc.quebec/articles/art-3-1-loi-sur-la-protection-des-renseignements-personnels-dans-le-secteur-prive/ et https://lpc.quebec/articles/art-17-loi-sur-la-protection-des-renseignements-personnels-dans-le-secteur-prive/) ; CAI : https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25
- [COPPA] Règle COPPA modifiée, conformité au 22 avril 2026 : https://www.davispolk.com/insights/client-update/ftc-prioritizes-coppa-enforcement-new-compliance-obligations-take-effect

Les numéros d'articles de la Loi 25 autres que 3.1, 4.1 et 17, ainsi que ceux du RGPD, viennent de la connaissance de l'auditeur et n'ont pas pu être relus sur LégisQuébec depuis cet environnement : à confirmer par le juriste.

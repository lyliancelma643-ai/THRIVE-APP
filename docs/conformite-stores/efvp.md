# Évaluation des facteurs relatifs à la vie privée (EFVP)

**Projet :** THRIVE — application web et applications mobiles iOS / Android
**Organisation :** Thrive Sport Positive (Québec, Canada)
**Responsable de la protection des renseignements personnels :** le dirigeant de Thrive Sport Positive (art. 3.1) — confidentialite@thrivesportpositive.com
**Fondements :** Loi sur la protection des renseignements personnels dans le secteur privé (RLRQ, c. P-39.1), notamment art. 3.3 (EFVP de tout projet de système d'information comportant des renseignements personnels) et art. 17 (EFVP avant toute communication à l'extérieur du Québec).
**Version :** 2026-10 · 2 octobre 2026 · à réviser à chaque nouveau sous-traitant, nouvelle finalité ou changement de région d'hébergement, et au moins une fois par an.

---

## 1. Description du projet

THRIVE est un programme psychoéducatif de 13 séances par le sport pour les jeunes de 8 à 17 ans. Les **parents** (comptes adultes) suivent le programme de leur enfant, échangent avec le **coach** assigné, reçoivent des bilans et vivent avec leur enfant des activités du soir (« Le moment qui compte », sur abonnement). **Les enfants n'ont pas de compte.** Ils répondent à des questionnaires (LSSS, EPOCH) sur l'appareil du parent, à partir d'un lien envoyé au parent.

L'hébergement principal (base de données, authentification, fichiers) est situé **au Québec** : Supabase, région AWS `ca-central-1`, à Montréal. Six fournisseurs reçoivent des renseignements **hors du Québec**. Ces communications sont l'objet principal de la présente évaluation.

## 2. Renseignements traités et sensibilité

| Catégorie | Personnes | Sensibilité | Motif |
|---|---|---|---|
| Identité et contact du parent ou du coach (nom, courriel, téléphone) | Adultes | Faible | — |
| Identité de l'enfant (prénom, nom, date de naissance, genre, sport, photo facultative) | Mineurs | **Élevée** | Mineur ; date de naissance ; photo |
| Mesures psychoéducatives (LSSS, EPOCH), émotions, objectifs, effort perçu, bilans, notes et documents du coach | Mineurs | **Très élevée** (renseignement sensible, art. 12) | Bien-être psychologique d'un mineur ; possible inférence sur sa santé |
| Messages parent ↔ coach | Adultes, mais portant souvent sur l'enfant | **Élevée** | Contenu libre, peut révéler des difficultés de l'enfant |
| Activités Maison (moments vécus, phrases gardées) | Familles | Moyenne | Vie familiale |
| Abonnement et facturation | Parents | Faible | — |
| Données techniques (IP, appareil, jeton push, journaux, erreurs) | Tous | Faible | Peuvent contenir des fragments de données applicatives |

## 3. Cartographie des flux hors Québec

| # | Fournisseur | Lieu | Données reçues | Données de mineurs ? | Finalité | Nécessité |
|---|---|---|---|---|---|---|
| F1 | **Expo** (650 Industries) → APNs (Apple) / FCM (Google) | États-Unis | Jeton push de l'appareil ; **titre et texte de la notification**, dont aujourd'hui un **aperçu du message reçu** (`notify` de la migration 056) ; identifiants de conversation | **Oui, indirectement** : l'aperçu d'un message peut parler de l'enfant | Prévenir le parent ou le coach d'un message, d'une séance, d'un bilan | Oui (seul canal de notification mobile) |
| F2 | **RevenueCat** | États-Unis | Identifiant interne du compte (UUID Supabase), historique d'achat, plateforme | Non | Gérer l'abonnement sur les trois plateformes | Oui |
| F3 | **Stripe** | États-Unis / Canada | Courriel, nom, adresse de facturation du parent ; identifiant du compte (métadonnées) | Non | Paiement web | Oui (paiement web) |
| F4 | **Sentry** | États-Unis | Traces d'erreurs, URL, navigateur, adresse IP ; variables pouvant contenir des fragments de données affichées | **Possible** (fragments) | Corriger les pannes | Oui, si la collecte est réduite au strict nécessaire |
| F5 | **Vercel** | États-Unis | Requêtes HTTP de la web app (IP, URL, en-têtes) ; les pages sont rendues côté client, les données métier transitent directement entre le navigateur et Supabase | Non (URL uniquement) | Héberger la web app | Oui |
| F6 | **Wistia** | États-Unis | Lecture des vidéos de séance : IP, navigateur, statistiques de visionnage, témoins du lecteur | Non identifiés (pas de nom) ; visionnage possible par l'enfant | Diffuser les vidéos | Oui |

Apple et Google, en tant que plateformes de paiement des achats intégrés, agissent comme **tiers indépendants** pour le paiement : leurs conditions s'appliquent directement à l'utilisateur, et THRIVE ne leur communique aucune donnée du programme.

## 4. Analyse par flux (critères de l'art. 17)

L'article 17 impose de tenir compte : de la sensibilité du renseignement, de la finalité de son utilisation, des mesures de protection (y compris contractuelles) dont il bénéficierait, et du régime juridique applicable dans l'État de destination. Pour les six flux, l'État de destination est principalement les **États-Unis** : il n'existe pas de loi fédérale générale équivalente à la Loi 25 dans le secteur privé, les autorités peuvent accéder aux données (FISA 702, CLOUD Act), et les lois d'État (dont la CCPA en Californie) offrent une protection partielle. Cela est compensé par les engagements contractuels et techniques décrits ci-dessous.

| Flux | Sensibilité | Protections existantes | Mesures exigées par la présente EFVP | Risque résiduel | Conclusion |
|---|---|---|---|---|---|
| F1 Expo / APNs / FCM | Élevée tant que le texte du message est transmis | TLS ; conditions et DPA d'Expo ; APNs et FCM ne conservent pas les notifications au-delà de la livraison | **M1** : remplacer l'aperçu par un texte générique (« Nouveau message de votre coach »), sans contenu ni prénom d'enfant. **M2** : signer le DPA d'Expo | Faible une fois M1 en place | **Acceptable sous condition de M1** |
| F2 RevenueCat | Faible | UUID sans nom ni courriel ; DPA RevenueCat ; TLS | **M3** : ne pas renseigner d'attributs d'abonné (`$email`, `$displayName`) | Faible | Acceptable |
| F3 Stripe | Faible | Certification PCI DSS niveau 1 ; DPA Stripe ; aucune donnée d'enfant | **M4** : n'envoyer aucune donnée du programme dans les métadonnées Stripe (seulement l'UUID) | Faible | Acceptable |
| F4 Sentry | Moyenne (fragments possibles) | Session Replay désactivé (`instrumentation-client.ts`) ; `sendDefaultPii` non activé ; DPA Sentry | **M5** : ajouter un `beforeSend` qui retire corps de requête, paramètres d'URL et adresse IP ; région UE ou US documentée ; conservation des événements à 30 jours | Faible après M5 | **Acceptable sous condition de M5** |
| F5 Vercel | Faible | Aucune donnée métier côté serveur ; DPA Vercel | **M6** : journaux limités à la durée minimale du plan | Faible | Acceptable |
| F6 Wistia | Faible | Aucun identifiant nominatif transmis | **M7** : activer le mode respectueux de la vie privée du lecteur (pas de témoins de suivi), ou informer et recueillir le consentement sur le web | Faible | Acceptable sous condition de M7 |

## 5. Mesures générales

| # | Mesure | Statut |
|---|---|---|
| G1 | Hébergement principal au Québec (Supabase `ca-central-1`) | En place |
| G2 | Accès limités au niveau de la base (RLS) : parent → sa famille, coach → enfants assignés, admin → selon le rôle | En place |
| G3 | Photos et documents dans un stockage privé, servis par URL signées de courte durée | En place |
| G4 | Aucun compte enfant ; consentement du titulaire de l'autorité parentale à l'inscription et à l'ajout d'un enfant (art. 4.1) | En place (app mobile) ; à aligner sur le web |
| G5 | **Consentement exprès et distinct** pour les mesures psychoéducatives (art. 12), consigné dans la table `consents` (finalité, version, date, retrait) | **À faire** |
| G6 | Politique de conservation et destruction (`politique-conservation.md`) | Rédigée ; purge automatique à mettre en place |
| G7 | Suppression du compte depuis l'app, traitée dans les 30 jours ; page web de suppression | App : en place ; page web : à publier |
| G8 | Registre des incidents de confidentialité et procédure d'avis à la CAI et aux personnes (art. 3.5 à 3.8) | **À créer** (`docs/RUNBOOK-SECURITE-ACTIONS-MANUELLES.md` peut l'accueillir) |
| G9 | Accords de traitement (DPA) signés et archivés avec chaque fournisseur F1 à F6 | **À faire** (acceptation en ligne dans chaque console) |
| G10 | Aucune IA tierce ni outil publicitaire ; toute nouvelle intégration exige une mise à jour de cette EFVP | Règle |

## 6. Conclusion

Les communications hors Québec vers Expo, RevenueCat, Stripe, Sentry, Vercel et Wistia sont **nécessaires** au service. Une fois les mesures **M1** (notifications sans contenu), **M5** (filtrage Sentry), **M7** (Wistia), **G5** (consentement distinct aux mesures psychoéducatives) et **G9** (DPA) appliquées, elles bénéficient d'une **protection adéquate** au sens de l'art. 17. Les renseignements les plus sensibles (mesures psychoéducatives, bilans, notes du coach, documents) restent alors hébergés au Québec et ne sont communiqués à aucun de ces fournisseurs.

Tant que **M1** n'est pas en place, le flux F1 transmet hors Québec des extraits de messages pouvant concerner un enfant : c'est la priorité.

**Décision :** _signature du responsable de la protection des renseignements personnels et date_ — ________________________

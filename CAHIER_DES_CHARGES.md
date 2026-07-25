# CAHIER DES CHARGES — THRIVE APP

**Plateforme psychoéducative par le sport pour les jeunes de 8 à 17 ans**

> Document de référence établi le 15 juillet 2026, à partir de l'intégralité du code source du monorepo (`apps/web`, `apps/mobile`, `packages/shared`, `supabase/`). Il décrit **exclusivement ce qui existe et fonctionne** dans l'application, à l'exception de la dernière section (« Perspectives d'évolution »).

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Design system & expérience utilisateur](#3-design-system--expérience-utilisateur)
4. [Rôles & modèle de permissions (RBAC)](#4-rôles--modèle-de-permissions-rbac)
5. [Authentification & gestion de session](#5-authentification--gestion-de-session)
6. [Cycle d'activation des comptes](#6-cycle-dactivation-des-comptes)
7. [Espace Parent](#7-espace-parent)
8. [Questionnaires enfant à lien tokenisé](#8-questionnaires-enfant-à-lien-tokenisé)
9. [Espace Coach](#9-espace-coach)
10. [Espace Admin / Super Admin](#10-espace-admin--super-admin)
11. [Monétisation — les 3 forfaits](#11-monétisation--les-3-forfaits)
12. [Moteurs psychométriques & de progression](#12-moteurs-psychométriques--de-progression)
13. [Notifications & temps réel](#13-notifications--temps-réel)
14. [PWA, offline & installation](#14-pwa-offline--installation)
15. [Sécurité & conformité](#15-sécurité--conformité)
16. [Base de données](#16-base-de-données)
17. [Edge Functions](#17-edge-functions)
18. [Application mobile (Expo)](#18-application-mobile-expo)
19. [Package partagé](#19-package-partagé)
20. [Qualité, CI/CD & observabilité](#20-qualité-cicd--observabilité)
21. [Environnements & déploiement](#21-environnements--déploiement)
22. [Limites connues & dette technique](#22-limites-connues--dette-technique)
23. [Perspectives d'évolution](#23-perspectives-dévolution)

---

## 1. Présentation générale

### 1.1 Le produit

THRIVE est une plateforme numérique qui accompagne le **protocole THRIVE Sport Positive** : un parcours psychoéducatif de **13 séances individuelles (1:1)** entre un coach certifié et un jeune athlète de 8 à 17 ans, visant le développement des compétences de vie (*life skills*) par le sport.

La plateforme connecte quatre publics :

| Public | Ce qu'il fait dans l'app |
|---|---|
| **Parent** | Suit la progression de son enfant (passeport athlète, bilans de séance, courbes de bien-être), fait vivre les séances vidéo 20 min avec l'enfant, échange avec le coach, gère son forfait |
| **Enfant** | Répond aux questionnaires psychométriques (LSSS, EPOCH) via un lien dédié sans compte ; vit les séances vidéo interactives avec le parent |
| **Coach** | Anime les 13 séances avec fiche interactive minutée, remplit le dossier athlète (identité, objectifs, émotions, routine, documents), envoie les bilans et questionnaires |
| **Admin / Super Admin** | Gère les comptes, valide les inscriptions, assigne coachs et superviseurs, pilote les forfaits, la roadmap interne, les réglages plateforme et l'analytique |

### 1.2 Principes structurants

- **Mobile-first** : ~80 % de l'usage est mobile ; l'app est une **PWA installable** (responsive dès ~380 px, safe-areas iOS, barre d'onglets basse façon application native).
- **Temps réel partout** : toute modification (coach → parent, admin → coach, webhook → UI) se propage instantanément via Supabase Realtime, sans rechargement.
- **La base de données est l'autorité** : l'interface ne fait que *refléter* les droits ; l'enforcement réel est assuré par la Row Level Security (RLS) PostgreSQL et les edge functions. Aucune donnée verrouillée n'atteint jamais le client.
- **Instruments scientifiques validés** : LSSS (Cronin & Allen, 2017 — 43 items officiels) et EPOCH (Kern et al., 2016 — 20 items officiels), pas de questionnaires « maison ».
- **Hébergement des données au Canada** (Supabase région `ca-central-1`) pour la conformité à la **Loi 25** (Québec).

---

## 2. Architecture technique

### 2.1 Monorepo

```
thrive-app/
├── apps/
│   ├── web/          ← Next.js 15 (App Router) + React 19 — LE produit déployé
│   └── mobile/       ← Expo 55 / React Native 0.83 — prototype non déployé
├── packages/
│   └── shared/       ← @thrive/shared : types, enums, hooks, client Supabase, schémas Zod
├── supabase/
│   ├── migrations/   ← 56 migrations SQL versionnées (001 → 052)
│   └── functions/    ← 11 Edge Functions Deno
├── docs/             ← audits sécurité/UX, plan de segmentation forfaits, runbooks
└── .github/workflows ← CI (typecheck · lint · build · Playwright)
```

- **Gestionnaire** : pnpm 9 (workspaces), Node ≥ 20.
- **Qualité imposée par hooks Git** : husky + lint-staged (ESLint --fix + Prettier sur chaque commit) + commitlint (conventional commits).

### 2.2 Stack applicative web

| Couche | Technologie |
|---|---|
| Framework | Next.js 15.5 (App Router, middleware Edge) — port 3001 |
| UI | React 19, Tailwind CSS 3.4, polices Google Inter (texte) + Fraunces (display) |
| État client | Zustand 5 (stores persistés `auth`, `child`, `access`, `plan`) |
| Données serveur | TanStack React Query 5 (cache + invalidation realtime) |
| Formulaires | react-hook-form + zod |
| Backend | **Supabase** : PostgreSQL + Auth + Storage + Realtime + Edge Functions (Deno) |
| Vidéo | Wistia (player embarqué, `hashed_id` stocké dans `video_sessions.video_url`) |
| Paiement | Stripe Checkout + webhook signé (paiement unique CAD) |
| PWA | Serwist 9 (`@serwist/next`) : service worker généré, précache, offline, Web Push VAPID |
| Observabilité | Sentry (`@sentry/nextjs` web + `_shared/sentry.ts` edge) — inerte sans DSN |
| Tests | Playwright (e2e parcours vitaux) |

### 2.3 Modèle d'accès aux données

Le client web parle **directement à Supabase** (pas de backend intermédiaire — le backend NestJS historique a été supprimé) :

1. **Lectures/écritures simples** : client `supabase-js` sous RLS.
2. **Opérations sensibles ou agrégées** : fonctions RPC PostgreSQL (`SECURITY DEFINER` ou `INVOKER` selon le besoin) — ex. `access_state()`, `session_report()`, `dossier_completeness()`, `gauge_summary()`, `perma_send()`.
3. **Opérations privilégiées** (création de comptes, bans, suppressions, Stripe, push) : Edge Functions avec clé `service_role`, gardées par vérification du rôle de l'appelant via `app_metadata`.

---

## 3. Design system & expérience utilisateur

### 3.1 Identité visuelle

- **Palette de marque** : `navy` (bleu profond #022539 et déclinaisons 50→900), `cream` (#F7F5F2, fond des espaces pro), `sun` (jaune #F9EB50, accent et CTA), `sage` (vert doux, validation), `sun-dark`, `sage-light`…
- **Typographies** : Fraunces (titres, `font-display`) et Inter (texte).
- **Deux ambiances distinctes** :
  - *Espace parent* : fond dégradé navy sombre « premium » (type Apple TV/Forme), effets **liquid glass** (`glass-navy`, halos flous, reflets spéculaires), animations de transition de page (`animate-page-in`).
  - *Espaces coach & admin* : fond `cream` clair, cartes blanches `shadow-card`, sidebar navy.

### 3.2 Règles UX transverses (constatées dans tout le code)

- Cibles tactiles ≥ 44 px (`min-h-[44px]` systématique).
- **Squelettes de chargement** partout (jamais de flash d'état vide ou de zéros).
- Modales : triple sortie (clic fond, bouton ✕, touche Échap via `useModalDismiss`), verrou de scroll, et `createPortal(document.body)` pour échapper au conteneur animé du layout parent (piège du `transform`).
- Messages d'erreur Supabase traduits en français lisible (`humanAuthError`).
- Anti double-submit sur tous les formulaires, sauvegarde optimiste avec revert en cas d'erreur.
- Accessibilité : `aria-label`, `aria-pressed`, `aria-busy`, `role="status"`, `aria-live`, `inert` sur les aperçus verrouillés.
- Safe-areas iOS (`safe-top`, `env(safe-area-inset-bottom)`) sur toutes les barres fixes.

---

## 4. Rôles & modèle de permissions (RBAC)

### 4.1 Les 5 rôles

| Rôle | Périmètre |
|---|---|
| `PARENT` | Sa famille : ses enfants, leurs bilans (filtrés par forfait), messagerie avec le coach (si forfait), personnalisation du passeport |
| `COACH` | Ses athlètes **assignés** uniquement (`coach_assignments`) : dossier complet en écriture, séances, questionnaires, messagerie |
| `ADMIN` | Hérite des permissions coach **pour les athlètes des coachs qu'il supervise** (`admin_coach_supervision`, migration 025) + gestion des comptes/validations |
| `SUPER_ADMIN` | Contrôle total : + supervision, réglages plateforme, suppression définitive de comptes, roadmap (édition/suppression), changement de rôles |
| `CHILD` | Rôle déclaratif (profil enfant) — l'enfant n'a **pas** de compte de connexion ; il interagit via les liens tokenisés |

### 4.2 Autorité du rôle — règle de sécurité fondamentale

- La **source d'autorité unique** du rôle est `auth.users.app_metadata.role`, posé exclusivement par les edge functions (clé service) — **jamais** `user_metadata` (modifiable par l'utilisateur lui-même, vecteur d'escalade de privilèges).
- `profiles.role` et `profiles.is_active` sont **verrouillés en base** (migration 018) : un non-admin ne peut pas modifier sa propre ligne.
- Toute auto-inscription reçoit d'office `app_metadata.role = PARENT` (migration 019) — seul rôle self-service.
- Règle métier : **un parent qui a au moins un enfant ne peut jamais devenir COACH ou ADMIN** (vérifiée côté UI *et* dans l'edge function `admin-update-user`).

### 4.3 Hiérarchie de supervision

- Table `admin_coach_supervision` : un coach a **un** admin superviseur actif ; un admin peut superviser plusieurs coachs.
- Helpers SQL en schéma `private` (`SECURITY DEFINER`, anti-récursion RLS) : `can_edit_child_bilan`, `can_view_child_bilan`, `is_parent_of_child`, `is_assigned_coach`, `is_coach_of_family`, `is_program_coach_of_child`, `is_admin`…

---

## 5. Authentification & gestion de session

### 5.1 Page `/login` (3 modes)

- **Connexion** : email + mot de passe (Supabase Auth). Détection d'un second facteur enrôlé → redirection `/mfa-verify?next=/dashboard` avant l'app.
- **Inscription parent** (« style Netflix », active immédiatement, aucun email de validation — un trigger DB confirme l'email) :
  - Prénom, nom, email, mot de passe (min. 8 caractères) ;
  - Déclaration des enfants **dès l'inscription** (lignes dynamiques : prénom, âge 8–17 strictement validé, sport parmi 13 options) ;
  - Création en 2 temps : compte + connexion (bloquant), puis famille + enfants (best-effort — en cas d'échec, l'utilisateur entre quand même dans l'app et ajoutera ses enfants ensuite).
- **Mot de passe oublié** : envoi d'un lien de réinitialisation (`/reset-password`), message neutre anti-énumération de comptes.
- Bannière « compte désactivé » si la session a été coupée à distance (raison stockée en `sessionStorage`, robuste aux courses de navigation).
- Lien de retour permanent vers le **site vitrine** (`thrivesportpositive.com`, configurable `NEXT_PUBLIC_SITE_URL`).

### 5.2 Middleware Edge (protection des routes)

- Routes protégées : `/dashboard`, `/parent/*`, `/coach/*`, `/admin/*`.
- Lecture du token dans le cookie `sb-access-token` (synchronisé par le store), validation `auth.getUser()`, **fail-closed** (toute erreur → redirection `/login`).
- Gate par rôle et par préfixe de route, basé **uniquement** sur `app_metadata.role` :
  - `/parent` → PARENT, ADMIN, SUPER_ADMIN · `/coach` → COACH, ADMIN, SUPER_ADMIN · `/admin` → ADMIN, SUPER_ADMIN.
- `/dashboard` est une page de transit qui redirige selon le rôle (ADMIN→/admin, COACH→/coach/dashboard, défaut→/parent).

### 5.3 Store d'authentification (`auth.store.ts`)

- Zustand persisté (`thrive-auth`), hydratation dédupliquée (un seul `getSession()` en vol même si plusieurs gardes montent en même temps).
- Écoute `onAuthStateChange` : rafraîchissement de token (~1 h) → cookie + store resynchronisés en continu.
- **Backstop désactivation** : après hydratation, revérification en arrière-plan de `profiles.is_active` — un compte banni avec un JWT encore valide est déconnecté immédiatement.
- Déconnexion « à toute épreuve » : purge locale garantie même hors-ligne (`signOut({scope:'local'})` en repli), effacement du profil enfant sélectionné, `location.replace('/login')` (aucun retour arrière possible dans l'app authentifiée).

### 5.4 Synchronisation de compte en direct (`AccountSync`)

Watcher global monté dans le layout racine, abonné en realtime à la ligne `profiles` de l'utilisateur connecté :

- **Désactivation** (`is_active=false`) → déconnexion immédiate + `/login?reason=disabled`.
- **Changement de rôle** → `refreshSession()` (nouveau JWT) puis redirection `/dashboard` (ré-aiguillage automatique).
- **Réconciliation** à chaque (re)connexion du socket : relecture one-shot de l'état réel (rattrape un événement manqué hors-ligne).

### 5.5 MFA / TOTP (double authentification)

- Page `/settings/security` : enrôlement d'une app d'authentification (QR code SVG + secret en clair), vérification du code à 6 chiffres, désenrôlement.
- Modèle AAL Supabase (`aal1`/`aal2`) : le dispositif est **dormant** tant qu'aucun facteur n'est enrôlé (aucun risque de verrouillage des comptes existants).
- **Enforcement sur la zone admin** : si un facteur est enrôlé mais la session est en `aal1`, le layout `/admin` force le step-up via `/mfa-verify`.
- Le login vérifie aussi `needsStepUp` et passe par `/mfa-verify` avant d'entrer dans l'app.

---

## 6. Cycle d'activation des comptes

Flux d'activation (migration 035) — **enforcement côté serveur** par policies RLS *restrictives* sur le contenu parent :

```
Inscription parent → fiche enfant (statut PENDING)
      → Confirmation par l'équipe (Admin/Super Admin : RPC confirm_child)
      → Validation d'accès par le coach (ou un admin : RPC validate_parent_access)
      → Accès complet (unlocked)
```

- **RPC `access_state()`** (SECURITY DEFINER) : source de vérité unique de l'état d'accès côté client — renvoie `role, unlocked, has_child, has_confirmed_child, coach_validated, fitness_enabled`.
- **UI en préparation** : tant que le compte n'est pas activé, le hub parent affiche des **aperçus grisés réels** (titres lisibles, contenu `inert` non cliquable), une bannière premium « Votre espace se prépare », et seul l'onglet Bilan reste cliquable (jamais d'enfermement). Messages in-app au ton « cordial, premium, accompagnement humain » centralisés dans `ACCESS_MESSAGES`.
- **Feature flags serveur** (table `app_settings`, écriture Super Admin uniquement, page `/admin/reglages`) : actuellement `fitness_enabled` — OFF ⇒ la section Fitness affiche « en construction » pour **tous** les comptes ; ON ⇒ bibliothèque vidéo accessible aux comptes activés.
- **Backfill** : les comptes antérieurs à la migration ont été « grand-périsés » (enfants CONFIRMED, parents validés).
- Repli sûr : si la RPC est absente (fenêtre de déploiement), l'UI se comporte « tout ouvert » — la RLS reste l'autorité sur les données.

---

## 7. Espace Parent

### 7.1 Structure & navigation (`/parent`)

- **Header vitré** : logo THRIVE, bouton `+ Ajouter un enfant`, **sélecteur d'enfant** (ChildSwitcher multi-profils, persisté par navigateur), raccourci messagerie ✉, **cloche de notifications**, menu utilisateur (compte, sécurité, forfaits, déconnexion).
- **Tab bar basse « liquid glass »** (3 onglets, bulle de verre animée qui glisse sous l'onglet actif, courbe d'animation type iOS) :
  1. **Bilan** (`/parent/bilans`) — onglet d'accueil (équivalent « Résumé » d'Apple Forme)
  2. **Mes séances** (`/parent/my-sessions`)
  3. **Fitness** (`/parent/fitness`)
- Redirections pérennes : `/parent` → `/parent/bilans`, `/parent/library` → `/parent/fitness`, `/parent/progress` → `/parent/bilans`.

### 7.2 Onglet Bilan — le « Passeport athlète » (`/parent/bilans`)

Pièce maîtresse de l'expérience parent : une **carte d'identité d'athlète** immersive rendue depuis un gabarit HTML/CSS dédié (`bilan-html.ts`, ~850 lignes : grilles responsives, animations CSS pures — jauges balayées, courbes dessinées, halos respirants).

**Contenu de la carte** (données temps réel via TanStack Query + invalidation realtime sur 6 tables) :

- **En-tête passeport** : photo de profil (bucket privé + URL signée), prénom/nom, initiales de secours, **surnom**, **numéro de maillot**, **couleur d'accent**, âge, sport, poste, club, coach attribué, force n°1.
- **Progression du programme** : % calculé (séances complétées / 13) ou **override manuel du coach**, parcours des 13 séances avec statut par nœud.
- **Jauge « compétences de vie »** : score global 0–100 + delta depuis le départ (LSSS), détail par sous-échelle *(selon forfait)*.
- **Courbe LSSS longitudinale** : 3 moments — Départ (S1), Mi-parcours (S7), Bilan final (S13) *(selon forfait)*.
- **Courbe de bien-être EPOCH** : un point par séance, 5 dimensions détaillées, SVG animé.
- **Objectif SMART**, **objectif life skill**, **mes actions**, **rêve de saison**, **histoire sportive**, **forces**.
- **Boîte à outils** (jusqu'à 6 outils avec contexte d'usage), **focus word**.
- **Prochaines étapes** (plan d'action rédigé par le coach : à faire / en cours / fait, échéances).
- **Dernière émotion relevée** *(roue des émotions selon forfait)*.
- **Documents téléchargeables** : contrat de confiance, lettre à moi-même, **certificat THRIVE** (état « prêt » piloté par le coach) — ouverture par URL signée 120 s.
- **Bannières questionnaires en attente** : LSSS (turquoise) et EPOCH (ambre) avec bouton « Ouvrir » direct vers `/q/<token>`.

**Interactions** (délégation de clic sur le HTML généré) :

- Chaque carte « livrable » ouvre une **fiche détaillée** plein écran (16 clés : passeport, programme, perma, lsss, parcours, compétences, boîte, étapes, identité, objectif, focus, émotions, routine, contrat, lettre, certificat) affichant les données de l'enfant en grand ;
- La flèche de la fiche ouvre une **fiche d'explication pédagogique** (`CARD_INFO` : icône, badge, tagline, sections) qui explique au parent ce que mesure chaque outil ;
- Le bouton d'édition ouvre la **modale de personnalisation du passeport** : photo (recadrée carrée 512 px, JPEG compressé côté client), surnom, numéro de maillot, couleur d'accent parmi 6 préréglages (Soleil, Ambre, Sauge, Ciel, Corail, Violet).

### 7.3 Onglet Mes séances (`/parent/my-sessions`)

- **Les 13 séances du protocole** (titres officiels de la méthode) réparties en 3 phases : *Ancrer* (S1–2), *Développer* (S3–10), *Intégrer* (S11–13).
- Chaque séance est **grisée** tant que le coach ne l'a pas validée, puis « s'éclaire » en direct (badge « Validée par le coach », date).
- **Jauge de progression** X/13 dégradé sage→sun.
- **Lecteur de bilan** : lecture inline sous la séance (mobile) ou panneau latéral collant (desktop, fermable par Échap/✕) avec 3 sections servies par le **RPC filtré `session_report`** (le serveur n'expose jamais ce que le forfait ne permet pas) :
  1. **Message du coach** — tous les forfaits ;
  2. **Bilan détaillé** (champs structurés) — Performance : toutes les séances · Avancé : séances 3/7/13 · Essentiel : verrouillé (libellé visible, contenu flouté factice + bandeau d'upgrade) ;
  3. **Observations chiffrées** — grille de jauges circulaires /5 avec échelle de couleur (vert→jaune→gris) ; verrouillé : anneaux visibles, chiffres floutés, **aucune note réelle transmise** (seuls les libellés arrivent au client).
- Mise à jour temps réel (sessions, reports, families → upgrade instantané).

### 7.4 Onglet Fitness — bibliothèque vidéo (`/parent/fitness`)

- **Hero bannière** (~50 % de l'écran) : la **prochaine séance du parcours** de l'enfant (première non complétée), grand numéro en filigrane, CTA « ▶ Lancer la séance », support d'image `thumbnail_url`.
- **Parcours 20 minutes** filtré sur la **tranche d'âge de l'enfant** (8–11 / 12–14 / 15–17, calculée depuis la date de naissance) : progression X/13, rangées par phase avec sous-titres pédagogiques (style Apple Fitness+).
- **Bibliothèque complète** : les 39 séances (13 × 3 tranches d'âge, langue FR, `is_active`), filtres par âge / phase / thème (pilules défilantes), grille de cartes.
- **Gardes d'accès** : flag `fitness_enabled` OFF → « en construction » pour tous ; compte non activé → aperçu réel grisé des séances découverte (`is_free`).

### 7.5 Lecteur de séance interactif (`/parent/session/[id]`)

- Page de détail : thème, phase, titre, sous-titre, description, durée, life skill, nombre d'interactions ; écran « Prêt avec {enfant} ? » avant lancement.
- **Player unifié** : Wistia (id extrait de `video_url`) avec ses contrôles natifs, **ou** balise `<video>` avec contrôles personnalisés (play/pause, seek à zone tactile élargie, plein écran, temps).
- **Moments interactifs** : aux timecodes définis (`video_interaction_points`), la vidéo se met en pause et affiche une **question A/B/C/D** en overlay (scrollable sur mobile) ; chaque réponse porte un `tag` et un `score` optionnels ; feedback positif 1,8 s puis reprise automatique.
- **RPE de fin** (« C'était difficile aujourd'hui ? » 0–10) puis écran de célébration avec **suggestion de transfert à la maison** liée au life skill de la séance.
- **Traçabilité complète** (`video_session_runs`) : run créé au premier play (garde anti-doublon StrictMode), progression sauvée toutes les 10 s **+ flush** à la fermeture/perte de visibilité de la page, journal des réponses (`answers_log` horodaté), RPE, `completed_at`. Bandeau discret « Progression non enregistrée » en cas d'échec de synchronisation, avec retry au play suivant.

### 7.6 Messagerie parent ↔ coach (`/parent/messages`)

- Fil de discussion direct avec **le coach attribué à l'enfant sélectionné** ; conversation créée au premier passage (une par duo coach·parent, gestion de la course au doublon).
- Bulles horodatées (sage = parent, verre = coach), réception **temps réel**, auto-scroll.
- **Exclusivité du forfait Performance** (`coachMessaging`) : les autres forfaits voient un **teaser flouté factice** (aucune donnée réelle) + bandeau d'upgrade. Enforcement serveur : policies RLS restrictives sur l'INSERT (migration 041) — la lecture de l'historique survit à un downgrade.

### 7.7 Forfaits & upgrade (`/parent/upgrade`)

- **Tableau comparatif des 3 forfaits** (20 lignes de fonctionnalités/limites — voir §11), forfait courant surligné « Votre forfait », paliers inférieurs « Inclus dans votre forfait ».
- **Achat** : Stripe Checkout via edge function → webhook → entitlement → `families.pack` (seul chemin d'écriture autorisé). **Repli gracieux** tant que Stripe n'est pas configuré : message invitant à contacter le coach.
- Mentions : paiement unique CAD pour le parcours de 13 séances, application immédiate à toute la famille, bilans régénérés à la profondeur du nouveau forfait.

### 7.8 Ajout de membres (`/parent/select-profile`)

- Parcours en étapes : choix Parent/Enfant → formulaire → succès.
- **Contrôle des quotas du forfait** (maxChildren / maxParents) : si le quota est atteint, écran dédié avec explication et CTA « Voir les forfaits » (la base revérifie par trigger — migration 039).
- **Co-parent** : créé via l'edge function `admin-create-user` (ne bascule pas la session du parent connecté), rattaché à `family_members`, puis **email « définir mon mot de passe »** envoyé automatiquement.
- **Enfant** : prénom, nom, âge (converti en date de naissance), genre, sport, notes ; création automatique de la famille si première fois ; statut PENDING → visible instantanément dans l'admin.

### 7.9 Mon compte (`/parent/compte`)

- Édition prénom/nom (propagée via `auth.updateUser` + re-hydratation du store), lecture email + type de compte.
- **Toggle notifications push** (WebPushToggle — invisible si non supporté/configuré).
- Déconnexion. Changement d'email/mot de passe : via le coach ou l'admin (choix produit).

---

## 8. Questionnaires enfant à lien tokenisé

### 8.1 Principe (`/q/[token]`)

- Page **publique sans authentification** : l'enfant n'a pas de compte. L'accès est gardé par un **token unique** ; chargement et soumission passent par les RPC `SECURITY DEFINER` `questionnaire_get` / `questionnaire_submit` (seules RPC volontairement ouvertes à `anon`, garde par token dans le corps).
- **Bilingue FR/EN** (langue dictée par le questionnaire), design immersif dédié : fond radial **turquoise** pour le LSSS, **ambré chaud** pour l'EPOCH.
- Salutation personnalisée (« Salut {prénom} 👋 »), consigne rassurante (« pas de bonne ou mauvaise réponse »), **barre de progression collante** (X/N réponses, %), questions groupées par sous-échelle/pilier, échelle 1–5 à gros boutons tactiles avec libellé.
- Bouton d'envoi actif seulement quand tout est répondu ; états gérés : succès 🎉, déjà complété, lien expiré, lien invalide ; note de confidentialité (« Tes réponses sont partagées avec ton coach »).
- Après soumission, **invalidation du cache bilan** → la courbe du parent se met à jour sans attendre.

### 8.2 Les deux instruments

| | **LSSS** | **EPOCH** (sous-système technique `PERMA`) |
|---|---|---|
| Instrument | Life Skills Scale for Sport (Cronin & Allen 2017) | EPOCH Measure of Adolescent Well-Being (Kern et al. 2016) |
| Items | **43 items officiels**, 8 sous-échelles : Travail d'équipe (7), Fixation d'objectifs (7), Habiletés sociales (5), Résolution de problèmes (4), Habiletés émotionnelles (4), Leadership (8), Gestion du temps (4), Communication (4) | **20 items officiels**, 5 sous-échelles × 4 items : Engagement, Persévérance, Optimisme, Connexion aux autres, Bonheur |
| Échelle | Accord 1–5 (Pas du tout → Tout à fait) | Fréquence 1–5 (Presque jamais → Presque toujours) |
| Cadence | 3 moments : **Départ (S1) · Mi-parcours (S7) · Bilan final (S13)** | **À chaque séance** (pulse post-séance) |
| Alimente | `skill_scores` (source QUESTIONNAIRE_LSSS) → jauge compétences de vie + courbe longitudinale | `perma_scores` (séparé — bien-être ≠ compétences) → courbe EPOCH du bilan |
| Envoi | Coach : RPC `lsss_send(child, moment)` | Coach : RPC `perma_send(child, session, lang)` |

### 8.3 Verrou anti-doublon (migration 047)

- **Un seul questionnaire** par (enfant, séance) pour EPOCH et par (enfant, moment) pour LSSS : index uniques partiels + RPC idempotentes — un second envoi renvoie l'existant avec `already_sent=true`, **sans** créer de doublon ni de nouvelle notification.
- Chaque envoi notifie le parent (cloche in-app + Web Push le cas échéant) avec le lien `/q/<token>` à faire compléter par l'enfant.

---

## 9. Espace Coach

Navigation (sidebar desktop / tab bar mobile) : **Tableau de bord · Séances · Mes athlètes · Bilans · Suivi · Messages**.

### 9.1 Tableau de bord (`/coach/dashboard`)

- Stats : athlètes assignés, séances du jour, séances à venir (8 prochaines planifiées, fenêtre glissante).
- Bannière d'alerte **dossiers incomplets** (lien vers le suivi).
- Liste des prochaines séances 1:1 (clic → fiche athlète) et grille « Mes athlètes ».
- Realtime avec **refetch débouncé 400 ms** : une assignation faite par l'admin apparaît en direct.

### 9.2 Séances (`/coach/sessions`)

- Toutes les séances de ses athlètes, ordonnées par numéro.
- Action clé : **Valider** (status COMPLETED + `completed_at`) → la séance « s'éclaire » instantanément chez le parent ; possibilité d'**annuler la validation** (retour SCHEDULED).

### 9.3 Mes athlètes & fiche athlète (`/coach/athletes`, `/coach/athletes/[id]`)

Fiche = **AthleteWorkspace**, l'espace de travail complet du dossier (partagé avec l'admin) :

- **Carte de complétude du dossier** (RPC `dossier_completeness`) : %, items faits/manquants, rafraîchie après chaque enregistrement.
- **% de complétion du programme** : automatique (séances/13) ou **override manuel** (curseur 0–100).
- 9 accordéons d'édition :
  1. **Carte d'identité de l'athlète** (ouvert par défaut) : sport, poste, club, histoire sportive, forces, rêve de saison, objectif SMART, objectif life skill, mes actions, boîte à outils (outil + contexte), focus word, lettre, notes — garde anti-écrasement si le chargement a échoué ;
  2. **Objectifs SMART détaillés** : TECHNIQUE / LIFE_SKILL, échéance, statut (à commencer / en cours / atteint), progression, tri ;
  3. **Parcours des 13 séances** : statut par séance (6 états : à venir, en cours, complétée, manquée, reportée, annulée) + notes du coach ;
  4. **Routine de pré-tir** : séquence personnalisée éditable ;
  5. **Roue des émotions** : relevés (émotion, intensité, contexte, n° de séance) ;
  6. **Documents PDF** : upload (contrat / lettre / certificat / autre) vers le bucket privé `athlete-documents` avec métadonnées, visibilité parent par document, URL signées, suppression avec nettoyage storage, rollback anti-orphelin ;
  7. **Bien-être EPOCH** : envoi du questionnaire par séance + courbe 5 dimensions ;
  8. **Questionnaire LSSS** : envoi par moment + résultats par sous-échelle ;
  9. **Prochaines étapes** : plan d'action visible par le parent.
- Bandeau « **Synchronisé en direct avec l'espace parent** » — chaque écriture est diffusée en realtime.

### 9.4 Séance en direct (`/coach/athletes/[id]/session/[sessionId]`)

Fiche de séance interactive **générée depuis les documents officiels de la méthode** (39 scripts : 13 séances × 3 tranches d'âge, `session-scripts.json`) :

- **Chrono de séance** : bouton « ▶ Commencer », minuteur qui met en évidence le bloc en cours (les titres `0:05–0:20 — Bloc…` sont parsés), **navigation rapide collante** entre les étapes minutées.
- **Blocs typés** : sections, callouts (⚠️ points de vigilance / encadrés navy), **verbatims** de la méthode (« 💬 »), chips, **checklists** cochables, **grilles d'observation** (indicateurs cotés 1–5, « 1 fragile · 5 solide » — indicateurs propres à chaque séance et tranche d'âge, cf. `thrive-guides.ts`), champs de notes libres.
- **Message bilan aux parents pré-rempli** depuis le gabarit officiel de la méthode, avec prénom de l'enfant et nom du coach injectés ; passages « … » à personnaliser.
- **Brouillon automatique** en localStorage (debounce 600 ms) : cases, notes, message, chrono — rien ne se perd, restauré au retour.
- **Envoi du bilan** (« Terminer & envoyer ») :
  1. Séance → COMPLETED (s'éclaire chez le parent) ;
  2. Insertion `reports` (contenu JSON : message, observations chiffrées, notes) — le canal officiel lu par `session_report` ;
  3. **Best-effort** : alimentation du moteur de bilans structuré (`coach_reports` → edge function `generate-parent-report` → `parent_reports`) sans bloquer l'envoi principal ;
  4. Purge du brouillon, retour à la fiche athlète.
- Barre d'envoi fixe : chrono, compteurs (indicateurs cotés, notes), bouton (ré)envoyer.

### 9.5 Bilans (`/coach/bilan`) & Suivi (`/coach/dossiers`)

- **Bilans** : liste des athlètes à gauche, fiche intégrale éditable à droite (même AthleteWorkspace).
- **Suivi** : tableau de complétude de tous ses dossiers (RPC `list_dossiers`, filtré par rôle) — %, items manquants, séances complétées, LSSS en attente.

### 9.6 Messages (`/coach/messages`)

Messagerie miroir de celle du parent : conversations avec les parents de ses athlètes, temps réel.

---

## 10. Espace Admin / Super Admin

Navigation (18 entrées ; deux réservées au Super Admin) : Dashboard · Dossiers · **Supervision*** · Validations · Roadmap · Comptes · Coaches · Familles · Enfants · Assignations · Programmes · Questionnaires · Badges · Messages · Notifications · Analytics · **Réglages*** · Sécurité.

### 10.1 Dashboard (`/admin`)

- 8 KPI cliquables (parents, familles, enfants actifs, coaches, programmes, programmes actifs, séances totales, taux de complétion) — comptages `head:true` scalables.
- Bannière dossiers incomplets, indicateur « Temps réel », tableau des 8 dernières inscriptions (rôle, statut, date).
- Realtime débouncé sur 5 tables.

### 10.2 Comptes (`/admin/users`)

- Table complète des profils : filtres par rôle (6), recherche nom/email, badge « (vous) ».
- **Modifications en attente** (staging) : changements de rôle (Super Admin seulement, hors SUPER_ADMIN et hors soi-même) et activation/désactivation mis en file, surlignés ambre, appliqués **en lot** via l'edge function `admin-update-user` (rapport appliqués/échecs, statut 207 partiel géré). Barre flottante « N modifications en attente / Annuler / Enregistrer ».
- Rôle **verrouillé 🔒 sur PARENT** pour tout parent ayant des enfants (règle vérifiée aussi côté serveur).
- **Désactivation = ban réel** Supabase Auth (bloque la connexion) + `is_active=false` ; réactivation = un-ban.
- **Suppression définitive** (Super Admin) : modale de confirmation par **saisie exacte de l'email**, edge function `admin-delete-user` — supprime Auth + cascade complète (famille, enfants, bilans, messages…), **libère l'adresse mail** ; garde-fous anti-lockout (jamais soi-même, jamais un SUPER_ADMIN) et FK RESTRICT qui protègent un coach encore titulaire.
- **Création de comptes** : modale Parent/Coach/Admin (Admin réservé au Super Admin) — actif immédiatement, sans email de validation ; champ spécialité pour les coachs.
- **Création d'enfant** : rattachement à un parent existant (famille créée au besoin).

### 10.3 Coaches (`/admin/coaches`)

- Vue enrichie `admin_coaches_view` (téléphone, spécialité, bio, compteurs programmes/séances/enfants) avec fallback `profiles`.
- Création via edge function `admin-create-coach` : validations complètes + **jauge de force du mot de passe** (5 niveaux).
- Activation/désactivation (ban réel), recherche, filtres actif/inactif, realtime.

### 10.4 Familles (`/admin/families`)

- Tous les parents avec leur famille, ville/province, nombre d'enfants, **et le forfait** : **sélecteur de pack inline** (écriture directe autorisée par le verrou de la migration 023 pour les admins), optimiste avec revert.

### 10.5 Enfants (`/admin/children`)

- Table jointe (famille, parent, email, compteurs programmes/badges), âge calculé, filtres/recherche.
- Accès à l'**éditeur de carte d'identité** en modale.
- **Suppression définitive** avec cascade Postgres (séances, rapports, badges, inscriptions, assignations, runs vidéo) — propagée en realtime au ChildSwitcher parent et aux espaces coach.

### 10.6 Validations (`/admin/validations`)

File d'activation à deux étages : **enfants PENDING** (bouton « Confirmer » → RPC `confirm_child`) et **parents en attente de validation coach** (bouton « Activer l'accès » → RPC `validate_parent_access` — l'admin peut débloquer à la place du coach).

### 10.7 Supervision (`/admin/supervision`) — Super Admin

Attribution de chaque **coach à un admin superviseur** (cartes récap par admin avec compteur, sélecteur par coach, un seul lien actif par coach). Détermine ce que chaque admin voit et gère.

### 10.8 Dossiers (`/admin/dossiers`, `/admin/dossiers/[id]`)

- Même tableau de complétude que le coach, filtré aux coachs supervisés (tous pour le Super Admin).
- Bouton **envoi manuel des rappels d'incomplétude** (RPC `notify_incomplete_dossiers(p_days:7)`).
- Correction directe d'un dossier via le même AthleteWorkspace (héritage total des permissions coach par RLS).

### 10.9 Roadmap v2 (`/admin/roadmap`) — gestion de projet interne

- **3 vues** : Organisation (colonnes par horizon), Calendrier (grille mensuelle), Vue d'ensemble (KPIs, retards, problèmes, charge d'équipe, flux d'activité live).
- **Tâches** : titre, description, groupe (8 catégories : Urgent, Coaching, Contenu, Développement, Pratique, Marketing, Administratif, Général), priorité (3 niveaux), statut (À faire / En cours / En révision / Bloquée / Terminée), échéance, assigné, **section Problème** (posée par l'assigné, résolue par le Super Admin), signatures créé par / complété par.
- **Classement automatique par horizon** selon la deadline (trigger SQL : ≤7 j → Semaine, ≤1 mois, ≤3 mois, Année) avec miroir client pour l'aperçu instantané.
- **Détail de tâche** : commentaires avec **mentions**, pièces jointes (liens avec détection automatique du service : Google Docs, Drive, Dropbox, Notion, Figma… / fichiers), **historique complet** (qui a changé quoi, ancienne → nouvelle valeur, verbalisé en français).
- **Bannière rouge « changements récents »** : tout ce que les *autres* admins ont fait depuis le dernier « Vu » — curseur global persisté en base (`admin_activity_seen`) + rejets **ligne par ligne** (`admin_activity_dismissed`), donc suivi cross-appareils.
- **Chat d'équipe** par canaux (# général + un canal par groupe), **mode sombre** mémorisé, filtres avancés (statut, priorité, assigné, groupe, recherche, afficher/masquer terminées), ajout rapide, **rappels d'échéance** (RPC `notify_admin_task_deadlines` à l'ouverture).
- **Droits** : Super Admin = contrôle total ; Admin = créer, se saisir, avancer SES tâches, signaler un problème, commenter, joindre (RLS + triggers).

### 10.10 Autres sections

- **Assignations** : sélecteur coach par enfant (désactivation de l'ancienne assignation + upsert) ; l'assignation **crée automatiquement le programme des 13 séances** de l'enfant (trigger migration 016).
- **Programmes** : liste avec coach, inscriptions, séances ; changement de statut (Actif / Brouillon / En pause / Terminé / Archivé) avec confirmation d'archivage.
- **Questionnaires** : consultation des questionnaires et de leurs questions (types : échelle, oui/non, choix multiple, texte).
- **Badges** : référentiel de gamification — nom, icône, couleur, catégorie (Participation, Progression, Exploit, Social, Spécial), **condition d'attribution** (séances complétées, questionnaires complétés, % de score, programmes terminés, ou manuelle), activation, stats d'attribution.
- **Messages** : supervision de toutes les conversations (liste optimisée sans N+1, lecture des fils).
- **Notifications** : centre de notifications (100 dernières, filtres type/non-lues, stats) + **envoi manuel** d'une notification à un utilisateur.
- **Analytics** : 4 onglets (Vue globale, Coaches, Enfants, Badges) sur vues SQL agrégées — KPIs globaux, activité mensuelle 12 mois (mini bar charts séances/messages), performance par coach, progression par enfant, distribution des badges, **export CSV des séances**.
- **Réglages** (Super Admin) : feature flags serveur (`app_settings`) avec interrupteurs — actuellement `fitness_enabled`.
- **Sécurité** : page MFA partagée (`/settings/security`).

---

## 11. Monétisation — les 3 forfaits

### 11.1 Offre (paiement unique CAD, parcours complet)

| | **ESSENTIEL — 1 700 $** | **AVANCÉ — 2 000 $** | **PERFORMANCE — 2 500 $** |
|---|---|---|---|
| Tagline | Le parcours THRIVE complet avec votre coach | Comprenez la progression, aux moments clés | L'accompagnement le plus profond et personnalisé |
| Coach 1:1 (13 séances), bibliothèque vidéo, carte d'identité, message du coach/séance, jauge globale, certificat | ✓ | ✓ | ✓ |
| Bilan détaillé + observations chiffrées | — | Séances 3 · 7 · 13 | Toutes les séances |
| Jauge par compétence + évolution | — | ✓ | ✓ |
| Courbe LSSS longitudinale | — | ✓ | ✓ |
| Roue des émotions | — | ✓ | ✓ |
| Journal de progression | — | ✓ | ✓ |
| Lettre personnalisée du coach | — | ✓ | ✓ |
| Messagerie directe avec le coach | — | — | ✓ |
| Export CSV / PDF · gabarits premium | — | — | ✓ |
| Synthèse IA de fin de parcours | *À venir* | *À venir* | *À venir* (flag OFF partout — aucune intégration LLM, décision produit) |
| Profils enfants / comptes parents | 1 / 1 | 2 / 2 | Illimité |
| Historique conservé | 3 mois | 12 mois | Illimité |
| Stockage documents | 100 Mo | 500 Mo | 2 000 Mo |

### 11.2 Implémentation en couches

1. **Matrice de référence** : table `plans` (migration 038) + copie conforme TypeScript (`lib/packs.ts` : `can()`, `limit()`, `quotaReached()`, `canSeePremium()`, textes d'incitation) ;
2. **Journal d'achat** : `entitlements` (un seul ACTIVE par famille) → **trigger** de synchronisation vers `families.pack` — seul chemin d'écriture (verrou d'autorité migration 023 : service_role et admins uniquement, un parent ne peut pas s'auto-upgrader) ;
3. **Enforcement RLS** (migration 039) : seule la branche PARENT des policies est filtrée par le pack (pattern CASE) ; RPC `session_report` ne sert que ce que le forfait permet ; verrou messagerie (041) ; quotas par triggers ;
4. **Reflet UI** : hook `usePlan(childId)` (store Zustand + realtime sur `families` → un upgrade Stripe se reflète en direct dans toute l'UI), composants de teasing partagés (`ScoreGauge` verrouillée, `LockedText`, `UpgradeHintBar`, `BilanCard`) — règle : structure visible, **jamais de données réelles floutées** (le flou porte sur du factice).

### 11.3 Chaîne de paiement Stripe

- `create-checkout-session` (JWT parent requis) : session Checkout paiement unique CAD par `plan_code` — 503 `not_configured` sans clé (repli UI propre).
- `stripe-webhook` (sans JWT ; **signature HMAC SHA-256 vérifiée manuellement, tolérance 5 min**) : sur `checkout.session.completed`, écrit l'entitlement ACTIVE → le trigger synchronise le pack.
- État actuel : chaîne complète déployée et testée, **clés Stripe de production non posées** (repli actif).

---

## 12. Moteurs psychométriques & de progression

- **`skill_scores`** : un score 0–100 par dimension, traçable à sa source (questionnaire LSSS, etc.) — écriture réservée aux fonctions serveur.
- **`gauge_summary(child)`** : agrège en jauge globale + par sous-échelle (SECURITY INVOKER : respecte la RLS, un appelant non autorisé obtient une jauge vide).
- **`lsss_progression(child)`** : les 3 points de la courbe longitudinale.
- **`perma_scores` / `perma_progression(child)`** : bien-être EPOCH par séance (séparé des compétences), avec les 5 sous-scores par point.
- **`progress_log`** : fil d'actualité de progrès (timeline).
- **Moteur de complétude** (migration 030) : `dossier_completeness(child)` (checklist normalisée — 13 items socle + certificat exigé une fois les 13 séances complétées — %, manquants), `list_dossiers()` (source unique du % pour tous les UI, filtré par rôle), `notify_incomplete_dossiers(days)` (rappels in-app coach + admin superviseur, throttle par table `dossier_reminders`).
- **Moteur de bilans structuré** (migration 022) : `coach_reports` (saisie structurée) → edge function `generate-parent-report` → `parent_reports` (version parent assemblée selon **séance × âge × pack × langue** via `report_templates`, idempotent) — coexiste avec le canal legacy `reports` (JSONB) qui reste le canal principal affiché.
- **Moteur d'engagement** (migrations 037b/044, présent en base) : `bilan_reveal` (révélation du bilan), `thrive_moments`, `family_streaks` (assiduité), `gauge_progress_milestones`, `family_status` avec fenêtre de renouvellement — fonctions et triggers synchronisés depuis la prod.
- **Guides d'observation** (`thrive-guides.ts`) : pour chaque séance × tranche d'âge, l'objectif pédagogique officiel + 4 à 6 indicateurs d'observation + verbatim d'ouverture — alimentent les grilles cotées du coach.

---

## 13. Notifications & temps réel

### 13.1 Temps réel (Supabase Realtime)

- Publication `supabase_realtime` sur toutes les tables vivantes (profiles, children, families, sessions, reports, coach_assignments, athlete_identity, questionnaires, admin_tasks, messages, notifications, web_push…), `REPLICA IDENTITY FULL` pour diffuser UPDATE/DELETE sous RLS (migration 012).
- **La RLS s'applique aux événements** : chaque abonné ne reçoit que les lignes qu'il a le droit de lire.
- Patterns : invalidation React Query (bilan), refetch débouncé 400 ms (dashboards), append direct (messagerie).

### 13.2 Notifications in-app

- Table `notifications` (types : MESSAGE, SESSION, BADGE, PROGRAM, SYSTEM + types questionnaires/tâches) ; triggers automatiques (nouveau message, séance planifiée, questionnaire envoyé, échéances roadmap).
- **Cloche parent** : badge non-lus, panneau des 20 dernières, « il y a X min », clic → ouvre `data.path` (ex. `/q/<token>`) et marque lue ; realtime.
- Page admin d'envoi manuel et de supervision.

### 13.3 Web Push (PWA)

- Abonnements par navigateur (`web_push_subscriptions` : endpoint, p256dh, auth, user_agent), toggle dans « Mon compte », désabonnement nettoyé des deux côtés.
- Clé VAPID publique servie par env ou RPC `vapid_public_key` (secrets dans **Supabase Vault**).
- **Chaîne d'envoi** : trigger sur `notifications` → `pg_net.http_post` → edge function `send-web-push` (authentifiée par secret partagé Vault `x-push-secret`, ou service_role, ou admin) → notification native sur le téléphone ; **no-op propre sans secrets** (l'in-app part quand même).
- Service worker : affichage de la notification (icône THRIVE), clic → focus/ouverture de l'app sur l'URL portée (défaut `/parent/bilans`).
- Canal **Expo Push** parallèle pour l'app mobile (`send-push-notification`, `push_notification_logs`).

---

## 14. PWA, offline & installation

- **Manifest** : nom « THRIVE Sport Positive », `display: standalone`, orientation portrait, `start_url: /dashboard` (retombe dans l'espace du rôle), thème #022539, icônes 192/512 + **maskable**.
- **Service worker Serwist** (généré en prod uniquement) : précache du shell Next, cache-first sur les statiques, network-first sur les pages, **jamais de cache sur Supabase**, `skipWaiting` + `clientsClaim` + navigation preload.
- **Page `/offline`** brandée servie en fallback pour toute navigation sans réseau.
- Pages d'erreur dédiées : `error.tsx`, `global-error.tsx` (avec rapport Sentry), `not-found.tsx` brandée.

---

## 15. Sécurité & conformité

### 15.1 Durcissements en base (chronologie des migrations)

- **Verrou des colonnes sensibles** : `profiles.role` / `is_active` (018), `families.pack` (023) — modifiables uniquement par service_role/admin.
- **Autorité `app_metadata`** (019) : rôle non falsifiable, backfillé, `handle_new_user` force PARENT et interdit l'auto-attribution ADMIN (009).
- **Anti-récursion RLS** par fonctions `SECURITY DEFINER` en schéma `private` (014, 015, 025).
- **Révocation `anon`** de toutes les RPC sauf les 4 tokenisées (031, 032, 044) ; fin du GRANT implicite PUBLIC pour les fonctions futures.
- **`search_path` durci** sur toutes les fonctions SECURITY DEFINER (034) — anti-détournement de schéma.
- **Performance RLS sans changement de droits** (046/046b) : `auth.uid()` en sous-select (initplan, évalué 1×/requête), suppression des policies doublons, grants resserrés `{public}`→`authenticated`, **index sur les 22 FK non couvertes**.
- **Policies restrictives** pour le cycle d'activation (035), le forfait (039), la messagerie (041) et le verrouillage de la lecture brute des `reports` côté parent (040).

### 15.2 En-têtes HTTP (next.config)

CSP fonctionnelle (self + Supabase + Wistia + Sentry ; `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`), **HSTS 2 ans preload**, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (géoloc/micro/caméra/paiement coupés), DNS prefetch off.

### 15.3 Données personnelles (Loi 25 / RGPD)

- Hébergement **ca-central-1** (projet Supabase THRIVE-CA), migration effectuée depuis l'ancien projet US.
- **`export-my-data`** : export JSON complet des données de l'utilisateur (portabilité).
- **`request-account-deletion`** : demande de droit à l'oubli (table `deletion_requests`) ; suppression effective par le Super Admin (`admin-delete-user`, cascade totale + libération de l'email).
- **Photos de mineurs** : bucket `child-avatars` **privé**, chemins imposés `<child_id>/…` (la RLS storage s'appuie sur le préfixe), affichage exclusivement par URL signée (60 min) ; lecture = quiconque peut voir le bilan de l'enfant ; écriture = parent ou admin. Idem `athlete-documents` (URL signées 2–5 min).
- Anti-énumération de comptes sur « mot de passe oublié ».

### 15.4 Modèle de menaces couvert (audits `docs/`)

Escalade verticale (rôle), escalade horizontale (isolation famille par RLS), auto-upgrade de forfait, lecture de bilans premium par API, session persistante après ban (triple parade : middleware fail-closed, backstop hydrate, AccountSync realtime), lockout admin (anti-self-target), doublons de questionnaires, orphelins storage.

---

## 16. Base de données

### 16.1 Tables (par domaine)

**Identité & accès** : `profiles` (+ téléphone, spécialité, bio, préférences notif, onboarding, `registration_status`, `coach_validated`), `families` (+ ville/province, `pack`), `family_members` (co-parents), `children` (+ genre, sport, notes, `validation_status`, **avatar_url, nickname, jersey_number, accent_color**), `app_settings` (flags), `admin_coach_supervision`, `coach_assignments`.

**Programme & séances** : `programs`, `program_enrollments`, `sessions` (13 par enfant, créées automatiquement à l'assignation), `reports` (bilans legacy JSONB), `coach_reports`, `parent_reports`, `report_templates`.

**Dossier athlète** : `athlete_identity` (une ligne/enfant : ~15 champs dont toolbox JSONB et `program_pct_override`, `certificate_ready`), `athlete_objectives`, `athlete_next_steps`, `emotion_logs`, `focus_word_history`, `athlete_documents`, `dossier_reminders`.

**Vidéo** : `video_sessions` (39 : 13×3 âges ; phase, thème, life skill, action THRIVE, durée, `video_url` Wistia, `is_free`, lang), `video_interaction_points` (timecode + réponses JSONB), `video_session_runs` (progression, answers_log, RPE).

**Psychométrie** : `questionnaires` (kind LSSS/PERMA, token, statut, moment/séance, langue), `questionnaire_items`/`lsss_items`/`perma_items` (43 + 20 items officiels), réponses, `skill_scores`, `perma_scores`, `progress_log`.

**Monétisation** : `plans`, `entitlements`.

**Engagement** : `bilan_reveal`, `thrive_moments`, `family_streaks`, `gauge_progress_milestones`, `family_status`, `deletion_requests`.

**Communication** : `conversations`, `messages`, `notifications`, `push_notification_logs`, `web_push_subscriptions`.

**Roadmap** : `admin_tasks`, `admin_task_comments`, `admin_task_attachments`, `admin_task_history`, `admin_chat_messages`, `admin_activity_seen`, `admin_activity_dismissed`.

**Divers** : `badges`, `child_badges`, `content_items`, `onboarding_progress` + vues analytics (KPIs globaux, activité mensuelle, `admin_coaches_view`, performance coach, progression enfant, distribution badges).

### 16.2 RPC principales

`access_state`, `confirm_child`, `validate_parent_access`, `get_my_role`/`is_admin`, `create_thrive_program`, `gauge_summary`, `lsss_progression`, `perma_progression`, `lsss_send`, `perma_send`, `questionnaire_get`, `questionnaire_submit` (anon+token), `session_report`, `dossier_completeness`, `list_dossiers`, `notify_incomplete_dossiers`, `notify_admin_task_deadlines`, `vapid_public_key`, `push_config` (service_role).

### 16.3 Historique des migrations

56 fichiers versionnés, du socle (messagerie, push, analytics, onboarding — juin 2026) aux vagues successives : bibliothèque vidéo & RLS (007–017), verrouillage des rôles (018–019), scores & bilans (020–022), packs & identité athlète (023–024), refonte coach complète (025–034), contrôle d'accès & roadmap (035–037), forfaits & enforcement (038–041), EPOCH & push & perf RLS (042–046b), verrou questionnaires (047), correctifs roadmap & personnalisation passeport (048–052). Chaque migration documente son **rollback**.

---

## 17. Edge Functions

| Fonction | Auth | Rôle |
|---|---|---|
| `admin-create-user` | JWT | Création universelle PARENT/COACH/ADMIN auto-confirmés (ADMIN → Super Admin seulement ; un parent peut créer son co-parent) |
| `admin-create-coach` | JWT admin | Création dédiée coach (Auth + profil + spécialité/bio) |
| `admin-update-user` | JWT admin | Lot de changements rôle/activation ; ban/un-ban Auth réel ; garde parent-avec-enfants ; anti-lockout |
| `admin-delete-user` | JWT Super Admin | Suppression définitive Auth + cascade ; libère l'email ; FK RESTRICT protectrices |
| `create-checkout-session` | JWT parent | Session Stripe Checkout (paiement unique CAD) ; 503 propre sans clé |
| `stripe-webhook` | Signature HMAC | `checkout.session.completed` → entitlement ACTIVE → pack |
| `generate-parent-report` | JWT coach/admin | Assemble `parent_reports` depuis `coach_reports` + gabarit (séance×âge×pack×langue), idempotent |
| `send-web-push` | service_role / admin / secret Vault | Envoi VAPID à tous les navigateurs abonnés d'un utilisateur |
| `send-push-notification` | — | Envoi Expo Push (mobile) |
| `export-my-data` | JWT | Export JSON portabilité (Loi 25/RGPD) |
| `request-account-deletion` | JWT | Demande de droit à l'oubli |

Toutes intègrent CORS et le wrapper Sentry partagé (`_shared/sentry.ts`).

---

## 18. Application mobile (Expo)

**État : prototype de développement, volontairement hors CI et non déployé.** La cible produit actuelle est la PWA web.

- Expo 55 / React Native 0.83 / expo-router, NativeWind (Tailwind RN), Reanimated.
- Routes : `(auth)` login/register, `(parent)` dashboard/children/programs/profile + chat + questionnaire, `(coach)` dashboard/programs/sessions/profile + chat ; écrans historiques enfant (Home, Badges, Questions).
- Intégrations préparées : `expo-notifications` (push Expo), `expo-secure-store`, **RevenueCat** (`react-native-purchases` + UI) pour un futur paiement in-app.
- Partage `@thrive/shared` (mêmes types/hooks/client Supabase que le web).
- Dette connue : **arborescences dupliquées** `app/` et `src/app/`.

---

## 19. Package partagé

`@thrive/shared` (TypeScript compilé, workspace) :

- **Client Supabase unique** (`supabaseClient`) consommé par web et mobile.
- **Enums** : rôles, statuts de programme, statuts de séance, tranches d'âge.
- **Types** : auth (IAuthState/User/Tokens), user, child, family, program, `database.ts` (types générés du schéma).
- **12 hooks React** : useAuth, useProfile, useFamily, useChildren, usePrograms, useSessions, useMessages, useConversations, useNotifications, useQuestionnaires, useBadges, useAnalytics (KPIs, activité mensuelle, perf coach, progression enfants, badges, export CSV).
- **Services** : NotificationService.
- **Validation Zod** : schémas user, family, program.

---

## 20. Qualité, CI/CD & observabilité

- **CI GitHub Actions** (push main + PR, concurrency par ref) : job web (build shared → typecheck → lint → build production) + job **Playwright** (parcours vitaux).
- **Tests e2e** sans compte réel : le middleware redirige bien les 6 routes protégées vers /login (fail-closed), /login rend le formulaire, /offline et 404 sont brandées.
- **Sentry** : client web (instrumentation client + serveur + edge, wrap conditionnel au DSN — build strictement identique sans lui, upload source maps si token) + toutes les edge functions.
- **Hooks Git** : lint-staged + commitlint conventionnel.
- **Vérification manuelle outillée** : compte démo `demo.parent@thrive.app`, procédures de test du preview web documentées.

---

## 21. Environnements & déploiement

| Élément | Valeur |
|---|---|
| Base de données prod | Supabase **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`, ca-central-1) — ancien projet US en décommissionnement |
| Hébergement web | **Vercel**, projet `thrive-app-backend`, déploiement auto sur push `main` |
| Site vitrine | Projet séparé `thrive-sport-psychologie-positive` (`thrivesportpositive.com`) — lié par les boutons « Retour au site » |
| Vidéos | Compte Wistia (mapping séance+âge → `hashed_id`) |
| Secrets | Supabase Vault (VAPID, secret trigger push) ; env Vercel (Supabase, Sentry DSN, Stripe à venir) |
| Fallbacks build | URL + clé anon Supabase en dur dans middleware/pages (clé publique protégée par RLS) — l'app survit à l'absence d'env au build |

---

## 22. Limites connues & dette technique

*(constatées dans le code et les documents d'audit — état au 15 juillet 2026)*

1. **Stripe** : chaîne complète prête, clés de production non posées → repli « contactez votre coach » actif.
2. **Section Fitness** : flag `fitness_enabled` OFF en prod (« en construction ») ; vidéos Wistia et thumbnails en cours de finalisation.
3. **Sentry / Web Push** : code prêt, DSN et clés VAPID d'environnement à poser + edge functions à redéployer ; trigger push à observer au premier envoi réel.
4. **CSP** : `unsafe-inline`/`unsafe-eval` encore nécessaires sur `script-src` (gabarits HTML inline + Wistia) — durcissement par nonce à faire quand Next le permettra proprement.
5. **Sécurité restante** (audit 2026-07) : protection « leaked password » Supabase à activer, enforcement MFA obligatoire pour tous les admins, upgrade Next.js (CVE-2025-29927).
6. **Mobile** : hors CI, routes dupliquées `app/`/`src/app/`, non déployée.
7. **Double canal de bilans** : `reports` (legacy, canal affiché) et `coach_reports`/`parent_reports` (moteur structuré, en best-effort) coexistent — convergence à terminer.
8. **`pg_net` dans le schéma `public`** (cosmétique, signalé par les advisors).
9. **Contenu** : synthèse IA absente par décision (flag `aiSummary` OFF partout) ; page admin « Contenu » (articles) présente mais peu exploitée par le produit.
10. **Données de test** : profils enfants doublons d'une famille de test à purger.
11. Historique/limites `historyMonths` et `storageMb` de la matrice : définis dans `plans`, quotas enfants/parents appliqués par triggers, mais la **purge d'historique** et le **quota de stockage** ne sont pas encore enforcés par des jobs.

---

## 23. Perspectives d'évolution

*(seule section prospective du document — pistes ordonnées par horizon, s'appuyant sur les fondations déjà posées)*

### Court terme (finitions de l'existant)

- **Activer le paiement en ligne** : poser les clés Stripe (checkout + webhook déjà déployés et testés), brancher les reçus et la facturation taxes canadiennes (TPS/TVQ).
- **Ouvrir la section Fitness** : finaliser l'upload des 39 vidéos Wistia et des thumbnails, basculer `fitness_enabled` ON — tout le reste (player interactif, runs, RPE) est prêt.
- **Allumer l'observabilité** : DSN Sentry + clés VAPID en env, redéploiement des edge functions, premier envoi Web Push réel supervisé.
- **Boucler l'audit sécurité** : leaked-password protection, MFA obligatoire pour ADMIN/SUPER_ADMIN (l'enforcement dormant existe), upgrade Next.js, CSP à nonces.
- **Converger les bilans** vers le moteur structuré (`coach_reports`/`parent_reports` + gabarits par pack/langue) et retirer progressivement le canal legacy `reports`.
- **Faire respecter les limites de forfait restantes** : job de purge selon `historyMonths`, comptage du stockage documents contre `storageMb`.

### Moyen terme (approfondissement produit)

- **Gamification active** : le référentiel badges + conditions existe — brancher l'attribution automatique (triggers sur séances/questionnaires/scores) et l'affichage côté parent/enfant ; exploiter le moteur d'engagement déjà en base (streaks familiaux, moments THRIVE, jalons de jauge, révélation de bilan) pour des célébrations dans l'UI.
- **Exports Performance** : générer les exports CSV/PDF du parcours et les gabarits de rapport premium promis par la matrice (`csvExport`, `pdfExport`, `premiumTemplates` sont déjà des droits actifs sans écran dédié).
- **Version anglaise complète** : l'infrastructure bilingue existe (items EPOCH FR/EN, page questionnaire localisée, `lang` sur les vidéos) — l'étendre à toute l'UI (i18n) pour le marché canadien anglophone.
- **Journal de progression parent** : exposer `progress_log` (timeline) dans un onglet dédié du bilan (droit `progressJournal` déjà dans la matrice).
- **Tableaux de bord coach enrichis** : agrégats inter-athlètes (charge, progression comparative anonymisée), rappels automatiques planifiés (cron `notify_incomplete_dossiers`).
- **Renouvellement / post-parcours** : exploiter `family_status` et sa fenêtre de renouvellement pour proposer un second cycle, un programme d'entretien ou un suivi saisonnier.

### Long terme (expansion)

- **Synthèse IA de fin de parcours** : l'emplacement produit est réservé (ligne « À venir » de la matrice) — génération d'une synthèse narrative du parcours (13 bilans + courbes LSSS/EPOCH + émotions) à valider par le coach avant envoi, avec les garde-fous nécessaires (données de mineurs, hébergement canadien).
- **Application mobile native** : industrialiser le prototype Expo (réintégration CI, dédoublonnage des routes, parité fonctionnelle avec la PWA), notifications Expo Push déjà prêtes, monétisation in-app via RevenueCat (dépendances déjà présentes).
- **Multi-coach / organisations** : la hiérarchie supervision (Super Admin → Admin → Coach) est posée ; l'étendre à des organisations clientes (clubs, fédérations, écoles de sport) avec espaces de marque et facturation groupée.
- **Nouveaux protocoles** : le modèle de données (programmes, `video_sessions` par tranche d'âge, scripts de séance JSON, gabarits de bilans) est générique — décliner d'autres parcours (préparation mentale équipe, parcours parents, modules courts hors-saison).
- **Recherche & mesure d'impact** : les données psychométriques longitudinales (LSSS × 3 moments, EPOCH × 13 séances, RPE, réponses aux interactions vidéo) forment un socle pour des études d'efficacité anonymisées et des benchmarks par cohorte — avec consentement explicite et cadre éthique.
- **Portail enfant léger** : aujourd'hui l'enfant passe par les liens tokenisés ; un espace enfant minimal (badges, boîte à outils, focus word, célébrations) prolongerait l'autonomie visée par les séances 11–13 sans imposer de compte.

---

*Document généré par analyse exhaustive du code source — monorepo `thrive-app`, branche `main`, commit `7c27da7`.*

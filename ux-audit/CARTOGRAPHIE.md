# Revue UX/UI THRIVE — Phase 0 : cartographie

_Date : 2026-09-29 · Périmètre : `apps/web` (l'app web / PWA). Lecture seule : aucun fichier de l'app n'a été modifié._

---

## 1. Stack

| Élément | Réalité du dépôt |
|---|---|
| Monorepo | pnpm 9 (workspaces) : `apps/web` (Next.js), `apps/mobile` (Expo, **hors périmètre** de cette revue), `packages/shared` (types, client Supabase), `supabase/` (65 migrations, 17 edge functions) |
| Framework | **Next.js 15.5 App Router**, React 19.2, TypeScript 5.9. Quasi toutes les pages sont des composants client (`'use client'`) |
| Styles | **Tailwind CSS 3.4** + `globals.css` (variables CSS des ambiances parent, classes `.nc-*`, `.glass*`, `.input-auth`, keyframes) + **un gabarit HTML/CSS injecté** pour la page Bilan (`bilans/bilan-html.ts`, styles inline) |
| Composants | Bibliothèque maison minimale `components/ui` (Button, Card, Badge, Skeleton, Icon) + kits locaux (`coach/ui.tsx`, `p3/pieces.tsx`). Aucune librairie de composants tierce |
| Animation / carrousels / graphiques | **Aucune librairie.** Keyframes CSS, gestes maison (`useThumbNav`, `useHScroll`, swipe du Mode Terrain et de la messagerie), graphiques en SVG/HTML faits main |
| Données | Supabase JS (auth en localStorage + cookie `sb-access-token` pour le middleware), TanStack Query (bilan), Zustand (auth, enfant, ambiance, accès, abonnement), realtime Supabase |
| Paiement | Web : Stripe Checkout + portail, synchronisé vers RevenueCat (`lib/billing.ts`, edge functions). Mobile : RevenueCat natif (Expo) |
| Vidéo | Wistia (script externe) ou `<video>` natif, lecteur interactif maison |
| PWA | Serwist (`src/sw.ts` : précache, repli `/offline`, Web Push), `manifest.ts` (standalone, `orientation: portrait`, `theme_color #022539`, `background_color #F7F5F2`, icônes 192/512/maskable), `apple-icon.png` 180×180, `appleWebApp.capable`, `statusBarStyle: 'default'`, `viewport-fit=cover` |
| Polices | `next/font/google` : Inter (texte) + Fraunces (titres), auto-hébergées au build (swap + préchargement + métriques de repli ajustées par défaut) |
| Monitoring | Sentry (inerte sans DSN) |
| Tests | Vitest (8 fichiers, **361 tests**), Playwright e2e (2 specs : gardes d'auth, Maison) sur Chromium desktop + Pixel 7 |

### État de référence (avant toute modification)

| Vérification | Résultat |
|---|---|
| `pnpm --filter @thrive/shared build` | ✅ (prérequis des tests et du typecheck, comme en CI) |
| `pnpm --filter web typecheck` | ✅ 0 erreur |
| `pnpm --filter web lint` | ✅ 0 avertissement |
| `pnpm --filter web test` | ✅ 361/361 |
| `pnpm --filter web build` | ✅ en 1 min 23 (avertissements connus : Sentry/OpenTelemetry, supabase-js en Edge) |

Poids JS au premier chargement (build de prod) : socle commun **185 kB** ; Bilan 305 kB ; écrans Maison **380–394 kB** (le JSON des 52 fiches, 477 Ko brut / 106 Ko gzip, est embarqué dans le bundle) ; conduite de séance coach **391 kB** (`session-scripts.json`, 529 Ko brut / 115 Ko gzip) ; autres écrans 262–283 kB.

---

## 2. Écrans par rôle

Légende : **(P)** portail plein écran · **(M)** modale / feuille · **(D)** menu déroulant · **(C)** carrousel / geste.

### 2.1 Transverses et publics

| Route | Écran | États / éléments notables |
|---|---|---|
| `/` | Redirection → `/login` | — |
| `/login` | Connexion · Créer un compte (onglets) · Mot de passe oublié · « Email envoyé » | Inscription multi-enfants, avis de compte désactivé, halos flous en fond, lien « Retour au site » |
| `/reset-password` | Nouveau mot de passe | Lien de récupération Supabase |
| `/mfa-verify` | Vérification 2FA (TOTP) | Dormant tant qu'aucun facteur n'est enrôlé |
| `/settings/security` | Sécurité / 2FA (QR d'enrôlement) | Lié depuis la nav admin |
| `/dashboard` | Transit (spinner) → espace du rôle | Le middleware redirige avant affichage |
| `/q/[token]` | **Questionnaire enfant** (LSSS ou bien-être EPOCH, fr/en), sans compte | Jeton invalide, déjà rempli, envoi |
| `/offline` | Hors ligne (repli du service worker) | Rechargement auto au retour du réseau |
| 404 · `error.tsx` · `global-error.tsx` | Page introuvable · erreur · erreur racine | Emoji 🧭 😵 ; `global-error` a ses propres couleurs en dur |

### 2.2 Parent (rôle PARENT ; ADMIN et SUPER_ADMIN y ont aussi accès)

Coque commune (`parent/(hub)/layout.tsx`) : en-tête collant (logo, sélecteur d'enfant **(D)**, « + Ajouter un enfant » ≥ md, messagerie, cloche de notifications **(D)**, bascule d'ambiance **Nuit calme / Jour clair**, menu du compte **(D)**) ; **barre d'onglets en bas sur tous les formats** (Bilan · Mes séances · Maison) avec filet actif glissant ; **changement d'onglet au glisser du pouce (C)** ; transition d'écran directionnelle (460 ms). Chaque écran existe en **deux ambiances** (sombre par défaut, claire).

| Route | Écran | Éléments et états |
|---|---|---|
| `/parent` | → `/parent/bilans` | — |
| `/parent/bilans` | **Bilan / carte d'identité de l'athlète** | Rendu par gabarit HTML injecté : progression du programme, passeport, compétences de vie (LSSS), courbe du bien-être (PERMA), parcours des 13 séances, boîte à outils, prochaines étapes, objectif, focus word, roue des émotions, routine, contrat, lettre, certificat. Rappels de questionnaire. **(M)** fiche détaillée, fiche d'explication, personnalisation du passeport (feuilles du bas ≤ 680 px). États : squelette, aucun enfant, compte en préparation (aperçu grisé), contenu réservé au forfait (flou + « Voir les forfaits »), arrivée depuis une notification (`?child=&focus=`) |
| `/parent/my-sessions` | **Mes séances** (programme 1:1) | Jauge 0–13, liste des 13 séances (validée / en cours / à venir / manquée), lecture du bilan du coach : dépliée en ligne sur mobile, **panneau latéral maître-détail ≥ 1024 px**. États : squelette, aucun enfant, pas encore de coach, verrouillé, contenu premium flouté |
| `/parent/fitness` | **Maison** (programme P3, façon streaming) | Accueil 4 écrans à la 1ʳᵉ visite, **affiche du soir** (hero + menu « … »), pastilles durée / lieu, raccourcis **(C)**, progression hebdo, **rangées d'affiches (C)**, carnet, bilan à 4 semaines, pied de page. États : squelette, fonctionnalité désactivée, sans accès → **paywall P3**, enfant de moins de 8 ans |
| `/parent/fitness/[activityId]` | Fiche activité | Durée, lieu, déroulé, lancer |
| `/parent/fitness/[activityId]/moment` | **Mode activité (P)** | Check-in, « la fois d'avant », déroulé pas à pas, minuteurs, visuels, débrief, clôture, synthèse, fin ; écran gardé allumé (Wake Lock) |
| `/parent/fitness/toutes` | Catalogue des activités | Onglets d'âge, filtres, ordre, grille d'affiches |
| `/parent/fitness/programme` | Le programme (13 semaines) | Étagères filtrables, liste des fiches |
| `/parent/fitness/carnet` | Le carnet | Fil des moments et des objets gagnés, état vide |
| `/parent/fitness/objets/[rewardId]` | Objet symbolique | Mise en page imprimable |
| `/parent/fitness/quand-il-dit-non` · `/sources` · `/quand-consulter` | Pages d'aide | `quand-consulter` visible en développement seulement |
| `/parent/fitness/seances` | **Séances vidéo « Fitness+ »** | Hero 16:9, progression, 3 rangées par phase **(C)**, bibliothèque filtrable (âge, phase, thème). Garde : drapeau `fitness_enabled` + activation |
| `/parent/session/[id]` | **Lecteur de séance interactive** | Wistia ou `<video>`, questions A/B/C/D en surimpression, retour, effort ressenti 0–10, écran final |
| `/parent/messages` | **Messagerie (P)** | Liste de 2 fils (coach, support) → fil (bulles, pièces jointes, saisie), retour au glisser |
| `/parent/upgrade` | Forfaits (3 packs comparés) | Pas d'achat en ligne : CTA vers la messagerie |
| `/parent/abonnement` | **Abonnement P3 « Le moment qui compte »** | Offre mensuelle/annuelle (radio), essai, redirection Stripe, retour de paiement, état abonné (portail Stripe, App Store, Google Play, accès offert), « Actualiser mon accès » |
| `/parent/compte` | Paramètres du compte | Profil, compte, notifications push, déconnexion |
| `/parent/select-profile` | Ajouter un membre (parent / enfant) | **Hors de la coque parent** : fond crème, palette `slate` |
| `/parent/library` · `/parent/progress` | Redirections | — |

### 2.3 Coach (rôle COACH ; ADMIN et SUPER_ADMIN y ont aussi accès)

Coque (`coach/layout.tsx`) : **< 1024 px** mini-barre haute + **barre d'onglets basse à 6 entrées** (Tableau de bord, Séances, Mes athlètes, Bilans, Suivi, Messages) ; **≥ 1024 px** sidebar marine fixe. Ambiance claire uniquement.

| Route | Écran | Éléments et états |
|---|---|---|
| `/coach/dashboard` | Tableau de bord | Stats (squelette), prochaines séances, athlètes, bannière « dossiers incomplets » |
| `/coach/sessions` | Séances | Liste groupée, squelette |
| `/coach/athletes` | Mes athlètes | Familles en attente, liste |
| `/coach/athletes/[id]` | Espace athlète | Éditeurs : identité, objectifs, émotions, routine, prochaines étapes, séances, documents, LSSS, PERMA, « Écrire au parent » |
| `/coach/athletes/[id]/session/[sessionId]` | **Conduite de séance** | Mode standard (sommaire collant défilant **(C)**, checklists, grilles d'observation, notes, barre d'action fixe) + **Mode Terrain (P)** plein écran (pages au glisser, minuteurs, feuille de détail **(M)**, note libre, retour haptique, thème clair/sombre propre) |
| `/coach/bilan` | Bilans | Liste + détail (2 colonnes ≥ 1024 px) |
| `/coach/dossiers` | Suivi des dossiers | Tableau |
| `/coach/messages` | Messagerie | Liste + fil (3 colonnes ≥ 1024 px) |

### 2.4 Admin et Super Admin

Coque (`admin/layout.tsx`) : **< 1024 px** barre marine + **navigation horizontale défilante de 16 à 19 pastilles** ; **≥ 1024 px** sidebar. Contrôle 2FA (dormant). Ambiance claire (la roadmap a un mode sombre de classe).

| Route | Écran | Super Admin seulement |
|---|---|---|
| `/admin` | Dashboard (stats, tableau récent, temps réel) | |
| `/admin/dossiers` · `/admin/dossiers/[id]` | Suivi des dossiers | |
| `/admin/supervision` | Structure de supervision | ✔ |
| `/admin/validations` | Validations | |
| `/admin/waitlist` | Liste d'attente (+ tiroir prospect **(M)**) | ✔ |
| `/admin/roadmap` | Roadmap interne (tableau de bord, calendrier, détail de tâche **(M)**, panneau de discussion **(M)**) | |
| `/admin/users` | Comptes (+ modales créer / éditer / supprimer) | |
| `/admin/coaches` | Coachs (+ modale) | |
| `/admin/families` | Familles et parents | |
| `/admin/children` | Enfants (+ modales) | |
| `/admin/assignments` | Assignations coach ↔ enfants | |
| `/admin/programs` | Programmes | |
| `/admin/questionnaires` | Questionnaires | |
| `/admin/badges` | Badges | |
| `/admin/messages` | Messages | |
| `/admin/notifications` | Notifications | |
| `/admin/analytics` | Analytics (tableaux) | |
| `/admin/reglages` | Réglages plateforme (drapeaux) | ✔ |
| `/admin/content` | Contenu pédagogique — **orphelin : aucun lien dans la navigation** | |
| `/settings/security` | Sécurité (2FA) | |

**Total : 62 entrées** dans le build, dont ≈ 55 écrans réels (hors redirections et fichiers d'icônes / manifeste), plus une vingtaine de modales, feuilles, tiroirs et menus. Pas de système de toasts : les messages sont en ligne (bandeaux `role="status"`/`role="alert"`).

---

## 3. Design system réel

### 3.1 Tokens déclarés

- **Tailwind (`tailwind.config.ts`)** : `navy` 50→900 (marine de marque #004E7A = `navy-600`), `cream` #F7F5F2, `sun` #F9EB50 (+ `dark`), `sage` #A7C4BC (+ `light`, `dark`), sémantiques `success` / `warning` / `danger`, alias vers les variables d'ambiance (`night.*`, `ink`, `body`, `soft`, `faint`, `meta`, `line`, `chip`, `field`, `track`, `accent.*`, `brand`), rayon `field` (0,85 rem), ombres `card` / `card-hover`, polices `sans` (Inter) / `display` (Fraunces).
- **Variables d'ambiance (`globals.css`)** : ≈ 35 variables × 2 ambiances (Nuit / Jour) — fond, surface, onglets, 4 niveaux de texte, filets, accent, bulles de messagerie, champs…
- **Primitives CSS** : `.nc-card` (rayon 22), `.nc-row` (18), `.nc-pill` (hauteur 40), `.nc-iconbtn` (44), `.nc-eyebrow`, `.nc-track` / `.nc-fill`, `.glass`, `.glass-strong`, `.glass-navy`, `.input-auth`.

Absents : échelle typographique, échelle d'espacement dédiée, échelle de rayons, échelle d'ombres, échelle de z-index, durées et courbes d'animation en tokens.

### 3.2 Valeurs codées en dur et doublons (mesurés)

| Famille | Constat |
|---|---|
| Couleurs | **89 hex distincts** et **90 `rgba()` distincts** écrits en dur. Deux systèmes de gris en parallèle de la marque : `gray-*` (≈ 250 usages) et `slate-*` (≈ 190), plus **36 classes de texte neutre différentes** (`text-gray-400/500/600`, `text-slate-400/500/600`, `text-navy-600/60`, `/70`, `/80`…). Couleurs Tailwind hors charte en admin : indigo, emerald, purple, violet, rose, amber, lime… `sage` est une couleur fixe dans Tailwind mais une variable (#7FA197 le jour) dans l'ambiance |
| Tailles de police | Échelle Tailwind (xs→5xl) **+ 40 tailles arbitraires** de 8 px à 120 px (dont 12,5 · 13,5 · 14,5 · 15,5 px) **+ ≈ 40 tailles inline** dans le gabarit du Bilan. Aucun `clamp()` |
| Rayons | **≈ 18 valeurs** : 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32 px, 22 %, full. Une même carte existe en 16, 18, 20, 22, 24 et 26 px |
| Ombres | Tokens `card` / `card-hover` + `shadow-sm/md/lg/xl/2xl` de Tailwind + 21 ombres inline |
| z-index | 10, 20, 30, 40, 50, 60, 70, 72, 75, 80, 85, 90, 110, 120, 130 (+ 1, 3, 5, 90 inline) — aucune échelle |
| Animations | Durées 150, 180, 200, 220, 300, 320, 380, 420, 450, 460, 500, 600, 700, 1000, 1100, 1600 ms… ; courbe `cubic-bezier(.22,.61,.36,1)` recopiée une dizaine de fois ; transition d'onglet à 450–460 ms (au-delà des 400 ms visés pour une action fréquente) |
| Breakpoints | Tailwind par défaut (sm 640 · md 768 · lg 1024 · xl 1280) + requêtes propres au Bilan (1100 · 680 · 400) + 768 pour les champs |
| Espacements | Échelle Tailwind 4 px, plus 76 valeurs arbitraires (`py-[15px]`, `gap-[3px]`, `ml-[78px]`…) |
| Hauteurs plein écran | `min-h-screen` (= `100vh`) sur 14 fichiers ; `dvh` sur 8 usages seulement |
| Icônes | Jeu SVG maison (`Icon`, 33 icônes) **mais** encore des glyphes texte (`▶ ❚❚ ⛶ ✓ ★ ✕ ← → …`) et des emoji (titres admin 👤 🎯 🧒 📊…, pages d'erreur 🧭 😵 📡, « 👋 » coach, « 📩 ») |

---

## 4. Composants partagés

| Domaine | Composants |
|---|---|
| Primitives | `ui/Button` (5 variantes, 40/48 px), `ui/Card`, `ui/Badge`, `ui/Skeleton`, `ui/Icon`, `BrandLogo` (next/image 512 px pour un affichage de 28 à 80 px) |
| Kits locaux | `coach/ui.tsx` (SectionCard, TextInput, TextArea, Select, Btn 40 px, SavePill) ; `p3/pieces.tsx` (PillGroup, DurationPills, BackLink, Section, P3Skeleton) |
| Navigation | 3 coques (parent, coach, admin), `useThumbNav` (glisser entre onglets), `ChildSwitcher`, `UserMenu`, `NotificationsBell`, `AmbianceToggle` |
| Carrousels et gestes | `PosterRow` / `PosterCard` / `useHScroll` (Maison : scroll-snap, flèches à la souris, mémoire de position), `SessionRow` / `SessionCard` (séances vidéo), raccourcis et filtres défilants, swipe du Mode Terrain, swipe retour de la messagerie |
| Vidéo | `WistiaPlayer`, `InteractivePlayer` |
| Modales et feuilles | `DetailModal`, `InfoModal`, `PassportEditModal` (Bilan, classes `.b-modal`), `DetailSheet` + `BlockFreeNote` (Mode Terrain), `ProspectDrawer`, `TaskDetail`, `ChatPanel`, modales admin inline ; utilitaire `useModalDismiss` (Échap + `overflow:hidden`) |
| Messagerie | `ConversationList`, `Thread`, `MessageList`, `MessageBubble`, `Composer`, `tone.ts` (thèmes) |
| Données et bilans | Gabarit `bilan-html.ts` (courbe PERMA SVG, jauges, nœuds du parcours), `ScoreGauge` / `BilanCard` / `LockedText` (`PackGate`), `LsssPanel`, `PermaPanel`, `DossierTable`, 13 tableaux admin/coach |
| Accès et états | `AccessGate` (bandeau, section grisée, aperçus verrouillés, « en construction »), `P3Paywall`, `IncompleteBanner` |
| Mode activité Maison | `ActivityMode`, `StepTimer`, `TimerRing`, `Visuals`, `RewardView`, `Poster` |

---

## 5. Lancer l'app et accéder à chaque rôle

```bash
pnpm install --frozen-lockfile
pnpm --filter @thrive/shared build     # obligatoire avant typecheck / tests / dev
pnpm dev:web                           # http://localhost:3001
# ou, au plus près de la prod (service worker, en-têtes) :
pnpm --filter web build && pnpm --filter web start   # port 3001
```

- Sans `.env.local`, l'app se branche **sur le projet Supabase de production** (URL et clé publique codées en repli dans `middleware.ts` et `supabase-server.ts`).
- **Blocage 1 — réseau** : depuis cet environnement cloud, `kkdcgzvdmipmrgkawnky.supabase.co` est refusé par la politique réseau (403). Aucune connexion n'est donc possible ici : seuls les écrans publics (connexion, mot de passe, 404, hors ligne, questionnaire à jeton invalide) peuvent être capturés.
- **Blocage 2 — comptes** : un seul compte de test est documenté (`demo.parent@thrive.app`, FIXES.md). Aucun compte **coach**, **admin** ou **super admin** n'est documenté, et le dépôt ne contient pas de seed de comptes.
- **Précaution** : certains écrans écrivent en base dès leur ouverture (le lecteur vidéo crée une ligne `video_session_runs` au montage ; ouvrir un fil marque les messages comme lus…). Capturer en masse sur la prod laisserait des traces : une base de préproduction (ou une branche Supabase) avec des données de démo est préférable.
- **Moteur WebKit** : seul Chromium est installé dans cet environnement et l'installation d'autres navigateurs n'y est pas permise. Sans WebKit, iPhone et iPad seront émulés dans Chromium (viewport, densité, tactile, user-agent) ; le script d'audit sera écrit pour basculer sur WebKit partout où il est disponible (poste local ou CI avec `playwright install webkit`).

---

## 6. Premiers constats relevés pendant la lecture (à confirmer en Phase 1)

Ce n'est pas encore l'audit : ce sont les points repérés en lisant le code, qui orienteront les captures.

1. **Ambiance Jour — textes illisibles** : titre du hero des séances vidéo en `text-night-ink` sur voile sombre (contraste 1,2:1) ; cartes `glass-navy` (fond marine translucide) sur Forfaits, Compte et lecteur de séance : titres à 3,9:1, textes secondaires à 1,4:1 ; avatar du menu (2,5:1) ; « Se déconnecter » `red-300` sur blanc (1,9:1) ; bouton de déconnexion de Compte `red-100` sur rouge pâle (1,3:1) ; `--text4`/`--meta` #8B979E sous AA (2,6–3,0:1) ; `text-sage` utilisé en texte (1,6–1,9:1).
2. **Zones claires** : `gray-400` / `slate-400` (≈ 140 usages, 2,5:1) et `navy-600/60–70` sur crème (3,1–4,0:1) sous le seuil AA du texte courant.
3. **Bilan au clavier** : 20 zones cliquables (`div`), 2 seulement avec `role="button"`, aucune avec `tabindex` → rien n'est atteignable au clavier ni correctement annoncé aux lecteurs d'écran.
4. **iPad et desktop = téléphone étiré côté parent** : barre d'onglets du bas centrée sur 448 px quel que soit l'écran. Coach : barre basse à 6 onglets jusqu'à 1023 px (donc sur tous les iPad en portrait). Admin : 16 à 19 pastilles défilantes jusqu'à 1023 px.
5. **Survol collant sur tactile** : 293 variantes `hover:` non conditionnées au pointeur (Tailwind 3 ne le fait pas par défaut).
6. **Champs à 14 px au-delà de 768 px** : la règle anti-zoom iOS s'arrête à 768 px → zoom au focus probable sur iPad (820 px et plus) dans login, coach et admin.
7. **Modales** : 3 implémentations recopiées ; ni piège du focus, ni focus initial, ni retour du focus ; verrouillage du scroll par `overflow:hidden` (inefficace sur iOS) ; fermeture non animée ; la poignée des feuilles du bas est décorative (pas de fermeture au glisser).
8. **Carrousels** : scroll-snap et confinement déjà en place, mais pas de navigation au clavier, pas d'indicateur de position, pas de glisser à la souris ; flèches positionnées au pixel près (`top-[101px]`).
9. **Tableaux admin/coach** (13) : défilement horizontal dans leur cadre sur téléphone, pas de version en cartes.
10. **Lancement** : garde d'auth côté client → spinner plein écran à chaque arrivée ; `BrandLogo` télécharge une image de 640 à 1080 px pour 28 à 80 px affichés ; vignettes sans `loading="lazy"` ; JSON des fiches (106 Ko gzip) dans le bundle de chaque écran Maison ; `min-h-screen` = `100vh`.
11. **PWA** : `orientation: portrait` verrouille les tablettes Android en portrait ; splash `background_color` crème alors que l'espace parent est sombre par défaut ; `theme-color` fixe (#022539) quelle que soit l'ambiance ou l'écran clair.
12. **Microcopie** : l'espace parent mélange tutoiement et vouvoiement (≈ 50/50 : « ton enfant » dans les fiches du Bilan, « vous » dans Maison et l'abonnement) ; espace admin avec emoji dans les titres et palette hors charte ; `select-profile` en `slate` hors coque parent.

---

## 7. Décisions attendues avant la Phase 1

1. **Accès réseau** au projet Supabase depuis l'environnement cloud (ajout de `*.supabase.co` aux domaines autorisés) — ou une URL de préproduction.
2. **Comptes de test** : coach, admin, super admin, et idéalement trois parents (compte en préparation · forfait Essentiel · forfait Performance + abonnement P3 actif) pour voir les états verrouillés et déverrouillés.
3. **Prod ou préproduction** pour les captures automatiques (voir la précaution du §5).
4. **Tutoiement ou vouvoiement** des parents (recommandation : vouvoiement, déjà majoritaire dans Maison et l'abonnement ; le questionnaire enfant reste au « tu »).
5. **Branche** : la session impose `claude/sharp-thompson-8ykafk` ; elle joue le rôle de `ux-polish` (isolée de `main`, un commit par lot).
6. **Périmètre** : `apps/web` seulement ; l'app Expo (`apps/mobile`, paywall RevenueCat natif) reste hors revue sauf demande contraire.

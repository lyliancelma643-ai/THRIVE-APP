# Revue UX/UI THRIVE — rapport d'audit et de corrections

_Périmètre : `apps/web` (app web / PWA) · 3 rôles parents + coach + admin + super admin · 14 formats (téléphones, iPad, ordinateurs) · deux ambiances pour l'espace parent (Nuit / Jour)._
_Branche : `claude/sharp-thompson-8ykafk` · méthode détaillée : `ux-audit/CARTOGRAPHIE.md` · système de design : `DESIGN_TOKENS.md`._

## Méthode

1. **Cartographie** du code (Phase 0) : 55 écrans, ~20 modales / feuilles / menus, inventaire des tokens et des valeurs en dur.
2. **Audit automatisé** (Phase 1, `apps/web/scripts/ux-audit`) :
   - l'app est construite **sans aucune modification** contre un **backend Supabase simulé** local (Supabase de prod inaccessible depuis l'environnement, et aucune capture ne doit écrire en production) : jetons signés, mini-PostgREST, RPC, stockage, fonctions, temps réel, et un univers de démonstration **fictif** avec six comptes (parent Performance + abonnement Maison, parent Essentiel, parent en préparation, coach, admin, super admin) ;
   - **1 232 captures** : 79 écrans ou états × 14 viewports (+ ambiance Jour pour 18 écrans parent) ;
   - contrôles automatiques à chaque capture : débordement horizontal, cibles < 44 px et champs < 16 px (formats tactiles), images sans alt / dimensions, **axe-core WCAG 2.2 AA** (iPhone 15, iPad portrait, ordinateur), **CLS** au chargement ;
   - moteur : Chromium avec émulation iPhone / iPad (viewport, tactile, user-agent Safari). WebKit n'est pas installable dans cet environnement ; le script accepte `--engine webkit` là où il l'est.
3. **Revue experte** (Phase 2) : lecture des captures et du code avec la grille 4.1 → 4.15 du cahier des charges.
4. **Corrections par lots** (Phase 4), un commit par lot, typecheck + lint + 361 tests + build verts après chacun, audit rapide (4 formats) intermédiaire, audit complet final.

## 1. Les 10 problèmes les plus visibles (avant)

1. **Ambiance Jour illisible par endroits** : titre du hero des séances vidéo à 1,2:1, cartes « verre marine » (Compte, Forfaits, lecteur) à 1,4:1, déconnexion à 1,3:1.
2. **Bilan inutilisable au clavier** : 20 cartes cliquables sans rôle ni tabindex.
3. **iPad et ordinateur = téléphone étiré** : barre d'onglets de 448 px en bas de l'écran côté parent, 6 onglets en bas pour le coach sur tous les iPad portrait, 16–19 pastilles défilantes pour l'admin sous 1 024 px.
4. **Zoom iOS au focus sur iPad** : champs à 14 px au-delà de 768 px (95 captures).
5. **Contraste insuffisant** : 2 881 nœuds axe en échec (gris 300/400, marine à 60–70 %, sauge en texte, `--text4` Jour).
6. **Débordements horizontaux** sur téléphone : comptes admin (438 px), analytics (409 px), roadmap (421 px), fiche Maison sur Android (363 px).
7. **Cibles tactiles trop petites** : 783 captures concernées (logo 32 px, pastilles 40 px, boutons coach/admin 27–40 px, notes 1–5 à 28 px sur iPad).
8. **Modales sans gestion du focus** : ni piège, ni retour du focus, scroll de fond qui bouge sur iOS, fermeture non animée, poignée de feuille décorative.
9. **Décalages de mise en page** : CLS jusqu'à 0,70 (dossier admin, lecteur de séance, tableau de bord coach).
10. **Survol collant sur tactile** (293 `hover:`) et **transitions trop lentes** (onglet 460 ms, retour en haut animé à chaque changement d'onglet par le `scroll-behavior: smooth` global).

## 2. Tableau des défauts

Gravité : **P0** cassé / inutilisable · **P1** visible et gênant · **P2** finition · **P3** raffinement.
Statut : ✅ corrigé · 🟡 partiel · ⏭ reporté (voir §3).

| ID | Écran | Rôle | Format(s) | Description | Grav. | Correction | Fichiers | Statut |
|---|---|---|---|---|---|---|---|---|
| UX-001 | Séances vidéo (hero) | Parent | Tous, Jour | Titre et sous-titre en encre sombre sur voile sombre (1,2:1) | P0 | Hero toujours sombre, texte blanc (15:1) | `fitness/seances/page.tsx` | ✅ |
| UX-002 | Compte, Forfaits, lecteur, notifications push | Parent | Tous, Jour | Cartes `glass-navy` : textes secondaires à 1,4:1 | P0 | Surface de l'ambiance | `compte`, `upgrade`, `session/[id]`, `WebPushToggle` | ✅ |
| UX-003 | Bilan | Parent | Tous | 20 cartes cliquables inaccessibles au clavier / lecteur d'écran | P0 | Rôle bouton, tabindex, Entrée / Espace, anneau de focus | `bilan-html.ts`, `bilans/page.tsx` | ✅ |
| UX-004 | Comptes | Admin | Téléphones | Filtres de rôles : débordement 438 px | P0 | Groupe défilant, `aria-pressed` | `admin/users` | ✅ |
| UX-005 | Analytics | Admin | Téléphones | Onglets : débordement 409 px, emoji | P0 | Onglets défilants (`tablist`), sans emoji | `admin/analytics` | ✅ |
| UX-006 | Roadmap | Admin | Téléphones | Barre d'outils : débordement 421 px | P0 | Passage à la ligne, sélecteur défilant | `admin/roadmap` | ✅ |
| UX-007 | Fiche Maison | Parent | Android 360 | Barre d'actions : débordement 363 px | P0 | « Autre activité » en icône nommée sous 400 px | `fitness/[activityId]` | ✅ |
| UX-008 | Fiche Maison | Parent | iPhone à barre d'accueil | Barre d'actions fixe à 84 px, recouverte par la barre d'onglets (≈ 92 px) | P0 | Position calculée sur la safe area | `fitness/[activityId]` | ✅ |
| UX-009 | Tous formulaires | Tous | iPad | Champs 14 px → zoom iOS au focus | P0 | 16 px sur tout pointeur grossier | `globals.css` | ✅ |
| UX-010 | Inscription, assignations, supervision | Public, admin | Tous | Listes déroulantes sans nom accessible (axe critique) | P0 | `aria-label` explicites | `login`, `admin/assignments`, `admin/supervision` | ✅ |
| UX-011 | Conduite de séance | Coach | Tous | Champs sans libellé (axe critique) | P0 | `aria-labelledby`, notes nommées | `coach/.../session/[sessionId]` | ✅ |
| UX-012 | Coque parent | Parent | iPad paysage, ordinateur | Barre d'onglets de téléphone centrée en bas | P1 | Onglets segmentés au centre de l'en-tête ≥ 1 024 px | `parent/(hub)/layout.tsx` | ✅ |
| UX-013 | Mes séances | Parent | iPad portrait | Liste de téléphone étirée, bilan déplié sous la ligne | P1 | Maître-détail dès 768 px | `my-sessions` | ✅ |
| UX-014 | Coque coach | Coach | iPad portrait | 6 onglets en bas, libellés sur 2 lignes | P1 | Rail d'icônes 88 px ; onglets téléphone sur une ligne | `coach/layout.tsx` | ✅ |
| UX-015 | Coque admin | Admin / SA | Téléphone, iPad portrait | 16–19 pastilles défilantes, 19 entrées à plat | P1 | 6 sections, menu en feuille (téléphone), rail (iPad) | `admin/layout.tsx` | ✅ |
| UX-016 | Toute l'app | Tous | Tactiles | 293 survols qui restent « collés » après un tap | P1 | `hoverOnlyWhenSupported` + survols CSS conditionnés | `tailwind.config.ts`, `globals.css` | ✅ |
| UX-017 | Zones claires | Public, coach, admin | Tous | Gris 300/400 et marine 60–70 % sous AA (2 881 nœuds) | P1 | Remontée au niveau AA (≈ 170 textes) | 50+ fichiers | ✅ |
| UX-018 | Espace parent | Parent | Tous, Jour | `--text4` / `--meta` à 2,6:1 | P1 | #626E77 (4,6:1) | `globals.css` | ✅ |
| UX-019 | Cartes, vignettes, bilan | Parent | Tous, Jour | Sauge utilisée en texte (1,6–1,9:1) | P1 | Token `sage-ink` (#46695F le jour) | 10 fichiers | ✅ |
| UX-020 | Menu du compte, Compte | Parent | Tous, Jour | Avatar 2,5:1, déconnexion 1,9:1 et 1,3:1 | P1 | Blanc sur marine, token `danger-ink` | `UserMenu`, `compte` | ✅ |
| UX-021 | Fiches du Bilan, passeport | Parent | Tous | Ni piège ni retour du focus, scroll iOS, pas d'anim. de sortie, poignée décorative | P1 | Feuille commune : entrée 300 / sortie 180 ms, glisser pour fermer, focus géré | `bilans/sheet.tsx`, `useModalDismiss` | ✅ |
| UX-022 | Menus enfant / compte / notifications | Parent | Tous | Pas de focus initial, ni flèches, ni animation | P1 | `useMenuKeyboard`, `animate-menu-in`, rôles ARIA | 3 composants | ✅ |
| UX-023 | Rangées Maison et vidéo | Parent | Tous | Pas de clavier, pas de glisser souris, pas d'indicateur, flèches mal centrées | P1 | Composant `Rail` | `Rail.tsx`, `useHScroll`, `Poster`, `SessionRow` | ✅ |
| UX-024 | Dossier admin, lecteur, tableau coach | Admin, parent, coach | Tous | CLS 0,35 → 0,70 | P1 | Squelettes à la forme finale, pas de squelette à l'actualisation | 3 fichiers | 🟡 |
| UX-025 | 13 tableaux | Admin, coach | Téléphones | Tableaux défilant horizontalement | P1 | Cartes « libellé : valeur » automatiques, `scope`, régions focusables | `ResponsiveTables.tsx`, `globals.css` | ✅ |
| UX-026 | Espaces coach / admin | Coach, admin | Tactiles | Boutons 27–40 px, notes 1–5 à 28 px sur iPad | P1 | 44 px sur pointeur grossier, notes 44 px | `globals.css`, séance coach | ✅ |
| UX-027 | Arrivée dans l'espace parent | Parent | Tous | Éclair crème avant l'interface sombre | P1 | Écran d'attente aux couleurs de l'ambiance | `parent/layout.tsx` | ✅ |
| UX-028 | Navigation parent | Parent | Tous | Transition 460 ms + retour en haut animé à chaque onglet | P1 | 280 ms, retour instantané | `globals.css`, 8 écrans | ✅ |
| UX-029 | Lecteur vidéo | Parent | Tous | Glyphes ▶ ❚❚ ⛶, barre non clavier, pas de poster, plein écran iPhone | P1 | Icônes nommées, slider ARIA, poster, `webkitEnterFullscreen` | `InteractivePlayer`, `session/[id]` | ✅ |
| UX-030 | 14 écrans | Tous | Safari mobile | Hauteurs en `100vh` | P2 | `100dvh` / `min-h-dvh` | 20 fichiers | ✅ |
| UX-031 | En-tête parent | Parent | 375 px | Prénom de l'enfant tronqué | P2 | Espacements resserrés | `parent/(hub)/layout.tsx` | ✅ |
| UX-032 | En-tête parent | Parent | Tactiles | Logo cliquable de 32 px | P2 | Zone tactile 44 px | idem | ✅ |
| UX-033 | 20 écrans admin | Admin | Tous | Titres hors charte avec emoji | P2 | Fraunces, sans emoji | `app/admin/**` | ✅ |
| UX-034 | 404, erreur, hors ligne | Tous | Tous | Emoji comme illustration, boutons 44 px | P2 | Pictos de marque, boutons 48 px | 4 fichiers | ✅ |
| UX-035 | Liens retour | Parent, coach | Tous | Flèches texte « ← → » lues par les lecteurs d'écran | P2 | Chevron icône, flèches `aria-hidden` | 7 fichiers | ✅ |
| UX-036 | Pastilles de filtre | Parent | Tactiles | 40 px de haut | P2 | 44 px | `globals.css` | ✅ |
| UX-037 | Notifications | Parent | Tous | Éléments lus en opacité 60 % (contraste) | P2 | Texte atténué, pastille non-lu annoncée | `NotificationsBell` | ✅ |
| UX-038 | Logo | Tous | Tous | 640–1 080 px téléchargés pour 28–80 px affichés | P2 | Source 160 px | `BrandLogo` | ✅ |
| UX-039 | Vignettes, images de séance | Parent | Tous | Pas de dimensions, pas de chargement différé | P2 | `width/height`, `loading="lazy"`, priorité au hero | `Poster`, `SessionCard`, `seances` | ✅ |
| UX-040 | App installée | Tous | Tablettes | Manifeste bloqué en portrait, pas d'`id` | P2 | `orientation: any`, `id` | `manifest.ts` | ✅ |
| UX-041 | Ajout de profil | Parent | Tous | Palette `slate` hors charte | P2 | Marine de marque | `select-profile` | ✅ |
| UX-042 | Toute l'interface | Tous | Tous | Tutoiement et vouvoiement mélangés | P2 | Tutoiement (≈ 115 textes) | 30 fichiers | 🟡 (fiches Maison : §3) |
| UX-043 | En-tête parent | Parent | iPad paysage | « + Ajouter un enfant » sur deux lignes | P2 | Masqué entre 1 024 et 1 279 px (reste dans le menu enfant) | `parent/(hub)/layout.tsx` | ✅ |
| UX-044 | Messagerie | Parent | Tactiles | Boutons retour 40 px ; accusés et pastilles aria non autorisés | P2 | 44 px, `role="img"` / texte masqué | `messages`, `MessageBubble`, coques | ✅ |
| UX-045 | Système | — | — | 18 rayons, 15 z-index, 15 durées non tokenisés | P2 | Échelles créées et documentées ; migration progressive des valeurs existantes | `tailwind.config.ts`, `DESIGN_TOKENS.md` | 🟡 |
| UX-046 | Maison, séances vidéo | Parent | Ordinateur | Vignettes 152–176 px perdues sur 1 280 px | P3 | 200 px / 264 px ≥ 1 024 px | `Poster`, `SessionCard` | ✅ |
| UX-047 | Titres | Tous | Tous | Veuves et césures disgracieuses | P3 | `text-balance` / `text-pretty` sur titres et textes clés | plusieurs | 🟡 |
| UX-048 | Chiffres | Tous | Tous | Chiffres qui « dansent » (minuteurs, notes, dates) | P3 | `tabular-nums` | plusieurs | 🟡 |

## 3. Propositions nécessitant validation

Ces points toucheraient au contenu, à un parcours ou à l'architecture : **non implémentés**.

1. **Fiches Maison au tutoiement** : ~360 phrases des fiches (sources Markdown → `activities.generated.json`) et 13 textes de `guide.ts` sont au vouvoiement. C'est du contenu éditorial validé par la méthode ; le convertir demande une relecture par l'auteur (accords, ton), puis régénération.
2. **`/admin/content` orphelin** : la page existe mais aucun lien n'y mène. L'ajouter à la section « Contenu » de la navigation ?
3. **Redirection incohérente** : `next.config.js` envoie `/parent/library` vers `/parent/fitness` alors que la page elle-même visait `/parent/fitness/seances`.
4. **Mode sombre coach / admin** : n'existe pas (hors roadmap). À décider avant de le créer.
5. **Afficher / masquer le mot de passe** à la connexion et à l'inscription (nouvelle fonctionnalité).
6. **Chargement à la demande des fiches Maison** : le JSON (106 Ko gzip) est embarqué dans chaque écran Maison (380–394 Ko au premier chargement). Le charger à la demande changerait la couche de données.
7. **Gardes d'authentification côté serveur** : les coques vérifient la session côté client (écran d'attente à chaque arrivée). Un rendu serveur de la session supprimerait cette attente mais touche à l'authentification.
8. **`theme-color` et splash** : la couleur de la barre système suit l'ambiance parent mais reste sombre sur les écrans clairs (connexion) ; `background_color` du manifeste crème alors que l'espace parent est sombre. Choix de marque à trancher.
9. **Onboarding de première visite** dans l'espace parent (checklist « ajoute un enfant → lance ta 1re séance ») : ajout de parcours.
10. **Bandeaux asynchrones en tête de page coach** : « Familles en attente de ta validation » (liste athlètes) arrive après la liste et la pousse vers le bas (CLS ≈ 0,2 sur téléphone). Lui réserver une place vide en permanence gênerait le cas courant (rien à valider) ; le déplacer sous la liste changerait la hiérarchie de l'écran. À trancher.
11. **Confirmation WebKit réelle** (Safari iPhone / iPad, mode app installée) : à lancer en local ou en CI avec `pnpm ux:audit --engine webkit` (voir §5).

## 4. Plan des lots (réalisé)

| Lot | Contenu | Commit |
|---|---|---|
| 0 | Outillage d'audit (backend simulé, captures, axe) | `4e44729`, `4f30bb8` |
| 1 | Fondations : tokens, survol, dvh, anti-zoom, contrastes Jour | `cc9ac55` |
| 2 | Composants de base et contrastes | `ea24e18` |
| 3 | Navigation par format | `e7e0c77` |
| 4 | Carrousels, gestes, transitions | `265962c` |
| 5 | Écrans par rôle | `0dd8fd5` |
| 6 | Modales, feuilles, menus, états | `65a1a97` |
| 7 | Vidéo, médias, stabilité du chargement | `fecba34` |
| 8 | Lancement et PWA | `e583514` |
| 9 | Accessibilité et microcopie | `8543a66` |
| 10 | Finitions post-audit : contrastes restants, bilan au clavier sans imbrication, tableaux en CSS pur, débordements, CLS | `714a62c`, `cebdfc2` |
| — | Outillage : Lighthouse connecté, comparatif, diagnostic CLS | `92b654e` |

## 5. Résultats

_Section complétée en fin de Phase 5 (voir ci-dessous)._

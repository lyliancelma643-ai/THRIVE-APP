# Audit UX/UI — THRIVE Sport Positif (app web)

_Date : 2026-07-06 · Périmètre : `apps/web` (Next.js 15 App Router) · Cible : PWA mobile-first (≈80 % mobile)_

Audit réalisé par lecture du code réel (design tokens, layouts des 4 rôles, flux d'entrée, pages
phares, primitives partagées). Chaque constat porte une **sévérité** (🔴 bloquant / 🟠 majeur /
🟡 mineur), une **référence fichier**, et un **correctif concret**.

---

## 0. Verdict global (TL;DR)

**Le socle est nettement au-dessus de la moyenne d'un MVP.** `globals.css` est exemplaire :
`prefers-reduced-motion`, `focus-visible`, inputs forcés à 16 px sur mobile (anti-zoom iOS),
`touch-action: manipulation`, `safe-area-inset`, `100dvh`, feedback tactile `:active`. Les zones
parent et coach respectent scrupuleusement la charte (navy / cream / sun / sage + Fraunces) et
posent des cibles tactiles ≥ 44 px, `aria-pressed`, `aria-current`, `role="alert"`, `aria-busy`.

**Le principal problème n'est pas la qualité, c'est la _cohérence_.** L'app contient en réalité
**deux design systems** : la charte de marque (parent/coach) et un « dashboard Tailwind générique »
(admin : slate + dégradés arc-en-ciel + emoji + `font-black`). S'y ajoutent 3 styles de champ, 3
styles de bouton, 3 gris secondaires, 2 locales de date, et 3 familles d'icônes. Il n'existe **aucun
composant `ui/` partagé** (le brief mentionne shadcn/ui — il n'est pas utilisé dans le code).

**Top 5 priorités avant public launch Q3 :**
1. 🔴 Unifier l'espace admin sur la charte de marque (aujourd'hui hors-marque). → §2.1
2. 🟠 Extraire une bibliothèque `components/ui/` (Button, Input, Card, Badge, Icon). → §2.5
3. 🟠 Vérifier/corriger les contrastes des textes faible-opacité (`text-white/45`, `/55`). → §4.1
4. 🟠 Fiabiliser l'inscription multi-étapes (échec partiel = compte orphelin). → §3.1
5. 🟡 Regrouper la navigation admin (15 items à plat). → §1.2

---

## 1. Architecture de l'information

### 1.1 Vue d'ensemble
4 espaces, IA propre côté parent, plus chargée côté admin.

| Espace | Nav | Modèle | Verdict |
|---|---|---|---|
| Parent | 3 onglets bas (Bilan · Mes séances · Fitness) | Apple Forme | ✅ Excellent |
| Coach | 5 items (sidebar desktop / tab bar mobile) | App | 🟡 Ambiguïtés de nommage |
| Admin | 15 items à plat | Console | 🟠 Surcharge, pas de regroupement |

### 1.2 🟠 Admin : 15 entrées de navigation à plat
`apps/web/src/app/admin/layout.tsx:12-28` — Dashboard, Dossiers, Supervision, Comptes, Coaches,
Familles, Enfants, Assignations, Programmes, Questionnaires, Badges, Messages, Notifications,
Analytics, Sécurité. Sur mobile c'est un **scroll horizontal de 15 pastilles** (`overflow-x-auto`,
ligne 87) : « trouver en faisant défiler », discoverabilité faible, pas de repère de section.

**Correctif** : grouper en 4-5 sections avec titres dans la sidebar :
- **Pilotage** : Dashboard · Analytics · Supervision
- **Suivi** : Dossiers · Assignations
- **Personnes** : Comptes · Coaches · Familles · Enfants
- **Contenu** : Programmes · Questionnaires · Badges
- **Comms** : Messages · Notifications
- **Système** : Sécurité

### 1.3 🟡 Collisions de vocabulaire
- Le mot **« séances »** désigne deux choses : les séances 1:1 coach (`/parent/my-sessions`) **et**
  la bibliothèque vidéo 20 min (`/parent/fitness`, titre « Toutes les séances »,
  `fitness/page.tsx:205`). Un parent ne saura pas où chercher.
- Côté coach, **« Bilans » (◈)**, **« Suivi » (◔ → dossiers)** et **« Séances » (✓)** se recouvrent
  conceptuellement (`coach/layout.tsx:11-15`). Clarifier les intitulés/périmètres.

**Correctif** : renommer l'onglet Fitness en « Programme » ou « Parcours », réserver « séances » au
1:1. Documenter en une phrase le rôle de chaque onglet coach.

### 1.4 🟡 Double `/dashboard`
`apps/web/src/app/dashboard/page.tsx` (43 l.) coexiste avec les dashboards par rôle. Vérifier que
c'est bien un simple routeur de redirection par rôle et non une 2ᵉ home concurrente.

---

## 2. Design system & cohérence visuelle

### 2.1 🔴 Deux design systems — l'admin est hors-marque
La charte (`tailwind.config.ts`) est claire : navy / cream / sun / sage + Fraunces (display).
Parent & coach la respectent. **L'admin ne l'utilise pas** :

| | Marque (parent/coach) | Admin (`admin/page.tsx`) |
|---|---|---|
| Texte | `text-navy-900`, Fraunces | `text-slate-900`, `font-black` / `font-extrabold` |
| Cartes | `shadow-card`, `rounded-2xl` | `rounded-[24px]`, dégradés indigo/emerald/amber/rose/lime |
| Icônes | glyphes géométriques | emoji 📊🗂️👤 |
| Gris | `navy-600/70` | `slate-500` |

Réf : `admin/page.tsx:125-134` (8 cartes en dégradés arc-en-ciel), `:142` (`text-4xl font-extrabold`),
`admin/layout.tsx:12-28` (nav emoji). Résultat : l'admin ressemble à un template SaaS générique,
pas à THRIVE. La police de marque (Fraunces) est **totalement absente** de l'admin.

**Correctif** : remplacer les dégradés par des aplats `navy/sun/sage`, `shadow-card`, `rounded-2xl`,
Fraunces sur les titres, et retirer les emoji (voir §2.4). C'est le chantier le plus visible.

### 2.2 🟠 Trois systèmes de champ, trois de bouton
- **Champs** : `.input-auth` (login), `TextInput` coach (`coach/ui.tsx:33`, bordure gris,
  `focus:ring-black/10`), et markup inline admin. Focus rings incohérents (`ring-black/10` vs
  `focus-visible` jaune global).
- **Boutons** : inline login (`login/page.tsx:334`), `Btn` coach (`coach/ui.tsx:116`, 3 variants),
  cartes-boutons dégradées admin. Aucun `<Button>` unique → styles qui divergent à chaque écran.

### 2.3 🟡 Échelles incohérentes (radius / ombres / gris / locale)
- **Radius** : `rounded-2xl`, `rounded-3xl`, `rounded-[24px]`, `rounded-[28px]`, `rounded-lg`,
  `rounded-full` sans échelle unifiée.
- **Ombres** : tokens `shadow-card` / `shadow-card-hover` existent mais l'admin utilise
  `shadow-sm` / `shadow-xl` / ombres colorées (`shadow-purple-500/20`).
- **Gris secondaire** : `text-gray-500` (coach ui) vs `text-slate-500` (admin) vs `text-navy-600/70`
  (parent) pour le même rôle sémantique.
- **Locale de date** : `fr-CA` (coach `dashboard:109`, `ui.tsx:154`) vs `fr-FR` (admin `page.tsx:238`)
  → formats de date différents selon l'écran. Le produit est **QC (Loi 25)** → normaliser sur `fr-CA`.

### 2.4 🟠 Trois familles d'icônes, dont emoji et glyphes typographiques
- Parent/coach : glyphes Unicode (`◈ ★ ▦ ◔ ✓`) — dépendants de la police, poids/rendu variables,
  pas de vraies icônes.
- Admin : **emoji** (`📊 🗂️ 👤 …`) — rendus différemment selon l'OS (Apple/Android/Windows), non
  contrôlables (couleur/poids), et **bruit pour les lecteurs d'écran** (lus « graphique à barres »).

**Correctif** : adopter un set d'icônes vectoriel (lucide-react, déjà idiomatique avec Tailwind),
et marquer toutes les icônes décoratives `aria-hidden`. Icônes = SVG, jamais texte/emoji.

### 2.5 🟠 Pas de bibliothèque `components/ui/`
Aucun dossier `components/ui`. Les primitives sont soit dupliquées (login), soit locales à un rôle
(`coach/ui.tsx`, thème clair uniquement, inutilisable en zone parent sombre). **Recommandation
structurante** : créer `components/ui/{Button,Input,Textarea,Select,Card,Badge,Skeleton,Icon}.tsx`
theming via variantes (light/dark), et refactorer login/coach/admin dessus. C'est le levier qui
résout mécaniquement §2.1–2.4.

---

## 3. Flux UX critiques

### 3.1 🟠 Inscription : chaîne multi-étapes sans reprise sur échec partiel
`login/page.tsx:108-172`. La création enchaîne, sans transaction ni idempotence :
`signUp` → `signIn` → `getUser` → insert `families` → insert `children`. Si l'insert enfants
échoue (ligne 162), l'utilisateur a **déjà un compte + une famille**, voit une erreur brute, et au
retry se heurte à « Un compte existe déjà avec cet email » (`:169`) — **cul-de-sac**.
- Le message d'erreur affiché est souvent `err.message` brut (technique), cf. `:104`, `:168`.
- Le formulaire n'a pas de feedback par étape (une seule spinner « Création du compte… »).

**Correctif** : déplacer famille+enfants dans une **RPC/Edge Function transactionnelle** post-signup
(ou upsert idempotent), détecter « déjà connecté mais enfants manquants » pour reprendre au lieu de
bloquer, et mapper les erreurs Supabase vers des messages humains.

### 3.2 🟡 Incohérence de validation d'âge
Le libellé promet « Vos enfants (8–17 ans) » (`:369`) mais l'input accepte `min={4}` (`:402`), et le
filtre d'enregistrement ne rejette pas < 8. Aligner min/max sur 8-17 + message d'erreur explicite.

### 3.3 🟡 Latence de connexion : appel MFA systématique
`login/page.tsx:101` — `getMfaStatus()` après **chaque** `signIn`, alors que le MFA est dormant
(aucun facteur enrôlé sur les comptes actuels, cf. mémoire projet). Ajoute un aller-retour à chaque
login. Acceptable, mais envisager de ne le déclencher que si un facteur est connu.

### 3.4 🟡 Pas d'accueil premier-login côté parent
`/parent` redirige direct vers `/parent/bilans` (`parent/(hub)/page.tsx`). Un nouveau parent (sans
séance complétée, sans bilan) tombe sur des états vides. Prévoir un onboarding/checklist de 1ʳᵉ
visite (« Choisis un profil → lance ta 1ʳᵉ séance »).

### 3.5 ✅ Points forts flux
Reset password complet avec confirmation neutre anti-énumération (`:243-247`), notice de compte
désactivé robuste (sessionStorage + repli URL, `:47-63`), anti-double-submit (`:94`), redirection
propre si déjà connecté (`:175-185`).

---

## 4. Accessibilité (WCAG 2.2 AA)

### 4.1 🟠 Contrastes des textes faible-opacité à vérifier/corriger
Nombreux textes à opacité réduite sur fonds sombres ou dégradés, à risque sur le seuil AA (4,5:1
texte normal, 3:1 grand texte) :
- `text-white/45`, `text-white/55` (labels 11 px de la tab bar parent, `parent/(hub)/layout.tsx:109`,
  `fitness/page.tsx:207,270`) — **petit texte** → seuil 4,5:1, probablement **non conforme**.
- `text-navy-200/60`, `text-navy-100/70` (coach layout), `text-navy-600/60` (login secondaire).

**Correctif** : mesurer avec un contraste-checker les tokens < 70 % d'opacité utilisés sur du texte,
et remonter l'opacité (ou éclaircir la couleur) là où < 4,5:1. Prioriser les labels de navigation.

### 4.2 🟠 Anneau de focus jaune sur fonds clairs
`globals.css` — `:focus-visible { outline: 2px solid rgba(249,235,80,0.75) }`. Le **sun sur cream/
blanc** (zones login, coach, admin) a un contraste très faible → l'indicateur de focus lui-même peut
échouer **SC 2.4.13 (Focus Appearance)**. Sur navy c'est parfait.

**Correctif** : anneau adaptatif — jaune sur fonds sombres, navy (ou double anneau navy+halo) sur
fonds clairs. Ou un `outline` navy universel avec `outline-offset` suffisant.

### 4.3 🟡 Icônes textuelles non masquées aux lecteurs d'écran
Les glyphes de nav (`◈ ★ ▦`) et les emoji admin sont dans le flux sans `aria-hidden`. Un lecteur
d'écran peut vocaliser le glyphe/emoji puis le label (redondant/confus). Marquer toutes les icônes
décoratives `aria-hidden` (voir §2.4).

### 4.4 🟡 Champs sans label programmatique quand `label` absent
`coach/ui.tsx:33-58` — `TextInput` peut être rendu **sans `label`** (placeholder seul), ce qui échoue
**SC 3.3.2 / 4.1.2**. Le placeholder n'est pas un label. Rendre `label` obligatoire ou générer un
`aria-label`.

### 4.5 🟡 Tableaux admin non responsives / non balisés
`admin/page.tsx:190-245` — `<table>` en `overflow-x-auto` sur mobile (scroll horizontal), `<th>` sans
`scope`, pas de `<caption>`. Ajouter `scope="col"`, une `caption` (ou `aria-label`), et un fallback
en cartes sur mobile.

### 4.6 🟡 `<h1>` manquant sur le login
`login/page.tsx` — le logo tient lieu de titre ; les sections sont en `<h2>` sans `<h1>` parent
(hiérarchie de titres cassée). Ajouter un `<h1>` (peut être visuellement masqué : « Connexion à
THRIVE »).

### 4.7 ✅ Points forts a11y (à préserver)
`prefers-reduced-motion`, `focus-visible`, 16 px mobile anti-zoom, `touch-action: manipulation`,
cibles ≥ 44/48 px, `aria-pressed`/`aria-current`/`aria-busy`/`role="status"`/`role="alert"`,
`aria-haspopup`/`aria-expanded` + fermeture Échap sur le ChildSwitcher, voile anti-clic-fantôme via
portal. C'est un socle a11y sérieux.

---

## 5. Responsive mobile

### 5.1 🟠 Coach — tab bar mobile à 5 items, labels longs
`coach/layout.tsx:60-79` — 5 cellules `flex-1`, labels `text-[11px]` dont **« Tableau de bord »** :
sur 375 px (≈ 75 px/cellule), le libellé passe sur 2 lignes → hauteurs de barre irrégulières.
**Correctif** : raccourcir (« Accueil », « Athlètes », « Bilans », « Séances », « Suivi »), garantir
une hauteur fixe, `line-clamp-1`.

### 5.2 🟡 Admin mobile — nav = scroll horizontal de 15 pastilles
Voir §1.2. Sur mobile le problème d'IA devient un problème d'ergonomie (chercher en scrollant).

### 5.3 ✅ Points forts responsive
Tab bars ancrées en bas type app native, `safe-area-inset`, `100dvh`, `overscroll-x-contain` sur les
carrousels (empêche le « retour » par swipe de bord), hero `50vh` façon Apple Fitness+, `pb-32` pour
dégager la tab bar flottante.

---

## 6. Performance perçue & réelle

### 6.1 🟠 Admin dashboard — comptages côté client sur tables entières
`admin/page.tsx:66-68` — `programs.select('id,status')` et **`sessions.select('id,status')`**
rapatrient **toutes les lignes** pour compter/filtrer en JS (`:82-85`). À l'échelle (milliers de
séances) : payload lourd, rendu lent.
**Correctif** : `select('id', { count:'exact', head:true })` avec `.eq('status', …)` par statut,
comme c'est déjà fait pour parents/coaches (`:58-64`).

### 6.2 🟠 Realtime — refetch complet à chaque changement de ligne
`admin/page.tsx:94-104` s'abonne à **5 tables** ; chaque INSERT/UPDATE relance **les 7 requêtes**.
Idem coach (`coach/dashboard:49-59`). En prod multi-utilisateur → rafales de refetch (« thundering
herd »).
**Correctif** : débouncer (ex. 500 ms), ne rafraîchir que la donnée concernée, ou passer par des
compteurs incrémentaux.

### 6.3 🟡 Coach dashboard — flash de zéros
`coach/dashboard:75-79` — les `StatCard` affichent `children.length` (=0) **avant** la fin du
chargement (seul le bloc « prochaines séances » a un skeleton, `:86`). L'utilisateur voit « 0
Athlètes » puis la vraie valeur. Gater les stats sur `loading` (skeleton chiffres).

### 6.4 ✅ Points forts
Skeletons soignés (admin `:107-117`, fitness `:100-107`), realtime = fraîcheur perçue (badge
« Temps réel » admin), une seule requête catalogue partagée en fitness.

---

## 7. Conversion, confiance & rétention

- ✅ **CTA clairs et hiérarchisés** : action primaire en `sun` (parent), en `navy` (coach/login) ;
  hero parent « ▶ Lancer la séance » très lisible (`fitness:154`).
- ✅ **Signaux de confiance** : « Compte actif immédiatement — aucun email de validation requis »
  (`login:449`), barre de progression du parcours (`fitness:162-180`).
- 🟡 **Friction rétention** : états vides informatifs (coach `:88-91`, `:130-134`) mais sans CTA
  d'amorçage côté parent (§3.4). Ajouter des empty states orientés action (« Lance ta 1ʳᵉ séance »).
- 🟡 **Messages d'erreur bruts** techniques exposés à l'utilisateur final (§3.1) — nuit à la
  confiance. Centraliser un mapping d'erreurs.

---

## 8. Plan d'action priorisé

| # | Sévérité | Chantier | Effort | Réf |
|---|---|---|---|---|
| 1 | 🔴 | Réaligner l'admin sur la charte (couleurs, Fraunces, radius, ombres, icônes) | L | §2.1 |
| 2 | 🟠 | Créer `components/ui/` (Button, Input, Card, Badge, Icon, Skeleton) et refactorer | L | §2.5 |
| 3 | 🟠 | Set d'icônes vectoriel (lucide) + `aria-hidden`, retrait emoji/glyphes | M | §2.4, §4.3 |
| 4 | 🟠 | Audit de contraste des tokens faible-opacité + focus ring adaptatif | M | §4.1, §4.2 |
| 5 | 🟠 | Fiabiliser l'inscription (RPC transactionnelle + reprise + mapping erreurs) | M | §3.1 |
| 6 | 🟠 | Comptages `head:true` + refetch realtime débouncé (admin/coach) | M | §6.1, §6.2 |
| 7 | 🟠 | Regrouper la nav admin en sections + raccourcir la tab bar coach | S | §1.2, §5.1 |
| 8 | 🟡 | Normaliser la locale de date sur `fr-CA` | S | §2.3 |
| 9 | 🟡 | `<h1>` login, `scope`/caption tables, labels obligatoires | S | §4.4-4.6 |
| 10 | 🟡 | Empty states parent orientés action + onboarding 1ʳᵉ visite | M | §3.4, §7 |

_Effort : S ≤ ½ j · M ≈ 1-3 j · L > 3 j._

---

## 9. Limites de cet audit
- **Statique** : lecture de code, pas de parcours runtime ni de mesure de contraste automatisée
  (Axe/Lighthouse) — les contrastes §4.1/4.2 sont **à confirmer par mesure**.
- **Échantillon** : ~10 fichiers représentatifs sur 38 routes lus intégralement (tokens, 4 layouts,
  login, 3 dashboards, ChildSwitcher, UI kit coach). Les pages non lues (bilans 1561 l., admin/users
  678 l., my-sessions 616 l.) peuvent receler d'autres cas — une passe dédiée est recommandée.
- Pas d'évaluation du mobile natif Expo (hors cible, cf. mémoire projet).

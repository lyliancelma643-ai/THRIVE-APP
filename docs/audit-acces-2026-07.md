# Audit intégral & système de contrôle d'accès — THRIVE APP

**Date : 2026-07-07 · Base auditée : code réel du monorepo + état live du projet Supabase THRIVE-CA (`kkdcgzvdmipmrgkawnky`).**
Complète l'audit technique du 2026-07-06 ([AUDIT_REPORT.md](../AUDIT_REPORT.md)) — les constats déjà corrigés hier (commit `5ae57cb`) ne sont pas répétés ici.

---

## 1 · Cartographie du projet (constat, vérifié)

### Stack
| Couche | Techno | État |
|---|---|---|
| Web (SEULE app déployée) | Next.js 14.2 App Router, Tailwind, Zustand | Vercel `thrive-app`, auto-deploy `main` |
| Backend | NestJS 10 (stubs — non déployé) | Swagger OK, guards JWT/rôles opérationnels |
| Mobile | Expo SDK 55 + NativeWind 4 (non shippé) | compile 0 erreur depuis hier |
| Partagé | `@thrive/shared` (enums, hooks, Zod, client Supabase, types `Database` générés) | build OK |
| Données | Supabase Postgres · 44 tables · RLS 38/38 · 35 migrations | advisors : items intentionnels seulement |

### Modèle de données (cœur)
`profiles` (rôle verrouillé, autorité = `app_metadata.role`) → `families` (`parent_id`) → `children` → `coach_assignments` → `sessions` / `programs` / `coach_reports` / `parent_reports` / `skill_scores` / `lsss_items` / `video_sessions` (+ storage `athlete-documents`).

### Auth actuelle
Supabase Auth (email+mdp), MFA TOTP dormant, cookie `sb-access-token` posé par `auth.store.ts`, middleware Next fail-closed avec garde de rôle par chemin (`/parent`, `/coach`, `/admin`), trigger `handle_new_user` + `trg_set_signup_app_role` (rôle self-service = PARENT uniquement).

### Constat clé pour la Partie 2 (avant ce chantier)
- **Aucun état d'activation de compte** : un parent inscrit voyait immédiatement tout son espace.
- **Aucun statut de validation d'enfant** (`children` : pas de colonne statut).
- **Aucune table de feature flags** ; aucune notion de « section en construction ».
- **Aucun espace de travail interne** admin (roadmap/tâches).
- L'inscription crée déjà famille + enfants (fiabilisée par le commit `a8f9668`) — la brique « enfant obligatoire » existait donc partiellement côté formulaire, sans enforcement.

---

## 2 · Rapport d'audit — 9 axes

> Légende : ✅ bon · 🔴 critique · 🟠 important · 🟡 confort. Les 🔴/🟠 déjà corrigés hier ne sont pas re-listés.

### 2.1 Architecture & structure
- ✅ Monorepo pnpm propre, séparation apps/packages, conventions CONVENTIONS.md respectées côté web.
- 🟠 **Héritage racine mort** : `app/`, `components/`, `src/`, `stores/`, `types/`, `mobile/`, `node_modules/`, `package-lock.json` à la racine (ancienne app Expo). Rien ne les référence. → purge à valider par toi (décision).
- 🟠 **Double arborescence mobile** `apps/mobile/app/` (active) vs `apps/mobile/src/app/` (orpheline : login, dashboards). → fusion = décision produit.
- 🟡 `apps/web/src/app/parent/(hub)/bilans/page.tsx` : **1 567 lignes** — composant-page trop lourd (types + rendu + data). Recommandation : extraire les sections en composants (`components/parent/bilan/*`), sans urgence fonctionnelle.

### 2.2 Qualité du code
- ✅ 0 erreur `tsc` sur les 3 apps ; 0 `@ts-ignore` ; ESLint 0 erreur bloquante.
- 🟡 ~11 warnings ESLint mobile (`any` explicites dans les stores) + 1 `react-hooks/exhaustive-deps` dans `coach/athletes/[id]/session/[sessionId]/page.tsx:241` — à traiter au fil de l'eau.
- 🟡 `TODO` restants : navigation post-notification mobile (`usePushNotifications.ts`, `app/_layout.tsx`) — assumés, mobile non shippé.

### 2.3 Sécurité 🔴
- ✅ (acquis) RLS 38/38, `search_path` propre, autorité `app_metadata.role` partout, CSP/HSTS, MFA dormant, RPC anon révoquées, DTO whitelistés backend.
- 🔴 **[CORRIGÉ ICI] Aucune restriction serveur sur le contenu parent avant validation** : n'importe quel compte PARENT fraîchement inscrit pouvait lire `sessions`, `parent_reports`, `video_sessions` via PostgREST (les policies existantes n'exigeaient que la relation parent-enfant). → policies **RESTRICTIVES** ajoutées (migration 035, §4) : le grisé UI est doublé d'un verrou RLS.
- 🟠 **Leaked password protection** toujours désactivée (action dashboard, connue).
- 🟠 Enforcement MFA admin : dormant tant qu'aucun facteur n'est enrôlé (connu).
- 🟡 Clé anon en dur (fallback) dans `middleware.ts` / `supabase-server.ts` / `shared/lib/supabase.ts` : acceptable (clé publique, RLS), documenté.

### 2.4 Base de données & modèle
- ✅ Intégrité référentielle bonne (FK systématiques), triggers métier actifs, realtime configuré.
- 🟠 **[CORRIGÉ ICI]** Pas d'état de cycle de vie (`children.validation_status`, `profiles.coach_validated`) → ajoutés en 035 avec index implicites PK/FK ; `admin_tasks` indexée (`horizon+status`, `assignee`).
- 🟡 Migration non numérotée `20260608_onboarding_profile.sql` (ne pas renommer — historique).
- 🟡 `notes` en clair sur `children` : contient potentiellement du sensible mineur — couvert par RLS ; chiffrement applicatif = chantier Loi 25 si le contenu s'étoffe.

### 2.5 Performance
- ✅ Comptages `head:true`, refetch realtime débouncé (commit `a8f9668`), Next static où possible, First Load JS ~87 kB partagé.
- 🟠 **Pattern N+1 léger** dans plusieurs pages admin/parent : requêtes en cascade (families → children → profiles). Ex. `child.store.ts` (2 requêtes séquentielles), `validations` (2+1). Acceptable aux volumes actuels (dizaines de familles) ; à refactorer en RPC/nested selects si >500 familles.
- 🟡 `bilans/page.tsx` charge toutes les sections d'un coup — lazy sections possibles.
- 🟡 Realtime roadmap : `load()` complet à chaque événement — OK pour une équipe de quelques admins.

### 2.6 UX/UI & parcours
- ✅ Design system cohérent (navy/cream/sun/sage, `components/ui/*`), tab bar type Apple Forme, focus ring bi-ton WCAG 2.2, pages erreur/404 brandées (hier).
- 🟠 **[CORRIGÉ ICI]** Aucun parcours « compte en préparation » : un nouvel inscrit tombait sur des pages vides sans explication → messages premium + aperçus grisés (§4).
- 🟡 `select-profile` (création enfant) est sur fond clair alors que le hub parent est sombre — rupture visuelle tolérable (écran de gestion), à harmoniser plus tard.
- 🟡 Accessibilité : les aperçus grisés utilisent `inert` + `aria-disabled` (fait) ; vérifier au VoiceOver réel lors d'un passage QA.

### 2.7 Gestion des états & données
- ✅ États loading/empty/error présents sur les pages refondues (bilans, dashboards, roadmap/validations livrées avec les 3 états).
- 🟠 **[CORRIGÉ ICI]** L'état « accès verrouillé » n'existait pas → store `useAccessStore` unique, rechargé au montage du hub, avec repli sûr si la RPC n'existe pas encore (fenêtre de déploiement).
- 🟡 `child.store` persiste `selectedChildId` — purgé au logout (fait hier), OK.

### 2.8 Fiabilité & robustesse
- ✅ Middleware fail-closed ; signOut à toute épreuve ; inscription compte/famille découplée (best-effort).
- 🟠 **Fenêtre code→migration** : les nouveaux écrans tolèrent l'absence des objets 035 (repli « ouvert » + messages explicites côté admin) — ordre de déploiement sûr dans les deux sens, mais **le verrouillage n'est effectif qu'une fois 035 appliquée**.
- 🟡 Échec réseau sur `access_state()` → repli « ouvert » côté UI : choix délibéré (la RLS reste l'autorité) ; l'alternative fail-closed UI pénaliserait les comptes légitimes hors-ligne.

### 2.9 Tests & maintenabilité
- 🔴 **Zéro test automatisé** dans tout le monorepo (jest configuré backend, aucun spec ; rien web/mobile). Zones critiques sans filet : cycle d'accès (035), scoring bilan/LSSS, middleware. Recommandation : commencer par 3 suites ciblées — (1) tests SQL du cycle d'accès (pgTAP ou script de seed+assert), (2) tests unitaires `lib/bilan.ts`/`lib/packs.ts`, (3) smoke Playwright login→hub.
- 🟡 Pas de CI (GitHub Actions) : `typecheck + lint + build` sur PR serait le premier gain.

---

## 3 · Synthèse priorisée — Top 10 impact/effort

| # | Action | Priorité | Effort | Statut |
|---|---|---|---|---|
| 1 | Enforcement serveur du cycle d'accès (RLS restrictives) | 🔴 | M | ✅ fait (035) |
| 2 | Cycle enfant PENDING → confirmation admin → validation coach | 🔴 | M | ✅ fait (035 + UI) |
| 3 | Feature flag Fitness serveur + toggle Super Admin | 🟠 | S | ✅ fait |
| 4 | Appliquer 034 + 035 sur THRIVE-CA | 🔴 | S | ⏳ **ton OK requis** |
| 5 | Activer leaked-password protection (dashboard) | 🟠 | S | ⏳ manuel |
| 6 | Tests du cycle d'accès (seed + asserts SQL) | 🟠 | M | à faire |
| 7 | CI GitHub Actions (typecheck+lint+build) | 🟠 | S | à faire |
| 8 | Purge héritage racine + fusion routes mobile | 🟠 | M | ta décision |
| 9 | Découper `bilans/page.tsx` (1 567 l.) en sections | 🟡 | M | à faire |
| 10 | Brancher `createClient<Database>` (typage bout-en-bout) | 🟡 | M | à faire (passe dédiée) |

---

## 4 · Contrôle d'accès — ce qui a été implémenté

### Modèle d'états
```
Inscription (rôle PARENT via app_metadata)
   └─ enfant OBLIGATOIRE  → children.validation_status = 'PENDING'
        └─ confirmation Admin/Super Admin → 'CONFIRMED'   (rpc confirm_child)
             └─ validation coach → profiles.coach_validated = true
                                   (rpc validate_parent_access — coach assigné ou admin)
                  └─ unlocked = (≥1 enfant CONFIRMED) ∧ coach_validated
Fitness : app_settings.fitness_enabled (Super Admin) — OFF ⇒ « en construction » pour TOUS.
```

### Schéma & serveur — [supabase/migrations/20260707_035_access_control.sql](../supabase/migrations/20260707_035_access_control.sql)
| Objet | Rôle |
|---|---|
| `children.validation_status` (PENDING/CONFIRMED) | statut de la fiche enfant — existants backfillés CONFIRMED |
| `profiles.coach_validated` | validation du coach — parents existants backfillés `true` (zéro lockout) |
| `app_settings` | feature flags serveur ; lecture authenticated, écriture Super Admin (RLS) ; seed `fitness_enabled=false` |
| `admin_tasks` + RLS + realtime | roadmap interne (droits différenciés admin/super admin) |
| `private.parent_access_unlocked()` / `access_state()` | état d'accès (1 RPC lue par le front) |
| `confirm_child()` / `validate_parent_access()` | actions de déblocage, contrôle des droits DANS la fonction |
| Policies **restrictives** `gate_parent_*` | verrou serveur sur `sessions`, `parent_reports`, `video_sessions`, `video_session_runs` — le flag fitness est aussi vérifié en RLS |

**Choix technique** : policies `AS RESTRICTIVE` = ET logique avec les policies permissives existantes → aucun risque de régression sur les accès coach/admin/enfant, et pas de réécriture des policies en prod.

### UI (fichiers livrés)
| Fichier | Rôle |
|---|---|
| [lib/access.ts](../apps/web/src/lib/access.ts) | store d'accès + messages premium (repli « ouvert » si 035 absente) |
| [components/parent/AccessGate.tsx](../apps/web/src/components/parent/AccessGate.tsx) | bannière, sections grisées (`inert`), aperçu Bilan, notices Séances/Fitness |
| [parent/(hub)/layout.tsx](../apps/web/src/app/parent/(hub)/layout.tsx) | onglets visibles **non cliquables** quand verrouillé ; redirection création enfant obligatoire |
| [bilans/page.tsx](../apps/web/src/app/parent/(hub)/bilans/page.tsx) · [my-sessions/page.tsx](../apps/web/src/app/parent/(hub)/my-sessions/page.tsx) · [fitness/page.tsx](../apps/web/src/app/parent/(hub)/fitness/page.tsx) · [session/[id]/page.tsx](../apps/web/src/app/parent/(hub)/session/[id]/page.tsx) | gardes par page (aperçu grisé / notice coach / « en construction ») |
| [select-profile/page.tsx](../apps/web/src/app/parent/select-profile/page.tsx) | message « fiche en cours de validation » après création |
| [admin/validations/page.tsx](../apps/web/src/app/admin/validations/page.tsx) | files d'attente enfants + parents, boutons Confirmer / Activer |
| [admin/reglages/page.tsx](../apps/web/src/app/admin/reglages/page.tsx) | toggle Fitness — **Super Admin uniquement** (nav `superAdminOnly` + garde page + RLS) |
| [components/coach/PendingFamiliesPanel.tsx](../apps/web/src/components/coach/PendingFamiliesPanel.tsx) | panneau coach « Ouvrir l'accès » sur ses familles assignées |

### Messages (intégrés, à valider par toi)
Repris de tes formulations, complétés dans le même ton (`ACCESS_MESSAGES` dans `lib/access.ts`) — un seul point de modification pour tout ajuster.

### Roadmap interne — [admin/roadmap/page.tsx](../apps/web/src/app/admin/roadmap/page.tsx)
4 horizons (semaine / mois / 3 mois / année) · cases à cocher · statut « En cours » · deadlines avec alerte retard · barres de progression par horizon · « **Je m'en occupe** » (self-assignation admin) · **attribution par le Super Admin** (menu déroulant sur chaque tâche) · description inline · suppression (admin : ses tâches ; super admin : tout) · **synchronisation temps réel** entre administrateurs · filtre « afficher les terminées ». Droits appliqués en RLS ET reflétés dans l'UI.

---

## 5 · Décisions qui t'appartiennent (je n'ai pas tranché)

1. **Application de 034 + 035 sur THRIVE-CA** — backfill inclus (zéro lockout des comptes existants), mais dès l'application : (a) la section **Fitness passe « en construction » pour tout le monde** (flag OFF par défaut — c'est la spec), (b) tout NOUVEAU parent entre dans le cycle de validation. Dis « OK » et je l'applique.
2. **Compte démo** `demo.parent@thrive.app` : backfillé comme les autres (accès complet conservé). Si tu préfères qu'il illustre le parcours verrouillé, je peux le repasser en attente.
3. **Formulations des messages** : intégrées telles que fournies — modifiables en un point (`ACCESS_MESSAGES`).
4. **Purge de l'héritage racine** et **fusion des routes mobile** : destructif → sur ton feu vert, chantier séparé.
5. **La validation coach par l'admin** : j'ai permis à l'admin de faire aussi « Activer l'accès » (dépannage si un coach tarde). Si tu veux le réserver strictement au coach, une ligne à retirer dans `validate_parent_access()`.

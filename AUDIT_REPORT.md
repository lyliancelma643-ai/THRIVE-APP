# AUDIT_REPORT — THRIVE APP

**Date : 2026-07-06 · Périmètre : monorepo complet (backend, web, mobile, shared, Supabase) · Base vérifiée : prod THRIVE-CA (`kkdcgzvdmipmrgkawnky`)**

**État final vérifié :** `tsc --noEmit` = **0 erreur** sur les 3 apps · `@thrive/shared` build OK · backend démarre (Swagger 200, garde JWT 401, validation DTO 400 sur champ inconnu) · `next build` prod OK · ESLint 0 erreur bloquante sur les 3 apps.

---

## ✅ Points validés (conformes, aucune correction nécessaire)

### Bloc 1 — Monorepo
- **1.1** `pnpm-workspace.yaml` liste `apps/*`, `packages/*`.
- **1.3** `@thrive/shared` référencé en `workspace:*` dans backend, web et mobile.
- **1.5** `pnpm --filter @thrive/shared build` produit un `dist/` valide (vérifié par `require()` du bundle).
- **1.7** Pas de duplication problématique (zod/zustand/tailwind par app = normal, résolution pnpm saine).

### Bloc 2 — Environnement
- **2.2** `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '../../.env.development'] })` conforme.
- **2.3** Aucune fuite : zéro occurrence de `SERVICE_ROLE` dans `apps/web/src`, `apps/mobile`, `packages/shared`. Les clés en dur (middleware, supabase-server, shared) sont **la clé anon publique** (protégée par RLS), documentée comme telle.
- **2.4** Mobile lit `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` via le client partagé (Expo SDK 55 ≥ 49 ✅).

### Bloc 3 — @thrive/shared
- **3.1** Tous les exports d'`index.ts` pointent vers des fichiers existants.
- **3.2** `UserRole` exporté + alias `Role` (rétrocompat).
- **3.3** `supabaseClient` (pas `supabase`) exporté.
- **3.5** `NotificationService` / `useNotifications` absents de l'index principal (vérifié sur le bundle).
- **3.6** Schémas Zod présents (`validation/*.schema.ts`) et exportés.
- **3.8** `zod`, `@types/react`, `@types/node` présents dans `package.json`.

### Bloc 4 — Backend NestJS
- **4.4** `@Public()` + `JwtAuthGuard` (APP_GUARD) : routes publiques exclues correctement.
- **4.5** `@CurrentUser()` extrait `request.user` posé par le guard.
- **4.6** Validation JWT via `supabase.auth.getUser(token)` (équivalent robuste à une JwtStrategy : la signature est vérifiée par Supabase côté serveur).
- **4.7** Swagger démarre sans crash — **testé en dry-run : `GET /api/docs` → 200**.
- **4.10** Aucun `console.log` de données sensibles dans le backend.

### Bloc 5 — Web Next.js
- **5.1** `tailwind.config.ts` : `content: ['./src/**/*.{ts,tsx}']` couvre app/ et components/.
- **5.2** `postcss.config.js` avec tailwindcss + autoprefixer.
- **5.3** `globals.css` importe les 3 directives `@tailwind`.
- **5.4** `auth.store.ts` pose/retire `sb-access-token` (signIn, signOut, hydrate, `onAuthStateChange` TOKEN_REFRESHED/SIGNED_IN/SIGNED_OUT) + backstop désactivation compte.
- **5.5 / 5.6** `middleware.ts` : lit le cookie, fail-closed vers `/login`, matcher couvre `/dashboard`, `/parent`, `/coach`, `/admin` + garde de rôle par `app_metadata.role` uniquement.
- **5.7** Tous les composants utilisant des hooks ont `'use client'` (sweep exhaustif : 0 manquant).
- **5.9** Pas de `next/image` sans dimensions (le seul `<img>` est un QR data-URI avec width/height).
- **5.10** Zéro `key={index}` dans les listes mappées.
- **5.12** `layout.tsx` racine définit `metadata` (title, description).

### Bloc 6 — Mobile Expo
- **6.1** `nativewind-env.d.ts` présent et inclus dans le tsconfig.
- **6.4** L'envoi push passe par l'edge function `send-push-notification` (tokens lus en base) — pas de token en dur.

### Bloc 7 — Migrations (vérifié fichiers + **état réel de la prod THRIVE-CA**)
- **7.2** Migration 009 : `v_role::user_role` casté + whitelist `PARENT/COACH/CHILD` (ADMIN/SUPER_ADMIN impossibles à l'inscription).
- **7.3** Migration 010 : enum `notification_type` contient `SESSION_REMINDER` — **confirmé en prod**.
- **7.4** Migrations 014/015 : récursion RLS résolue par fonctions SECURITY DEFINER + `SET search_path`.
- **7.5** Migration 019 : `app_metadata` = autorité du rôle ; trigger `trg_set_signup_app_role` actif en prod.
- **7.6** Migration 025 : 7 helpers `private.*` (is_super_admin, can_view/edit_child_bilan, etc.) tous avec search_path.
- **7.7** REPLICA IDENTITY FULL posé (012) ; publication `supabase_realtime` couvre 24 tables en prod.
- **7.8** **RLS activé sur les 38 tables du schéma public en prod** (vérifié `pg_tables.rowsecurity`) — y compris skill_scores, bilans (coach_reports/parent_reports), lsss_items, athlete_documents, family-packs (familles/entitlements).
- **7.9** **0 fonction SECURITY DEFINER sans `SET search_path` en prod** (vérifié `pg_proc.proconfig`). Voir 🔧 034 pour la reproductibilité des fichiers.
- **7.10** Migrations 031+032 : REVOKE anon effectif ; advisors ne signalent que `lsss_get`/`lsss_submit`, **volontairement** ouvertes à anon (lien enfant tokenisé, garde par token dans le corps).
- **7.11** Migration 028 : policies storage `athlete-documents` limitées au coach assigné / superviseurs (bucket privé).

### Bloc 8 — Sécurité
- **8.1 / 8.2** Aucune clé secrète côté client ; service_role uniquement backend + edge functions. `.env`/`.env.local` non trackés par git.
- **8.3** Les 5 edge functions utilisent `Deno.env.get()` — zéro hardcode.
- **8.6** Migration 013 (child_visibility) + helpers 025 : visibilité enfant conditionnée à la relation parent-enfant / assignation coach validée en base. Advisors sécurité : **aucun problème non documenté**.

### Bloc 9 — Qualité
- **9.2** Zéro `@ts-ignore` / `@ts-expect-error` dans tout le code source.
- **9.3** Zéro `any` dans les types partagés (`packages/shared/src/types/*`).
- **9.5** Pas d'import circulaire (build tsc strict du package OK).

### Bloc 10 — Flux métier (vérifié sur la prod THRIVE-CA)
- **10.1 / 10.2** Trigger `on_auth_user_created` (handle_new_user, cast enum + rôle whitelisté) + `trg_set_signup_app_role` sur `auth.users` — actifs.
- **10.3 / 10.4** Login/logout : cookie posé/retiré + purge locale à toute épreuve + `location.replace('/login')` (voir auth.store.ts).
- **10.5** Trigger `trg_assignment_program` (on_assignment_create_program) sur `coach_assignments` — actif.
- **10.6** Trigger `on_session_scheduled_notify` sur `sessions` + enum `SESSION_REMINDER` présent → plus de 42804 possible.
- **10.7** RPC `gauge_summary` présente en prod ; tables `skill_scores` + `progress_log` sous RLS.
- **10.8** RPC LSSS complètes en prod : `lsss_get`, `lsss_submit`, `lsss_send`, `lsss_progression`.
- **10.9** `messages`, `conversations`, `notifications` dans la publication realtime + REPLICA IDENTITY FULL.
- **10.10** Migration 011 (admin_full_access) + helper `private.is_super_admin()` en place.

---

## 🔧 Points corrigés (fichier + description)

### Monorepo & build
| Fichier | Correction |
|---|---|
| [package.json](package.json) | `--filter backend` ne matchait pas le nom réel `@thrive/backend` (dev:backend/build:backend cassés) → corrigé ; ajout `build:shared`, `test`, `--if-present` sur lint/typecheck |
| [apps/backend/package.json](apps/backend/package.json) | Ajout scripts `lint` + `typecheck` ; ajout deps **class-validator + class-transformer** (le `ValidationPipe` global les exige au runtime) |
| [apps/backend/tsconfig.json](apps/backend/tsconfig.json) | Étend désormais `../../tsconfig.base.json` (1.4) en conservant les assouplissements requis (`noImplicitAny:false`, etc.) ; paths `@thrive/shared` → dist |
| [commitlint.config.js](commitlint.config.js) | scope-enum enrichi des scopes réellement utilisés dans l'historique (`ux`, `sécu`, `db`, `coach`, `parent`, `bilans`, `packs`, `identity`, `admin`, `docs`) — les commits récents ne passaient pas le lint |
| [.gitignore](.gitignore) | Le `.env*` final annulait l'exception `!.env.example` → retiré |
| [.env.example](.env.example) | Ajout des variables mobile `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` + `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/ANDROID` (2.4/6.5) |
| [.eslintrc.json](.eslintrc.json) + [apps/web/.eslintrc.json](apps/web/.eslintrc.json) | **Aucune config ESLint n'existait** (9.6 : `next lint` inopérant, lint-staged husky inopérant) → configs créées ; `eslint-config-next` ajouté au web ; `react/no-unescaped-entities` désactivée (app francophone) |

### @thrive/shared
| Fichier | Correction |
|---|---|
| [packages/shared/src/index.ts](packages/shared/src/index.ts) | **Retrait de `/// <reference shims.d.ts>`** : le shim (modules Expo déclarés en ambiant) écrasait les vrais types react-native/expo-notifications pour toute la compilation mobile (cause racine de ~15 erreurs TS). Ajout exports `useAuth`, `useChildBadges`, `Badge`, `ChildBadge`, `Database`, `Json` |
| [packages/shared/src/hooks/useAuth.ts](packages/shared/src/hooks/useAuth.ts) | **Créé** (3.4) : hook d'auth partagé (session Supabase + `onAuthStateChange`), rôle lu depuis `app_metadata` uniquement — utilisé par 4 écrans mobiles qui l'importaient déjà |
| [packages/shared/src/types/database.ts](packages/shared/src/types/database.ts) | **Créé** (3.7) : types générés depuis le schéma prod THRIVE-CA (44 tables) — permet le typage bout-en-bout `Database['public']['Tables'][…]` |
| [packages/shared/package.json](packages/shared/package.json) | Ajout des sous-chemins d'export `./services/NotificationService` et `./hooks/useNotifications` (imports mobile propres, sans polluer l'index consommé par le web) |
| [packages/shared/src/services/NotificationService.ts](packages/shared/src/services/NotificationService.ts) | Handler conforme à l'API expo-notifications SDK 55 (`shouldShowBanner`/`shouldShowList`) |

### Backend NestJS
| Fichier | Correction |
|---|---|
| [apps/backend/src/main.ts](apps/backend/src/main.ts) | CORS : origines multiples `[APP_URL, localhost:3000, localhost:3001, localhost:19006]` (4.1) |
| [apps/backend/src/app.module.ts](apps/backend/src/app.module.ts) | Import de Sessions/Programs/Notifications/Messages modules (4.2) ; [sessions.module.ts](apps/backend/src/modules/sessions/sessions.module.ts) créé |
| [jwt-auth.guard.ts](apps/backend/src/modules/auth/guards/jwt-auth.guard.ts) | **Sécurité (4.8)** : `request.user.role` lu depuis `app_metadata.role` (source d'autorité) au lieu de `profiles.role` ; le profil ne sert plus qu'à `is_active` + identité |
| DTOs créés : [Login](apps/backend/src/modules/auth/dto/Login.dto.ts), [Register](apps/backend/src/modules/auth/dto/Register.dto.ts), [UpdateProfile](apps/backend/src/modules/auth/dto/UpdateProfile.dto.ts), [CreateUser](apps/backend/src/modules/users/dto/CreateUser.dto.ts), [UpdateUser](apps/backend/src/modules/users/dto/UpdateUser.dto.ts), [CreateFamily](apps/backend/src/modules/families/dto/CreateFamily.dto.ts), [CreateChild](apps/backend/src/modules/children/dto/CreateChild.dto.ts) | **Sécurité + 4.3/4.9** : `PUT /auth/me` acceptait un body arbitraire appliqué avec la clé service (`{ "role": "ADMIN" }` = escalade de privilèges) → liste blanche stricte, `role`/`is_active` exclus. Testé : champ inconnu → 400 `property rogue should not exist` |
| [users.controller.ts](apps/backend/src/modules/users/users.controller.ts) | Fin des `@Body() body: any` (4.3) + endpoints admin protégés par `@Roles(ADMIN, SUPER_ADMIN)` (ils étaient accessibles à tout utilisateur connecté) |
| [families.controller.ts](apps/backend/src/modules/families/families.controller.ts) / [children.controller.ts](apps/backend/src/modules/children/children.controller.ts) | Bodies typés par DTO, fin des `as any` |

### Web Next.js
| Fichier | Correction |
|---|---|
| [apps/web/src/app/error.tsx](apps/web/src/app/error.tsx) + [not-found.tsx](apps/web/src/app/not-found.tsx) | **Créés** (5.11) — brandés THRIVE (navy/cream), bouton Réessayer / retour accueil |

### Mobile Expo
| Fichier | Correction |
|---|---|
| [apps/mobile/src/stores/auth.store.ts](apps/mobile/src/stores/auth.store.ts) | **Import cassé** `../services/supabase` (fichier inexistant) → client partagé ; **sécurité** : rôle lu depuis `app_metadata` (était `user_metadata`, falsifiable) |
| [apps/mobile/src/hooks/usePushNotifications.ts](apps/mobile/src/hooks/usePushNotifications.ts) | Réécrit : API expo-notifications SDK 55 (`subscription.remove()`), projectId depuis `app.json` (plus de `'your-project-id'` en dur), **token push retiré des logs** (8.4) |
| [apps/mobile/app/_layout.tsx](apps/mobile/app/_layout.tsx) | Imports corrigés (NotificationService en sous-chemin, store via `../src/`), types listeners SDK 55, init RevenueCat |
| [apps/mobile/app.json](apps/mobile/app.json) | **Créé** — il n'existait pas (scheme, bundle ids, plugins expo-router/notifications/secure-store, `tsconfigPaths`) |
| [apps/mobile/babel.config.js](apps/mobile/babel.config.js) / [metro.config.js](apps/mobile/metro.config.js) / [global.css](apps/mobile/global.css) | **Créés** (6.2/6.3) : NativeWind v4 n'était pas câblé dans l'app (les configs vivaient à la racine pour l'app legacy) ; metro configuré pour le monorepo pnpm (watchFolders) |
| [apps/mobile/tailwind.config.js](apps/mobile/tailwind.config.js) | Était un **symlink** vers la racine (content ne couvrait pas `./src` ni le package partagé) → fichier réel avec content complet |
| [apps/mobile/tsconfig.json](apps/mobile/tsconfig.json) | Paths `@thrive/shared/*` (sous-chemins) + mapping `expo-notifications`/`expo-device` (résolution pnpm depuis les sources partagées) |
| [apps/mobile/src/services/purchases.ts](apps/mobile/src/services/purchases.ts) | **Créé** (6.5) : init RevenueCat par plateforme (`EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/ANDROID`), no-op sûr sous Expo Go |
| Écrans `(coach)`/`(parent)` | Imports réparés (`useNotifications` en sous-chemin, `supabase`→`supabaseClient`), `order_index` ajouté aux questions (questionnaires.tsx) |

### Supabase
| Fichier | Correction |
|---|---|
| [20260706_034_search_path_hardening.sql](supabase/migrations/20260706_034_search_path_hardening.sql) | **Créée** (7.9) : les migrations 002/003/004/010 créent des fonctions SECURITY DEFINER **sans** `SET search_path` — la prod est déjà corrigée (passe advisors), mais un replay complet (nouvel env, CI) recréerait la faille. Migration idempotente : ALTER ciblés + filet de sécurité générique. **Non appliquée à la prod** (voir ⚠️). |

**Résultat mobile : 33 erreurs TypeScript → 0.**

---

## ⚠️ Points nécessitant une action manuelle / décision

1. **Appliquer la migration 034 sur THRIVE-CA** — no-op fonctionnel (la prod est déjà conforme), mais à passer via `supabase db push` ou le MCP pour l'inscrire dans l'historique. Non appliquée sans ton OK explicite (règle : toute écriture prod).
2. **Leaked password protection désactivée** (advisor Supabase, connu) — à activer dans Dashboard → Auth → Passwords (HaveIBeenPwned). Action dashboard, pas de migration possible.
3. **Rate limiting auth (8.5)** — les vrais login/register passent par Supabase Auth (rate limiting intégré, configurable Dashboard → Auth → Rate limits). Les endpoints backend `/auth/login|register` sont des stubs informatifs non exposés en prod. Si le backend est un jour déployé public, ajouter `@nestjs/throttler`.
4. **Double arborescence de routes mobile** (`apps/mobile/app/` **et** `apps/mobile/src/app/`) — expo-router n'utilise que `app/` quand les deux existent : les écrans de `src/app/` (login, register, dashboards) sont **orphelins** (6.6). Tout compile désormais, mais il faut fusionner les deux arbres dans `app/` — décision produit sur les écrans à garder, je ne l'ai pas tranchée automatiquement.
5. **Migration non numérotée** `supabase/migrations/20260608_onboarding_profile.sql` (entre 005 et 006). Contenu valide et idempotent, mais hors convention `NNN_`. **Ne pas renommer** si elle a été appliquée sous ce nom (désynchroniserait l'historique supabase_migrations).
6. **Héritage racine à nettoyer** (ancienne app Expo pré-monorepo) : `app/`, `components/`, `src/`, `stores/`, `types/`, `mobile/`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `package-lock.json` + `node_modules/` à la racine. Rien ne les référence dans les workspaces ; suppression recommandée mais non faite (contrainte : ne rien supprimer sans remplaçant — ici c'est une purge, à valider).
7. **Typage bout-en-bout des queries (9.4)** — `Database` est maintenant généré et exporté. Brancher `createClient<Database>(...)` dans `packages/shared/src/lib/supabase.ts` activera le typage strict de toutes les queries, mais fera remonter les mismatches existants dans le web : à faire dans une passe dédiée.
8. **RevenueCat** : `initPurchases()` est câblé mais nécessite un **development build** (module natif absent d'Expo Go) + les clés publiques SDK dans `EXPO_PUBLIC_REVENUECAT_API_KEY_*`.
9. **Enforcement MFA côté dashboard** (reste connu de l'audit sécu de juillet) — inchangé.

---

## Preuves d'exécution (2026-07-06)

```
@thrive/shared  build      : OK (dist/ + exports vérifiés)
web             tsc        : 0 erreur     next build : OK      next lint : 0 erreur
mobile          tsc        : 0 erreur (33 → 0)        eslint    : 0 erreur (11 warnings)
backend         nest build : OK           tsc : 0 erreur       eslint    : 0 erreur
backend boot    : /api/docs → 200 · /auth/me sans token → 401 ·
                  login body invalide → 400 {"property rogue should not exist", ...}
prod THRIVE-CA  : RLS = 38/38 tables · SECURITY DEFINER sans search_path = 0 ·
                  advisors sécurité = uniquement des items documentés/intentionnels
```

# Corrections de stabilité — feat/dynamic-data

## Problèmes résolus

### 1. `UserRole` introuvable dans `@thrive/shared`
- **Cause** : L'enum existait dans `roles.enum.ts` mais sans export `UserRole`
- **Fix** : Renommé l'enum en `UserRole` + alias `Role` pour rétrocompatibilité

### 2. Décorateurs `@Public` et `@CurrentUser` manquants
- **Cause** : Fichiers non inclus dans la branche
- **Fix** : Ajout de `public.decorator.ts` et `current-user.decorator.ts` dans `apps/backend/src/modules/auth/decorators/`

### 3. `ERR_MODULE_NOT_FOUND` pour `@thrive/shared`
- **Cause** : Le package n'était pas compilé (pas de dossier `dist/`)
- **Fix** : Ajout de `tsconfig.json` correct avec `outDir: dist` + `package.json` avec `main: ./dist/index.js`
- **Action requise** : Lancer `pnpm --filter @thrive/shared build` une fois

### 4. Swagger crashait au démarrage NestJS
- **Cause** : Les paramètres `any` dans les contrôleurs bloquaient le parser Swagger
- **Fix** : Remplacé `any` par `Record<string, string | unknown>` sur tous les `@Body()` et `@CurrentUser()`

### 5. Variables d'environnement non chargées
- **Cause** : NestJS ne chargeait pas le `.env` racine du monorepo
- **Fix** : `ConfigModule.forRoot({ envFilePath: ['../../.env', '../../.env.development'] })` dans `AppModule`

### 6. `rootDir` TypeScript bloquait les imports
- **Cause** : `tsconfig.json` backend trop strict
- **Fix** : Suppression du `rootDir` explicite, `skipLibCheck: true`, `noImplicitAny: false`

## Corrections — 12 juin 2026 (espace parent)

### 7. Inscription totalement cassée (production)
- **Cause** : `handle_new_user()` insérait `v_role` (TEXT) sans cast vers l'enum `user_role` → erreur 42804 sur **toute** création de compte
- **Fix** : Migration 009 — cast `v_role::user_role` + garde-fou : impossible de s'auto-attribuer ADMIN/SUPER_ADMIN via les metadata d'inscription

### 8. Planification de séance cassée (production)
- **Cause** : Le trigger `notify_on_session_scheduled()` utilisait le type `'SESSION'`, absent de l'enum `notification_type` → toute insertion dans `sessions` échouait
- **Fix** : Migration 010 — type `'SESSION_REMINDER'`

### 9. Exports cassés dans `@thrive/shared`
- **Cause** : `index.ts` référençait des fichiers inexistants (`useAuth`, `AuthProvider`, `types/database`) et `supabase` au lieu de `supabaseClient` ; le build web utilisait un vieux `dist`
- **Fix** : Réécriture de `index.ts`, correction des imports dans les hooks, ajout deps `zod`/`@types/react`/`@types/node`, retrait des exports Expo (`NotificationService`, `useNotifications`) qui cassaient le build web (import par sous-chemin côté mobile)

### 10. Tailwind jamais compilé dans `apps/web`
- **Cause** : Aucun `tailwind.config` ni `postcss.config` dans l'app web → pages sans styles
- **Fix** : `tailwind.config.ts` avec la brand board THRIVE + `postcss.config.js`

### 11. Middleware bloquait toutes les routes protégées
- **Cause** : Le middleware lit le cookie `sb-access-token` que personne ne posait (session Supabase en localStorage)
- **Fix** : `auth.store.ts` pose/supprime le cookie à la connexion/déconnexion/hydratation

## Compte de démonstration

- **Parent** : `demo.parent@thrive.app` / `Demo1234!` (famille Tremblay : Léo 9 ans, Maya 13 ans, programme 13 séances en cours)

## Commande à lancer après pull

```bash
pnpm --filter @thrive/shared build
pnpm dev:backend
```

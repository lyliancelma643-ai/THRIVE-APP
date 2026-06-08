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

## Commande à lancer après pull

```bash
pnpm --filter @thrive/shared build
pnpm dev:backend
```

# Conventions THRIVE APP

## Structure du monorepo

```
thrive-app/
├── apps/
│   ├── backend/     ← NestJS API
│   ├── web/         ← Next.js 14 App Router
│   └── mobile/      ← Expo + React Native
└── packages/
    └── shared/      ← Types, Enums, Validation Zod
```

## Nommage des fichiers

| Type | Convention | Exemple |
|---|---|---|
| Composant React | PascalCase.tsx | `ChildDashboard.tsx` |
| Hook | camelCase, préfixe `use` | `useChildProgress.ts` |
| Service (backend) | camelCase.service.ts | `auth.service.ts` |
| Controller | camelCase.controller.ts | `auth.controller.ts` |
| Module NestJS | camelCase.module.ts | `auth.module.ts` |
| DTO | PascalCase.dto.ts | `CreateFamily.dto.ts` |
| Entity | camelCase.entity.ts | `user.entity.ts` |
| Store Zustand | camelCase.store.ts | `auth.store.ts` |
| Schema Zod | camelCase.schema.ts | `user.schema.ts` |
| Enum | camelCase.enum.ts | `roles.enum.ts` |
| Type partagé | camelCase.types.ts | `user.types.ts` |

## Nommage du code

- Variables : `camelCase`
- Constantes globales : `SCREAMING_SNAKE_CASE`
- Interfaces TypeScript : préfixe `I` → `IUser`, `IFamily`
- Types TypeScript : préfixe `T` → `TProgram`, `TChild`
- Enums : `PascalCase` → `ProgramStatus.ACTIVE`
- Fonctions : verbe + nom → `getUserById`, `createFamily`, `updateChildProgress`

## Conventions de commits (Conventional Commits)

Format : `type(scope): description courte`

Exemples :
```
feat(auth): add JWT refresh token rotation
fix(children): correct age group calculation
chore(deps): update expo to 55.0.24
docs(setup): add environment variables documentation
refactor(programs): extract session scheduling logic
```

## Stratégie de branches

| Branche | Rôle |
|---|---|
| `main` | Production — PR obligatoire |
| `staging` | Pré-prod / QA — PR obligatoire |
| `develop` | Intégration — PR recommandée |
| `feature/xxx` | Nouvelles fonctionnalités |
| `fix/xxx` | Corrections de bugs |
| `hotfix/xxx` | Correctifs urgents prod |

## Variables d'environnement

- `.env.example` → commité, sans secrets
- `.env.development` / `.env.staging` / `.env.production` → JAMAIS commités
- Toujours valider les env vars au démarrage de l'app

## Règles de validation

- Toute validation de données passe par un **schéma Zod** dans `packages/shared/src/validation/`
- Les DTOs NestJS utilisent `class-validator` ET le schéma Zod partagé
- Les formulaires frontend utilisent `react-hook-form` + schéma Zod via `@hookform/resolvers/zod`

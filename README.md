# THRIVE APP — Monorepo

Plateforme psychoéducative par le sport pour les jeunes 8–17 ans.

## Structure

```
thrive-app/
├── apps/
│   ├── backend/     ← NestJS API (port 3000)
│   ├── web/         ← Next.js 14 App Router (port 3001)
│   └── mobile/      ← Expo + React Native
└── packages/
    └── shared/      ← Types TypeScript, Enums, Schemas Zod
```

## Prérequis

- Node.js >= 20
- pnpm >= 9 (ou `npx pnpm`)

## Installation

```bash
npx pnpm install
cp .env.example .env.development
cp .env.example .env.staging
cp .env.example .env.production
```

## Lancer le projet

```bash
# Backend
npx pnpm dev:backend

# Web
npx pnpm dev:web

# Mobile
npx pnpm dev:mobile
```

## Couche Auth

Architecture retenue :
- Login / register / logout côté client via **Supabase Auth**
- Backend NestJS protégé par Bearer token
- Validation du JWT Supabase à finaliser dans le guard backend

## Modules Backend

| Module | Description |
|---|---|
| `auth` | Authentification JWT + Supabase |
| `users` | Gestion des utilisateurs |
| `families` | Gestion des familles |
| `children` | Profils enfants |
| `programs` | Programmes THRIVE (13 séances) |
| `entitlements` | Droits d'accès et abonnements |
| `reports` | Rapports de progression |
| `questionnaires` | Questionnaires psychoéducatifs |
| `messages` | Messagerie coach ↔ parent |
| `audit` | Logs d'audit |
| `content` | Gestion du contenu |
| `notifications` | Notifications push Expo |

## Conventions

Voir [CONVENTIONS.md](./CONVENTIONS.md)

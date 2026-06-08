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
- pnpm >= 9

## Installation

```bash
# Installer pnpm si nécessaire
npm install -g pnpm

# Installer toutes les dépendances
pnpm install

# Copier les variables d'environnement
cp .env.example apps/backend/.env.development
cp .env.example apps/web/.env.local
```

## Lancer le projet

```bash
# Backend
pnpm dev:backend

# Web
pnpm dev:web

# Mobile
pnpm dev:mobile
```

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

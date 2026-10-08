# Sauvegarde du travail local non poussé — 2026-10-08

Provenance : `~/Desktop/THRIVE/thrive APP` (Mac de Lylian), copie par lecture seule. Le dossier local n'a pas été modifié.
État local au moment de la copie : `main` @ `712640b`, `[ahead 1, behind 91]` par rapport à `origin/main` @ `fae1825`.

## Fichiers uniquement locaux recopiés au même chemin
- `apps/web/scripts/build-home-cards.mjs`
- `apps/web/src/app/parent/(hub)/fitness/carte/`, `fitness/guide/`
- `apps/web/src/app/parent/(hub)/fitness/page.tsx` — **remplace** la version de `main` (accueil « À la maison » par cartes ; sur `main` cette page est différente). À ne pas fusionner tel quel.
- `apps/web/src/components/parent/home-cards/`, `lib/home-cards/`, `hooks/useHomeCards.ts`, `content/a-la-maison/`
- `apps/web/src/lib/notifications.ts` (+ `.test.ts`), `hooks/useAdminNotifications.ts`, `components/admin/AdminNotificationsBell.tsx`, `AdminPushToggle.tsx`
- `docs/design/prompt-claude-design-a-la-maison.md`
- `supabase/migrations/20260913_061_home_card_moments.sql` — **jamais appliquée** ; sa date (09-13) est antérieure à 062–067 déjà en prod → à renuméroter (≥ 074) avant toute intégration.

## Doublons / collisions
- Migrations `059_admin_alert_enum` et `060_admin_notification_center` : mêmes noms que sur `main` mais **contenu différent** (brouillons locaux). Les versions de `main` sont celles appliquées en prod ; les versions locales sont rangées dans `docs/backup/migrations-locales/` pour référence uniquement.
- `apps/web/public/sw (1).js` : doublon de téléchargement, ignoré.
- Aucun secret détecté (`sk_`, `rk_`, `whsec_`, `service_role`). Aucun `.env` copié.

## Fichiers modifiés localement (non appliqués)
`docs/backup/local-diff-2026-10-08.patch` = `git diff` du dossier local (base 712640b, 91 commits de retard) : `apps/web/package.json`, `admin/layout.tsx`, `admin/notifications/page.tsx`, `admin/roadmap/page.tsx`, `globals.css`, `fitness/videos/page.tsx`, `ChatPanel.tsx`, `useThumbNav.ts`, `lib/access.ts`.

## Commit local 712640b
`docs/backup/712640b.patch`. Déjà présent sur `origin/main` sous `0dbd374` (même message, mêmes fichiers) **sauf** le renommage local `fitness/page.tsx → fitness/videos/page.tsx`, qui n'existe que dans le travail « À la maison » ci-dessus.

## Décision v1.0
Non intégré à la release v1.0 (backlog v1.1), conformément au défaut D3.

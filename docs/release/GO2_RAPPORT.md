# GO 2 — Rapport d'exécution

Oct 9, 2026 · branche `release/go2` (depuis `main` bb547d3), 14 commits, **rien poussé, rien appliqué en production**.

Vague 1 : 9 agents en parallèle. Vague 2 : G1 (revue sécurité) a trouvé 2 bloquants dans le lot C3, corrigés en une itération. V1 : typecheck web + mobile OK, 453 tests web OK, 54 tests Deno OK, `deno check` 16/16 OK (avec `--no-config`, la config par défaut échoue sur la résolution `npm:openai` de `edge-runtime.d.ts`, sans lien avec le code).

## Statut par ID

| ID | Statut | Ce qui est fait / ce qui reste |
| --- | --- | --- |
| P0-1, P0-2, P0-3, P0-5, P0-9, P0-10, P0-11 | À TOI | Consoles : voir `CHECKLIST_TOI.md` |
| P0-4 | FAIT (code) + À TOI | Migration 076 = proposition, interrupteur `accept_sandbox_purchases = false`. À activer seulement pendant la revue |
| P0-6 | FAIT (code) + À TOI | `eas.json` production sans secret, `environment: production` ; placeholders `projectId`, `ascAppId`, `appleTeamId` ; `eas init` et variables EAS à poser |
| P0-7 | FAIT | Appui long → Répondre / Signaler / Bloquer la conversation ; tables `message_reports`, `conversation_blocks` (077), alerte admin, envoi refusé si bloqué ; phrase ajoutée aux CGU §5 |
| P0-8 | FAIT | NEQ 2281953960, siège 5006 rue Fabre, Montréal (Québec) H2J 3W4, responsable Lylian Celma (`apps/web/src/lib/legal.ts`). Redéploiement web à faire |
| P1-1, P1-2, P1-3, P1-6, P1-12 | À TOI | Consoles |
| P1-4 | FAIT (code) + À TOI | Bannière « Mettez à jour votre moyen de paiement » sur l'accueil parent ; périodes de grâce à activer dans les consoles |
| P1-5 | FAIT (code) + À TOI | `process-due-deletions` + pg_cron quotidien 09:00 UTC (079), alerte S1. Secrets à poser ; **valeur de statut « traitée » à confirmer** (code : `'COMPLETED'`) |
| P1-7 | PARTIEL | `ErrorBoundary` dans les 4 layouts ; « Pas de connexion » + Réessayer sur 6 écrans. Restent 8 écrans dont les hooks partagés (`packages/shared`) n'exposent pas d'erreur : messages, inbox, notifications, programs ×2, badges, activité, chat coach |
| P1-8 | FAIT | Limite par utilisateur (078, table `rate_limits`, 429) sur billing-sync (10/min), request-account-deletion et export-my-data (5/h). Waitlist : proposition seulement (voir plus bas) |
| P1-9 | FAIT | Libellé unique « Supprimer mon compte et mes données » (mobile, politique, notes, e2e web) |
| P1-10 | BLOQUÉ (valeurs) | AASA et assetlinks en `[À COMPLÉTER : APPLE_TEAM_ID]` / `[À COMPLÉTER : ANDROID_SHA256_PLAY_SIGNING]` |
| P1-11 | FAIT | Push de message : « Nouveau message de votre coach », sans extrait (trigger SQL 077 + `send-push-notification`) |
| P1-13 | FAIT (non exécuté) | `.maestro/parent-paywall-restore.yaml` + job CI non bloquant ; à lancer sur simulateur avec un dev build |
| P1-14 | FAIT (code) + À TOI | HMAC `X-RevenueCat-Webhook-Signature` (t=…,v1=…, ±5 min, temps constant), en-tête `Authorization` conservé ; secret `REVENUECAT_WEBHOOK_HMAC_SECRET` à poser |
| P2-2 | FAIT | Bilans/questionnaires via `WebBrowser.openBrowserAsync` |
| P2-3 | FAIT | `apps/mobile/app/` supprimé (aucun import) |
| P2-6 | FAIT | Clé service_role comparée à temps constant dans `send-push-notification` |
| P2-7 | FAIT | `docs/store/fiches-fr-en.md` (nom, sous-titre, mots-clés FR/EN, 8 captures à faire) |
| P2-1, P2-4, P2-5, P2-8 | À TOI | Section « Confort » de la checklist |

## Ordre des actions humaines

1. Relire et merger `release/go2` dans `main` (le push déclenche le déploiement Vercel des pages légales).
2. Suivre `CHECKLIST_TOI.md` de haut en bas ; en particulier, avant la 079, vérifier `select status, count(*) from deletion_requests group by status;`.
3. Appliquer 076 → 077 → 078 → 079, puis lancer `supabase/tests/audit_rls_simulation.sql`.
4. Poser les secrets (`REVENUECAT_WEBHOOK_HMAC_SECRET`, `DELETIONS_CRON_SECRET` + Vault `deletions_cron_secret`) et redéployer les 6 Edge Functions.
5. Fournir APPLE_TEAM_ID et ANDROID_SHA256_PLAY_SIGNING, `eas init`, variables EAS, build, puis P0-9 en dernier.

## Remarques non bloquantes (revue G1 et agents)

- 077 : un client pouvait fixer `status` d'un signalement à l'insertion — corrigé par l'orchestrateur (`new.status := 'OPEN'` dans `message_reports_before_insert`).
- Le titre « Nouveau message de votre coach » s'affiche aussi pour un coach destinataire ou une réponse du Support (libellé générique). Vérifier que `send-web-push` accepte `body: null`.
- Les pages web de messagerie (`/parent/messages`) n'ont ni signalement ni blocage ; pas de bouton « Débloquer » dans l'app.
- `privacyEmail` passé de confidentialite@ à support@thrivesportpositive.com (valeur §0). Le titre du responsable est mis en minuscules dans la politique (`politique-confidentialite/page.tsx:51`) : relire la phrase.
- Liens légaux du paywall et de l'inscription encore en `Linking.openURL` (hors périmètre P2-2).
- Flux Maestro : pas de `testID` dans le mobile, sélection par libellés FR ; job CI suppose PyYAML sur le runner.
- `apps/mobile/tailwind.config.js` contient encore le glob `./app/**` (inoffensif).
- Waitlist (proposition) : Cloudflare Turnstile ou hCaptcha devant le formulaire, jeton vérifié par une Edge Function (limite par IP) qui insère en service_role ; retirer l'`INSERT` public sur `waitlist` et rendre l'e-mail unique.
- Lecture de contrôle en production refusée par le mode d'autorisation (conforme à la règle 4) : la valeur de statut reste à vérifier par toi.

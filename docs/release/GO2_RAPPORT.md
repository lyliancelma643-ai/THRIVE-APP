# GO 2 — Rapport d'exécution

Oct 9, 2026 · branche `release/go2b` (= `release/go2` + passe 2 renforcée), depuis `main` bb547d3. **Rien poussé, rien appliqué en production.**

- **Passe 1** (`release/go2`, intacte) : orchestrateur + S1/G1 Opus, C1–C5 Sonnet, H1–H3/V1 Haiku.
- **Passe 2** (`release/go2b`) : chaque agent un cran au-dessus (C1–C5 Opus, H1–H3/V1 Sonnet ; S1/G1 restent Opus), en revue critique et complétion de son lot.
- **Revue G1** : 2 bloquants en passe 1, 1 en passe 2, tous dans le lot C3 (suppressions planifiées) et corrigés en une itération.
- **V1 (passe 2)** : typecheck mobile + web OK, 453 tests web OK, 56 tests Deno OK, `deno check` 16/16 OK (avec `--no-config`, sans lien avec le code), `expo config` OK sans variables. Une erreur de lint préexistante (`apps/mobile/src/lib/secure-storage.ts:85`, hors diff).

## Statut par ID

| ID | Statut | Fait / reste |
| --- | --- | --- |
| P0-1, P0-2, P0-3, P0-5, P0-9, P0-10, P0-11 | À TOI | Consoles : `CHECKLIST_TOI.md` |
| P0-4 | FAIT (code) + À TOI | Migration 076 = proposition, `accept_sandbox_purchases = false` ; à activer seulement pendant la revue |
| P0-6 | FAIT (code) + À TOI | `eas.json` production sans secret ; `app.config.ts` ne pose `extra.eas.projectId` que si `EAS_PROJECT_ID` est défini (le placeholder de la passe 1 cassait l'enregistrement push) ; `apps/mobile/.env.example` liste les 11 variables ; `ascAppId` / `appleTeamId` à remplir |
| P0-7 | FAIT | Mobile : appui long → Répondre / Signaler (motifs, dont Spam) / Bloquer ; bandeau « Conversation bloquée » + Débloquer. Web parent : Signaler (menu •••) et Bloquer/Débloquer. 077 : RLS, statut forcé OPEN, blocage réservé aux participants du fil coach (un admin ne peut plus bloquer), alerte admin, envoi refusé si bloqué. Phrase CGU §5 |
| P0-8 | FAIT | NEQ, siège, responsable PRP ; phrase du responsable réécrite, « Canada » en double retiré. Redéploiement web à faire |
| P1-1, P1-2, P1-3, P1-6, P1-12 | À TOI | Consoles |
| P1-4 | FAIT (code) + À TOI | Bannière paiement : accueil parent, Profil, Abonnement. Périodes de grâce dans les consoles |
| P1-5 | FAIT (code) + À TOI | `process-due-deletions` + pg_cron 09:00 UTC (079) : prise atomique, reprise après 6 h, `COMPLETED` posé seulement après suppression réelle, ADMIN/SUPER_ADMIN refusés, seul un vrai `user_not_found` clôt une demande, profil orphelin laissé en échec visible dans l'alerte S1. Secrets à poser ; vérifier les statuts en prod avant d'appliquer |
| P1-7 | FAIT (14/18) | `ErrorBoundary` dans les 4 layouts ; « Pas de connexion » + Réessayer sur 14 écrans (hooks partagés : `error` / `refetch`) ; sans chargement propre : 2 profils ; écrans chat gérés par le bandeau de blocage, sans état hors ligne dédié |
| P1-8 | FAIT | `rate_limits` (078) avec purge horaire ; 429 + `Retry-After`. Waitlist : proposition ci-dessous |
| P1-9 | FAIT | Libellé unique « Supprimer mon compte et mes données » ; parcours exacts dans les notes de revue et les CGU |
| P1-10 | BLOQUÉ (valeurs) | AASA / assetlinks au bon format, en attente de APPLE_TEAM_ID et ANDROID_SHA256_PLAY_SIGNING |
| P1-11 | FAIT | Push sans extrait ; titre selon le destinataire : parent ← coach « Nouveau message de votre coach », fil Support « Nouveau message de l'équipe THRIVE », coach/admin « Nouveau message » ; corps vide (jamais « null ») |
| P1-13 | FAIT (non exécuté) | `testID` stables, 2 flux Maestro (paywall → Restaurer ; mauvais mot de passe), job CI non bloquant sans PyYAML. Nécessite un dev build (`expo-dev-client` à installer) |
| P1-14 | FAIT (code) + À TOI | HMAC sur les octets bruts du corps, ±5 min, temps constant, format vérifié contre la doc RevenueCat ; poser `REVENUECAT_WEBHOOK_HMAC_SECRET` |
| P2-2 | FAIT | Bilans, liens légaux du paywall, de l'inscription et de la section confidentialité en navigateur intégré |
| P2-3 | FAIT | `apps/mobile/app/`, navigateurs TODO et globs Tailwind morts supprimés |
| P2-6 | FAIT | Clé service_role à temps constant |
| P2-7 | FAIT | Fiches FR/EN dans les limites (nom 21, sous-titres 25/27, description courte 80/72, mots-clés 96/97) ; description longue EN et captures à faire |
| P2-1, P2-4, P2-5, P2-8 | À TOI | Section « Confort » de la checklist |

## Ordre des actions humaines

Voir `CHECKLIST_TOI.md` (23 étapes en 5 phases, encadré « Ce qui bloque la soumission » en tête). En résumé : contrats et produits stores → clés RevenueCat → vérifier `select status, count(*) from deletion_requests group by status;` puis migrations 076 → 079 et `audit_rls_simulation.sql` → secrets (`REVENUECAT_WEBHOOK_HMAC_SECRET`, `DELETIONS_CRON_SECRET` + Vault `deletions_cron_secret`) et redéploiement des 6 Edge Functions (`process-due-deletions` sans vérification JWT, déjà déclaré dans `config.toml`) → relire et merger `release/go2b` dans `main` → `EAS_PROJECT_ID`, identifiants Apple/Android, variables EAS → build → P0-9 en dernier.

## Remarques non bloquantes

- Espaces web coach et admin : pas encore de Signaler/Bloquer ; aucune page admin ne traite `message_reports` (les alertes arrivent dans le centre de notifications admin).
- Web parent : un blocage posé par l'autre partie n'est pas affiché à l'avance ; l'envoi échoue avec le message d'erreur générique.
- `send-push-notification` ne masque le corps que si `data.conversation_id` est présent (aucun autre appelant dans le dépôt).
- Le message d'échec de connexion mobile est le texte brut de Supabase en anglais (« Invalid login credentials »).
- `apps/web/e2e-client/compte.spec.ts` cible encore « Changer mon mot de passe » et « Lien envoyé » (libellés réels différents) ; `inscription.spec.ts` cible « Créer mon compte parent ». Écarts préexistants, à aligner.
- Documents internes (`docs/conformite-stores/*`, `docs/security/incident-response.md`, `docs/store/google-data-safety.md`) mentionnent encore confidentialite@ : à aligner sur support@ s'ils sont republiés.
- Demandes de suppression d'un ADMIN ou SUPER_ADMIN : traitement manuel.
- Waitlist (proposition, non implémentée — le formulaire public n'est pas dans ce dépôt ; il écrit via la clé anon grâce à la policy de `20260804_057c_create_waitlist.sql` et au `grant insert … to anon` de `20261001_066_security_audit_final.sql` ; l'e-mail est déjà unique) : 1) Edge Function `waitlist-signup` (Turnstile, `TURNSTILE_SECRET_KEY`, limite par IP via une variante de `consume_rate_limit` à clé texte, insertion service_role `on conflict do nothing`) ; 2) basculer le formulaire du site ; 3) seulement ensuite, retirer l'insert public et le grant à anon.
- La lecture de contrôle en production a été refusée par le mode d'autorisation (conforme à la règle 4).

# GO 2 — Armée d'agents pour l'audit 360° THRIVE

> Déclencheur : l'utilisateur tape exactement **GO 2** dans Claude Code, à la racine de `thrive APP`.
> Source de vérité : `docs/release/AUDIT_360.md` (IDs P0-x, P1-x, P2-x).
> Avant GO 2 : passer la session principale en Sonnet (`/model sonnet`). L'orchestrateur n'a pas besoin d'Opus.

---

## 0. Valeurs à remplir AVANT de taper GO 2

Remplis ces lignes. Une valeur vide reste `[À COMPLÉTER]` dans le code et finit dans `CHECKLIST_TOI.md`.

```
NEQ=2281953960
ADRESSE_SIEGE=5006 rue Fabre, Montréal (Québec) H2J 3W4, Canada
RESPONSABLE_PRP_NOM=Lylian Celma
RESPONSABLE_PRP_TITRE=Fondateur, responsable de la protection des renseignements personnels
RESPONSABLE_PRP_COURRIEL=support@thrivesportpositive.com
APPLE_TEAM_ID=
ANDROID_SHA256_PLAY_SIGNING=
```

---

## 1. Règles d'économie (pour tous les agents, non négociables)

1. **Contexte minimal.** L'orchestrateur ne colle à chaque agent QUE ses lignes de l'audit et sa liste de fichiers. Il ne transmet jamais l'audit entier.
2. **Lecture ciblée.** On utilise Grep et Glob d'abord, puis Read avec `offset`/`limit`. On ne lit pas un fichier de plus de 300 lignes en entier. On ne fait pas d'exploration générale du dépôt.
3. **Périmètre de fichiers exclusif.** Chaque agent ne modifie que les fichiers de son lot (§3). S'il doit en toucher un autre, il s'arrête et le signale dans son rapport.
4. **Aucune action en production.** On ne fait ni `supabase db push`, ni `apply_migration` sur THRIVE-CA, ni déploiement Vercel, ni `eas submit`, ni `git push`. On écrit les fichiers, et l'humain applique.
5. **Rapport de 15 lignes maximum** : fichiers touchés, ce qui est fait, ce qui reste, commande de test lancée et son résultat. Pas de recopie de code dans le rapport.
6. **Une seule tentative de correction** si un test échoue. Au-delà, l'agent rapporte l'erreur sans boucler.
7. **Migrations : numéros réservés** (voir §3), préfixe de date `20261009_`. On ne renumérote rien d'existant.
8. Le code reste en français pour l'UI et suit `CONVENTIONS.md`. On le lit seulement en `limit: 80` si besoin.
9. **Autonomie totale jusqu'au bout.** L'orchestrateur et les agents ne posent aucune question et n'attendent aucune validation. Si une information manque, on écrit `[À COMPLÉTER]` et on l'ajoute à `CHECKLIST_TOI.md`. Si on bloque, on le note dans le rapport et on continue le reste. Les interdits de la règle 4 restent valables.

---

## 2. Séquence de l'orchestrateur (session principale, Sonnet)

```
GO 2 reçu →
  a. git checkout -b release/go2 (depuis main) ; lire §0 de ce fichier.
  b. VAGUE 1 : lancer EN PARALLÈLE, dans un seul message, les 9 agents du §3 (Agent tool, paramètre model).
  c. Attendre tous les rapports. Ne relire aucun fichier soi-même.
  d. VAGUE 2 : lancer G1 (Opus, revue sécurité), puis V1 (Haiku, vérification).
  e. Si G1 ou V1 signalent un bloquant : relancer UNIQUEMENT l'agent fautif (SendMessage, même contexte) avec le correctif précis. Maximum 1 itération.
  f. Commits atomiques par lot : "fix(P0-7): …". Pas de push.
  g. Écrire docs/release/GO2_RAPPORT.md : tableau ID → statut (FAIT / À TOI / BLOQUÉ) + ordre des actions humaines.
  h. Message final : 5 lignes maximum, avec le lien vers GO2_RAPPORT.md et CHECKLIST_TOI.md.
```

---

## 3. Les agents (vague 1, en parallèle)

| Agent | Modèle | IDs audit | Fichiers autorisés | Migration |
|---|---|---|---|---|
| **S1 Sécurité backend** | **opus** | P1-14, P1-8, P2-6, P0-4 (076) | `supabase/functions/revenuecat-webhook/**`, `billing-sync/**`, `request-account-deletion/**`, `export-my-data/**`, `send-push-notification/index.ts` (seulement la comparaison de clé), `supabase/functions/_shared/rate-limit.ts` (nouveau), migrations 076 + 078 | 076, 078 |
| **C1 Messagerie** | sonnet | P0-7, P1-11 | `apps/mobile/src/app/**/chat/**`, composants de message, `send-push-notification` (texte de la notification seulement), section CGU sur le signalement | 077 |
| **C2 Stabilité mobile** | sonnet | P1-7, P1-4 (bannière) | `apps/mobile/src/app/**/_layout.tsx`, `apps/mobile/src/components/ErrorBoundary.tsx`, `OfflineState.tsx`, `BillingIssueBanner.tsx` (nouveaux), les 12 écrans sans état d'erreur (ajout minimal) | — |
| **C3 Ops suppression + surveillance** | sonnet | P1-5, S1/S2/S5 | `supabase/functions/process-due-deletions/**` (nouveau), `supabase/tests/audit_inventaire_surveillance.sql` (lecture seule) | 079 |
| **C4 Build & liens profonds** | sonnet | P0-6 (partie code), P1-10, P2-2 | `apps/mobile/app.json` ou `app.config.*`, `eas.json`, `apps/web/public/.well-known/**`, ouverture des bilans (`expo-web-browser`) | — |
| **C5 Tests E2E + CI** | sonnet | P1-13 | `.maestro/**` (nouveau), `.github/workflows/ci.yml` (ajout d'un job, sans rien retirer) | — |
| **H1 Légal** | haiku | P0-8 | pages web `/confidentialite`, `/conditions`, `/suppression-compte` (remplacer les `[À COMPLÉTER…]` par les valeurs du §0) | — |
| **H2 Textes stores** | haiku | P1-9, notes de revue, P2-7 | libellé de suppression dans le mobile, la politique et `/suppression-compte` ; `docs/store/notes-revue-apple.md`, `docs/store/notes-revue-play.md`, `docs/store/fiches-fr-en.md` | — |
| **H3 Checklist humaine + nettoyage** | haiku | toutes les lignes « Toi », P2-3 | `CHECKLIST_TOI.md` (nouveau, racine), suppression de `apps/mobile/app/` (vérifier d'abord par grep qu'aucun import n'y pointe) | — |

### Brief à coller tel quel par l'orchestrateur (une variante par agent)

```
Tu es <AGENT> sur le dépôt THRIVE (Expo Router + Supabase + RevenueCat).
Mission : <coller UNIQUEMENT les lignes de l'audit pour tes IDs>.
Fichiers autorisés : <liste §3>. Migration réservée : <n°>.
Règles §1 de GO2.md (contexte minimal, aucune action en prod, rapport ≤ 15 lignes).
Critère de fin : <critère §4>.
```

---

## 4. Critères de fin par agent (« done » vérifiable)

- **S1** : la vérification HMAC porte sur `X-RevenueCat-Webhook-Signature` (horodatage + corps brut, fenêtre de 5 min). On garde l'en-tête secret en plus. Toutes les comparaisons se font à temps constant. Rate limit par `user_id` via la table `rate_limits` (078, RLS activée, aucun accès client), réponse 429. Migration 076 = copie de `docs/release/PROPOSITION_20261009_076_sandbox_revue_stores.sql`, interrupteur à `false` par défaut. Captcha ou jeton pour `waitlist` : seulement une proposition écrite dans le rapport. Tests Deno existants verts, plus 1 test HMAC (valide, invalide, expiré).
- **C1** : un appui long sur un message ouvre « Signaler » et « Bloquer la conversation ». Tables `message_reports` et `conversation_blocks` (077) : RLS « insert par le participant seulement », lecture par l'auteur et ADMIN. Un trigger notifie l'admin. Un utilisateur bloqué ne peut plus envoyer. Le push affiche « Nouveau message de votre coach », sans extrait. Une phrase ajoutée aux CGU.
- **C2** : un `ErrorBoundary` est exporté par chaque `_layout` d'Expo Router. Écran « Pas de connexion » avec un bouton Réessayer sur les 12 écrans. Bannière « Mettez à jour votre moyen de paiement » si `billing_issue_at` est renseigné. `tsc` mobile vert.
- **C3** : fonction quotidienne (pg_cron 079 → `process-due-deletions`) qui appelle `admin-delete-user` pour les demandes arrivées à échéance. Elle est idempotente et journalisée. Une alerte part si la requête S1 renvoie plus de 0 ligne.
- **C4** : `eas.json` contient des profils `production` sans aucun secret en dur. Les variables `EXPO_PUBLIC_*` sont lues depuis l'environnement EAS. `projectId`, `ascAppId` et `appleTeamId` sont des placeholders documentés si les valeurs du §0 sont vides. AASA et assetlinks utilisent `APPLE_TEAM_ID` et `ANDROID_SHA256_PLAY_SIGNING`. Les bilans s'ouvrent via `WebBrowser.openBrowserAsync`.
- **C5** : un flux Maestro `connexion → Maison → paywall → Restaurer`. Le job CI n'est pas bloquant tant qu'il n'y a pas de simulateur (`continue-on-error: true`, commenté).
- **H1** : `grep -r "À COMPLÉTER" apps/web` ne renvoie plus rien, sauf pour les valeurs vides du §0, listées dans le rapport.
- **H2** : un seul libellé partout : « Supprimer mon compte et mes données ». Les notes de revue Apple et Play reprennent le texte de l'audit (section « Notes de revue prêtes à coller »). Fiches FR et EN avec les mots-clés.
- **H3** : `CHECKLIST_TOI.md` reprend P0-1, 2, 3, 5, 9, 10, 11 et P1-1, 2, 3, 6, 12 dans l'ordre d'exécution de l'audit, chacun avec une case à cocher et son chemin console. On y ajoute : appliquer les migrations 076 à 079 en prod, poser les variables EAS et activer HMAC dans RevenueCat. `apps/mobile/app/` est supprimé.

---

## 5. Vague 2

- **G1 Revue sécurité, modèle opus.** Entrée : `git diff main...release/go2 -- supabase/` uniquement, sans aucune lecture hors du diff. Vérifie la RLS des tables 077, 078 et 079, les `SECURITY DEFINER` avec `search_path` figé, l'absence de secrets et l'absence d'écriture client sur la facturation. Rapport : liste de bloquants ou « RAS ». Si possible, il exécute `supabase/tests/audit_rls_simulation.sql` sur la base locale.
- **V1 Vérification, modèle haiku.** Lance `pnpm -r typecheck`, `pnpm --filter web test`, `deno test supabase/functions` et `deno check`. Il rapporte uniquement les échecs, avec fichier et ligne, sans les journaux complets.

---

## 6. Hors périmètre des agents (consoles, à toi)

P0-1, P0-2, P0-3, P0-5, P0-9, P0-10, P0-11, P1-1, P1-2, P1-3, P1-6, P1-12 et P2-4, P2-5, P2-8. Ils sont regroupés et ordonnés dans `CHECKLIST_TOI.md`. P0-9, l'achat sandbox de bout en bout, se fait **en dernier**, après les migrations et le build EAS.

## 7. Budget estimé

Opus : 2 appels (S1, G1). Sonnet : orchestrateur + 5 agents. Haiku : 4 agents. Aucun agent ne relit le travail d'un autre, sauf G1 sur le diff.

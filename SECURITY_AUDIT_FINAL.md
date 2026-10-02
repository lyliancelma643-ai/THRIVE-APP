# Audit de sécurité final — THRIVE Sport Positive

**Auditrice :** Lydia (CTRL_1_SECURITE_BACKEND) · **Date :** 2026-10-01 · **Branche :** `claude/amazing-cerf-5974xy`

## 0. Verdict

| | |
|---|---|
| **Score de préparation à la publication** | **42 / 100 aujourd'hui en production** → **≈ 80 / 100** une fois la migration 066 appliquée, le code déployé et les actions A1 à A5 faites |
| **Verdict** | **NO-GO** tant que la migration 066 n'est pas appliquée en production et que Next.js n'est pas redéployé |

**Pourquoi NO-GO :** la production expose aujourd'hui les données de mineurs entre familles et à n'importe quel coach (SEC-01, SEC-02, SEC-06, SEC-07). Elle permet aussi de s'offrir le forfait le plus cher sans payer (SEC-04, SEC-05). Enfin, elle tourne sur une version de Next.js qui a une RCE publique (APP-01).

Tous ces points sont corrigés dans la branche. Les correctifs sont prouvés par des tests automatisés, rejoués sur une réplique du schéma de production. **Ils ne sont pas encore déployés.**

## 1. Cartographie (vérifiée)

| Élément | Réalité constatée |
|---|---|
| Front web | Next.js 15.5.20 (App Router, PWA Serwist), Vercel projet `thrive-app`, domaine `app.thrivesportpositive.com` |
| Mobile | Expo / React Native (`apps/mobile`), RevenueCat |
| Backend | Supabase **THRIVE-CA** (`kkdcgzvdmipmrgkawnky`, ca-central-1, PG 17). Pas d'API NestJS (retirée). 15 edge functions |
| Paiement | Stripe Checkout + Portail (web) → RevenueCat (source de vérité) → miroir `billing_subscriptions` (RLS) |
| Rôles | `PARENT`, `COACH`, `ADMIN`, `SUPER_ADMIN` (+ `CHILD` prévu). Autorité : `app_metadata.role` (JWT) **et** `profiles.role` (selon les policies) |
| Volume prod | 8 comptes (3 parents, 2 coachs, 2 admins, 1 super admin), données réelles de mineurs |
| Autres projets | `thrive-app-backend`, `thrive-sport-psychologie-positive` (Vercel) ; 4 projets Supabase inactifs |

**Matrice d'accès cible** (celle qu'appliquent la migration 066 et les tests) :

| Donnée | Parent | Coach | Admin | Super admin | Anonyme |
|---|---|---|---|---|---|
| Enfant, séances, bilans, questionnaires, vidéos | ses enfants (débloqué) | enfants **assignés et actifs** | tous | tous | ✗ |
| Écriture dossier / bilan / badge / questionnaire | ✗ | enfants assignés | supervisés / tous | tous | ✗ |
| Forfait (`pack`), validation compte / enfant | ✗ | validation parent (RPC) | ✓ | ✓ | ✗ |
| Rôle | ✗ | ✗ | PARENT↔COACH | + ADMIN | ✗ |
| Journal d'audit | ✗ | ✗ | lecture seule | lecture seule | ✗ |
| Liste d'attente | ✗ | ✗ | ✗ | ✓ | insertion seule |
| Questionnaire par jeton (`/q/:token`) | via jeton | via jeton | via jeton | via jeton | via jeton (UUID aléatoire, expiration, pas de double soumission) |

## 2. Méthode et preuves

* **Statique** : tout le code, les **263 commits de l'historique** (`git log --all -p`), les 65 migrations, les 15 edge functions, la config Next/Vercel et la CI.
* **Base de production (lecture seule)** : catalogue (tables, RLS, policies, grants, fonctions, triggers, buckets) et advisors Supabase.
  * Tests **multi-rôles** joués avec de vrais comptes simulés (`request.jwt.claims` + `SET LOCAL ROLE authenticated`, exactement comme PostgREST).
  * Chaque test d'écriture se trouvait dans un bloc qui se termine par une exception, donc **annulé**. Vérification ensuite : aucune ligne de test résiduelle.
* **Banc de test local** (`supabase/tests/local/`) :
  * Réplique du schéma d'autorisation de production : 26 tables, fonctions `private.*`, triggers de garde, **texte exact des policies et des droits**.
  * Données **synthétiques** uniquement.
  * Script `run.sh` : la suite doit **échouer sans** la migration 066 et **passer avec**. Ajouté à la CI (job `rls-security`).
  * Rollback testé : migration → rollback → failles revenues → réapplication → tests OK. Idempotence vérifiée (double application).
* **Bundle** : build de production local scanné ; un chunk de production échantillonné.
* **Limites** (voir `NON_VERIFIE`) :
  * Le proxy de l'environnement bloque `*.supabase.co` : pas de test via le vrai client HTTP, ni lecture des réglages Auth.
  * Le connecteur Vercel n'a pas le droit de lire les variables d'environnement.
  * L'outil SQL Supabase met le DDL en attente de confirmation humaine : **je n'ai rien appliqué en production**.

## 3. Tableau principal

Légende des statuts :
- **CORRIGÉ\*** : corrigé dans la branche et prouvé par test, **pas encore déployé** (la production reste vulnérable jusqu'à l'action A1/A2/A3).
- **CORRIGÉ** : déjà effectif.

| ID | Zone | Constat | Gravité | Preuve | Statut | Correctif |
|---|---|---|---|---|---|---|
| SEC-01 | B·RLS | Les 4 policies « gate » (`sessions`, `parent_reports`, `video_session_runs`, `video_sessions`) sont **PERMISSIVE** au lieu de RESTRICTIVE. Régression de la migration 046 (optimisation) qui a perdu `as restrictive`. Elles s'ajoutent en OU : **tout coach et tout parent débloqué lisent les séances, bilans et vidéos de tous les enfants**. | **CRITIQUE** | `pg_policies.permissive='PERMISSIVE'` ; `20260711_046…sql:75-101`, `046b…:7-33`. Prod : un coach sans enfant lit 104/104 séances, 25/25 bilans, 31/31 runs ; un parent lit 25 bilans (6 légitimes) | CORRIGÉ\* | 066 §SEC-01 : recréées `as restrictive` (tests T1, T5) |
| SEC-02 | C·Auth | `handle_new_user` prend le rôle dans **`user_metadata`** (contrôlé par le client) : `signUp({data:{role:'COACH'}})` crée un profil **COACH**. Il obtient alors l'accès aux questionnaires de tous les enfants (SEC-07) et peut écrire des bilans (SEC-09) | **CRITIQUE** | Définition prod de `handle_new_user` ; simulation d'inscription → `profiles.role = COACH` (T11) | CORRIGÉ\* | Rôle lu dans `app_metadata` (posé à PARENT par `set_signup_app_role`, ou par la service_role) |
| SEC-04 | E·Paiement | Contournement du forfait : un parent **crée une famille directement en `PERFORMANCE`** (le trigger anti-changement de pack ne couvre que l'UPDATE) puis y déplace son enfant → messagerie coach + niveau de détail 3 **sans payer** | **CRITIQUE** | Test prod annulé : famille AVANCE → `coachMessaging` false→true, `detail_level` 3 | CORRIGÉ\* | Trigger `guard_family_pack_on_insert` (pack forcé à ESSENTIEL hors admin) + T6 |
| SEC-05 | E·Paiement | Un parent passe lui-même son enfant en `CONFIRMED` et change `children.family_id` ; avec `profiles.coach_validated` (SEC-03), cela suffit à **débloquer l'accès sans validation du coach** | **CRITIQUE** | Test prod : `update children set validation_status='CONFIRMED'` → 1 ligne | CORRIGÉ\* | Trigger `guard_child_privileged_columns` (T6, T7) |
| SEC-06 | C·IDOR | **N'importe quel coach** crée un programme et y inscrit **n'importe quel enfant**. Il devient « coach de programme » : lecture des bilans, écriture du dossier, obtention des jetons de questionnaires via `lsss_send`/`perma_send` | **CRITIQUE** | Test prod : coach étranger → `coach_reports` 0→1, `can_edit_child_bilan` = true | CORRIGÉ\* | `WITH CHECK … is_assigned_coach(child_id)` (T2) |
| APP-01 | F·Dépendances | **Next.js 15.5.20 : RCE non authentifiée dans l'API Image Optimization** (utilisée : `/_next/image`), plus SSRF, déni de service et confusion de cache | **CRITIQUE** | `pnpm audit` (2 critiques sur `next`) | CORRIGÉ\* | `next` 15.5.27 ; typecheck, lint, 365 tests et build OK |
| SEC-07 | B·RLS | `coaches_admins_questionnaires` / `_questions` : tout profil COACH lit et modifie **tous les questionnaires** (réponses + jetons d'accès) | ÉLEVÉE | Policy prod ; coach sans enfant : 19/19 questionnaires visibles | CORRIGÉ\* | Remplacées par `can_edit_child_bilan(child_id) OR is_admin()` |
| SEC-03 | B·RLS | `profiles_admin_update_all` lit `profiles` dans une policy de `profiles` → **récursion infinie : tout UPDATE de profil échoue** (jeton push, édition de profil, édition admin). Bug fonctionnel en prod. La protection de `coach_validated` n'est **qu'accidentelle** : corriger la récursion seule permettrait à un parent de s'auto-valider | ÉLEVÉE | Erreur `42P17` en prod (T8, T9) | CORRIGÉ\* | Policy via `private.is_admin()` + `WITH CHECK` + trigger `guard_profile_privileged_columns` + INSERT limité à PARENT |
| SEC-09 | C·Autorisation | `coach_reports` / `reports` : un COACH insère un bilan sur **n'importe quel enfant**, ensuite affiché au parent (`session_report`, `generate-parent-report`) | ÉLEVÉE | Test prod (T3) | CORRIGÉ\* | `WITH CHECK can_edit_child_bilan(child_id)` |
| APP-02 | C·Edge function | `send-push-notification` (verify_jwt seul) : **tout utilisateur connecté envoie une notification push au texte libre à n'importe qui** (hameçonnage de parents) | ÉLEVÉE | `supabase/functions/send-push-notification/index.ts` (aucun contrôle d'appelant, aucun appelant dans le code) | CORRIGÉ\* | Exige service_role ou `app_metadata.role` ADMIN/SUPER_ADMIN |
| AUTH-01 | C·Admin | **Aucun admin ni super admin n'a de MFA** (0 facteur vérifié) ; la MFA n'est pas exigée côté serveur | ÉLEVÉE | `auth.mfa_factors` | À CORRIGER | Action A4, puis policy RESTRICTIVE `aal2` sur les tables admin |
| AUTH-02 | C·Auth | `handle_new_user` **confirme automatiquement l'e-mail** de toute auto-inscription → création de comptes au nom d'e-mails tiers, pas de preuve de contrôle (parents de mineurs, Loi 25) | ÉLEVÉE | `UPDATE auth.users SET email_confirmed_at = NOW()` | À CORRIGER (décision) | Action A6 |
| GH-01 | F·GitHub | `main` **non protégée** alors qu'elle déploie en production (Vercel) ; pas de Dependabot | ÉLEVÉE | `list_branches` : `main.protected=false` ; pas de `.github/dependabot.yml` | À CORRIGER | Action A5 |
| SEC-13 | B·RLS | Un coach **désassigné** garde l'accès à l'enfant via ses anciennes inscriptions de programme (1 cas en prod) | MOYENNE | Requête prod : 1 inscription sans assignation active | CORRIGÉ\* | `is_program_coach_of_child` exige une assignation active (T13) |
| SEC-10 | B·Audit | `audit_logs` en `FOR ALL` pour les admins : un admin peut **modifier ou effacer** la piste d'audit | MOYENNE | Policy prod | CORRIGÉ\* | SELECT seul |
| SEC-11 | B·Storage | Buckets `athlete-documents` et `admin-attachments` sans limite de taille ni de type MIME | MOYENNE | `storage.buckets` | CORRIGÉ\* | 20 Mo PDF/images ; 25 Mo |
| SEC-12 | B·Grants | `anon` a SELECT/INSERT/UPDATE/DELETE/TRUNCATE sur 60+ tables : la RLS est la seule barrière | MOYENNE | `has_table_privilege` | CORRIGÉ\* | `revoke all … from anon` (+ default privileges), sauf `INSERT waitlist` (T10) |
| SEC-08 | B·Mineurs | `child_badges` lisible par tout connecté ; tout coach attribue des badges à tout enfant | MOYENNE | Policies `using (true)` | CORRIGÉ\* | Restreint à `can_view` / `can_edit_child_bilan` |
| DB-01 | B·Migrations | Dérive : 4 migrations appliquées en prod **absentes du dépôt** ; l'historique prod commence par `clone_*` ≠ fichiers 001–017 → schéma **non rejouable** | MOYENNE | `list_migrations` vs `supabase/migrations` | Partiellement CORRIGÉ | 4 migrations rapatriées, MD5 identiques à la prod. Reste : action A7 (baseline `supabase db pull`) |
| VCL-01 | A·Vercel | Les fallbacks codés en dur (`middleware.ts:12`, `lib/supabase-server.ts:9`, `shared/lib/supabase.ts:15`) pointent vers la **base de prod** : un preview sans variables d'env écrit en prod | MOYENNE | Code | À CORRIGER | Projet Supabase de staging + vars Preview (A3) |
| VCL-02 | A·Vercel | Séparation des variables dev / preview / prod | ? | 403 sur `filter_project_envs` | NON_VERIFIE | A3 |
| APP-03 | D·En-têtes | CSP avec `'unsafe-inline' 'unsafe-eval'` sur `script-src` | MOYENNE | En-têtes de prod | À CORRIGER | CSP à nonce (Next middleware) |
| APP-04 | D·Session | Jeton d'accès recopié dans un cookie `sb-access-token` **lisible par JS** (pas `HttpOnly`), durée de 7 jours | MOYENNE | Chunk prod `layout-*.js` | À CORRIGER | Cookies `@supabase/ssr` HttpOnly gérés côté serveur |
| APP-07 | D·Abus | Formulaire liste d'attente : insertion anonyme sans captcha ni rate limit | MOYENNE | Policy `waitlist_public_insert` | À CORRIGER | Vercel WAF rate-limit / Turnstile |
| APP-08 | C·Comptes | `admin-create-user` : un **PARENT** peut créer un nombre illimité de comptes PARENT auto-confirmés, sur n'importe quel e-mail | MOYENNE | `admin-create-user/index.ts:76` | À CORRIGER | Lier la création à `family_members` + quota `maxParents` côté fonction |
| AUTH-03 | C·Auth | Protection contre les mots de passe compromis (HIBP) désactivée | MOYENNE | Advisor Supabase | À CORRIGER | A4 |
| AUTH-04 | C·Auth | Rate limits Auth, liste blanche des redirections, politique de mot de passe, expiration des sessions, inscription ouverte | ? | Proxy bloque `/auth/v1/settings` | NON_VERIFIE | A4 |
| DEP-01 | F·Dépendances | 61 vulnérabilités hautes restantes, **toutes dans l'outillage** (eslint, commitlint, Expo CLI, Metro) : non embarquées dans le bundle web | MOYENNE | `pnpm audit` | À CORRIGER | Dependabot + montée Expo / eslint |
| SEC-SA | A·Secrets | Historique Git complet : **aucune** clé `service_role`, Stripe, `whsec_`, clé privée, PAT ni URL Postgres réelle. Seules des clés **anon** (2 projets, rôle `anon` décodé) dans d'anciens `.env` suivis, détrackés depuis | FAIBLE | Scan regex + décodage JWT | OK (rien à faire) | La clé anon est publique par nature |
| SEC-BD | A·Bundle | Build de prod : seule la clé anon est présente ; pas de source maps publiques ; aucun préfixe public sur un secret | — | Scan `.next/static` | OK | — |
| BILL-OK | E·Paiement | Stripe : signature HMAC, tolérance de 5 min contre le rejeu, comparaison à temps constant. RevenueCat : en-tête secret comparé à temps constant. **Le droit d'accès est toujours relu chez RevenueCat**, jamais pris du client. `billing_subscriptions` en lecture seule côté client ; `entitlements` modifiable par les admins seulement | — | `stripe-webhook/verify.ts`, `_shared/billing.ts`, tests prod H/G | OK | — |
| BILL-01 | E·Paiement | Les achats **sandbox** ouvrent l'accès en production (`has_p3_subscription` ignore `is_sandbox`) | FAIBLE | Définition SQL | Laisser tel quel | Nécessaire à la revue Apple ; surveiller |
| BILL-02 | E·Paiement | Si `APP_ORIGINS` est vide, les origines de retour incluent `localhost` | FAIBLE | `billing_core.ts:33` | NON_VERIFIE | A3 |
| APP-05 | D·CORS | Edge functions en `Access-Control-Allow-Origin: *` (authentification par Bearer, sans cookie : risque faible) | FAIBLE | Code | À CORRIGER | Restreindre à `APP_ORIGINS` |
| APP-06 | D·Erreurs | Les edge functions renvoient `e.message` brut en 500 | FAIBLE | Code | À CORRIGER | Message générique + Sentry |
| DB-02 | B | `pg_net` installé dans `public` ; `storage_child_uuid` sans `search_path` | FAIBLE | Advisors | Partiellement CORRIGÉ | `search_path` figé (066) |
| D-XSS | D·XSS | `dangerouslySetInnerHTML` du bilan : toutes les valeurs utilisateur passent par `esc()` ; `jersey_number` est un entier (CHECK 0–999) ; `?next=` en liste blanche | — | `bilans/bilan-html.ts:41`, `login/page.tsx:38-41` | OK | — |
| G-01 | G·Résilience | Sauvegardes et PITR, procédure de restauration, plan de rotation des clés et d'incident | ? | Aucune API accessible | NON_VERIFIE | A8 |

## 4. Fichiers livrés (branche `claude/amazing-cerf-5974xy`)

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261001_066_security_audit_final.sql` | SEC-01 à SEC-13. Idempotente, testée |
| `supabase/rollbacks/20261001_066_security_audit_final_rollback.sql` | Retour à l'état exact d'avant (urgence uniquement) |
| `supabase/tests/security_rls_regression.sql` | 13 groupes de tests multi-rôles. Exécutable aussi en prod : se termine toujours par une exception, donc rien n'est conservé |
| `supabase/tests/local/` (`00_replica_schema.sql`, `01_seed.sql`, `run.sh`) | Banc Postgres jetable : avant = échec, après = succès |
| `.github/workflows/ci.yml` (job `rls-security`) | Rejoue le banc à chaque PR |
| `supabase/functions/send-push-notification/index.ts` | APP-02 |
| `apps/web/package.json`, `pnpm-lock.yaml` | Next 15.5.27 (seuls `next` et `@next/*` changent) |
| `supabase/migrations/20260804_057c…`, `20260906_059…`, `20260906_060…`, `20260923_062b…` | Migrations de prod rapatriées (MD5 identiques) |

**Résultat du banc** (`./supabase/tests/local/run.sh`) :

```
AVANT  : SECURITY_TESTS_FAILED (17 failles : T1×4, T2, T3, T5×3, T6×2, T7, T8, T9, T10, T11, T13)
APRÈS  : SECURITY_TESTS_PASSED (+ non-régression : coach assigné, parent débloqué, ajout d'enfant,
         validation parent par le coach, validation admin, mise à jour de son profil, liste d'attente anonyme)
```

Le même script, joué en **production** sans la 066 (en lecture seule, annulé), échoue sur 14 points : les failles sont confirmées sur les vraies données.

## 5. Bloquants avant publication

1. **SEC-01, 02, 04, 05, 06** (CRITIQUE) : appliquer la migration 066 → A1.
2. **APP-01** (CRITIQUE) : déployer Next 15.5.27 → A2.
3. **SEC-03, 07, 09, APP-02** (ÉLEVÉE) : couverts par A1 et A3.
4. **AUTH-01, AUTH-02, GH-01** (ÉLEVÉE) : A4, A6, A5.

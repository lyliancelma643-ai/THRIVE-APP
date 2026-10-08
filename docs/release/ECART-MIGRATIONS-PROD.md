# Écart migrations : code (supabase/migrations) ↔ prod THRIVE-CA

Projet prod : `kkdcgzvdmipmrgkawnky` (THRIVE-CA, ca-central-1). Constat en **lecture seule** (`list_migrations`, `execute_sql` SELECT, `get_advisors`) le 2026-10-08. Aucune écriture, aucun `apply_migration`.

Périmètre : fichiers de `supabase/migrations/` datés à partir de 20260906, plus la migration 061 présente seulement dans le dépôt principal (non trackée, absente de la branche `agent/a11-base`).

Méthode : (1) présence du nom dans `list_migrations` ; (2) contenu enregistré dans `supabase_migrations.schema_migrations` (colonne `statements`, longueur seule vérifiée) ; (3) vérification d'objets clés via `pg_proc`, `pg_policies`, `pg_trigger`, `information_schema`, `pg_enum`.

## Tableau des statuts

| Fichier | Statut prod | Preuves (objets vérifiés en prod) |
|---|---|---|
| `20260906_059_admin_alert_enum` | APPLIQUÉ | `schema_migrations` 20260906183505 `admin_alert_enum` ; valeur d'enum `ADMIN_ALERT` présente |
| `20260906_060_admin_notification_center` | APPLIQUÉ | 20260906183711 `admin_notification_center` ; table `admin_notification_prefs`, `private.notify_admins`, trigger `trg_admin_chat_notify` présents |
| `20260922_062_p3_moments` | APPLIQUÉ | 20260923022314 `p3_moments_062` ; tables `p3_moments`, `p3_letters` ; policy `p3_moments_read` |
| `20260923_062b_waitlist_pack_nouveaux_programmes` | APPLIQUÉ | 20260923023914 `waitlist_pack_nouveaux_programmes` |
| `20260926_063_p3_complements` | APPLIQUÉ | 20260926183643 `p3_complements_063` |
| `20260926_064_billing_subscriptions` | APPLIQUÉ | 20260928195623 `billing_subscriptions_064` ; table `billing_subscriptions`, policy `billing_subscriptions_read_own` |
| `20260928_065_billing_grants_hardening` | APPLIQUÉ | 20260928204910 `billing_grants_hardening_065` |
| `20261001_066_coparent_access` | APPLIQUÉ | Équivalent prod en 3 parties : `066a_coparent_helpers`, `066b_coparent_access_state`, `066c_coparent_read_policies` (20261002043143 à 043634) |
| `20261001_066_security_audit_final` | **PARTIEL** | Présent : `private.is_program_coach_of_child`, `private.storage_child_uuid`, policies `gate_*` en **RESTRICTIVE** (SEC-01), `audit_admin_only`, `profiles_admin_update_all`. **Absents** : `private.guard_child_privileged_columns`, `private.guard_family_pack_on_insert`, `private.guard_profile_privileged_columns` et leurs triggers `trg_guard_*`. `public.handle_new_user` est encore la version ancienne (sans garde). Rollback présent (voir ci-dessous). |
| `20261001_067_identity_sport_no_default` | APPLIQUÉ | `schema_migrations` 20261002043132 `067_identity_sport_no_default` ; `athlete_identity.sport` sans default |
| `20261002_066d_loi25_delai_et_partage_p3` | APPLIQUÉ | 20261002144245 `loi25_delai_et_partage_p3_066` ; `deletion_requests.due_at` NOT NULL, `private.overdue_deletion_requests`, trigger `trg_deletion_requests_due_at` |
| `20261002_067_require_email_confirmation` | **NON APPLIQUÉ** | `public.handle_new_user` contient encore `UPDATE auth.users SET email_confirmed_at = NOW() ...`. Aucune migration `require_email_confirmation` dans `schema_migrations`. |
| `20261006_067b_maison_abonnement_obligatoire` | APPLIQUÉ | 20261006181419 `maison_abonnement_obligatoire_067` ; `public.access_state` et `private.parent_p3_access` à jour (contiennent la logique p3) |
| `20261006_068_parent_section_access` | **NON APPLIQUÉ** | Absents : table `public.parent_access`, `private.parent_section_access`, `private.touch_parent_access`, `public.admin_parent_access_list`, trigger `trg_parent_access_touch`. |
| `20260913_061_home_card_moments` (dépôt principal uniquement, non trackée) | **NON APPLIQUÉ** | Table `public.home_card_moments` absente. Non présente dans la branche `agent/a11-base`. |

Résumé : 11 fichiers APPLIQUÉS (dont 066_coparent et 066d, 067b), 1 PARTIEL (066_security_audit_final), 3 NON APPLIQUÉS (067_require_email_confirmation, 068, 061 hors branche).

Note sur les noms : prod enregistre les versions avec un horodatage d'application (ex. `20260906183505`), pas le préfixe du fichier. Le rapprochement se fait sur le nom, pas sur la version.

## Ordre recommandé pour les migrations à appliquer

1. **066_security_audit_final** (PARTIEL). Idempotente (`DROP … IF EXISTS`, `CREATE OR REPLACE`). Ajoute les gardes de colonnes (`guard_profile_privileged_columns`, `guard_child_privileged_columns`, `guard_family_pack_on_insert`) qui bloquent les écritures directes `authenticated`/`anon` sur les colonnes privilégiées. Dépendance : aucune nouvelle, les helpers existent déjà.
   - Risque sur les 11 comptes : moyen. Les gardes bloquent toute écriture client sur `profiles.role`, colonnes d'accès, etc. Avant d'appliquer, vérifier que le code web et mobile n'écrit jamais ces colonnes depuis le client (sinon passer par RPC SECURITY DEFINER). Les 11 comptes sont confirmés (voir plus bas), donc pas d'impact sur l'authentification.
   - Retour arrière : `supabase/rollbacks/20261001_066_security_audit_final_rollback.sql` (restaure l'état du 01/10 et réintroduit SEC-01 à SEC-12). À utiliser seulement en urgence. Remarque : le rollback recrée les policies `gate_*` PERMISSIVE, donc il ré-ouvre une fuite de données de mineurs.
   - Pré-requis : `set lock_timeout = '5s'` est dans le fichier ; prévoir un créneau sans trafic.

2. **067_require_email_confirmation** (NON APPLIQUÉ). Remplace `public.handle_new_user` pour ne plus confirmer l'e-mail d'office. Dépendance : le code web de `main` (page `/auth/confirm`, flux de confirmation) doit être déployé avant ou en même temps, sinon les nouvelles inscriptions restent bloquées. Le réglage « Confirm email » du projet Auth ne se vérifie pas en SQL : à contrôler dans le tableau de bord Supabase.
   - Risque sur les 11 comptes : faible. Les 11 comptes existants sont déjà confirmés (`auth.users` : 11 total, 11 confirmés, 0 non confirmé). La migration ne touche pas les comptes confirmés (`IF email_confirmed_at IS NULL`, selon l'en-tête). Les comptes créés par admin ou co-parent (`email_confirm: true`) ne sont pas touchés. Deux comptes sont bannis (`banned_until` futur) : sans effet sur cette migration.
   - Retour arrière : pas de fichier dédié. Réappliquer la définition actuelle de `handle_new_user` (corps en prod, avec `UPDATE auth.users SET email_confirmed_at = NOW()`). Conserver le texte de la fonction avant application.

3. **068_parent_section_access** (NON APPLIQUÉ). Redéfinit `public.access_state` et `private.parent_p3_access`, et crée la table `parent_access` avec ses policies. Dépendance : 067b (déjà en prod), donc cohérent. Risque : **élevé pour l'accès parent**. Un changement de `access_state` peut ouvrir ou fermer une section (Maison, Bilan, Mes séances) pour un parent existant. Avant application, comparer `access_state()` pour chacun des comptes parents réels (dry-run sur une branche Supabase, pas sur la prod). Le fichier stipule que la règle automatique est la même pour les abonnés Maison seul, mais cela reste à vérifier sur les données.
   - Retour arrière : bloc DOWN commenté en tête du fichier (lignes 26 à 32) : `drop function public.admin_parent_access_list()`, `drop function private.parent_section_access(uuid, text)`, `drop table public.parent_access`. Il faut aussi restaurer l'ancienne `access_state` / `parent_p3_access` (sauvegarder leurs définitions actuelles avant application, car le DOWN ne les restaure pas).

4. **061_home_card_moments** (dépôt principal uniquement). Crée `public.home_card_moments` (moments parent ↔ enfant). Dépendance : vérifier qu'elle est bien dans la branche qui sera fusionnée, car elle n'est pas dans `agent/a11-base`. Risque faible (table neuve, pas de données existantes). Pas de rollback fourni : `drop table public.home_card_moments` et suppression des policies.

## Risques pour les 11 comptes réels

- Les 11 comptes sont confirmés, aucun en attente de confirmation : 067 ne change rien pour eux, seulement pour les nouvelles inscriptions.
- Le risque principal est 068 (accès parent). Il faut un dry-run des `access_state` avant application.
- 066 peut bloquer une écriture client légitime sur une colonne privilégiée : vérifier les parcours profil et enfant avant.

## Advisors de sécurité (get_advisors, type security, 2026-10-08)

- **WARN** `function_search_path_mutable` : `private.storage_child_uuid` (corrigé par 066, `alter function`).
- **WARN** `extension_in_public` : extension `pg_net` dans le schéma `public`.
- **WARN** `anon_security_definer_function_executable` (5) : `lsss_get`, `lsss_submit`, `questionnaire_get`, `questionnaire_submit` (paramètre token uuid, probablement voulu pour les formulaires publics), `vapid_public_key`. À confirmer comme intentionnel.
- **WARN** `authenticated_security_definer_function_executable` (26) : dont `access_state`, `admin_send_notification`, `admin_notification_test`, `confirm_child`, `notify_admin_task_deadlines`, `notify_incomplete_dossiers(p_days)`, `perma_send`, `lsss_send`, `validate_parent_access`, `set_support_conversation_state`. Les fonctions `notify_*` et `perma_send` / `lsss_send` ne devraient pas être appelables par tout utilisateur authentifié : à restreindre (revoke, ou garde interne sur le rôle) après revue du code.
- **WARN** `auth_leaked_password_protection` : protection contre les mots de passe compromis désactivée (réglage du tableau de bord Auth, non SQL).
- **INFO** `rls_enabled_no_policy` : `public.dossier_reminders` a RLS activé sans policy (accès refusé pour les clients). Probablement voulu si la table est réservée au service_role ; à confirmer.

## Actions suivantes (hors périmètre A11, lecture seule)

- Revue du code client pour les écritures sur colonnes privilégiées (avant 066).
- Dry-run `access_state` sur branche Supabase avant 068.
- Décision sur les 26 fonctions SECURITY DEFINER appelables par `authenticated`.
- Activer la protection contre les mots de passe compromis (réglage Auth).

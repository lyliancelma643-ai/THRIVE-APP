-- ═════════════════════════════════════════════════════════════════════════════
-- THRIVE — Inventaire sécurité + surveillance quotidienne (LECTURE SEULE).
-- Supabase › SQL Editor. Exécuter bloc par bloc ; chaque bloc dit le résultat attendu.
-- ═════════════════════════════════════════════════════════════════════════════

-- A1. Tables public SANS RLS — attendu : 0 ligne
select c.relname as table_sans_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity;

-- A2. Tables RLS sans aucune politique (fermées à tous sauf service_role) — à justifier une par une
select c.relname as table_fermee
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);

-- A3. Politiques ouvertes à anon / public — attendu : 0 ligne hors exceptions documentées
select schemaname, tablename, policyname, cmd, roles, left(qual, 120) as qual
from pg_policies
where schemaname in ('public','storage') and roles && array['anon','public']::name[];

-- A4. Droits d'écriture du client sur les tables qui pilotent l'accès payant
--     attendu : billing_subscriptions absente ; les autres protégées par RLS + triggers
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
  and table_name in ('billing_subscriptions','parent_access','profiles','qa_accounts','deletion_requests')
  and privilege_type in ('INSERT','UPDATE','DELETE')
group by 1, 2 order by 1, 2;

-- A5. Fonctions SECURITY DEFINER appelables SANS connexion — attendu : seulement les
--     fonctions à jeton (questionnaire_get/submit, lsss_get/submit) et vapid_public_key
select p.proname as fonction_publique
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE');

-- A6. Fonctions SECURITY DEFINER sans search_path figé — attendu : 0 ligne
select n.nspname || '.' || p.proname as fonction_sans_search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','private') and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');

-- A7. Buckets de stockage publics — attendu : 0 ligne
select id as bucket_public from storage.buckets where public;

-- ── SURVEILLANCE (à brancher sur une alerte quotidienne) ────────────────────

-- S1. Demandes de suppression en retard sur le délai annoncé (30 jours) — attendu : 0
select id, target_profile_id, requested_at, due_at, status
from public.deletion_requests
where processed_at is null and coalesce(due_at, requested_at + interval '30 days') < now() + interval '5 days'
order by requested_at;

-- S2. Miroir d'abonnement incohérent : marqué actif mais expiré — attendu : 0
--     (webhook RevenueCat non reçu ou en échec)
select user_id, store, product_id, expires_at, synced_at
from public.billing_subscriptions
where active and expires_at is not null and expires_at < now() - interval '1 hour';

-- S3. Abonnés en problème de paiement (période de grâce) — à relancer côté produit
select user_id, store, billing_issue_at, expires_at
from public.billing_subscriptions
where active and billing_issue_at is not null
order by billing_issue_at desc;

-- S4. Fraîcheur du webhook : dernière synchronisation reçue
select max(synced_at) as derniere_synchro, count(*) filter (where active) as abonnes_actifs,
       count(*) filter (where active and is_sandbox) as actifs_sandbox
from public.billing_subscriptions;

-- S5. Comptes de revue présents et confirmés — attendu : 3 lignes, confirmed = true
select email, email_confirmed_at is not null as confirmed, last_sign_in_at
from auth.users
where email in ('parent-test@thrivesportpositive.com',
                'coach-test@thrivesportpositive.com',
                'parent-abonnement@thrivesportpositive.com');

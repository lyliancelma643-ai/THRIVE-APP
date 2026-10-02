-- ════════════════════════════════════════════════════════════════════════════
-- Réplique LOCALE (sous-ensemble) du schéma de production THRIVE-CA,
-- limitée aux objets qui décident de l'autorisation : tables métier, fonctions
-- private.* d'autorisation, triggers de garde, policies RLS et droits exacts.
-- Extrait du catalogue de production le 2026-10-01 (état AVANT migration 066).
-- AUCUNE donnée de production : le jeu de données (01_seed.sql) est synthétique.
--
-- Sert à rejouer la migration 066 + supabase/tests/security_rls_regression.sql
-- sur un Postgres jetable (voir run.sh), sans toucher à la production.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Rôles et schémas fournis par Supabase ───────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;
grant usage on schema public, auth, private to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  raw_user_meta_data jsonb, raw_app_meta_data jsonb,
  email_confirmed_at timestamptz, created_at timestamptz, updated_at timestamptz
);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

create table storage.buckets (id text primary key, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
insert into storage.buckets (id) values ('athlete-documents'), ('admin-attachments');

create function private.storage_child_uuid(p_name text) returns uuid language sql immutable as $function$
  select case
    when split_part(p_name, '/', 1)
         ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$function$;

-- ── Types ───────────────────────────────────────────────────────────────────
create type public.age_group as enum ('8-11','12-14','15-17');
create type public.entitlement_status as enum ('ACTIVE','EXPIRED','CANCELLED','TRIAL');
create type public.gender_type as enum ('MALE','FEMALE','NON_BINARY','PREFER_NOT_TO_SAY');
create type public.program_status as enum ('DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED');
create type public.questionnaire_status as enum ('PENDING','IN_PROGRESS','COMPLETED');
create type public.session_status as enum ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','MISSED','POSTPONED');
create type public.user_role as enum ('SUPER_ADMIN','ADMIN','COACH','PARENT','CHILD');

-- ── Tables (colonnes, défauts et contraintes identiques à la production) ────
create table public.admin_coach_supervision (id uuid default gen_random_uuid() not null, admin_id uuid not null, coach_id uuid not null, assigned_by uuid, is_active boolean default true not null, created_at timestamp with time zone default now() not null);
create table public.app_settings (key text not null, enabled boolean default false not null, note text, updated_at timestamp with time zone default now() not null, updated_by uuid);
create table public.athlete_identity (child_id uuid not null, sport text default 'Hockey sur glace'::text, "position" text, club text, sport_story text, strengths text[] default '{}'::text[] not null, season_dream text, smart_goal text, life_skill_goal text, my_actions text[] default '{}'::text[] not null, toolbox jsonb default '[]'::jsonb not null, focus_word text, letter text, notes text, updated_by uuid, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, routine jsonb default '[]'::jsonb not null, program_pct_override integer, certificate_ready boolean default false not null);
create table public.audit_logs (id uuid default gen_random_uuid() not null, user_id uuid, action text not null, table_name text, record_id uuid, old_data jsonb, new_data jsonb, ip_address inet, created_at timestamp with time zone default now() not null);
create table public.badges (id uuid default gen_random_uuid() not null, name text not null, description text, icon_url text, created_at timestamp with time zone default now() not null, icon text default '🏅'::text, color text default '#FFD700'::text, category text default 'participation'::text, condition_type text default 'sessions_completed'::text, condition_value integer default 1, is_active boolean default true);
create table public.billing_subscriptions (user_id uuid not null, entitlement text default 'thrive_moments'::text not null, active boolean default false not null, store text, product_id text, period_type text, will_renew boolean, expires_at timestamp with time zone, billing_issue_at timestamp with time zone, is_sandbox boolean default false not null, ever_subscribed boolean default false not null, stripe_customer_id text, synced_at timestamp with time zone, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.child_badges (id uuid default gen_random_uuid() not null, child_id uuid not null, badge_id uuid not null, earned_at timestamp with time zone default now() not null, awarded_by uuid, note text);
create table public.children (id uuid default gen_random_uuid() not null, family_id uuid not null, first_name text not null, last_name text not null, date_of_birth date not null, gender gender_type, avatar_url text, notes text, is_active boolean default true not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, sport text, validation_status text default 'PENDING'::text not null, nickname text, jersey_number integer, accent_color text);
create table public.coach_assignments (id uuid default gen_random_uuid() not null, coach_id uuid not null, child_id uuid not null, assigned_by uuid, is_active boolean default true not null, created_at timestamp with time zone default now() not null);
create table public.coach_reports (id uuid default gen_random_uuid() not null, child_id uuid not null, coach_id uuid not null, session_id uuid, age_group text, life_skill_target text, performance_summary text, success_count integer, forces_via text, transfer_notes text, home_recommendations text, coach_message_parent text, rpe integer, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.entitlements (id uuid default gen_random_uuid() not null, family_id uuid not null, status entitlement_status default 'TRIAL'::entitlement_status not null, plan_id text, revenuecat_id text, starts_at timestamp with time zone default now() not null, expires_at timestamp with time zone, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.families (id uuid default gen_random_uuid() not null, name text not null, parent_id uuid not null, address text, city text, province text, postal_code text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, pack text default 'ESSENTIEL'::text not null);
create table public.family_members (id uuid default gen_random_uuid() not null, family_id uuid not null, profile_id uuid not null, member_role text default 'PARENT'::text not null, created_at timestamp with time zone default now() not null);
create table public.parent_reports (id uuid default gen_random_uuid() not null, coach_report_id uuid not null, child_id uuid not null, parent_visible_body jsonb default '{}'::jsonb not null, detail_level integer default 1 not null, language text default 'fr'::text not null, seen_at timestamp with time zone, created_at timestamp with time zone default now() not null);
create table public.plans (code text not null, label text not null, tagline text default ''::text not null, price_cents integer not null, currency text default 'CAD'::text not null, features jsonb default '{}'::jsonb not null, limits jsonb default '{}'::jsonb not null, is_active boolean default true not null, sort_order integer default 0 not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.profiles (id uuid not null, email text not null, first_name text, last_name text, role user_role default 'PARENT'::user_role not null, avatar_url text, phone_number text, is_active boolean default true not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, expo_push_token text, notifications_enabled boolean default true, speciality text, bio text, children_count integer default 0, address text, city text, province text, postal_code text, emergency_contact_name text, emergency_contact_phone text, registration_status text default 'pending'::text, registration_notes text, agreed_to_terms boolean default false, agreed_at timestamp with time zone, coach_validated boolean default false not null);
create table public.program_enrollments (id uuid default gen_random_uuid() not null, program_id uuid not null, child_id uuid not null, enrolled_at timestamp with time zone default now() not null, completed_at timestamp with time zone);
create table public.programs (id uuid default gen_random_uuid() not null, title text not null, description text, age_group age_group not null, status program_status default 'DRAFT'::program_status not null, total_sessions integer default 13 not null, coach_id uuid not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.questionnaires (id uuid default gen_random_uuid() not null, session_id uuid, child_id uuid not null, status questionnaire_status default 'PENDING'::questionnaire_status not null, answers jsonb default '[]'::jsonb not null, completed_at timestamp with time zone, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, title text default 'Questionnaire'::text not null, description text, program_id uuid, created_by uuid, kind text default 'GENERIC'::text not null, moment text, access_token uuid, token_expires_at timestamp with time zone, session_number integer, lang text default 'fr'::text not null);
create table public.questions (id uuid default gen_random_uuid() not null, questionnaire_id uuid, text text not null, type text default 'scale'::text not null, options jsonb default '[]'::jsonb, order_index integer default 0, created_at timestamp with time zone default now());
create table public.reports (id uuid default gen_random_uuid() not null, child_id uuid not null, program_id uuid not null, generated_by uuid not null, content jsonb default '{}'::jsonb not null, pdf_url text, created_at timestamp with time zone default now() not null);
create table public.sessions (id uuid default gen_random_uuid() not null, program_id uuid not null, child_id uuid not null, session_number integer not null, title text not null, status session_status default 'SCHEDULED'::session_status not null, scheduled_at timestamp with time zone, completed_at timestamp with time zone, coach_notes text, duration_minutes integer, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.skill_scores (id uuid default gen_random_uuid() not null, child_id uuid not null, skill_key text not null, source text not null, source_id uuid, value numeric(5,2) not null, created_at timestamp with time zone default now() not null);
create table public.video_session_runs (id uuid default gen_random_uuid() not null, video_session_id uuid not null, child_id uuid not null, parent_id uuid not null, started_at timestamp with time zone default now() not null, completed_at timestamp with time zone, progress_seconds integer default 0 not null, answers_log jsonb default '[]'::jsonb not null, rpe integer, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.video_sessions (id uuid default gen_random_uuid() not null, session_number integer not null, phase text not null, title text not null, subtitle text, description text, age_group age_group not null, theme text not null, life_skill text, thrive_action text, duration_minutes integer default 20 not null, video_url text, thumbnail_url text, lang text default 'fr'::text not null, is_free boolean default false not null, is_active boolean default true not null, sort_order integer, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.waitlist (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default now() not null, first_name text not null, email text not null, phone text not null, source text, consent boolean default false not null, status text default 'nouveau'::text not null, pack text, destination text, notes text, called_at timestamp with time zone, child_first_name text, child_age smallint, age_group text, main_need text, call_preference text, appointment_at timestamp with time zone, updated_at timestamp with time zone default now() not null);

alter table public.admin_coach_supervision add primary key (id);
alter table public.app_settings add primary key (key);
alter table public.athlete_identity add primary key (child_id);
alter table public.audit_logs add primary key (id);
alter table public.badges add primary key (id);
alter table public.billing_subscriptions add primary key (user_id);
alter table public.child_badges add primary key (id);
alter table public.children add primary key (id);
alter table public.children add constraint children_validation_status_check check (validation_status = any (array['PENDING','CONFIRMED']));
alter table public.coach_assignments add primary key (id);
alter table public.coach_assignments add unique (coach_id, child_id);
alter table public.coach_reports add primary key (id);
alter table public.entitlements add primary key (id);
alter table public.families add primary key (id);
alter table public.families add constraint families_pack_check check (pack = any (array['ESSENTIEL','AVANCE','PERFORMANCE']));
alter table public.family_members add primary key (id);
alter table public.parent_reports add primary key (id);
alter table public.plans add primary key (code);
alter table public.profiles add primary key (id);
alter table public.profiles add constraint profiles_registration_status_check check (registration_status = any (array['pending','approved','rejected']));
alter table public.program_enrollments add primary key (id);
alter table public.program_enrollments add unique (program_id, child_id);
alter table public.programs add primary key (id);
alter table public.questionnaires add primary key (id);
alter table public.questions add primary key (id);
alter table public.reports add primary key (id);
alter table public.sessions add primary key (id);
alter table public.skill_scores add primary key (id);
alter table public.video_session_runs add primary key (id);
alter table public.video_sessions add primary key (id);
alter table public.waitlist add primary key (id);
alter table public.children add foreign key (family_id) references public.families(id) on delete cascade;
alter table public.families add foreign key (parent_id) references public.profiles(id) on delete cascade;
alter table public.program_enrollments add foreign key (program_id) references public.programs(id) on delete cascade;
alter table public.program_enrollments add foreign key (child_id) references public.children(id) on delete cascade;
alter table public.sessions add foreign key (program_id) references public.programs(id) on delete cascade;
alter table public.coach_reports add foreign key (child_id) references public.children(id) on delete cascade;
alter table public.parent_reports add foreign key (coach_report_id) references public.coach_reports(id) on delete cascade;
alter table public.questions add foreign key (questionnaire_id) references public.questionnaires(id) on delete cascade;

-- ── Fonctions d'autorisation (définitions de production) ────────────────────
create function private.jwt_role() returns text language sql stable set search_path to 'public' as $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$function$;
create function private.is_admin_or_super() returns boolean language sql stable set search_path to 'public' as $function$
  select private.jwt_role() in ('ADMIN', 'SUPER_ADMIN');
$function$;
create function private.is_super_admin_jwt() returns boolean language sql stable set search_path to 'public' as $function$
  select private.jwt_role() = 'SUPER_ADMIN';
$function$;
create function private.is_admin() returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'));
$function$;
create function private.is_super_admin() returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'SUPER_ADMIN');
$function$;
create function public.current_user_role() returns user_role language sql stable set search_path to 'public' as $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;
create function private.is_assigned_coach(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca WHERE ca.child_id = p_child AND ca.coach_id = auth.uid() AND ca.is_active);
$function$;
create function private.is_program_coach_of_child(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN programs pr ON pr.id = pe.program_id
    WHERE pe.child_id = p_child AND pr.coach_id = auth.uid());
$function$;
create function private.is_admin_of_child(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.admin_coach_supervision s join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active where s.admin_id = auth.uid() and s.is_active and ca.child_id = p_child);
$function$;
create function private.is_parent_of_child(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM children c JOIN families f ON f.id = c.family_id WHERE c.id = p_child AND f.parent_id = auth.uid());
$function$;
create function private.can_edit_child_bilan(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select private.is_super_admin() or private.is_admin_of_child(p_child) or private.is_assigned_coach(p_child) or private.is_program_coach_of_child(p_child);
$function$;
create function private.can_view_child_bilan(p_child uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select private.can_edit_child_bilan(p_child) or private.is_parent_of_child(p_child);
$function$;
create function private.is_coach_of_family(p_family uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca JOIN children c ON c.id = ca.child_id
    WHERE c.family_id = p_family AND ca.coach_id = auth.uid() AND ca.is_active);
$function$;
create function private.is_my_childs_coach(p_profile uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.coach_assignments ca join public.children c on c.id = ca.child_id join public.families f on f.id = c.family_id where ca.coach_id = p_profile and ca.is_active and f.parent_id = auth.uid());
$function$;
create function private.is_my_supervisor(p_profile uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.admin_coach_supervision s where s.admin_id = p_profile and s.coach_id = auth.uid() and s.is_active);
$function$;
create function private.is_parent_of_program(p_program uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN children c ON c.id = pe.child_id
    JOIN families f ON f.id = c.family_id WHERE pe.program_id = p_program AND f.parent_id = auth.uid());
$function$;
create function private.family_pack(p_child uuid) returns text language sql stable security definer set search_path to 'public' as $function$
  select f.pack from public.families f join public.children c on c.family_id = f.id where c.id = p_child;
$function$;
create function private.pack_feature(p_child uuid, p_feature text) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((p.features ->> p_feature)::boolean, false) from public.plans p where p.code = private.family_pack(p_child);
$function$;
create function private.pack_detail_level(p_child uuid) returns integer language sql stable security definer set search_path to 'public' as $function$
  select coalesce((p.limits ->> 'detailLevel')::int, 1) from public.plans p where p.code = private.family_pack(p_child);
$function$;
create function private.parent_access_unlocked(p_parent uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select p.coach_validated from profiles p where p.id = p_parent), false)
     and exists (select 1 from children c join families f on f.id = c.family_id
                 where f.parent_id = p_parent and c.is_active and c.validation_status = 'CONFIRMED');
$function$;

create function public.confirm_child(p_child uuid) returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not private.is_admin_or_super() then raise exception 'Réservé aux administrateurs'; end if;
  update children set validation_status = 'CONFIRMED' where id = p_child;
end; $function$;
create function public.validate_parent_access(p_parent uuid) returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not (private.is_admin_or_super() or exists (
    select 1 from coach_assignments ca join children c on c.id = ca.child_id join families f on f.id = c.family_id
    where f.parent_id = p_parent and ca.coach_id = auth.uid())) then
    raise exception 'Réservé au coach assigné ou aux administrateurs';
  end if;
  update profiles set coach_validated = true where id = p_parent and role = 'PARENT';
end; $function$;

-- ── Triggers de production pertinents pour l'autorisation ───────────────────
create function public.enforce_role_change_authority() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if (new.role is distinct from old.role) or (new.is_active is distinct from old.is_active) then
    if auth.uid() is null then return new; end if;
    if exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')) then
      return new;
    end if;
    raise exception 'Modification du rôle ou du statut non autorisée' using errcode = 'check_violation';
  end if;
  return new;
end; $function$;
create trigger trg_enforce_role_change_authority before update on public.profiles
  for each row execute function public.enforce_role_change_authority();

create function public.enforce_pack_change_authority() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.pack is distinct from old.pack then
    if auth.uid() is null then return new; end if;
    if exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')) then
      return new;
    end if;
    raise exception 'Modification du pack non autorisée' using errcode = 'check_violation';
  end if;
  return new;
end; $function$;
create trigger trg_enforce_pack_change_authority before update on public.families
  for each row execute function public.enforce_pack_change_authority();

create function public.set_signup_app_role() returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if (new.raw_app_meta_data->>'role') is null then
    new.raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'PARENT');
  end if;
  return new;
end; $function$;

-- handle_new_user tel qu'en production AVANT la migration 066 (rôle lu dans user_metadata)
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $function$
DECLARE v_first_name TEXT; v_last_name TEXT; v_role TEXT;
BEGIN
  v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), '');
  v_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), '');
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'PARENT');
  IF v_role NOT IN ('PARENT', 'COACH', 'CHILD') THEN v_role := 'PARENT'; END IF;
  INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active, registration_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_first_name, v_last_name, v_role::user_role, true, 'approved', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END; $function$;

-- ── RLS + policies (texte exact du catalogue de production) ─────────────────
do $$ declare t text; begin
  foreach t in array array['admin_coach_supervision','app_settings','athlete_identity','audit_logs','badges','billing_subscriptions','child_badges','children','coach_assignments','coach_reports','entitlements','families','family_members','parent_reports','plans','profiles','program_enrollments','programs','questionnaires','questions','reports','sessions','skill_scores','video_session_runs','video_sessions','waitlist'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "Service role can insert profiles" on public.profiles as permissive for insert to service_role with check (true);
create policy all_read_child_badges on public.child_badges as permissive for select to authenticated using (true);
create policy all_read_questions on public.questions as permissive for select to authenticated using (true);
create policy app_settings_read on public.app_settings as permissive for select to authenticated using (true);
create policy app_settings_write on public.app_settings as permissive for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy assignments_admin_all on public.coach_assignments as permissive for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy assignments_coach_read on public.coach_assignments as permissive for select to authenticated using ((coach_id = ( SELECT auth.uid() AS uid)));
create policy assignments_parent_read on public.coach_assignments as permissive for select to authenticated using (private.is_parent_of_child(child_id));
create policy athlete_identity_delete on public.athlete_identity as permissive for delete to authenticated using (private.can_edit_child_bilan(child_id));
create policy athlete_identity_insert on public.athlete_identity as permissive for insert to authenticated with check (private.can_edit_child_bilan(child_id));
create policy athlete_identity_read on public.athlete_identity as permissive for select to authenticated using (private.can_view_child_bilan(child_id));
create policy athlete_identity_update on public.athlete_identity as permissive for update to authenticated using (private.can_edit_child_bilan(child_id)) with check (private.can_edit_child_bilan(child_id));
create policy audit_admin_only on public.audit_logs as permissive for all to authenticated using (private.is_admin());
create policy badges_admin_write on public.badges as permissive for all to authenticated using (private.is_admin());
create policy badges_read_all on public.badges as permissive for select to authenticated using (true);
create policy billing_subscriptions_read_own on public.billing_subscriptions as permissive for select to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin_or_super() AS is_admin_or_super)));
create policy children_coach_assigned_read on public.children as permissive for select to authenticated using (private.is_assigned_coach(id));
create policy children_coach_select on public.children as permissive for select to authenticated using (private.is_program_coach_of_child(id));
create policy children_parent_own on public.children as permissive for all to authenticated using (((EXISTS ( SELECT 1 FROM families f WHERE ((f.id = children.family_id) AND (f.parent_id = ( SELECT auth.uid() AS uid))))) OR private.is_admin()));
create policy children_supervising_admin_read on public.children as permissive for select to authenticated using (private.is_admin_of_child(id));
create policy coach_reports_insert on public.coach_reports as permissive for insert to authenticated with check (((coach_id = ( SELECT auth.uid() AS uid)) AND (current_user_role() = ANY (ARRAY['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))));
create policy coach_reports_read on public.coach_reports as permissive for select to authenticated using (((coach_id = ( SELECT auth.uid() AS uid)) OR private.is_assigned_coach(child_id) OR private.is_program_coach_of_child(child_id) OR private.is_admin()));
create policy coach_reports_update on public.coach_reports as permissive for update to authenticated using (((coach_id = ( SELECT auth.uid() AS uid)) OR private.is_admin())) with check (((coach_id = ( SELECT auth.uid() AS uid)) OR private.is_admin()));
create policy coaches_admins_questionnaires on public.questionnaires as permissive for all to authenticated using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))))));
create policy coaches_admins_questions on public.questions as permissive for all to authenticated using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))))));
create policy coaches_award_badges on public.child_badges as permissive for insert to authenticated with check ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))))));
create policy enrollments_coach_read on public.program_enrollments as permissive for all to authenticated using ((private.is_admin() OR (EXISTS ( SELECT 1 FROM programs pr WHERE ((pr.id = program_enrollments.program_id) AND (pr.coach_id = ( SELECT auth.uid() AS uid))))))) with check ((private.is_admin() OR (EXISTS ( SELECT 1 FROM programs pr WHERE ((pr.id = program_enrollments.program_id) AND (pr.coach_id = ( SELECT auth.uid() AS uid)))))));
create policy enrollments_parent_read on public.program_enrollments as permissive for select to authenticated using (private.is_parent_of_child(child_id));
create policy entitlements_admin_write on public.entitlements as permissive for all to authenticated using (private.is_admin());
create policy entitlements_family_read on public.entitlements as permissive for select to authenticated using ((EXISTS ( SELECT 1 FROM families f WHERE ((f.id = entitlements.family_id) AND ((f.parent_id = ( SELECT auth.uid() AS uid)) OR private.is_admin())))));
create policy families_admin_all on public.families as permissive for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy families_parent_insert on public.families as permissive for insert to authenticated with check ((parent_id = ( SELECT auth.uid() AS uid)));
create policy families_parent_update on public.families as permissive for update to authenticated using ((parent_id = ( SELECT auth.uid() AS uid)));
create policy families_select_policy on public.families as permissive for select to authenticated using (((( SELECT auth.uid() AS uid) = parent_id) OR private.is_admin() OR private.is_coach_of_family(id)));
create policy family_members_owner_insert on public.family_members as permissive for insert to authenticated with check (((EXISTS ( SELECT 1 FROM families f WHERE ((f.id = family_members.family_id) AND (f.parent_id = ( SELECT auth.uid() AS uid))))) OR private.is_admin_or_super()));
create policy family_members_read on public.family_members as permissive for select to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM families f WHERE ((f.id = family_members.family_id) AND (f.parent_id = ( SELECT auth.uid() AS uid))))) OR private.is_admin_or_super()));
create policy gate_parent_reports on public.parent_reports as permissive for select to authenticated using (((( SELECT private.jwt_role() AS jwt_role) <> 'PARENT'::text) OR ( SELECT private.parent_access_unlocked(( SELECT auth.uid() AS uid)) AS parent_access_unlocked)));
create policy gate_parent_sessions on public.sessions as permissive for select to authenticated using (((( SELECT private.jwt_role() AS jwt_role) <> 'PARENT'::text) OR ( SELECT private.parent_access_unlocked(( SELECT auth.uid() AS uid)) AS parent_access_unlocked)));
create policy gate_parent_video_runs on public.video_session_runs as permissive for select to authenticated using (((( SELECT private.jwt_role() AS jwt_role) <> 'PARENT'::text) OR (( SELECT private.parent_access_unlocked(( SELECT auth.uid() AS uid)) AS parent_access_unlocked) AND COALESCE(( SELECT app_settings.enabled FROM app_settings WHERE (app_settings.key = 'fitness_enabled'::text)), false))));
create policy gate_parent_video_sessions on public.video_sessions as permissive for select to authenticated using (((( SELECT private.jwt_role() AS jwt_role) <> 'PARENT'::text) OR (( SELECT private.parent_access_unlocked(( SELECT auth.uid() AS uid)) AS parent_access_unlocked) AND COALESCE(( SELECT app_settings.enabled FROM app_settings WHERE (app_settings.key = 'fitness_enabled'::text)), false))));
create policy parent_reports_parent_update on public.parent_reports as permissive for update to authenticated using (private.is_parent_of_child(child_id)) with check (private.is_parent_of_child(child_id));
create policy parent_reports_read on public.parent_reports as permissive for select to authenticated using (CASE WHEN private.is_parent_of_child(child_id) THEN (detail_level <= private.pack_detail_level(child_id)) ELSE (private.is_assigned_coach(child_id) OR private.is_program_coach_of_child(child_id) OR private.is_admin()) END);
create policy plans_admin_write on public.plans as permissive for all to authenticated using (private.is_admin_or_super()) with check (private.is_admin_or_super());
create policy plans_read on public.plans as permissive for select to authenticated using (true);
create policy profiles_admin_update_all on public.profiles as permissive for update to authenticated using ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))))));
create policy profiles_insert_trigger on public.profiles as permissive for insert to authenticated with check ((( SELECT auth.uid() AS uid) = id));
create policy profiles_read_my_childs_coach on public.profiles as permissive for select to authenticated using (private.is_my_childs_coach(id));
create policy profiles_read_my_supervisor on public.profiles as permissive for select to authenticated using (private.is_my_supervisor(id));
create policy profiles_select_policy on public.profiles as permissive for select to authenticated using (((( SELECT auth.uid() AS uid) = id) OR private.is_admin()));
create policy profiles_update_own on public.profiles as permissive for update to authenticated using ((( SELECT auth.uid() AS uid) = id));
create policy programs_coach_own on public.programs as permissive for all to authenticated using (((coach_id = ( SELECT auth.uid() AS uid)) OR private.is_admin()));
create policy programs_parent_read on public.programs as permissive for select to authenticated using (private.is_parent_of_program(id));
create policy questionnaires_coach_manage on public.questionnaires as permissive for all to authenticated using (((EXISTS ( SELECT 1 FROM (sessions s JOIN programs p ON ((p.id = s.program_id))) WHERE ((s.id = questionnaires.session_id) AND (p.coach_id = ( SELECT auth.uid() AS uid))))) OR private.is_admin()));
create policy questionnaires_parent_read on public.questionnaires as permissive for select to authenticated using ((EXISTS ( SELECT 1 FROM (children c JOIN families f ON ((f.id = c.family_id))) WHERE ((c.id = questionnaires.child_id) AND (f.parent_id = ( SELECT auth.uid() AS uid))))));
create policy reports_coach_write on public.reports as permissive for insert to authenticated with check (((generated_by = ( SELECT auth.uid() AS uid)) AND (current_user_role() = ANY (ARRAY['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role]))));
create policy reports_read on public.reports as permissive for select to authenticated using (((generated_by = ( SELECT auth.uid() AS uid)) OR private.is_admin()));
create policy runs_coach_read on public.video_session_runs as permissive for select to authenticated using (private.is_assigned_coach(child_id));
create policy runs_parent_all on public.video_session_runs as permissive for all to authenticated using (((parent_id = ( SELECT auth.uid() AS uid)) OR private.is_admin())) with check (((parent_id = ( SELECT auth.uid() AS uid)) OR private.is_admin()));
create policy sessions_assigned_coach_all on public.sessions as permissive for all to authenticated using ((private.is_assigned_coach(child_id) OR private.is_admin_of_child(child_id) OR private.is_super_admin())) with check ((private.is_assigned_coach(child_id) OR private.is_admin_of_child(child_id) OR private.is_super_admin()));
create policy sessions_coach_own on public.sessions as permissive for all to authenticated using (((EXISTS ( SELECT 1 FROM programs p WHERE ((p.id = sessions.program_id) AND (p.coach_id = ( SELECT auth.uid() AS uid))))) OR private.is_admin()));
create policy sessions_parent_read on public.sessions as permissive for select to authenticated using (private.is_parent_of_child(child_id));
create policy skill_scores_read on public.skill_scores as permissive for select to authenticated using (CASE WHEN private.is_parent_of_child(child_id) THEN private.pack_feature(child_id, 'skillBreakdown'::text) ELSE (private.is_assigned_coach(child_id) OR private.is_program_coach_of_child(child_id) OR private.is_admin()) END);
create policy supervision_admin_read on public.admin_coach_supervision as permissive for select to authenticated using ((admin_id = ( SELECT auth.uid() AS uid)));
create policy supervision_coach_read on public.admin_coach_supervision as permissive for select to authenticated using ((coach_id = ( SELECT auth.uid() AS uid)));
create policy supervision_super_admin_all on public.admin_coach_supervision as permissive for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy video_sessions_admin_write on public.video_sessions as permissive for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy video_sessions_read on public.video_sessions as permissive for select to authenticated using ((is_active OR private.is_admin()));
create policy waitlist_public_insert on public.waitlist as permissive for insert to anon,authenticated with check (((consent = true) AND (status = 'nouveau'::text) AND (called_at IS NULL) AND (appointment_at IS NULL)));
create policy waitlist_super_admin_read on public.waitlist as permissive for select to authenticated using (( SELECT private.is_super_admin_jwt() AS is_super_admin_jwt));

-- ── Droits (identiques à la production) ─────────────────────────────────────
grant all on all tables in schema public to anon, authenticated, service_role;
revoke all on public.billing_subscriptions from anon, authenticated;
grant select on public.billing_subscriptions to authenticated;
revoke all on public.parent_reports from authenticated;
grant delete, insert, references, select, trigger, truncate on public.parent_reports to authenticated;
grant update (seen_at) on public.parent_reports to authenticated;

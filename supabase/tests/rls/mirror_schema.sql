-- ─────────────────────────────────────────────────────────────────────────────
-- Miroir minimal de la production THRIVE-CA pour tester les règles d'accès
-- (RLS) sur un Postgres 16 local, sans Supabase.
--
-- Reproduit À L'IDENTIQUE (relevé en lecture seule le 2026-10-02) :
--   • les colonnes, types et énumérations des tables utilisées par l'espace
--     parent et par les demandes de suppression ;
--   • les fonctions private.* et public.access_state() dans leur version
--     ANTÉRIEURE aux migrations 066 / 067 ;
--   • les politiques RLS de ces tables.
-- Ne remplace pas un test sur une branche Supabase (voir README.md) : les
-- triggers métier (quotas, notifications, coach automatique) n'y sont pas.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── Socle Supabase : rôles, auth.uid(), auth.jwt() ──────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists private;
create schema if not exists vault;
create schema if not exists net;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb
);

-- Même lecture des claims que Supabase (request.jwt.claims posé par PostgREST).
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- Vault et pg_net : bouchons (aucun secret → les triggers HTTP sont des no-op).
create table if not exists vault.decrypted_secrets (name text primary key, decrypted_secret text);
create table if not exists net.calls (id bigserial primary key, url text, headers jsonb, body jsonb, at timestamptz default now());
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000)
returns bigint language sql as $$
  insert into net.calls (url, headers, body) values (url, headers, body) returning id
$$;

grant usage on schema public, auth, private to anon, authenticated, service_role;

-- ── Énumérations ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('SUPER_ADMIN','ADMIN','COACH','PARENT','CHILD');
create type public.gender_type as enum ('MALE','FEMALE','NON_BINARY','PREFER_NOT_TO_SAY');
create type public.entitlement_status as enum ('ACTIVE','EXPIRED','CANCELLED','TRIAL');
create type public.questionnaire_status as enum ('PENDING','IN_PROGRESS','COMPLETED');
create type public.session_status as enum ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','MISSED','POSTPONED');
create type public.notification_type as enum ('SESSION_REMINDER','PROGRESS_UPDATE','MESSAGE_RECEIVED','BADGE_EARNED',
  'PROGRAM_UPDATED','REPORT_READY','DOSSIER_INCOMPLET','QUESTIONNAIRE_PENDING','QUESTIONNAIRE_COMPLETED',
  'DOCUMENT_ADDED','TASK_UPDATE','ADMIN_ALERT');

-- ── Tables (colonnes relevées en production) ────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text, last_name text,
  role public.user_role not null default 'PARENT',
  is_active boolean not null default true,
  coach_validated boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  pack text not null default 'ESSENTIEL',
  created_at timestamptz not null default now()
);
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'PARENT' check (member_role in ('OWNER','PARENT','SUPERVISOR')),
  created_at timestamptz not null default now(),
  unique (family_id, profile_id)
);
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  gender public.gender_type,
  sport text,
  is_active boolean not null default true,
  validation_status text not null default 'PENDING',
  created_at timestamptz not null default now()
);
create table public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id),
  child_id uuid not null references public.children(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create type public.age_group as enum ('8-11','12-14','15-17');
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  age_group public.age_group not null,
  coach_id uuid not null references public.profiles(id)
);
create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade
);
create table public.admin_coach_supervision (admin_id uuid, coach_id uuid, is_active boolean default true);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id),
  child_id uuid not null references public.children(id) on delete cascade,
  session_number int not null,
  title text not null,
  status public.session_status not null default 'SCHEDULED'
);
create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  status public.questionnaire_status not null default 'PENDING',
  title text not null default 'Questionnaire',
  kind text not null default 'GENERIC',
  access_token uuid
);
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  status public.entitlement_status not null default 'TRIAL',
  plan_id text
);
create table public.family_status (family_id uuid primary key references public.families(id) on delete cascade, status text not null default 'FOUNDING');
create table public.family_streaks (family_id uuid primary key references public.families(id) on delete cascade, current_weeks int not null default 0);
create table public.plans (code text primary key, features jsonb not null default '{}', limits jsonb not null default '{}');
create table public.app_settings (key text primary key, enabled boolean not null default false);
create table public.billing_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  entitlement text not null default 'thrive_moments',
  active boolean not null default false,
  store text, expires_at timestamptz, stripe_customer_id text,
  ever_subscribed boolean not null default false
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null, body text,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.p3_rewards (
  child_id uuid not null references public.children(id) on delete cascade,
  reward_id text not null,
  payload jsonb,
  earned_at timestamptz not null default now()
);
create table public.p3_moments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id text not null,
  week smallint not null
);
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','ANONYMIZED','PURGED','CANCELLED')),
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id)
);

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ── Fonctions private.* (version de production avant 066) ───────────────────
create function private.jwt_role() returns text language sql stable set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'));
$$;
create function private.is_admin_or_super() returns boolean language sql stable security definer set search_path = public as $$
  select private.jwt_role() in ('ADMIN', 'SUPER_ADMIN');
$$;
create function private.is_super_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'SUPER_ADMIN');
$$;
create function private.is_coach_of_family(p_family uuid) returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca JOIN children c ON c.id = ca.child_id
    WHERE c.family_id = p_family AND ca.coach_id = auth.uid() AND ca.is_active);
$$;
create function private.is_assigned_coach(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca WHERE ca.child_id = p_child AND ca.coach_id = auth.uid() AND ca.is_active);
$$;
create function private.is_program_coach_of_child(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN programs pr ON pr.id = pe.program_id
    WHERE pe.child_id = p_child AND pr.coach_id = auth.uid());
$$;
create function private.is_admin_of_child(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_coach_supervision s join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active
    where s.admin_id = auth.uid() and s.is_active and ca.child_id = p_child);
$$;
create function private.can_edit_child_bilan(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  select private.is_super_admin() or private.is_admin_of_child(p_child) or private.is_assigned_coach(p_child) or private.is_program_coach_of_child(p_child);
$$;
create function private.is_parent_of_child(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM children c JOIN families f ON f.id = c.family_id WHERE c.id = p_child AND f.parent_id = auth.uid());
$$;
create function private.can_view_child_bilan(p_child uuid) returns boolean language sql stable security definer set search_path = public as $$
  select private.can_edit_child_bilan(p_child) or private.is_parent_of_child(p_child);
$$;
create function private.is_parent_of_program(p_program uuid) returns boolean language sql stable security definer set search_path = public as $$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN children c ON c.id = pe.child_id
    JOIN families f ON f.id = c.family_id WHERE pe.program_id = p_program AND f.parent_id = auth.uid());
$$;
create function private.is_family_parent(p_family uuid) returns boolean language sql stable security definer set search_path = public as $$
  select p_family is not null and (
    exists (select 1 from public.families f where f.id = p_family and f.parent_id = auth.uid())
    or exists (select 1 from public.family_members m where m.family_id = p_family and m.profile_id = auth.uid())
  );
$$;
create function private.is_my_childs_coach(p_profile uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coach_assignments ca join public.children c on c.id = ca.child_id join public.families f on f.id = c.family_id
    where ca.coach_id = p_profile and ca.is_active and f.parent_id = auth.uid());
$$;
create function private.family_pack(p_child uuid) returns text language sql stable security definer set search_path = public as $$
  select f.pack from public.families f join public.children c on c.family_id = f.id where c.id = p_child;
$$;
create function private.pack_feature(p_child uuid, p_feature text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((p.features ->> p_feature)::boolean, false) from public.plans p where p.code = private.family_pack(p_child);
$$;
create function private.parent_has_feature(p_feature text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (p.features ->> p_feature)::boolean from public.families f join public.plans p on p.code = f.pack
    where f.parent_id = auth.uid() limit 1), false);
$$;
create function private.parent_access_unlocked(p_parent uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.coach_validated from profiles p where p.id = p_parent), false)
     and exists (select 1 from children c join families f on f.id = c.family_id
       where f.parent_id = p_parent and c.is_active and c.validation_status = 'CONFIRMED');
$$;
create function private.has_p3_subscription(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from billing_subscriptions s where s.active and (s.expires_at is null or s.expires_at > now())
    and (s.user_id = p_user or s.user_id in (select f.parent_id from family_members m join families f on f.id = m.family_id where m.profile_id = p_user)));
$$;
create function private.parent_p3_access(p_parent uuid) returns boolean language sql stable security definer set search_path = public as $$
  select private.parent_access_unlocked(p_parent) or private.has_p3_subscription(p_parent);
$$;

create function public.access_state() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := private.jwt_role();
  v_has_child boolean; v_has_confirmed boolean; v_coach_ok boolean; v_fitness boolean; v_subscribed boolean;
begin
  if v_uid is null then return jsonb_build_object('unlocked', false, 'reason', 'anonymous'); end if;
  select coalesce(enabled, false) into v_fitness from app_settings where key = 'fitness_enabled';
  if v_role <> 'PARENT' then
    return jsonb_build_object('role', v_role, 'unlocked', true, 'has_child', true, 'has_confirmed_child', true,
      'coach_validated', true, 'fitness_enabled', coalesce(v_fitness, false), 'p3_subscribed', false, 'p3_access', true);
  end if;
  select exists (select 1 from children c join families f on f.id = c.family_id where f.parent_id = v_uid and c.is_active),
         exists (select 1 from children c join families f on f.id = c.family_id where f.parent_id = v_uid and c.is_active and c.validation_status = 'CONFIRMED')
    into v_has_child, v_has_confirmed;
  select coalesce(coach_validated, false) into v_coach_ok from profiles where id = v_uid;
  v_subscribed := private.has_p3_subscription(v_uid);
  return jsonb_build_object('role', v_role, 'unlocked', v_has_confirmed and v_coach_ok, 'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed, 'coach_validated', v_coach_ok, 'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed, 'p3_access', (v_has_confirmed and v_coach_ok) or v_subscribed);
end;
$$;

grant execute on all functions in schema private, public to authenticated;

-- ── Politiques RLS (texte de production) ────────────────────────────────────
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.coach_assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.questionnaires enable row level security;
alter table public.entitlements enable row level security;
alter table public.family_status enable row level security;
alter table public.family_streaks enable row level security;
alter table public.p3_rewards enable row level security;
alter table public.p3_moments enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.profiles enable row level security;

create policy profiles_self on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_admin());
create policy notifications_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy billing_own on public.billing_subscriptions for select to authenticated using (user_id = (select auth.uid()));

create policy families_select_policy on public.families for select to authenticated
  using (((select auth.uid()) = parent_id) or private.is_admin() or private.is_coach_of_family(id));
create policy families_parent_insert on public.families for insert to authenticated with check (parent_id = (select auth.uid()));
create policy families_parent_update on public.families for update to authenticated using (parent_id = (select auth.uid()));

create policy family_members_read on public.family_members for select to authenticated
  using ((profile_id = (select auth.uid())) or exists (select 1 from families f where f.id = family_members.family_id and f.parent_id = (select auth.uid())) or private.is_admin_or_super());
create policy family_members_owner_insert on public.family_members for insert to authenticated
  with check (exists (select 1 from families f where f.id = family_members.family_id and f.parent_id = (select auth.uid())) or private.is_admin_or_super());
create policy family_members_owner_delete on public.family_members for delete to authenticated
  using (((member_role <> 'OWNER') and exists (select 1 from families f where f.id = family_members.family_id and f.parent_id = (select auth.uid()))) or private.is_admin_or_super());

create policy children_parent_own on public.children for all to authenticated
  using (exists (select 1 from families f where f.id = children.family_id and f.parent_id = (select auth.uid())) or private.is_admin());
create policy children_coach_assigned_read on public.children for select to authenticated using (private.is_assigned_coach(id));

create policy assignments_parent_read on public.coach_assignments for select to authenticated using (private.is_parent_of_child(child_id));

create policy sessions_parent_read on public.sessions for select to authenticated using (private.is_parent_of_child(child_id));
create policy gate_parent_sessions on public.sessions as restrictive for select to authenticated
  using (((select private.jwt_role()) <> 'PARENT') or (select private.parent_access_unlocked((select auth.uid()))));

create policy questionnaires_parent_read on public.questionnaires for select to authenticated
  using (exists (select 1 from children c join families f on f.id = c.family_id where c.id = questionnaires.child_id and f.parent_id = (select auth.uid())));

create policy entitlements_family_read on public.entitlements for select to authenticated
  using (exists (select 1 from families f where f.id = entitlements.family_id and (f.parent_id = (select auth.uid()) or private.is_admin())));
create policy family_status_read on public.family_status for select to authenticated
  using (exists (select 1 from families f where f.id = family_status.family_id and f.parent_id = (select auth.uid())) or (select private.is_admin()));
create policy family_streaks_read on public.family_streaks for select to authenticated
  using (exists (select 1 from families f where f.id = family_streaks.family_id and f.parent_id = (select auth.uid())) or (select private.is_admin()));

create policy p3_rewards_insert on public.p3_rewards for insert to authenticated with check (private.is_parent_of_child(child_id));
create policy p3_rewards_read on public.p3_rewards for select to authenticated
  using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id) or private.is_admin());
create policy p3_moments_insert on public.p3_moments for insert to authenticated
  with check ((parent_id = (select auth.uid())) and private.is_parent_of_child(child_id));
create policy p3_moments_read on public.p3_moments for select to authenticated
  using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id) or private.is_admin());

create policy deletion_req_select on public.deletion_requests for select to authenticated
  using (requested_by = (select auth.uid()) or target_profile_id = (select auth.uid()) or private.is_admin());
create policy deletion_req_insert_self on public.deletion_requests for insert to authenticated
  with check (requested_by = (select auth.uid()) and target_profile_id = (select auth.uid()));
create policy deletion_req_admin_update on public.deletion_requests for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ── Quota de comptes parents (trigger de production) ────────────────────────
create function public.enforce_family_members_quota() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pack text;
  v_max int;
  v_count int;
begin
  if auth.uid() is null or private.is_admin_or_super() then return new; end if;
  select f.pack into v_pack from public.families f where f.id = new.family_id;
  select (p.limits ->> 'maxParents')::int into v_max from public.plans p where p.code = v_pack;
  if v_max is not null then
    select count(*) into v_count from public.family_members m where m.family_id = new.family_id;
    if v_count >= v_max then
      raise exception 'Quota de comptes parents atteint pour le forfait % (max %). Passez à un forfait supérieur.', v_pack, v_max
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger trg_enforce_family_members_quota before insert on public.family_members
  for each row execute function public.enforce_family_members_quota();

insert into public.plans (code, features, limits) values
  ('ESSENTIEL', '{}', '{"maxChildren": 1, "maxParents": 1, "detailLevel": 1}'),
  ('AVANCE', '{}', '{"maxChildren": 2, "maxParents": 2, "detailLevel": 2}'),
  ('PERFORMANCE', '{}', '{"detailLevel": 3}');
insert into public.app_settings (key, enabled) values ('fitness_enabled', true), ('p3_enabled', true);

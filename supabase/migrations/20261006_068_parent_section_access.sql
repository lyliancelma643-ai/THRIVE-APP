-- ─────────────────────────────────────────────────────────────────────────────
-- 068 — Accès par section, réglable parent par parent (Admin / Super Admin).
--
-- Trois sections côté parent : Maison · Bilan · Mes séances.
--
-- Règle AUTOMATIQUE (sans réglage manuel) — alignée sur la prod (067b) :
--   • Maison      = abonnement Maison actif (propre ou partagé co-parent, 066d)
--                   SEUL. Le pack programme et l'activation coach n'ouvrent
--                   PAS Maison automatiquement (décision produit 067b) ; l'admin
--                   peut l'ouvrir par forçage.
--   • Bilan       = compte activé par le coach (inchangé).
--   • Mes séances = compte activé par le coach (inchangé).
--
-- Réglage MANUEL : pour chaque section, null = automatique, true = ouvert,
-- false = fermé. Le manuel l'emporte toujours sur l'automatique (ex. ouvrir
-- « Mes séances » à un abonné Maison seul).
--
-- Enforcement serveur :
--   • tables p3_*           : via private.parent_p3_access (redéfinie ici) ;
--   • sessions, parent_reports : lues par Bilan ET par Mes séances → ouvertes
--     si l'une des deux sections l'est ; la séparation fine est faite dans l'UI.
--
-- Rétrocompatible : aucune ligne parent_access = comportement identique à avant.
--
-- Rollback : supabase/rollbacks/20261006_068_parent_section_access_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- ── 1) Réglages par parent ───────────────────────────────────────────────────
create table if not exists public.parent_access (
  parent_id    uuid primary key references public.profiles(id) on delete cascade,
  -- Pack THRIVE acheté (null = aucun pack)
  program_pack text check (program_pack in ('GROUPE', 'INDIVIDUEL', 'COMPLET')),
  -- Forçages par section : null = automatique, true = ouvert, false = fermé
  maison       boolean,
  bilan        boolean,
  seances      boolean,
  note         text,
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.parent_access is
  'Pack THRIVE et forçages d''accès par section (Maison / Bilan / Mes séances), réglés par Admin / Super Admin.';

alter table public.parent_access enable row level security;

drop policy if exists parent_access_read on public.parent_access;
create policy parent_access_read on public.parent_access
  for select to authenticated
  using ((select private.is_admin_or_super()));  -- le parent lit son état via access_state() (la note admin reste privée)

drop policy if exists parent_access_admin_insert on public.parent_access;
create policy parent_access_admin_insert on public.parent_access
  for insert to authenticated
  with check ((select private.is_admin_or_super()));

drop policy if exists parent_access_admin_update on public.parent_access;
create policy parent_access_admin_update on public.parent_access
  for update to authenticated
  using ((select private.is_admin_or_super()))
  with check ((select private.is_admin_or_super()));

drop policy if exists parent_access_admin_delete on public.parent_access;
create policy parent_access_admin_delete on public.parent_access
  for delete to authenticated
  using ((select private.is_admin_or_super()));

revoke all on public.parent_access from anon;
revoke truncate, references, trigger on public.parent_access from authenticated;
grant select, insert, update, delete on public.parent_access to authenticated;

create or replace function private.touch_parent_access()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists trg_parent_access_touch on public.parent_access;
create trigger trg_parent_access_touch
  before insert or update on public.parent_access
  for each row execute function private.touch_parent_access();

alter table public.parent_access replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.parent_access;
exception when duplicate_object or undefined_object then null;
end $$;

-- ── 2) Droit effectif par section ────────────────────────────────────────────
create or replace function private.parent_section_access(p_parent uuid, p_section text)
returns boolean language plpgsql stable security definer
set search_path = public
as $$
declare
  r parent_access%rowtype;
  v_forced boolean;
begin
  -- Pas de lecture des droits d'autrui (même garde que has_p3_subscription).
  if not (auth.uid() is null or auth.uid() = p_parent or private.is_admin()) then
    return false;
  end if;

  select * into r from parent_access where parent_id = p_parent;

  v_forced := case p_section
    when 'maison'  then r.maison
    when 'bilan'   then r.bilan
    when 'seances' then r.seances
  end;
  if v_forced is not null then
    return v_forced;
  end if;

  if p_section = 'maison' then
    return private.has_p3_subscription(p_parent);          -- 067b
  end if;

  if p_section in ('bilan', 'seances') then
    return private.parent_access_unlocked(p_parent);
  end if;

  return false;
end;
$$;

revoke execute on function private.parent_section_access(uuid, text) from public, anon;
grant execute on function private.parent_section_access(uuid, text) to authenticated;

-- Maison : les policies gate_parent_p3_* (064) appellent déjà cette fonction.
create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.parent_section_access(p_parent, 'maison');
$$;

-- ── 3) Gardes Bilan / Mes séances ────────────────────────────────────────────
drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_section_access((select auth.uid()), 'bilan'))
         or (select private.parent_section_access((select auth.uid()), 'seances')));

drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_section_access((select auth.uid()), 'bilan'))
         or (select private.parent_section_access((select auth.uid()), 'seances')));

-- ── 4) access_state() : + program_pack / bilan_access / seances_access ──────
-- Mêmes clés qu'avant (rétrocompatible) ; p3_access suit désormais les réglages.
create or replace function public.access_state()
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := private.jwt_role();
  v_has_child boolean;
  v_has_confirmed boolean;
  v_coach_ok boolean;
  v_fitness boolean;
  v_subscribed boolean;
  v_pack text;
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  -- Coach / Admin / Super Admin / Enfant : pas de cycle d'activation ni de paywall
  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role,
      'unlocked', true,
      'has_child', true,
      'has_confirmed_child', true,
      'coach_validated', true,
      'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false,
      'p3_access', true,
      'program_pack', null,
      'bilan_access', true,
      'seances_access', true
    );
  end if;

  select
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active),
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  -- Co-parent (066) : l'activation du titulaire de la famille compte.
  select coalesce(p.coach_validated, false)
      or exists (
        select 1 from family_members m
        join families f on f.id = m.family_id
        join profiles owner on owner.id = f.parent_id
        where m.profile_id = v_uid and coalesce(owner.coach_validated, false)
      )
  into v_coach_ok
  from profiles p where p.id = v_uid;

  v_subscribed := private.has_p3_subscription(v_uid);

  select program_pack into v_pack from parent_access where parent_id = v_uid;

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and coalesce(v_coach_ok, false),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', coalesce(v_coach_ok, false),
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', private.parent_section_access(v_uid, 'maison'),
    'program_pack', v_pack,
    'bilan_access', private.parent_section_access(v_uid, 'bilan'),
    'seances_access', private.parent_section_access(v_uid, 'seances')
  );
end;
$$;

revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;

-- ── 5) Vue admin : réglages + droit automatique + droit effectif ─────────────
create or replace function public.admin_parent_access_list()
returns table (
  parent_id      uuid,
  program_pack   text,
  maison         boolean,
  bilan          boolean,
  seances        boolean,
  note           text,
  coach_unlocked boolean,
  p3_subscribed  boolean,
  auto_maison    boolean,
  auto_bilan     boolean,
  auto_seances   boolean,
  eff_maison     boolean,
  eff_bilan      boolean,
  eff_seances    boolean
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  with base as (
    select
      p.id as pid,
      a.program_pack as pk,
      a.maison as fm, a.bilan as fb, a.seances as fs,
      a.note as nt,
      private.parent_access_unlocked(p.id) as unl,
      private.has_p3_subscription(p.id) as sub
    from profiles p
    left join parent_access a on a.parent_id = p.id
    where p.role = 'PARENT'
  )
  select
    pid, pk, fm, fb, fs, nt, unl, sub,
    sub,
    unl,
    unl,
    coalesce(fm, sub),
    coalesce(fb, unl),
    coalesce(fs, unl)
  from base;
end;
$$;

revoke execute on function public.admin_parent_access_list() from public, anon;
grant execute on function public.admin_parent_access_list() to authenticated;

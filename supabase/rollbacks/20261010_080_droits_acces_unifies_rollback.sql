-- ─────────────────────────────────────────────────────────────────────────────
-- Retour arrière de 080 : rend le calcul de 068 / 070 / 075 (Maison = abonnement
-- ou pack ; Bilan / Séances = activation coach ; forçages dans parent_access).
--
-- Avant de supprimer les nouvelles tables, les packs EN COURS et les overrides
-- ACTIFS sont recopiés dans parent_access pour ne fermer l'accès de personne.
-- Le journal d'audit est exporté dans la note admin la plus récente, puis supprimé.
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- 1) Données → parent_access
insert into public.parent_access (parent_id, program_pack, note)
select distinct on (e.parent_id) e.parent_id, e.pack, 'Repris de pack_enrollments (rollback 080)'
from public.pack_enrollments e
where e.starts_on <= (now() at time zone 'America/Toronto')::date
  and (e.ends_on is null or e.ends_on >= (now() at time zone 'America/Toronto')::date)
order by e.parent_id, e.starts_on desc
on conflict (parent_id) do update set program_pack = excluded.program_pack;

update public.parent_access a set program_pack = null
where not exists (
  select 1 from public.pack_enrollments e
  where e.parent_id = a.parent_id
    and e.starts_on <= (now() at time zone 'America/Toronto')::date
    and (e.ends_on is null or e.ends_on >= (now() at time zone 'America/Toronto')::date));

insert into public.parent_access (parent_id) select distinct o.user_id from public.access_overrides o
where o.revoque_le is null and (o.expire_le is null or o.expire_le > now())
on conflict (parent_id) do nothing;
update public.parent_access a set
  maison  = (select o.etat = 'ouvert' from public.access_overrides o where o.user_id = a.parent_id and o.section = 'maison'
             and o.revoque_le is null and (o.expire_le is null or o.expire_le > now()) order by o.cree_le desc limit 1),
  bilan   = (select o.etat = 'ouvert' from public.access_overrides o where o.user_id = a.parent_id and o.section = 'bilan'
             and o.revoque_le is null and (o.expire_le is null or o.expire_le > now()) order by o.cree_le desc limit 1),
  seances = (select o.etat = 'ouvert' from public.access_overrides o where o.user_id = a.parent_id and o.section = 'seances'
             and o.revoque_le is null and (o.expire_le is null or o.expire_le > now()) order by o.cree_le desc limit 1);

grant insert, update, delete on public.parent_access to authenticated;
comment on table public.parent_access is
  'Pack THRIVE et forçages d''accès par section (Maison / Bilan / Mes séances), réglés par Admin / Super Admin.';

-- 2) Synchro 075
create trigger trg_sync_family_pack_from_program_pack
  after insert or update of program_pack on public.parent_access
  for each row execute function private.sync_family_pack_from_program_pack();
create trigger trg_sync_program_pack_from_family_pack
  after update of pack on public.families
  for each row execute function private.sync_program_pack_from_family_pack();

-- 3) RLS d'avant
do $$
declare t text;
begin
  foreach t in array array['questionnaires', 'athlete_identity', 'athlete_objectives', 'athlete_next_steps',
                           'athlete_documents', 'focus_word_history', 'emotion_logs', 'skill_scores',
                           'progress_log', 'perma_scores', 'coach_reports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists gate_parent_bilan_%1$s on public.%1$I', t);
    end if;
  end loop;
end $$;

create or replace function private.can_view_child_bilan(p_child uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.can_edit_child_bilan(p_child) or private.is_parent_of_child(p_child);
$$;

do $$
begin
  if to_regclass('public.home_card_moments') is not null then
    drop policy if exists gate_parent_home_card_moments on public.home_card_moments;
    create policy gate_parent_home_card_moments on public.home_card_moments
      as restrictive for all to authenticated
      using ((select private.jwt_role()) <> 'PARENT'
             or ((select private.parent_access_unlocked((select auth.uid())))
                 and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)))
      with check ((select private.jwt_role()) <> 'PARENT'
             or ((select private.parent_access_unlocked((select auth.uid())))
                 and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
  end if;
end $$;

drop policy if exists gate_parent_video_runs_write on public.video_session_runs;
drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));

-- 4) Fonctions d'avant (075 / 070 / 068)
create or replace function private.parent_section_access(p_parent uuid, p_section text)
returns boolean language plpgsql stable security definer
set search_path = public
as $$
declare
  r parent_access%rowtype;
  v_forced boolean;
begin
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
    -- Abonnement Maison (propre ou partagé co-parent), OU inscrit à un pack
    -- (le sien ou celui du titulaire de sa famille, pour le co-parent).
    return private.has_p3_subscription(p_parent)
        or r.program_pack is not null
        or exists (
          select 1
          from family_members m
          join families f on f.id = m.family_id
          join parent_access a on a.parent_id = f.parent_id
          where m.profile_id = p_parent and a.program_pack is not null
        );
  end if;

  if p_section in ('bilan', 'seances') then
    return private.parent_access_unlocked(p_parent);
  end if;

  return false;
end;
$$;

revoke execute on function private.parent_section_access(uuid, text) from public, anon;
grant execute on function private.parent_section_access(uuid, text) to authenticated;

create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.parent_section_access(p_parent, 'maison');
$$;

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
  v_level text;
  v_maison boolean;
  v_bilan boolean;
  v_seances boolean;
  r parent_access%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role, 'unlocked', true, 'has_child', true, 'has_confirmed_child', true,
      'coach_validated', true, 'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false, 'p3_access', true,
      'program_pack', null, 'bilan_access', true, 'seances_access', true,
      'sections', jsonb_build_object('maison', true, 'bilan', true, 'seances', true),
      'bilan_level', 'PERFORMANCE',
      'is_staff', v_role in ('COACH', 'ADMIN', 'SUPER_ADMIN'),
      'forced', jsonb_build_object('maison', null, 'bilan', null, 'seances', null)
    );
  end if;

  select
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active),
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

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

  select * into r from parent_access where parent_id = v_uid;
  v_pack := r.program_pack;

  -- Niveau de bilan = meilleur pack parmi les familles du parent.
  select f.pack into v_level
  from families f
  where private.is_family_parent(f.id)
  order by case f.pack when 'PERFORMANCE' then 3 when 'AVANCE' then 2 else 1 end desc
  limit 1;

  v_maison  := private.parent_section_access(v_uid, 'maison');
  v_bilan   := private.parent_section_access(v_uid, 'bilan');
  v_seances := private.parent_section_access(v_uid, 'seances');

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and coalesce(v_coach_ok, false),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', coalesce(v_coach_ok, false),
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', v_maison,
    'program_pack', v_pack,
    'bilan_access', v_bilan,
    'seances_access', v_seances,
    'sections', jsonb_build_object('maison', v_maison, 'bilan', v_bilan, 'seances', v_seances),
    'bilan_level', coalesce(v_level, 'ESSENTIEL'),
    'is_staff', false,
    'forced', jsonb_build_object('maison', r.maison, 'bilan', r.bilan, 'seances', r.seances)
  );
end;
$$;
revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;

drop function if exists public.admin_parent_access_list();
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
    (sub or pk is not null),
    unl,
    unl,
    coalesce(fm, sub or pk is not null),
    coalesce(fb, unl),
    coalesce(fs, unl)
  from base;
end;
$$;

revoke execute on function public.admin_parent_access_list() from public, anon;
grant execute on function public.admin_parent_access_list() to authenticated;

-- 5) Objets 080
drop function if exists public.admin_parent_access_detail(uuid);
drop function if exists public.admin_set_pack(uuid, text, date, date, text);
drop function if exists public.admin_end_pack(uuid, date, text);
drop function if exists public.admin_set_access_override(uuid, text, text, text, timestamptz);
drop function if exists public.admin_revoke_access_override(uuid, text);
drop function if exists public.admin_set_access_parameter(text, jsonb, text);
drop function if exists private.require_super_admin();
drop function if exists private.require_reason(text);
drop function if exists private.parent_section_writable(uuid, text);
drop trigger if exists trg_bump_billing_subscriptions on public.billing_subscriptions;
drop table if exists public.access_versions;
drop table if exists public.access_overrides;
drop table if exists public.pack_enrollments;
drop table if exists public.access_audit_log;
drop table if exists public.access_parameters;
drop function if exists private.access_compute(uuid);
drop function if exists private.access_param(text, jsonb);
drop function if exists private.bump_access_version_trigger();
drop function if exists private.bump_access_version(uuid);
drop function if exists private.audit_access_change();
drop function if exists private.guard_access_overrides();

reset lock_timeout;

-- ROLLBACK de 20261006_068_parent_section_access.sql
-- Restaure l'état de production relevé le 2026-10-08 (067b + 066 co-parents).
-- À exécuter AVANT toute donnée utile dans parent_access (la table est supprimée).

drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT' or (select private.parent_access_unlocked((select auth.uid()))));
drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT' or (select private.parent_access_unlocked((select auth.uid()))));

create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.has_p3_subscription(p_parent);
$$;

comment on function private.parent_p3_access(uuid) is
  'Accès Maison (tables p3_*) d''un parent : abonnement P3 actif uniquement (migration 067).';

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
      'p3_subscribed', false, 'p3_access', true
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

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and coalesce(v_coach_ok, false),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', coalesce(v_coach_ok, false),
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', v_subscribed
  );
end;
$$;

revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;
revoke execute on function private.parent_p3_access(uuid) from public, anon;
grant execute on function private.parent_p3_access(uuid) to authenticated;

drop function if exists public.admin_parent_access_list();
drop function if exists private.parent_section_access(uuid, text);
drop trigger if exists trg_parent_access_touch on public.parent_access;
drop function if exists private.touch_parent_access();
drop table if exists public.parent_access;

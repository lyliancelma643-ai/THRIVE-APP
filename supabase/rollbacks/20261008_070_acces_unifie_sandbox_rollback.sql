-- ROLLBACK de 20261008_070_acces_unifie_sandbox.sql
-- Restaure parent_access_unlocked (prod), has_p3_subscription (066d) et access_state (068 corrigée).
create or replace function private.parent_access_unlocked(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.coach_validated from profiles p where p.id = p_parent), false)
     and exists (
       select 1 from children c
       join families f on f.id = c.family_id
       where f.parent_id = p_parent
         and c.is_active
         and c.validation_status = 'CONFIRMED'
     );
$$;

create or replace function private.has_p3_subscription(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select
    (auth.uid() is null or auth.uid() = p_user or private.is_admin())
    and exists (
      select 1
      from billing_subscriptions s
      where s.active
        and (s.expires_at is null or s.expires_at > now())
        and (
          s.user_id = p_user
          or s.user_id in (
            select f.parent_id
            from families f
            where (
              select m.profile_id
              from family_members m
              where m.family_id = f.id
                and m.profile_id <> f.parent_id
                and m.member_role <> 'OWNER'
              order by m.created_at, m.id
              limit 1
            ) = p_user
          )
        )
    );
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


drop function if exists private.is_qa_account(uuid);
drop table if exists public.qa_accounts;

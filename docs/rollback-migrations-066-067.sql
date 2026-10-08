-- Retour arrière des migrations 066 (accès co-parents) et 067 (sport par défaut).
-- Définitions relevées en production juste avant l'application (2 octobre 2026).
-- À exécuter seulement en cas de problème constaté après 066 / 067.

-- 067
alter table public.athlete_identity alter column sport set default 'Hockey sur glace';

-- 066 — politiques ajoutées
drop policy if exists children_family_member_read on public.children;
drop policy if exists families_member_read on public.families;

-- 066 — politiques remplacées
drop policy if exists entitlements_family_read on public.entitlements;
create policy entitlements_family_read on public.entitlements for select to authenticated
  using (exists (select 1 from families f where f.id = entitlements.family_id
                 and (f.parent_id = (select auth.uid()) or private.is_admin())));
drop policy if exists questionnaires_parent_read on public.questionnaires;
create policy questionnaires_parent_read on public.questionnaires for select to authenticated
  using (exists (select 1 from children c join families f on f.id = c.family_id
                 where c.id = questionnaires.child_id and f.parent_id = (select auth.uid())));
drop policy if exists family_streaks_read on public.family_streaks;
create policy family_streaks_read on public.family_streaks for select to authenticated
  using ((exists (select 1 from families f where f.id = family_streaks.family_id
                  and f.parent_id = (select auth.uid()))) or (select private.is_admin()));
drop policy if exists family_status_read on public.family_status;
create policy family_status_read on public.family_status for select to authenticated
  using ((exists (select 1 from families f where f.id = family_status.family_id
                  and f.parent_id = (select auth.uid()))) or (select private.is_admin()));

-- 066 — fonctions
create or replace function private.is_parent_of_child(p_child uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  SELECT EXISTS (SELECT 1 FROM children c JOIN families f ON f.id = c.family_id WHERE c.id = p_child AND f.parent_id = auth.uid());
$function$;

create or replace function private.is_parent_of_program(p_program uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN children c ON c.id = pe.child_id
    JOIN families f ON f.id = c.family_id WHERE pe.program_id = p_program AND f.parent_id = auth.uid());
$function$;

create or replace function private.is_my_childs_coach(p_profile uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$ select exists (select 1 from public.coach_assignments ca join public.children c on c.id = ca.child_id join public.families f on f.id = c.family_id where ca.coach_id = p_profile and ca.is_active and f.parent_id = auth.uid()); $function$;

create or replace function private.parent_has_feature(p_feature text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select coalesce((
    select (p.features ->> p_feature)::boolean
    from public.families f
    join public.plans p on p.code = f.pack
    where f.parent_id = auth.uid()
    limit 1
  ), false);
$function$;

create or replace function public.access_state()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
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
  select coalesce(enabled, false) into v_fitness from app_settings where key = 'fitness_enabled';
  if v_role <> 'PARENT' then
    return jsonb_build_object('role', v_role, 'unlocked', true, 'has_child', true,
      'has_confirmed_child', true, 'coach_validated', true,
      'fitness_enabled', coalesce(v_fitness, false), 'p3_subscribed', false, 'p3_access', true);
  end if;
  select
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active),
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;
  select coalesce(coach_validated, false) into v_coach_ok from profiles where id = v_uid;
  v_subscribed := private.has_p3_subscription(v_uid);
  return jsonb_build_object('role', v_role, 'unlocked', v_has_confirmed and v_coach_ok,
    'has_child', v_has_child, 'has_confirmed_child', v_has_confirmed,
    'coach_validated', v_coach_ok, 'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed, 'p3_access', (v_has_confirmed and v_coach_ok) or v_subscribed);
end;
$function$;

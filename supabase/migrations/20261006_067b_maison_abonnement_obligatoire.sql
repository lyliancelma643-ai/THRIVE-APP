-- ════════════════════════════════════════════════════════════════════════════
-- 20261006_067b_maison_abonnement_obligatoire.sql
-- RÉCONCILIATION : migration DÉJÀ APPLIQUÉE en production (THRIVE-CA) le
-- 6 octobre 2026 sous le nom « maison_abonnement_obligatoire_067 »
-- (version 20261006181419), mais absente de toutes les branches GitHub.
-- Texte recopié tel quel depuis supabase_migrations.schema_migrations le
-- 8 octobre 2026. Ne pas la réappliquer en prod.
--
-- Effet : l'accès Maison (tables p3_*) exige un abonnement P3 actif ;
-- access_state().p3_access = abonnement uniquement.
-- ─────────────────────────────────────────────────────────────────────────────

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

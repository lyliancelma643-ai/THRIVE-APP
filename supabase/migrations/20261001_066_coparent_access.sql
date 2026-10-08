-- ─────────────────────────────────────────────────────────────────────────────
-- 066 — Co-parents : accès en lecture à toute la famille
--
-- « + Ajouter un parent » (espace parent) crée un compte PARENT et l'inscrit
-- dans family_members. Jusqu'ici la plupart des règles d'accès ne regardaient
-- que families.parent_id (le parent qui a créé la famille) : un co-parent se
-- connectait sur un espace vide (aucun enfant, aucune séance, compte « en
-- préparation » pour toujours).
--
-- Cette migration aligne les helpers et les politiques de LECTURE sur
-- private.is_family_parent() (déjà utilisé par la messagerie), qui reconnaît
-- le parent principal ET les membres de family_members.
--
-- Ce qui ne change pas : les écritures sensibles (fiche enfant, famille,
-- membres) restent réservées au parent principal et aux admins ; aucune
-- donnée ne devient visible hors de la famille.
--
-- Appliquée en production le 2 octobre 2026 en trois parties (historique
-- Supabase : 066a_coparent_helpers, 066b_coparent_access_state,
-- 066c_coparent_read_policies ; les politiques remplacées l'ont été par
-- ALTER POLICY, même effet). Vérifié : état d'accès des parents existants
-- inchangé, chaque parent ne lit que les enfants de sa famille.
-- Retour arrière : docs/rollback-migrations-066-067.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helpers ------------------------------------------------------------------

-- Parent (principal ou co-parent) de l'enfant.
create or replace function private.is_parent_of_child(p_child uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.children c
    where c.id = p_child and private.is_family_parent(c.family_id)
  );
$$;

create or replace function private.is_parent_of_program(p_program uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.program_enrollments pe
    join public.children c on c.id = pe.child_id
    where pe.program_id = p_program and private.is_family_parent(c.family_id)
  );
$$;

create or replace function private.is_my_childs_coach(p_profile uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.coach_assignments ca
    join public.children c on c.id = ca.child_id
    where ca.coach_id = p_profile and ca.is_active and private.is_family_parent(c.family_id)
  );
$$;

create or replace function private.parent_has_feature(p_feature text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce((
    select (p.features ->> p_feature)::boolean
    from public.families f
    join public.plans p on p.code = f.pack
    where private.is_family_parent(f.id)
    order by (f.parent_id = auth.uid()) desc
    limit 1
  ), false);
$$;

-- 2. État d'accès : un co-parent hérite de l'activation de sa famille ---------
create or replace function public.access_state()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
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
      'role', v_role,
      'unlocked', true,
      'has_child', true,
      'has_confirmed_child', true,
      'coach_validated', true,
      'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false,
      'p3_access', true
    );
  end if;

  select
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active),
    exists (select 1 from children c
            where private.is_family_parent(c.family_id) and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  -- Validation par le coach : celle du compte, ou celle du parent principal
  -- d'une famille dont on est co-parent.
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
    'p3_access', (v_has_confirmed and coalesce(v_coach_ok, false)) or v_subscribed
  );
end;
$$;

-- 3. Politiques de lecture ----------------------------------------------------

drop policy if exists children_family_member_read on public.children;
create policy children_family_member_read on public.children
  for select to authenticated
  using (private.is_family_parent(family_id));

drop policy if exists families_member_read on public.families;
create policy families_member_read on public.families
  for select to authenticated
  using (private.is_family_parent(id));

drop policy if exists questionnaires_parent_read on public.questionnaires;
create policy questionnaires_parent_read on public.questionnaires
  for select to authenticated
  using (private.is_parent_of_child(child_id));

drop policy if exists entitlements_family_read on public.entitlements;
create policy entitlements_family_read on public.entitlements
  for select to authenticated
  using (private.is_family_parent(family_id) or private.is_admin());

drop policy if exists family_status_read on public.family_status;
create policy family_status_read on public.family_status
  for select to authenticated
  using (private.is_family_parent(family_id) or (select private.is_admin()));

drop policy if exists family_streaks_read on public.family_streaks;
create policy family_streaks_read on public.family_streaks
  for select to authenticated
  using (private.is_family_parent(family_id) or (select private.is_admin()));

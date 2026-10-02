-- ─────────────────────────────────────────────────────────────────────────────
-- 20261002_066_coparent_access.sql
-- Accès des CO-PARENTS aux enfants de la famille.
--
-- Contexte : un parent invite un co-parent depuis /parent/select-profile
-- (admin-create-user + ligne family_members 'PARENT'). Jusqu'ici, les règles
-- d'accès ne reconnaissaient que le titulaire (families.parent_id) : le
-- co-parent ne voyait aucun enfant, alors que l'offre promet « Accès pour les
-- deux parents ».
--
-- Principe : UNE définition de « parent de la famille » — le titulaire OU un
-- membre family_members de rôle OWNER/PARENT — portée par
-- private.is_family_member(), puis réutilisée par les fonctions existantes.
-- Comme la quasi-totalité des politiques passe par private.is_parent_of_child()
-- (séances, bilans, jauges, LSSS/EPOCH, documents, photos, Maison P3…), les
-- redéfinir ouvre ces données au co-parent sans toucher à chaque politique.
-- Les politiques écrites en dur sur families.parent_id sont réécrites.
--
-- Hors champ, volontairement :
--   • SUPERVISOR : rôle prévu par le schéma mais jamais créé par l'app ; il ne
--     reçoit pas les droits parent (décision à prendre le jour où il existera).
--   • Mise à jour de la famille (nom, forfait) et invitation de membres :
--     titulaire seul (politiques families_parent_update, family_members_owner_*).
--   • video_session_runs : chaque parent garde ses propres visionnages.
--   • Notifications : toujours adressées au titulaire (triggers notify_on_*).
--
-- Idempotente (create or replace / drop policy if exists). Signatures, modes
-- SECURITY DEFINER et search_path des fonctions remplacées : inchangés.
-- Test : supabase/tests/rls/README.md.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Familles dont l'utilisateur est parent (titulaire ou membre OWNER/PARENT)
create or replace function private.parent_family_ids(p_user uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select f.id from public.families f where f.parent_id = p_user
  union
  select m.family_id from public.family_members m
   where m.profile_id = p_user and m.member_role in ('OWNER', 'PARENT');
$$;

create or replace function private.is_family_member(p_family uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_family is not null
     and p_family in (select private.parent_family_ids(auth.uid()));
$$;

revoke all on function private.parent_family_ids(uuid) from public, anon;
revoke all on function private.is_family_member(uuid) from public, anon;
grant execute on function private.parent_family_ids(uuid) to authenticated, service_role;
grant execute on function private.is_family_member(uuid) to authenticated, service_role;

-- 2) Fonctions existantes : même signature, définition étendue aux co-parents
create or replace function private.is_parent_of_child(p_child uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.children c
     where c.id = p_child
       and c.family_id in (select private.parent_family_ids(auth.uid()))
  );
$$;

create or replace function private.is_parent_of_program(p_program uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.program_enrollments pe
      join public.children c on c.id = pe.child_id
     where pe.program_id = p_program
       and c.family_id in (select private.parent_family_ids(auth.uid()))
  );
$$;

create or replace function private.is_my_childs_coach(p_profile uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_assignments ca
      join public.children c on c.id = ca.child_id
     where ca.coach_id = p_profile and ca.is_active
       and c.family_id in (select private.parent_family_ids(auth.uid()))
  );
$$;

-- Forfait : celui de la famille du titulaire en priorité, puis des familles rejointes.
create or replace function private.parent_has_feature(p_feature text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (p.features ->> p_feature)::boolean
      from public.families f
      join public.plans p on p.code = f.pack
     where f.id in (select private.parent_family_ids(auth.uid()))
     order by (f.parent_id = auth.uid()) desc, f.created_at
     limit 1
  ), false);
$$;

-- Accès « activé par le coach » : la validation porte sur le TITULAIRE de la
-- famille (le co-parent n'a pas de validation propre). Pour un titulaire, le
-- résultat est identique à la version précédente.
create or replace function private.parent_access_unlocked(p_parent uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.families f
      join public.profiles owner on owner.id = f.parent_id
     where f.id in (select private.parent_family_ids(p_parent))
       and owner.coach_validated
       and exists (select 1 from public.children c
                    where c.family_id = f.id and c.is_active
                      and c.validation_status = 'CONFIRMED')
  );
$$;

-- Abonnement Maison : le sien ou celui du titulaire d'une famille rejointe
-- (membres OWNER/PARENT, comme le reste des droits parent).
create or replace function private.has_p3_subscription(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.billing_subscriptions s
     where s.active
       and (s.expires_at is null or s.expires_at > now())
       and (s.user_id = p_user
            or s.user_id in (select f.parent_id from public.families f
                              where f.id in (select private.parent_family_ids(p_user))))
  );
$$;

-- 3) État d'accès affiché par l'app (mêmes clés JSON qu'avant)
create or replace function public.access_state()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
      'p3_subscribed', false, 'p3_access', true);
  end if;

  select
    exists (select 1 from children c
             where c.family_id in (select private.parent_family_ids(v_uid)) and c.is_active),
    exists (select 1 from children c
             where c.family_id in (select private.parent_family_ids(v_uid)) and c.is_active
               and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  -- Validation coach : celle du titulaire d'une des familles du parent.
  select exists (select 1 from families f join profiles owner on owner.id = f.parent_id
                  where f.id in (select private.parent_family_ids(v_uid)) and owner.coach_validated)
    into v_coach_ok;

  v_subscribed := private.has_p3_subscription(v_uid);

  return jsonb_build_object(
    'role', v_role,
    'unlocked', private.parent_access_unlocked(v_uid),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', v_coach_ok,
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', private.parent_access_unlocked(v_uid) or v_subscribed
  );
end;
$$;

-- 4) Politiques écrites en dur sur families.parent_id
drop policy if exists families_select_policy on public.families;
create policy families_select_policy on public.families for select to authenticated
  using (((select auth.uid()) = parent_id) or private.is_family_member(id)
         or private.is_admin() or private.is_coach_of_family(id));

-- Lecture ET écriture des fiches enfants (ajout, passeport) pour les deux parents ;
-- le quota du forfait reste garanti par trg_enforce_children_quota.
drop policy if exists children_parent_own on public.children;
create policy children_parent_own on public.children for all to authenticated
  using (private.is_family_member(family_id) or private.is_admin())
  with check (private.is_family_member(family_id) or private.is_admin());

-- Chaque parent voit les autres membres de sa famille (liste « parents »).
drop policy if exists family_members_read on public.family_members;
create policy family_members_read on public.family_members for select to authenticated
  using ((profile_id = (select auth.uid())) or private.is_family_member(family_id)
         or private.is_admin_or_super());

drop policy if exists questionnaires_parent_read on public.questionnaires;
create policy questionnaires_parent_read on public.questionnaires for select to authenticated
  using (private.is_parent_of_child(child_id));

drop policy if exists entitlements_family_read on public.entitlements;
create policy entitlements_family_read on public.entitlements for select to authenticated
  using (private.is_family_member(family_id) or private.is_admin());

drop policy if exists family_status_read on public.family_status;
create policy family_status_read on public.family_status for select to authenticated
  using (private.is_family_member(family_id) or (select private.is_admin()));

drop policy if exists family_streaks_read on public.family_streaks;
create policy family_streaks_read on public.family_streaks for select to authenticated
  using (private.is_family_member(family_id) or (select private.is_admin()));

-- 5) Quota de comptes parents : un abonnement Maison inclut « l'accès pour les
--    deux parents ». Sans cela, une famille au forfait ESSENTIEL (max 1 compte
--    parent, titulaire compris) ne pouvait inviter personne malgré l'offre.
--    Les forfaits plus généreux (AVANCE : 2, PERFORMANCE : illimité) restent.
create or replace function public.enforce_family_members_quota()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pack  text;
  v_owner uuid;
  v_max   int;
  v_count int;
begin
  if auth.uid() is null or private.is_admin_or_super() then return new; end if;
  select f.pack, f.parent_id into v_pack, v_owner from public.families f where f.id = new.family_id;
  select (p.limits ->> 'maxParents')::int into v_max from public.plans p where p.code = v_pack;
  if v_max is not null and private.has_p3_subscription(v_owner) then
    v_max := greatest(v_max, 2);
  end if;
  if v_max is not null then
    select count(*) into v_count from public.family_members m where m.family_id = new.family_id;
    if v_count >= v_max then
      raise exception 'Quota de comptes parents atteint pour le forfait % (max %). Passez à un forfait supérieur.', v_pack, v_max
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

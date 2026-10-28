-- ─────────────────────────────────────────────────────────────────────────────
-- Retour arrière de 084 (comptes inactifs sans accès). Idempotent.
-- Remet les corps de production d'avant 084 (catalogue THRIVE-CA, 2026-10-27) :
-- les comptes désactivés retrouvent leurs droits jusqu'à l'expiration du JWT.
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path to 'public' as $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'));
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'SUPER_ADMIN');
$$;

create or replace function private.is_admin_or_super()
returns boolean language sql stable set search_path to 'public' as $$
  select private.jwt_role() in ('ADMIN', 'SUPER_ADMIN');
$$;

create or replace function private.is_super_admin_jwt()
returns boolean language sql stable set search_path to 'public' as $$
  select private.jwt_role() = 'SUPER_ADMIN';
$$;

create or replace function private.is_assigned_coach(p_child uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca WHERE ca.child_id = p_child AND ca.coach_id = auth.uid() AND ca.is_active);
$$;

create or replace function private.is_program_coach_of_child(p_child uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN programs pr ON pr.id = pe.program_id JOIN coach_assignments ca ON ca.child_id = pe.child_id AND ca.coach_id = pr.coach_id AND ca.is_active WHERE pe.child_id = p_child AND pr.coach_id = auth.uid());
$$;

create or replace function private.is_admin_of_child(p_child uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.admin_coach_supervision s join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active where s.admin_id = auth.uid() and s.is_active and ca.child_id = p_child);
$$;

create or replace function private.is_coach_of_family(p_family uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  SELECT EXISTS (SELECT 1 FROM coach_assignments ca JOIN children c ON c.id = ca.child_id WHERE c.family_id = p_family AND ca.coach_id = auth.uid() AND ca.is_active);
$$;

create or replace function private.is_supervisor_of_coach(p_coach uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.admin_coach_supervision s where s.admin_id = auth.uid() and s.coach_id = p_coach and s.is_active);
$$;

create or replace function private.is_my_supervisor(p_profile uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.admin_coach_supervision s where s.admin_id = p_profile and s.coach_id = auth.uid() and s.is_active);
$$;

create or replace function private.is_family_parent(p_family uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select p_family is not null and (
    exists (select 1 from public.families f where f.id = p_family and f.parent_id = auth.uid())
    or exists (select 1 from public.family_members m where m.family_id = p_family and m.profile_id = auth.uid())
  );
$$;

-- Policies restrictives « compte_actif_requis » (avant la fonction qu'elles appellent).
do $$
declare t text;
begin
  for t in
    select distinct tablename from pg_policies
    where schemaname = 'public' and policyname = 'compte_actif_requis'
  loop
    execute format('drop policy if exists compte_actif_requis on public.%I', t);
  end loop;
end $$;

-- is_parent_of_child : le corps 066 (via is_family_parent) est conservé tel quel.

-- Plus rien n'en dépend après les remplacements ci-dessus.
drop function if exists private.caller_is_active();

-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — Partie 5 : hiérarchie RBAC à 3 niveaux avec héritage.
--   COACH       : édite le bilan/outils de SES athlètes assignés uniquement.
--   ADMIN       : hérite des permissions coach pour les athlètes des coachs
--                 qu'il supervise (table admin_coach_supervision).
--   SUPER_ADMIN : accès total + assigne les coachs aux admins.
-- Backfill de transition : chaque ADMIN existant supervise tous les coachs
-- actuels (le super admin peut ensuite réassigner librement).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Table de supervision admin ↔ coach
create table if not exists public.admin_coach_supervision (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (admin_id, coach_id)
);
create index if not exists idx_supervision_admin on public.admin_coach_supervision(admin_id) where is_active;
create index if not exists idx_supervision_coach on public.admin_coach_supervision(coach_id) where is_active;

-- 2) Helpers (schema private, SECURITY DEFINER : évite la récursion RLS)
create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'SUPER_ADMIN');
$$;

create or replace function private.is_supervisor_of_coach(p_coach uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1 from public.admin_coach_supervision s
    where s.admin_id = auth.uid() and s.coach_id = p_coach and s.is_active
  );
$$;

-- L'admin appelant supervise-t-il un coach actif de cet enfant ?
create or replace function private.is_admin_of_child(p_child uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1
    from public.admin_coach_supervision s
    join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active
    where s.admin_id = auth.uid() and s.is_active and ca.child_id = p_child
  );
$$;

-- Droit d'ÉDITION du dossier bilan d'un enfant (hiérarchie complète)
create or replace function private.can_edit_child_bilan(p_child uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select private.is_super_admin()
      or private.is_admin_of_child(p_child)
      or private.is_assigned_coach(p_child)
      or private.is_program_coach_of_child(p_child);
$$;

-- Droit de LECTURE du dossier (édition + parent de l'enfant)
create or replace function private.can_view_child_bilan(p_child uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select private.can_edit_child_bilan(p_child) or private.is_parent_of_child(p_child);
$$;

-- Le profil consulté est-il le coach d'un de mes enfants ? (affichage « Coach
-- affilié » sur le Bilan parent)
create or replace function private.is_my_childs_coach(p_profile uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1
    from public.coach_assignments ca
    join public.children c on c.id = ca.child_id
    join public.families f on f.id = c.family_id
    where ca.coach_id = p_profile and ca.is_active and f.parent_id = auth.uid()
  );
$$;

-- Le profil consulté est-il mon admin superviseur ? (affichage côté coach)
create or replace function private.is_my_supervisor(p_profile uuid)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1 from public.admin_coach_supervision s
    where s.admin_id = p_profile and s.coach_id = auth.uid() and s.is_active
  );
$$;

-- 3) RLS sur la supervision
alter table public.admin_coach_supervision enable row level security;

drop policy if exists supervision_super_admin_all on public.admin_coach_supervision;
create policy supervision_super_admin_all on public.admin_coach_supervision
  for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists supervision_admin_read on public.admin_coach_supervision;
create policy supervision_admin_read on public.admin_coach_supervision
  for select to authenticated using (admin_id = (select auth.uid()));

drop policy if exists supervision_coach_read on public.admin_coach_supervision;
create policy supervision_coach_read on public.admin_coach_supervision
  for select to authenticated using (coach_id = (select auth.uid()));

-- 4) Backfill de transition : chaque admin actuel supervise tous les coachs
insert into public.admin_coach_supervision (admin_id, coach_id, assigned_by)
select a.id, c.id, (select id from public.profiles where role = 'SUPER_ADMIN' order by created_at limit 1)
from public.profiles a
cross join public.profiles c
where a.role = 'ADMIN' and c.role = 'COACH'
on conflict (admin_id, coach_id) do nothing;

-- 5) Lecture de profils nécessaire aux nouveaux écrans
drop policy if exists profiles_read_my_childs_coach on public.profiles;
create policy profiles_read_my_childs_coach on public.profiles
  for select to authenticated using (private.is_my_childs_coach(id));

drop policy if exists profiles_read_my_supervisor on public.profiles;
create policy profiles_read_my_supervisor on public.profiles
  for select to authenticated using (private.is_my_supervisor(id));

-- 6) athlete_identity : écriture alignée sur la hiérarchie (admin limité à ses
--    coachs supervisés, super admin illimité). Lecture : dossier + parent.
drop policy if exists athlete_identity_insert on public.athlete_identity;
create policy athlete_identity_insert on public.athlete_identity
  for insert to authenticated with check (private.can_edit_child_bilan(child_id));

drop policy if exists athlete_identity_update on public.athlete_identity;
create policy athlete_identity_update on public.athlete_identity
  for update to authenticated
  using (private.can_edit_child_bilan(child_id))
  with check (private.can_edit_child_bilan(child_id));

drop policy if exists athlete_identity_delete on public.athlete_identity;
create policy athlete_identity_delete on public.athlete_identity
  for delete to authenticated using (private.can_edit_child_bilan(child_id));

drop policy if exists athlete_identity_read on public.athlete_identity;
create policy athlete_identity_read on public.athlete_identity
  for select to authenticated using (private.can_view_child_bilan(child_id));

-- 7) sessions : le coach ASSIGNÉ peut gérer les séances de son athlète même si
--    le programme a été créé par un autre coach (statut, notes, replanif).
drop policy if exists sessions_assigned_coach_all on public.sessions;
create policy sessions_assigned_coach_all on public.sessions
  for all to authenticated
  using (private.is_assigned_coach(child_id) or private.is_admin_of_child(child_id) or private.is_super_admin())
  with check (private.is_assigned_coach(child_id) or private.is_admin_of_child(child_id) or private.is_super_admin());

-- 8) Les enfants supervisés doivent être visibles de leur admin même sans
--    passer par is_admin() global (utile si on resserre plus tard).
drop policy if exists children_supervising_admin_read on public.children;
create policy children_supervising_admin_read on public.children
  for select to authenticated using (private.is_admin_of_child(id));

-- 9) Realtime : la réassignation d'un coach apparaît en direct
do $$
begin
  begin
    alter publication supabase_realtime add table public.admin_coach_supervision;
  exception when duplicate_object then null;
  end;
end $$;

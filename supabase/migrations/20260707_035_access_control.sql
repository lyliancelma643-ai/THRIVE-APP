-- ─────────────────────────────────────────────────────────────────────────────
-- 035 — Contrôle d'accès : cycle d'activation des comptes parents + flags.
--
-- Cycle : inscription → enfant OBLIGATOIRE (statut PENDING) → confirmation
-- Admin/Super Admin → validation coach → accès complet.
--
-- Enforcement CÔTÉ SERVEUR : policies RLS RESTRICTIVES (ET logique avec les
-- policies permissives existantes, qu'on ne réécrit pas) sur le contenu
-- parent (sessions 1:1, bilans parent, vidéos). L'UI grisée n'est qu'une
-- couche de présentation.
--
-- Backfill : les comptes existants sont « grand-périsés » (enfants CONFIRMED,
-- parents coach_validated = true) → AUCUN lockout à l'application.
-- Le flag fitness_enabled démarre à FALSE → section Fitness fermée pour tous
-- dès l'application (voulu : « en construction »).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Statut de validation des enfants ----------------------------------------
alter table public.children
  add column if not exists validation_status text not null default 'PENDING'
  check (validation_status in ('PENDING', 'CONFIRMED'));

-- Grand-père : tout enfant existant avant la migration est confirmé
update public.children set validation_status = 'CONFIRMED'
where validation_status = 'PENDING';

-- 2) Validation du coach sur le compte parent ---------------------------------
alter table public.profiles
  add column if not exists coach_validated boolean not null default false;

-- Grand-père : tous les parents existants sont validés
update public.profiles set coach_validated = true
where role = 'PARENT' and coach_validated = false;

-- 3) Feature flags (réglages serveur, pilotés par le Super Admin) -------------
create table if not exists public.app_settings (
  key        text primary key,
  enabled    boolean not null default false,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

insert into public.app_settings (key, enabled, note)
values ('fitness_enabled', false, 'Section Fitness (parents). OFF = « en construction » pour tous.')
on conflict (key) do nothing;

-- 4) Tâches / roadmap interne (admins + super admins) -------------------------
create table if not exists public.admin_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  horizon     text not null default 'WEEK'
              check (horizon in ('WEEK', 'MONTH', 'QUARTER', 'YEAR')),
  status      text not null default 'TODO'
              check (status in ('TODO', 'IN_PROGRESS', 'DONE')),
  deadline    date,
  assignee    uuid references public.profiles(id) on delete set null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists admin_tasks_horizon_idx on public.admin_tasks (horizon, status);
create index if not exists admin_tasks_assignee_idx on public.admin_tasks (assignee);

drop trigger if exists admin_tasks_updated_at on public.admin_tasks;
create trigger admin_tasks_updated_at
  before update on public.admin_tasks
  for each row execute function update_updated_at();

alter table public.admin_tasks enable row level security;
alter table public.admin_tasks replica identity full;

-- Helper : le caller est-il admin OU super admin ? (rôle lu depuis le JWT —
-- app_metadata, non falsifiable par l'utilisateur)
create or replace function private.jwt_role()
returns text language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function private.is_admin_or_super()
returns boolean language sql stable
set search_path = public
as $$
  select private.jwt_role() in ('ADMIN', 'SUPER_ADMIN');
$$;

-- Lecture : tous les admins/super admins
drop policy if exists admin_tasks_read on public.admin_tasks;
create policy admin_tasks_read on public.admin_tasks
  for select to authenticated using (private.is_admin_or_super());

-- Création : admins/super admins, en leur nom
drop policy if exists admin_tasks_insert on public.admin_tasks;
create policy admin_tasks_insert on public.admin_tasks
  for insert to authenticated
  with check (private.is_admin_or_super() and created_by = auth.uid());

-- Mise à jour : SUPER ADMIN = tout ; ADMIN = ses tâches, celles qui lui sont
-- assignées, ou non assignées (permet le « Je m'en occupe »)
drop policy if exists admin_tasks_update on public.admin_tasks;
create policy admin_tasks_update on public.admin_tasks
  for update to authenticated
  using (
    private.jwt_role() = 'SUPER_ADMIN'
    or (private.jwt_role() = 'ADMIN'
        and (created_by = auth.uid() or assignee = auth.uid() or assignee is null))
  );

-- Suppression : SUPER ADMIN = tout ; ADMIN = uniquement ses propres tâches
drop policy if exists admin_tasks_delete on public.admin_tasks;
create policy admin_tasks_delete on public.admin_tasks
  for delete to authenticated
  using (
    private.jwt_role() = 'SUPER_ADMIN'
    or (private.jwt_role() = 'ADMIN' and created_by = auth.uid())
  );

-- Realtime (rafraîchissement live de la roadmap entre admins)
do $$
begin
  alter publication supabase_realtime add table public.admin_tasks;
exception when duplicate_object then null;
end $$;

-- 5) État d'accès du compte ----------------------------------------------------
-- Un parent est « débloqué » quand : ≥1 enfant CONFIRMED ET coach_validated.
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

-- RPC lue par le front au chargement (une seule requête)
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
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  -- Coach / Admin / Super Admin / Enfant : pas de cycle d'activation
  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role,
      'unlocked', true,
      'has_child', true,
      'has_confirmed_child', true,
      'coach_validated', true,
      'fitness_enabled', coalesce(v_fitness, false)
    );
  end if;

  select
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active),
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  select coalesce(coach_validated, false) into v_coach_ok
  from profiles where id = v_uid;

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and v_coach_ok,
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', v_coach_ok,
    'fitness_enabled', coalesce(v_fitness, false)
  );
end;
$$;

-- Confirmation d'un enfant (Admin / Super Admin uniquement)
create or replace function public.confirm_child(p_child uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update children set validation_status = 'CONFIRMED' where id = p_child;
end;
$$;

-- Validation du compte parent (coach assigné à l'un de ses enfants, ou admin)
create or replace function public.validate_parent_access(p_parent uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not (
    private.is_admin_or_super()
    or exists (
      select 1
      from coach_assignments ca
      join children c on c.id = ca.child_id
      join families f on f.id = c.family_id
      where f.parent_id = p_parent
        and ca.coach_id = auth.uid()
    )
  ) then
    raise exception 'Réservé au coach assigné ou aux administrateurs';
  end if;
  update profiles set coach_validated = true where id = p_parent and role = 'PARENT';
end;
$$;

-- Grants : jamais anon sur les RPC ; access_state pour tout connecté
revoke execute on function public.access_state()                 from public, anon;
revoke execute on function public.confirm_child(uuid)            from public, anon;
revoke execute on function public.validate_parent_access(uuid)   from public, anon;
grant  execute on function public.access_state()                 to authenticated;
grant  execute on function public.confirm_child(uuid)            to authenticated;
grant  execute on function public.validate_parent_access(uuid)   to authenticated;

-- 6) Enforcement serveur : policies RESTRICTIVES sur le contenu parent --------
-- (ET logique avec les policies permissives existantes ; ne touchent ni les
-- coachs, ni les admins, ni les enfants.)

-- Séances 1:1 (page « Mes séances »)
drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  as restrictive for select to authenticated
  using (private.jwt_role() <> 'PARENT' or private.parent_access_unlocked(auth.uid()));

-- Bilan parent (page « Bilan »)
drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  as restrictive for select to authenticated
  using (private.jwt_role() <> 'PARENT' or private.parent_access_unlocked(auth.uid()));

-- Vidéos (section Fitness) : compte débloqué ET flag fitness activé
drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  as restrictive for select to authenticated
  using (
    private.jwt_role() <> 'PARENT'
    or (private.parent_access_unlocked(auth.uid())
        and coalesce((select enabled from app_settings where key = 'fitness_enabled'), false))
  );

drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  as restrictive for select to authenticated
  using (
    private.jwt_role() <> 'PARENT'
    or (private.parent_access_unlocked(auth.uid())
        and coalesce((select enabled from app_settings where key = 'fitness_enabled'), false))
  );

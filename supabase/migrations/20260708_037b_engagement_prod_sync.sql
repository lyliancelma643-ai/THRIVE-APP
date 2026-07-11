-- 20260708_037b_engagement_prod_sync.sql
-- ⚠️ SYNCHRONISATION DOCUMENTAIRE — DÉJÀ APPLIQUÉ EN PROD, NE PAS RÉ-APPLIQUER.
--
-- Reconstruction des objets créés directement en prod le 2026-07-08 par les
-- migrations « engagement_* » (bilan_reveal, thrive_moments, family_streaks,
-- gauge_progress_milestones, family_status_renewal_window, harden_function_grants)
-- qui n'avaient pas été rapatriées dans le repo. Ce fichier rétablit la parité
-- repo ↔ prod pour les diffs et le dev local. Tout est idempotent (IF NOT EXISTS).
--
-- Rollback (down) : drop table public.thrive_moments, public.family_streaks,
-- public.family_status, public.deletion_requests ;
-- alter table public.parent_reports drop column seen_at ;
-- (ne pas exécuter en prod : données réelles.)

-- 1) Révélation du bilan côté parent (engagement_bilan_reveal)
alter table public.parent_reports
  add column if not exists seen_at timestamptz;

-- 2) Moments THRIVE — cartes souvenirs créées par le coach (engagement_thrive_moments)
create table if not exists public.thrive_moments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  quote text,
  note text,
  media_url text,
  card_color text not null default '#004E7A',
  created_at timestamptz not null default now()
);
alter table public.thrive_moments enable row level security;
drop policy if exists thrive_moments_read on public.thrive_moments;
create policy thrive_moments_read on public.thrive_moments for select to authenticated
  using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id)
      or private.is_program_coach_of_child(child_id) or private.is_admin());
drop policy if exists thrive_moments_insert on public.thrive_moments;
create policy thrive_moments_insert on public.thrive_moments for insert to authenticated
  with check (private.is_assigned_coach(child_id) or private.is_program_coach_of_child(child_id) or private.is_admin());
drop policy if exists thrive_moments_update on public.thrive_moments;
create policy thrive_moments_update on public.thrive_moments for update to authenticated
  using (private.is_assigned_coach(child_id) or private.is_program_coach_of_child(child_id) or private.is_admin());
drop policy if exists thrive_moments_delete on public.thrive_moments;
create policy thrive_moments_delete on public.thrive_moments for delete to authenticated
  using (private.is_admin());

-- 3) Assiduité hebdomadaire de la famille (engagement_family_streaks)
create table if not exists public.family_streaks (
  family_id uuid primary key references public.families(id) on delete cascade,
  current_weeks int not null default 0,
  longest_weeks int not null default 0,
  jokers_remaining int not null default 1,
  last_validated_week date,
  updated_at timestamptz not null default now()
);
alter table public.family_streaks enable row level security;
drop policy if exists family_streaks_read on public.family_streaks;
create policy family_streaks_read on public.family_streaks for select to authenticated
  using (exists (select 1 from public.families f where f.id = family_id and f.parent_id = auth.uid())
      or private.is_admin());

-- 4) Statut famille + fenêtre de renouvellement (engagement_family_status_renewal_window)
create table if not exists public.family_status (
  family_id uuid primary key references public.families(id) on delete cascade,
  status text not null default 'FOUNDING',
  renewal_window_opens_at timestamptz,
  renewal_window_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.family_status enable row level security;
drop policy if exists family_status_read on public.family_status;
create policy family_status_read on public.family_status for select to authenticated
  using (exists (select 1 from public.families f where f.id = family_status.family_id and f.parent_id = auth.uid())
      or private.is_admin());
drop policy if exists family_status_admin_write on public.family_status;
create policy family_status_admin_write on public.family_status for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- 5) Demandes de suppression de compte (droit à l'oubli — edge function
--    request-account-deletion, rapatriée dans supabase/functions/)
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'PENDING',
  requested_at timestamptz not null default now()
);
alter table public.deletion_requests enable row level security;
drop policy if exists deletion_req_select on public.deletion_requests;
create policy deletion_req_select on public.deletion_requests for select to authenticated
  using (requested_by = (select auth.uid()) or target_profile_id = (select auth.uid()) or private.is_admin());
drop policy if exists deletion_req_insert_self on public.deletion_requests;
create policy deletion_req_insert_self on public.deletion_requests for insert to authenticated
  with check (requested_by = (select auth.uid()) and target_profile_id = (select auth.uid()));
drop policy if exists deletion_req_admin_update on public.deletion_requests;
create policy deletion_req_admin_update on public.deletion_requests for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

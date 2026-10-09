-- ════════════════════════════════════════════════════════════════════════════
-- Complément de la réplique locale (00_replica_schema.sql) : objets apparus
-- APRÈS l'extraction du 2026-10-01 et nécessaires pour tester les droits
-- d'accès parents (migration 080). Structure et policies recopiées du
-- catalogue de production THRIVE-CA le 2026-10-09. AUCUNE donnée.
--
-- À charger après 00_replica_schema.sql et 01_seed.sql, avant les migrations.
-- ════════════════════════════════════════════════════════════════════════════

-- Co-parents (056) : utilisé par 066 / 068 / 070.
create or replace function private.is_family_parent(p_family uuid)
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select p_family is not null and (
    exists (select 1 from public.families f where f.id = p_family and f.parent_id = auth.uid())
    or exists (select 1 from public.family_members m
                where m.family_id = p_family and m.profile_id = auth.uid())
  );
$$;

-- ── Tables Bilan (027 / 030 / 042) ──────────────────────────────────────────
create table if not exists public.athlete_objectives (id uuid default gen_random_uuid() primary key, child_id uuid not null, kind text default 'TECHNIQUE' not null, title text not null, description text, due_date date, status text default 'not_started' not null, progress integer default 0 not null, sort_order integer default 0 not null, created_by uuid, created_at timestamptz default now() not null, updated_at timestamptz default now() not null);
create table if not exists public.athlete_next_steps (id uuid default gen_random_uuid() primary key, child_id uuid not null, label text not null, due_date date, status text default 'todo' not null, sort_order integer default 0 not null, created_by uuid, created_at timestamptz default now() not null, updated_at timestamptz default now() not null);
create table if not exists public.athlete_documents (id uuid default gen_random_uuid() primary key, child_id uuid not null, kind text not null, title text, storage_path text not null, file_name text, mime_type text, size_bytes bigint, parent_visible boolean default true not null, uploaded_by uuid, created_at timestamptz default now() not null);
create table if not exists public.focus_word_history (id uuid default gen_random_uuid() primary key, child_id uuid not null, word text not null, note text, is_current boolean default true not null, created_by uuid, created_at timestamptz default now() not null);
create table if not exists public.emotion_logs (id uuid default gen_random_uuid() primary key, child_id uuid not null, emotion text not null, intensity integer, context text, session_number integer, created_by uuid, created_at timestamptz default now() not null);
create table if not exists public.progress_log (id uuid default gen_random_uuid() primary key, child_id uuid not null, event_type text not null, title text not null, summary text, delta_scores jsonb default '{}'::jsonb not null, created_at timestamptz default now() not null);
create table if not exists public.perma_scores (id uuid default gen_random_uuid() primary key, child_id uuid not null, questionnaire_id uuid not null, session_number integer, pillar text not null, value numeric not null, created_at timestamptz default now() not null);

-- ── Tables Maison (062 / 074) ───────────────────────────────────────────────
create table if not exists public.p3_moments (id uuid default gen_random_uuid() primary key, child_id uuid not null, parent_id uuid default auth.uid() not null, activity_id text not null, week smallint, duration_chosen smallint not null default 10, outcome text, created_at timestamptz default now() not null);
create table if not exists public.home_card_moments (id uuid default gen_random_uuid() primary key, child_id uuid not null, parent_id uuid default auth.uid() not null, card_id text not null, outcome text not null, created_at timestamptz default now() not null);

do $$
declare t text;
begin
  foreach t in array array['athlete_objectives','athlete_next_steps','athlete_documents','focus_word_history',
                           'emotion_logs','progress_log','perma_scores','p3_moments','home_card_moments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

create policy documents_read on public.athlete_documents as permissive for select to authenticated
  using (private.can_edit_child_bilan(child_id) or (parent_visible and private.is_parent_of_child(child_id)
         and (kind <> 'LETTER' or private.pack_feature(child_id, 'coachLetter'))));
create policy documents_write on public.athlete_documents as permissive for all to authenticated
  using (private.can_edit_child_bilan(child_id)) with check (private.can_edit_child_bilan(child_id));
create policy athlete_next_steps_read on public.athlete_next_steps as permissive for select to authenticated
  using (private.can_view_child_bilan(child_id));
create policy athlete_objectives_read on public.athlete_objectives as permissive for select to authenticated
  using (private.can_view_child_bilan(child_id));
create policy focus_word_history_read on public.focus_word_history as permissive for select to authenticated
  using (private.can_view_child_bilan(child_id));
create policy emotion_logs_read on public.emotion_logs as permissive for select to authenticated
  using (case when private.is_parent_of_child(child_id) then private.pack_feature(child_id, 'emotionWheel')
              else private.can_view_child_bilan(child_id) end);
create policy progress_log_read on public.progress_log as permissive for select to authenticated
  using (case when private.is_parent_of_child(child_id) then private.pack_feature(child_id, 'progressJournal')
              else (private.is_assigned_coach(child_id) or private.is_program_coach_of_child(child_id) or private.is_admin()) end);
create policy perma_scores_read on public.perma_scores as permissive for select to authenticated
  using (private.can_view_child_bilan(child_id));

create policy p3_moments_read on public.p3_moments as permissive for select to authenticated
  using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id) or private.is_admin());
create policy p3_moments_insert on public.p3_moments as permissive for insert to authenticated
  with check (parent_id = (select auth.uid()) and private.is_parent_of_child(child_id));
create policy home_card_moments_read on public.home_card_moments as permissive for select to authenticated
  using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id) or private.is_admin());
create policy home_card_moments_insert on public.home_card_moments as permissive for insert to authenticated
  with check (parent_id = (select auth.uid()) and private.is_parent_of_child(child_id));

-- Gardes telles qu'en prod avant 080 (p3_* : 064/068 ; cartes : 074 = activation coach).
-- parent_p3_access : amorce (064), redéfinie par 067b / 068.
create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select private.parent_access_unlocked(p_parent); $$;

create policy gate_parent_p3_moments on public.p3_moments as restrictive for all to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_p3_access((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'p3_enabled'), false)));
create policy gate_parent_home_card_moments on public.home_card_moments as restrictive for all to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)))
  with check ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));

insert into public.app_settings (key, enabled) values ('p3_enabled', true), ('fitness_enabled', true)
on conflict do nothing;

-- Privilèges par défaut de Supabase : toute nouvelle table de public est
-- accessible à anon / authenticated (la RLS fait le tri) — comme en prod.
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;

-- RPC du Bilan telle qu'en prod (SECURITY DEFINER, garde = can_view_child_bilan).
create or replace function public.gauge_summary(p_child_id uuid)
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select case when not private.can_view_child_bilan(p_child_id)
    then jsonb_build_object('global', 0, 'sample_size', 0, 'by_skill', '{}'::jsonb)
    else (select jsonb_build_object(
            'global', coalesce(round(avg(value))::int, 0),
            'sample_size', count(*),
            'by_skill', case when private.jwt_role() = 'PARENT' and not private.pack_feature(p_child_id, 'skillBreakdown')
                             then '{}'::jsonb
                             else coalesce((select jsonb_object_agg(skill_key, avg_val) from (
                                    select skill_key, round(avg(value))::int as avg_val
                                    from public.skill_scores where child_id = p_child_id group by skill_key) s), '{}'::jsonb) end)
          from public.skill_scores where child_id = p_child_id)
  end;
$function$;
grant execute on function public.gauge_summary(uuid) to authenticated;

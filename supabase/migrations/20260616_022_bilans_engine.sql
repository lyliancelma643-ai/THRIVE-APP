-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 4 — MOTEUR DE BILANS (§6.4 / §7.1). Additif : coexiste avec la table
-- legacy public.reports (jsonb) sans la modifier.
--   coach_reports     : bilan coach structuré (saisie back-office)
--   parent_reports    : version parent dérivée (assemblée par l'EF generate-parent-report)
--   report_templates  : gabarits d'assemblage (séance × âge × pack × langue)
-- RLS calquée sur le pattern éprouvé (private.is_parent_of_child / is_assigned_coach
-- / is_program_coach_of_child / is_admin + current_user_role()).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) coach_reports
create table if not exists public.coach_reports (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references public.children(id) on delete cascade,
  coach_id             uuid not null references public.profiles(id),
  session_id           uuid references public.sessions(id) on delete set null,
  age_group            text,
  life_skill_target    text,
  performance_summary  text,
  success_count        int,
  forces_via           text,
  transfer_notes       text,
  home_recommendations text,
  coach_message_parent text,
  rpe                  int check (rpe is null or (rpe between 0 and 10)),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_coach_reports_child   on public.coach_reports(child_id);
create index if not exists idx_coach_reports_coach   on public.coach_reports(coach_id);
create index if not exists idx_coach_reports_session on public.coach_reports(session_id);

-- 2) parent_reports
create table if not exists public.parent_reports (
  id                  uuid primary key default gen_random_uuid(),
  coach_report_id     uuid not null references public.coach_reports(id) on delete cascade,
  child_id            uuid not null references public.children(id) on delete cascade,
  parent_visible_body jsonb not null default '{}'::jsonb,
  detail_level        int not null default 1,
  language            text not null default 'fr',
  seen_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_parent_reports_child        on public.parent_reports(child_id);
create index if not exists idx_parent_reports_coach_report on public.parent_reports(coach_report_id);

-- 3) report_templates
create table if not exists public.report_templates (
  id             uuid primary key default gen_random_uuid(),
  session_number int,
  age_group      text,
  pack_level     text,
  body_template  jsonb not null default '{}'::jsonb,
  lang           text not null default 'fr',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (session_number, age_group, pack_level, lang)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.coach_reports    enable row level security;
alter table public.parent_reports   enable row level security;
alter table public.report_templates enable row level security;

-- coach_reports : lu par le coach (auteur/assigné) + admin ; écrit par coach/admin
drop policy if exists coach_reports_read on public.coach_reports;
create policy coach_reports_read on public.coach_reports for select to authenticated
  using (coach_id = (select auth.uid())
         or private.is_assigned_coach(child_id)
         or private.is_program_coach_of_child(child_id)
         or private.is_admin());

drop policy if exists coach_reports_insert on public.coach_reports;
create policy coach_reports_insert on public.coach_reports for insert to authenticated
  with check (coach_id = (select auth.uid())
              and current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::user_role[]));

drop policy if exists coach_reports_update on public.coach_reports;
create policy coach_reports_update on public.coach_reports for update to authenticated
  using (coach_id = (select auth.uid()) or private.is_admin())
  with check (coach_id = (select auth.uid()) or private.is_admin());

-- parent_reports : lu par parent/coach/admin ; le parent ne peut MAJ que seen_at
drop policy if exists parent_reports_read on public.parent_reports;
create policy parent_reports_read on public.parent_reports for select to authenticated
  using (private.is_parent_of_child(child_id)
         or private.is_assigned_coach(child_id)
         or private.is_program_coach_of_child(child_id)
         or private.is_admin());

drop policy if exists parent_reports_parent_update on public.parent_reports;
create policy parent_reports_parent_update on public.parent_reports for update to authenticated
  using (private.is_parent_of_child(child_id))
  with check (private.is_parent_of_child(child_id));

-- restreindre la MAJ parent à la seule colonne seen_at (création = EF service_role)
revoke update on public.parent_reports from authenticated;
grant  update (seen_at) on public.parent_reports to authenticated;

-- report_templates : lecture authentifiée (preview coach), écriture admin
drop policy if exists report_templates_read on public.report_templates;
create policy report_templates_read on public.report_templates for select to authenticated using (true);
drop policy if exists report_templates_admin_write on public.report_templates;
create policy report_templates_admin_write on public.report_templates for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ── Realtime (nouveau bilan parent visible en direct) ────────────────────────
alter table public.coach_reports  replica identity full;
alter table public.parent_reports replica identity full;
alter publication supabase_realtime add table public.coach_reports;
alter publication supabase_realtime add table public.parent_reports;

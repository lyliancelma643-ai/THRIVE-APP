-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 4 — Fondation SCORES & JOURNAL (additif, ne modifie aucune table existante)
-- Alimente : jauges « Progrès », timeline « Journal », impact des séances 20 min
-- et des questionnaires. Écriture réservée aux Edge Functions (service_role,
-- bypass RLS). Lecture : parent de l'enfant, coach assigné/au programme, admin.
-- RLS calquée sur le pattern éprouvé (private.is_parent_of_child / is_assigned_coach
-- / is_program_coach_of_child / is_admin) pour garantir l'isolation par famille.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) skill_scores : un score (0–100) par dimension, traçable à sa source
create table if not exists public.skill_scores (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  skill_key   text not null,
  source      text not null check (source in
                ('SESSION_1TO1','SESSION_20MIN','QUESTIONNAIRE_LSSS','QUESTIONNAIRE_WHO5','MANUAL')),
  source_id   uuid,
  value       numeric(5,2) not null check (value >= 0 and value <= 100),
  created_at  timestamptz not null default now()
);
create index if not exists idx_skill_scores_child       on public.skill_scores(child_id);
create index if not exists idx_skill_scores_child_skill on public.skill_scores(child_id, skill_key);

-- 2) progress_log : fil d'actualité de progrès (timeline)
create table if not exists public.progress_log (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children(id) on delete cascade,
  event_type   text not null check (event_type in
                 ('VIDEO_RUN','SESSION_1TO1','QUESTIONNAIRE','BADGE','REPORT','NOTE')),
  title        text not null,
  summary      text,
  delta_scores jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_progress_log_child_created on public.progress_log(child_id, created_at desc);

-- 3) RLS : activée, lecture famille/coach/admin, aucune écriture client
alter table public.skill_scores enable row level security;
alter table public.progress_log enable row level security;

drop policy if exists skill_scores_read on public.skill_scores;
create policy skill_scores_read on public.skill_scores
  for select to authenticated
  using (
    private.is_parent_of_child(child_id)
    or private.is_assigned_coach(child_id)
    or private.is_program_coach_of_child(child_id)
    or private.is_admin()
  );

drop policy if exists progress_log_read on public.progress_log;
create policy progress_log_read on public.progress_log
  for select to authenticated
  using (
    private.is_parent_of_child(child_id)
    or private.is_assigned_coach(child_id)
    or private.is_program_coach_of_child(child_id)
    or private.is_admin()
  );

-- 4) Realtime (cohérent avec les autres tables produit : MAJ live des jauges)
alter table public.skill_scores replica identity full;
alter table public.progress_log replica identity full;
alter publication supabase_realtime add table public.skill_scores;
alter publication supabase_realtime add table public.progress_log;

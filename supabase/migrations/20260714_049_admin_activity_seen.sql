-- ──────────────────────────────────────────────────────────────────────────────
-- 20260714_049_admin_activity_seen.sql
-- Roadmap : bannière « changements récents ». Chaque admin garde un curseur
-- « vu jusqu'à » ; tout ce que les AUTRES ont fait après ce curseur s'affiche
-- dans une case rouge en haut de la page, avec un bouton « Vu » qui avance le
-- curseur (persisté ici → suivi cross-appareils, 80 % mobile).
-- L'activité elle-même vient d'admin_task_history (triggers migration 037).
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_activity_seen (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.admin_activity_seen enable row level security;

drop policy if exists activity_seen_select on public.admin_activity_seen;
create policy activity_seen_select on public.admin_activity_seen
  for select to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists activity_seen_insert on public.admin_activity_seen;
create policy activity_seen_insert on public.admin_activity_seen
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists activity_seen_update on public.admin_activity_seen;
create policy activity_seen_update on public.admin_activity_seen
  for update to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()))
  with check ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

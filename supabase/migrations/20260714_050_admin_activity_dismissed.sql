-- ──────────────────────────────────────────────────────────────────────────────
-- 20260714_050_admin_activity_dismissed.sql
-- Roadmap : bannière « changements récents » — rejet ligne par ligne.
-- La 049 posait un curseur unique « vu jusqu'à » (bouton « Vu » global). Un
-- curseur seul ne peut pas dire « celui-ci vu, mais celui d'avant non » : on
-- ajoute donc un registre des changements rejetés un par un par chaque admin.
--
-- Un changement reste dans la case rouge tant que :
--   · il est plus récent que le curseur global (admin_activity_seen), ET
--   · il n'est PAS dans admin_activity_dismissed pour cet admin.
-- Le « Vu » global avance le curseur (efface tout) ; le « Vu » d'une ligne
-- insère juste cette ligne ici. Nettoyage : le « Vu » global purge les rejets
-- devenus inutiles (déjà sous le curseur).
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_activity_dismissed (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  history_id   uuid not null references public.admin_task_history(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, history_id)
);

alter table public.admin_activity_dismissed enable row level security;

drop policy if exists activity_dismissed_select on public.admin_activity_dismissed;
create policy activity_dismissed_select on public.admin_activity_dismissed
  for select to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists activity_dismissed_insert on public.admin_activity_dismissed;
create policy activity_dismissed_insert on public.admin_activity_dismissed
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists activity_dismissed_delete on public.admin_activity_dismissed;
create policy activity_dismissed_delete on public.admin_activity_dismissed
  for delete to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

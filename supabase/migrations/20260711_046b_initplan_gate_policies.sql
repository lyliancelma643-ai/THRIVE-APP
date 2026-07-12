-- 20260711_046b_initplan_gate_policies.sql
-- Complément de la 046 : les 4 policies « gate_parent_* » restaient signalées
-- par l'advisor auth_rls_initplan — auth.uid() doit être LUI-MÊME en sous-select
-- ((select private.fn((select auth.uid())))), pas seulement l'appel englobant.
-- Idempotent.

drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked((select auth.uid()))));

drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked((select auth.uid()))));

drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

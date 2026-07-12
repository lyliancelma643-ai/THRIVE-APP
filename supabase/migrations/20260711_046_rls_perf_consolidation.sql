-- 20260711_046_rls_perf_consolidation.sql
-- Performance RLS (advisors : 14 auth_rls_initplan, 93 multiple_permissive_policies,
-- 22 unindexed_foreign_keys). Zéro changement de droits effectifs :
--   1) auth.uid()/jwt_role() enveloppés en sous-select (évalués 1×/requête, plus 1×/ligne)
--   2) suppression des policies DOUBLONS legacy (prouvées strictement équivalentes ou
--      sous-ensembles d'une policy conservée — voir commentaires)
--   3) rétrécissement {public} → authenticated (anon n'a plus aucun grant table
--      depuis 031/032 ; supprime le bruit anon/authenticator/dashboard_user)
--   4) index sur les 22 FK non couvertes
-- Les index « unused » signalés ne sont PAS supprimés : statistiques trop jeunes.
-- Idempotent.

-- ════ 1) Réécriture initplan-safe (14 policies) ════

drop policy if exists admin_chat_delete on public.admin_chat_messages;
create policy admin_chat_delete on public.admin_chat_messages
  for delete to authenticated
  using ((select private.jwt_role()) = 'SUPER_ADMIN' or author = (select auth.uid()));

drop policy if exists admin_chat_insert on public.admin_chat_messages;
create policy admin_chat_insert on public.admin_chat_messages
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and author = (select auth.uid()));

drop policy if exists task_attachments_delete on public.admin_task_attachments;
create policy task_attachments_delete on public.admin_task_attachments
  for delete to authenticated
  using ((select private.jwt_role()) = 'SUPER_ADMIN' or created_by = (select auth.uid()));

drop policy if exists task_attachments_insert on public.admin_task_attachments;
create policy task_attachments_insert on public.admin_task_attachments
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and created_by = (select auth.uid()));

drop policy if exists task_comments_delete on public.admin_task_comments;
create policy task_comments_delete on public.admin_task_comments
  for delete to authenticated
  using ((select private.jwt_role()) = 'SUPER_ADMIN' or author = (select auth.uid()));

drop policy if exists task_comments_insert on public.admin_task_comments;
create policy task_comments_insert on public.admin_task_comments
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and author = (select auth.uid()));

drop policy if exists admin_tasks_insert on public.admin_tasks;
create policy admin_tasks_insert on public.admin_tasks
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and created_by = (select auth.uid()));

drop policy if exists admin_tasks_update on public.admin_tasks;
create policy admin_tasks_update on public.admin_tasks
  for update to authenticated
  using ((select private.jwt_role()) = 'SUPER_ADMIN'
         or ((select private.jwt_role()) = 'ADMIN'
             and (created_by = (select auth.uid())
                  or assignee = (select auth.uid())
                  or assignee is null)));

drop policy if exists family_status_read on public.family_status;
create policy family_status_read on public.family_status
  for select to authenticated
  using (exists (select 1 from public.families f
                 where f.id = family_status.family_id
                   and f.parent_id = (select auth.uid()))
         or (select private.is_admin()));

drop policy if exists family_streaks_read on public.family_streaks;
create policy family_streaks_read on public.family_streaks
  for select to authenticated
  using (exists (select 1 from public.families f
                 where f.id = family_streaks.family_id
                   and f.parent_id = (select auth.uid()))
         or (select private.is_admin()));

drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked(auth.uid())));

drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked(auth.uid())));

drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked(auth.uid()))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked(auth.uid()))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

-- ════ 2) Doublons legacy (chaque drop est couvert par la policy indiquée) ════

-- profiles : équivalents exacts conservés = profiles_insert_trigger,
-- profiles_admin_update_all, profiles_update_own
drop policy if exists "Parents can insert their own profile" on public.profiles;
drop policy if exists "Users can insert own profile"          on public.profiles;
drop policy if exists "Admins can update all profiles"        on public.profiles;
drop policy if exists "Users can update own profile"          on public.profiles;

-- families : équivalents exacts conservés = families_parent_insert / _update
drop policy if exists "Parents can create their family" on public.families;
drop policy if exists "Parents can update their family" on public.families;

-- children : children_parent_own (FOR ALL : parent de la famille OU is_admin)
-- couvre strictement ces 6 policies (mêmes prédicats ou sous-ensembles)
drop policy if exists "Parents can insert children"        on public.children;
drop policy if exists "Parents can update their children"  on public.children;
drop policy if exists children_parent_insert               on public.children;
drop policy if exists children_parent_update               on public.children;
drop policy if exists children_parent_select               on public.children;
drop policy if exists children_admin_select_all            on public.children;

-- badges : badges_admin_write (private.is_admin()) ≡ admins_manage_badges ;
-- badges_read_all ≡ all_read_badges (true)
drop policy if exists admins_manage_badges on public.badges;
drop policy if exists all_read_badges      on public.badges;

-- child_badges : all_read_child_badges (true, authenticated) rend
-- child_badges_read (sous-ensemble parent/admin) redondante
drop policy if exists child_badges_read on public.child_badges;

-- questionnaires : all_read_questionnaires (`true`) était SUR-LARGE — elle
-- exposait les lignes (dont les tokens de lien enfant) à tout compte connecté.
-- Lecture restante : parents (questionnaires_parent_read), coach de la séance
-- ou admin (questionnaires_coach_manage), tout coach/admin
-- (coaches_admins_questionnaires). Le flux enfant passe par RPC SECURITY DEFINER.
drop policy if exists all_read_questionnaires on public.questionnaires;

-- ════ 3) {public} → authenticated (expressions inchangées) ════
-- anon n'a plus de grant table depuis 031/032 : aucune perte d'accès réelle.
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and 'public' = any(roles)
  loop
    execute format('alter policy %I on public.%I to authenticated',
                   r.policyname, r.tablename);
  end loop;
end $$;

-- ════ 4) Index des 22 FK non couvertes (advisor unindexed_foreign_keys) ════
create index if not exists idx_admin_chat_messages_author        on public.admin_chat_messages(author);
create index if not exists idx_admin_coach_supervision_assigned_by on public.admin_coach_supervision(assigned_by);
create index if not exists idx_admin_task_attachments_created_by on public.admin_task_attachments(created_by);
create index if not exists idx_admin_task_comments_author        on public.admin_task_comments(author);
create index if not exists idx_admin_task_history_actor          on public.admin_task_history(actor);
create index if not exists idx_admin_tasks_completed_by          on public.admin_tasks(completed_by);
create index if not exists idx_admin_tasks_created_by            on public.admin_tasks(created_by);
create index if not exists idx_admin_tasks_problem_by            on public.admin_tasks(problem_by);
create index if not exists idx_app_settings_updated_by           on public.app_settings(updated_by);
create index if not exists idx_athlete_documents_uploaded_by     on public.athlete_documents(uploaded_by);
create index if not exists idx_athlete_identity_updated_by       on public.athlete_identity(updated_by);
create index if not exists idx_athlete_next_steps_created_by     on public.athlete_next_steps(created_by);
create index if not exists idx_athlete_objectives_created_by     on public.athlete_objectives(created_by);
create index if not exists idx_deletion_requests_processed_by    on public.deletion_requests(processed_by);
create index if not exists idx_deletion_requests_requested_by    on public.deletion_requests(requested_by);
create index if not exists idx_emotion_logs_created_by           on public.emotion_logs(created_by);
create index if not exists idx_entitlements_plan_id              on public.entitlements(plan_id);
create index if not exists idx_family_members_profile_id         on public.family_members(profile_id);
create index if not exists idx_focus_word_history_created_by     on public.focus_word_history(created_by);
create index if not exists idx_perma_scores_questionnaire_id     on public.perma_scores(questionnaire_id);
create index if not exists idx_thrive_moments_coach_id           on public.thrive_moments(coach_id);
create index if not exists idx_thrive_moments_session_id         on public.thrive_moments(session_id);

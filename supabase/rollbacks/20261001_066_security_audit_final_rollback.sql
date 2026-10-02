-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK de 20261001_066_security_audit_final.sql — URGENCE UNIQUEMENT.
-- Restaure l'état exact relevé en production le 2026-10-01 AVANT la 066.
-- ⚠ Réintroduit les failles SEC-01 à SEC-12 (fuite de données de mineurs,
--   contournement du forfait). À n'utiliser que si la 066 casse un parcours
--   critique, le temps de corriger, puis ré-appliquer la 066.
-- ════════════════════════════════════════════════════════════════════════════

-- SEC-01 (état d'origine : PERMISSIVE)
drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT' or (select private.parent_access_unlocked((select auth.uid()))));
drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT' or (select private.parent_access_unlocked((select auth.uid()))));
drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));

-- SEC-02
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
DECLARE v_first_name TEXT; v_last_name TEXT; v_role TEXT;
BEGIN
  v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), '');
  v_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), '');
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'PARENT');
  IF v_role NOT IN ('PARENT', 'COACH', 'CHILD') THEN v_role := 'PARENT'; END IF;
  INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active, registration_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_first_name, v_last_name, v_role::user_role, true, 'approved', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
    first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name = CASE WHEN profiles.last_name = '' THEN EXCLUDED.last_name ELSE profiles.last_name END,
    updated_at = NOW();
  UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$function$;

-- SEC-03
drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
drop function if exists private.guard_profile_privileged_columns();
drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
                 and p.role = any (array['ADMIN'::user_role, 'SUPER_ADMIN'::user_role])));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id);
drop policy if exists profiles_insert_trigger on public.profiles;
create policy profiles_insert_trigger on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

-- SEC-04 / SEC-05
drop trigger if exists trg_guard_family_pack_on_insert on public.families;
drop function if exists private.guard_family_pack_on_insert();
drop trigger if exists trg_guard_child_privileged_columns on public.children;
drop function if exists private.guard_child_privileged_columns();

-- SEC-06
drop policy if exists enrollments_coach_read on public.program_enrollments;
create policy enrollments_coach_read on public.program_enrollments for all to authenticated
  using (private.is_admin() or exists (select 1 from public.programs pr
         where pr.id = program_enrollments.program_id and pr.coach_id = (select auth.uid())))
  with check (private.is_admin() or exists (select 1 from public.programs pr
         where pr.id = program_enrollments.program_id and pr.coach_id = (select auth.uid())));

-- SEC-07
drop policy if exists questionnaires_child_staff on public.questionnaires;
drop policy if exists coaches_admins_questionnaires on public.questionnaires;
create policy coaches_admins_questionnaires on public.questionnaires for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid())
         and profiles.role = any (array['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role])));
drop policy if exists questions_staff_write on public.questions;
drop policy if exists coaches_admins_questions on public.questions;
create policy coaches_admins_questions on public.questions for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid())
         and profiles.role = any (array['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role])));

-- SEC-08
drop policy if exists all_read_child_badges on public.child_badges;
create policy all_read_child_badges on public.child_badges for select to authenticated using (true);
drop policy if exists coaches_award_badges on public.child_badges;
create policy coaches_award_badges on public.child_badges for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid())
              and profiles.role = any (array['COACH'::user_role, 'ADMIN'::user_role, 'SUPER_ADMIN'::user_role])));

-- SEC-09
drop policy if exists coach_reports_insert on public.coach_reports;
create policy coach_reports_insert on public.coach_reports for insert to authenticated
  with check (coach_id = (select auth.uid())
              and current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::user_role[]));
drop policy if exists reports_coach_write on public.reports;
create policy reports_coach_write on public.reports for insert to authenticated
  with check (generated_by = (select auth.uid())
              and current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::user_role[]));

-- SEC-10
drop policy if exists audit_admin_only on public.audit_logs;
create policy audit_admin_only on public.audit_logs for all to authenticated using (private.is_admin());

-- SEC-11
update storage.buckets set file_size_limit = null, allowed_mime_types = null
 where id in ('athlete-documents', 'admin-attachments');

-- SEC-12 (droits d'origine : anon avait tous les droits table ; billing_subscriptions,
-- p3_*, web_push_subscriptions n'en avaient aucun — on ne les rétablit donc pas).
do $$ declare t text; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r','v')
             and c.relname not in ('billing_subscriptions','p3_letters','p3_moments','p3_rewards',
                                   'p3_saved','p3_skips','web_push_subscriptions')
  loop
    execute format('grant all on public.%I to anon', t);
  end loop;
end $$;
alter default privileges in schema public grant all on tables to anon;

-- SEC-13
create or replace function private.is_program_coach_of_child(p_child uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN programs pr ON pr.id = pe.program_id
    WHERE pe.child_id = p_child AND pr.coach_id = auth.uid());
$function$;

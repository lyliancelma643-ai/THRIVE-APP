-- ════════════════════════════════════════════════════════════════════════════
-- 20261001_066_security_audit_final.sql
-- Correctifs de l'audit de sécurité final (voir SECURITY_AUDIT_FINAL.md).
-- Idempotent : chaque objet est (re)créé avec DROP … IF EXISTS / OR REPLACE.
-- Rollback : supabase/rollbacks/20261001_066_security_audit_final_rollback.sql
--
-- Principe des gardes de colonnes : triggers SECURITY INVOKER qui ne
-- s'appliquent qu'aux requêtes directes des rôles `authenticated` / `anon`
-- (current_user). Les fonctions SECURITY DEFINER légitimes (confirm_child,
-- validate_parent_access, sync_family_pack_from_entitlements…) et la
-- service_role (edge functions) ne sont donc pas bloquées.
-- ════════════════════════════════════════════════════════════════════════════

set lock_timeout = '5s';

-- ─── SEC-01 · Policies « gate » redevenues RESTRICTIVE ───────────────────────
-- La migration 046 (perf) les avait recréées sans `as restrictive` : PERMISSIVE,
-- elles s'ajoutaient en OU et ouvraient TOUTES les lignes à tout coach et à tout
-- parent débloqué (séances, bilans parents, séances vidéo de tous les enfants).
drop policy if exists gate_parent_reports on public.parent_reports;
create policy gate_parent_reports on public.parent_reports
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked((select auth.uid()))));

drop policy if exists gate_parent_sessions on public.sessions;
create policy gate_parent_sessions on public.sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or (select private.parent_access_unlocked((select auth.uid()))));

drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

-- ─── SEC-02 · Auto-inscription : le rôle ne vient plus de user_metadata ──────
-- Avant : signUp({ data: { role: 'COACH' } }) créait un profil COACH (les
-- policies basées sur profiles.role lui ouvraient tous les questionnaires).
-- Désormais le rôle du profil = app_metadata.role (posé à PARENT par
-- set_signup_app_role pour toute auto-inscription, ou par la service_role
-- dans les edge functions admin). Le reste de la fonction est inchangé.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE v_first_name TEXT; v_last_name TEXT; v_role TEXT;
BEGIN
  v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), '');
  v_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), '');
  -- Autorité : app_metadata (non modifiable par l'utilisateur), jamais user_metadata.
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_app_meta_data->>'role'), ''), 'PARENT');
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

-- ─── SEC-03 · profiles : récursion RLS + colonnes d'autorité ─────────────────
-- profiles_admin_update_all lisait public.profiles dans une policy de profiles
-- → « infinite recursion detected » sur TOUT UPDATE client (les mises à jour
-- de profil et de jeton push échouaient). La protection de coach_validated
-- n'était qu'accidentelle : une fois la récursion corrigée, un parent pouvait
-- se « valider » lui-même et débloquer le contenu payant.
drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Un utilisateur ne peut créer que son propre profil, en PARENT non validé
-- (le profil est normalement créé par le trigger handle_new_user).
drop policy if exists profiles_insert_trigger on public.profiles;
create policy profiles_insert_trigger on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id
              and role = 'PARENT'::user_role
              and coach_validated = false);

create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') and not private.is_admin() then
    if new.coach_validated is distinct from old.coach_validated
       or new.registration_status is distinct from old.registration_status then
      raise exception 'Modification de la validation du compte non autorisée'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before update on public.profiles
  for each row execute function private.guard_profile_privileged_columns();

-- ─── SEC-04 · families : pack posé à la création ─────────────────────────────
-- enforce_pack_change_authority ne couvrait que l'UPDATE : un parent créait une
-- famille directement en PERFORMANCE puis y déplaçait son enfant.
create or replace function private.guard_family_pack_on_insert()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') and not private.is_admin() then
    new.pack := 'ESSENTIEL';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_family_pack_on_insert on public.families;
create trigger trg_guard_family_pack_on_insert
  before insert on public.families
  for each row execute function private.guard_family_pack_on_insert();

-- ─── SEC-05 · children : famille et validation hors de portée du parent ──────
create or replace function private.guard_child_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.validation_status := 'PENDING';
    else
      if new.family_id is distinct from old.family_id then
        raise exception 'Changement de famille non autorisé'
          using errcode = 'insufficient_privilege';
      end if;
      if new.validation_status is distinct from old.validation_status then
        raise exception 'Validation de l''enfant réservée aux administrateurs'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_child_privileged_columns on public.children;
create trigger trg_guard_child_privileged_columns
  before insert or update on public.children
  for each row execute function private.guard_child_privileged_columns();

-- ─── SEC-06 · program_enrollments : un coach n'inscrit que ses enfants ───────
-- Avant : tout coach créait un programme et y inscrivait N'IMPORTE QUEL enfant,
-- devenant « coach de programme » (lecture des bilans, écriture du dossier,
-- obtention des jetons de questionnaires via lsss_send/perma_send).
drop policy if exists enrollments_coach_read on public.program_enrollments;
create policy enrollments_coach_read on public.program_enrollments
  for all to authenticated
  using (private.is_admin()
         or exists (select 1 from public.programs pr
                    where pr.id = program_enrollments.program_id
                      and pr.coach_id = (select auth.uid())))
  with check (private.is_admin()
              or (exists (select 1 from public.programs pr
                          where pr.id = program_enrollments.program_id
                            and pr.coach_id = (select auth.uid()))
                  and private.is_assigned_coach(child_id)));

-- ─── SEC-13 · Accès « coach de programme » révoqué avec l'assignation ───────
-- Un coach désassigné d'un enfant gardait l'accès (bilans, dossier, jetons de
-- questionnaires) via ses anciennes inscriptions de programme. En production,
-- toutes les inscriptions correspondent à une assignation : aucun accès
-- légitime n'est perdu.
create or replace function private.is_program_coach_of_child(p_child uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  SELECT EXISTS (SELECT 1 FROM program_enrollments pe JOIN programs pr ON pr.id = pe.program_id
    JOIN coach_assignments ca ON ca.child_id = pe.child_id AND ca.coach_id = pr.coach_id AND ca.is_active
    WHERE pe.child_id = p_child AND pr.coach_id = auth.uid());
$function$;

-- ─── SEC-07 · questionnaires / questions : fin de l'accès « tout coach » ─────
-- coaches_admins_questionnaires ouvrait à tout profil COACH tous les
-- questionnaires (réponses + jetons d'accès) de tous les enfants.
drop policy if exists coaches_admins_questionnaires on public.questionnaires;
drop policy if exists questionnaires_child_staff on public.questionnaires;
create policy questionnaires_child_staff on public.questionnaires
  for all to authenticated
  using (private.can_edit_child_bilan(child_id) or private.is_admin())
  with check (private.can_edit_child_bilan(child_id) or private.is_admin());

drop policy if exists coaches_admins_questions on public.questions;
drop policy if exists questions_staff_write on public.questions;
create policy questions_staff_write on public.questions
  for all to authenticated
  using (private.is_admin() or exists (
    select 1 from public.questionnaires q
    where q.id = questions.questionnaire_id
      and (private.can_edit_child_bilan(q.child_id)
           or exists (select 1 from public.sessions s
                      join public.programs p on p.id = s.program_id
                      where s.id = q.session_id and p.coach_id = (select auth.uid())))))
  with check (private.is_admin() or exists (
    select 1 from public.questionnaires q
    where q.id = questions.questionnaire_id
      and (private.can_edit_child_bilan(q.child_id)
           or exists (select 1 from public.sessions s
                      join public.programs p on p.id = s.program_id
                      where s.id = q.session_id and p.coach_id = (select auth.uid())))));

-- ─── SEC-08 · child_badges : lecture et attribution limitées à l'enfant ──────
drop policy if exists all_read_child_badges on public.child_badges;
create policy all_read_child_badges on public.child_badges
  for select to authenticated
  using (private.can_view_child_bilan(child_id) or private.is_admin());

drop policy if exists coaches_award_badges on public.child_badges;
create policy coaches_award_badges on public.child_badges
  for insert to authenticated
  with check (private.can_edit_child_bilan(child_id) or private.is_admin());

-- ─── SEC-09 · coach_reports / reports : écriture limitée aux enfants suivis ──
-- Un profil COACH quelconque pouvait injecter un bilan sur n'importe quel enfant
-- (affiché ensuite au parent via session_report / generate-parent-report).
drop policy if exists coach_reports_insert on public.coach_reports;
create policy coach_reports_insert on public.coach_reports
  for insert to authenticated
  with check (coach_id = (select auth.uid())
              and current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::user_role[])
              and (private.can_edit_child_bilan(child_id) or private.is_admin()));

drop policy if exists reports_coach_write on public.reports;
create policy reports_coach_write on public.reports
  for insert to authenticated
  with check (generated_by = (select auth.uid())
              and current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::user_role[])
              and (private.can_edit_child_bilan(child_id) or private.is_admin()));

-- ─── SEC-10 · audit_logs : journal en lecture seule (append-only) ────────────
-- Les écritures passent par private.audit_trigger (SECURITY DEFINER) et la
-- service_role ; un admin ne doit pas pouvoir modifier ni effacer la trace.
drop policy if exists audit_admin_only on public.audit_logs;
create policy audit_admin_only on public.audit_logs
  for select to authenticated
  using (private.is_admin());

-- ─── SEC-11 · Storage : limites de taille / type sur les buckets ouverts ─────
update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
 where id = 'athlete-documents';
update storage.buckets
   set file_size_limit = 26214400
 where id = 'admin-attachments';

-- search_path figé (linter 0011)
alter function private.storage_child_uuid(text) set search_path to '';

-- ─── SEC-12 · Défense en profondeur : plus aucun droit table pour `anon` ─────
-- Seule exception fonctionnelle : le formulaire public de liste d'attente.
-- Les RPC publiques par jeton (questionnaire_get/submit, lsss_get/submit,
-- vapid_public_key) sont des fonctions et ne sont pas concernées.
revoke all on all tables in schema public from anon;
grant insert on public.waitlist to anon;
alter default privileges in schema public revoke all on tables from anon;

reset lock_timeout;

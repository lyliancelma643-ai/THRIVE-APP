-- ─────────────────────────────────────────────────────────────────────────────
-- Comptes de revue App Store / Google Play — données 100 % fictives.
--
--   parent-test@thrivesportpositive.com  (PARENT, forfait PERFORMANCE)
--   coach-test@thrivesportpositive.com   (COACH)
--
-- Ce qui est créé :
--   • famille « Tremblay » (fictive), deux enfants fictifs validés (10 et 13 ans) ;
--   • assignation au coach → programme et 13 séances créés par le trigger 016 ;
--     séances 1 à 3 réalisées pour Léo, 1 pour Maya ;
--   • deux bilans de séance publiés au parent (coach_reports → parent_reports) ;
--   • un fil de messagerie coach ↔ parent avec 3 messages ;
--   • deux moments Maison dans le carnet de Léo.
--
-- Accès Maison : la famille est « accompagnée » (coach validé + enfant confirmé),
-- donc Maison est ouvert sans achat (access_state().p3_access). Pour tester
-- l'achat intégré, le reviewer crée un compte depuis l'app (voir notes au
-- reviewer dans docs/conformite-stores/declarations-stores.md §7).
--
-- Exécution : Supabase › SQL Editor (rôle postgres), sur la base de PRODUCTION
-- (Apple et Google testent la version publiée). Une seule transaction : tout ou rien.
-- 1. Remplacer le mot de passe ci-dessous (12 caractères min.) ;
-- 2. exécuter ; 3. reporter les identifiants dans App Store Connect et la Play Console ;
-- 4. NE PAS committer le mot de passe.
--
-- Pour recréer les comptes : les supprimer d'abord par l'espace admin
-- (admin-delete-user), puis relancer.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create extension if not exists pgcrypto;

do $$
declare
  -- ⚠️ À REMPLACER avant exécution — jamais committé.
  v_password   text := 'REMPLACER_PAR_UN_MOT_DE_PASSE_FORT';

  v_parent_email text := 'parent-test@thrivesportpositive.com';
  v_coach_email  text := 'coach-test@thrivesportpositive.com';
  v_parent uuid := gen_random_uuid();
  v_coach  uuid := gen_random_uuid();
  v_family uuid;
  v_leo    uuid;
  v_maya   uuid;
  v_conv   uuid;
  v_report uuid;
  v_session uuid;
  v_hash   text;
  v_now    timestamptz := now();
begin
  if v_password = 'REMPLACER_PAR_UN_MOT_DE_PASSE_FORT' or length(v_password) < 12 then
    raise exception 'Remplacez v_password par un mot de passe fort (12 caractères minimum).';
  end if;
  if exists (select 1 from auth.users where email in (v_parent_email, v_coach_email)) then
    raise exception 'Un compte de revue existe déjà : supprimez-le via admin-delete-user avant de relancer.';
  end if;

  v_hash := crypt(v_password, gen_salt('bf'));

  -- ── 1. Comptes d'authentification ─────────────────────────────────────────
  -- Rôle porté par app_metadata (autorité, migration 019) ET user_metadata
  -- (lu par handle_new_user pour créer le profil, migration 009).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values
  ('00000000-0000-0000-0000-000000000000', v_parent, 'authenticated', 'authenticated',
   v_parent_email, v_hash, v_now,
   jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'PARENT'),
   jsonb_build_object('firstName', 'Julie', 'lastName', 'Tremblay', 'role', 'PARENT',
                      'legal_version', '2026-10', 'legal_accepted_at', v_now, 'adult_guardian_confirmed', true),
   v_now, v_now, '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', v_coach, 'authenticated', 'authenticated',
   v_coach_email, v_hash, v_now,
   jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'COACH'),
   jsonb_build_object('firstName', 'Marc', 'lastName', 'Gagnon', 'role', 'COACH'),
   v_now, v_now, '', '', '', '', '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
  (gen_random_uuid(), v_parent, v_parent::text,
   jsonb_build_object('sub', v_parent::text, 'email', v_parent_email, 'email_verified', true),
   'email', v_now, v_now, v_now),
  (gen_random_uuid(), v_coach, v_coach::text,
   jsonb_build_object('sub', v_coach::text, 'email', v_coach_email, 'email_verified', true),
   'email', v_now, v_now, v_now);

  -- ── 2. Profils (créés par le trigger handle_new_user, complétés ici) ───────
  update public.profiles
     set first_name = 'Julie', last_name = 'Tremblay', role = 'PARENT',
         registration_status = 'approved', is_active = true,
         coach_validated = true, onboarding_completed = true,
         city = 'Montréal', province = 'QC'
   where id = v_parent;

  update public.profiles
     set first_name = 'Marc', last_name = 'Gagnon', role = 'COACH',
         registration_status = 'approved', is_active = true, onboarding_completed = true,
         speciality = 'Préparation mentale — soccer et hockey',
         bio = 'Coach THRIVE fictif utilisé pour la revue des stores.'
   where id = v_coach;

  -- ── 3. Famille et enfants (fictifs) ────────────────────────────────────────
  insert into public.families (name, parent_id, pack, city, province)
  values ('Tremblay', v_parent, 'PERFORMANCE', 'Montréal', 'QC')
  returning id into v_family;

  insert into public.children (family_id, first_name, last_name, date_of_birth, gender, sport,
                               is_active, validation_status, nickname)
  values (v_family, 'Léo', 'Tremblay', (current_date - interval '10 years 3 months')::date,
          'MALE', 'Soccer', true, 'CONFIRMED', 'Léo')
  returning id into v_leo;

  insert into public.children (family_id, first_name, last_name, date_of_birth, gender, sport,
                               is_active, validation_status, nickname)
  values (v_family, 'Maya', 'Tremblay', (current_date - interval '13 years 5 months')::date,
          'FEMALE', 'Hockey', true, 'CONFIRMED', 'Maya')
  returning id into v_maya;

  -- ── 4. Assignation au coach → programme + 13 séances (trigger 016) ─────────
  insert into public.coach_assignments (coach_id, child_id, is_active)
  values (v_coach, v_leo, true), (v_coach, v_maya, true);

  update public.sessions
     set status = 'COMPLETED',
         completed_at = v_now - ((4 - session_number) * interval '7 days'),
         scheduled_at = v_now - ((4 - session_number) * interval '7 days')
   where child_id = v_leo and session_number <= 3;

  update public.sessions
     set status = 'COMPLETED', completed_at = v_now - interval '5 days',
         scheduled_at = v_now - interval '5 days'
   where child_id = v_maya and session_number = 1;

  -- ── 5. Bilans de séance (version coach → version parent) ───────────────────
  select id into v_session from public.sessions where child_id = v_leo and session_number = 2;
  insert into public.coach_reports (child_id, coach_id, session_id, age_group, coach_message_parent,
                                    forces_via, performance_summary, life_skill_target, home_recommendations)
  values (v_leo, v_coach, v_session, '8-11',
          'Léo s''est fixé un objectif clair pour ses prochains matchs. Bravo pour son engagement !',
          'Persévérance, esprit d''équipe',
          'Séance centrée sur les objectifs : Léo a choisi un objectif de passes réussies.',
          'Fixer des objectifs',
          'Cette semaine, demandez-lui où il en est de son objectif après chaque entraînement.')
  returning id into v_report;
  insert into public.parent_reports (coach_report_id, child_id, detail_level, language, parent_visible_body)
  values (v_report, v_leo, 2, 'fr', jsonb_build_object(
    'session_number', 2, 'age_group', '8-11', 'detail_level', 2, 'template', null,
    'sections', jsonb_build_object(
      'message_coach', 'Léo s''est fixé un objectif clair pour ses prochains matchs. Bravo pour son engagement !',
      'forces', 'Persévérance, esprit d''équipe',
      'resume', 'Séance centrée sur les objectifs : Léo a choisi un objectif de passes réussies.',
      'objectif', 'Fixer des objectifs',
      'recommandations_maison', 'Cette semaine, demandez-lui où il en est de son objectif après chaque entraînement.')));

  select id into v_session from public.sessions where child_id = v_leo and session_number = 3;
  insert into public.coach_reports (child_id, coach_id, session_id, age_group, coach_message_parent,
                                    forces_via, performance_summary, life_skill_target, home_recommendations)
  values (v_leo, v_coach, v_session, '8-11',
          'Belle séance sur la confiance : Léo a osé prendre la parole devant le groupe.',
          'Courage, gentillesse',
          'Travail sur la confiance par de petits défis réussis.',
          'Confiance et courage',
          'Rappelez-lui un moment récent où il a osé quelque chose de nouveau.')
  returning id into v_report;
  insert into public.parent_reports (coach_report_id, child_id, detail_level, language, parent_visible_body)
  values (v_report, v_leo, 2, 'fr', jsonb_build_object(
    'session_number', 3, 'age_group', '8-11', 'detail_level', 2, 'template', null,
    'sections', jsonb_build_object(
      'message_coach', 'Belle séance sur la confiance : Léo a osé prendre la parole devant le groupe.',
      'forces', 'Courage, gentillesse',
      'resume', 'Travail sur la confiance par de petits défis réussis.',
      'objectif', 'Confiance et courage',
      'recommandations_maison', 'Rappelez-lui un moment récent où il a osé quelque chose de nouveau.')));

  -- ── 6. Messagerie coach ↔ parent ──────────────────────────────────────────
  insert into public.conversations (kind, parent_id, coach_id, child_id, family_id, last_message_at)
  values ('COACH', v_parent, v_coach, v_leo, v_family, v_now)
  returning id into v_conv;

  insert into public.messages (conversation_id, sender_id, content, created_at) values
  (v_conv, v_coach,  'Bonjour Julie, le bilan de la séance 3 de Léo est disponible dans l''onglet Bilans.', v_now - interval '2 days'),
  (v_conv, v_parent, 'Merci Marc ! Il était très fier en rentrant.', v_now - interval '2 days' + interval '1 hour'),
  (v_conv, v_coach,  'Super. On se voit mardi pour la séance 4.', v_now - interval '1 day');

  -- ── 7. Carnet Maison de Léo ───────────────────────────────────────────────
  insert into public.p3_moments (child_id, parent_id, activity_id, week, duration_chosen, place, outcome, kept_phrase, created_at)
  values
  (v_leo, v_parent, 'ACT-0101', 1, 10, 'maison', 'ACCROCHE', 'Il a souri à la troisième chose.', v_now - interval '3 days'),
  (v_leo, v_parent, 'ACT-0102', 1, 10, 'maison', 'MOYEN', null, v_now - interval '1 day');

  raise notice 'Comptes de revue créés : parent % · coach %', v_parent, v_coach;
end $$;

-- Contrôle : doit renvoyer 2 lignes, rôles PARENT et COACH.
select u.email, u.raw_app_meta_data->>'role' as app_role, p.role as profile_role, p.coach_validated
from auth.users u join public.profiles p on p.id = u.id
where u.email in ('parent-test@thrivesportpositive.com', 'coach-test@thrivesportpositive.com');

commit;

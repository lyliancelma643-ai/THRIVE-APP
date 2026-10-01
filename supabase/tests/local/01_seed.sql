-- Jeu de données SYNTHÉTIQUE (aucune donnée réelle) pour les tests de sécurité.
-- Deux familles, deux coachs (dont un sans aucun enfant), un admin, un super admin.

insert into public.plans (code, label, price_cents, features, limits) values
 ('ESSENTIEL', 'Essentiel', 0,
  '{"coachLetter":false,"emotionWheel":false,"coachMessaging":false,"skillBreakdown":false,"progressJournal":false}',
  '{"maxParents":1,"detailLevel":1,"maxChildren":1}'),
 ('AVANCE', 'Avancé', 1000,
  '{"coachLetter":true,"emotionWheel":true,"coachMessaging":false,"skillBreakdown":true,"progressJournal":true}',
  '{"maxParents":2,"detailLevel":2,"maxChildren":2}'),
 ('PERFORMANCE', 'Performance', 2000,
  '{"coachLetter":true,"emotionWheel":true,"coachMessaging":true,"skillBreakdown":true,"progressJournal":true}',
  '{"maxParents":null,"detailLevel":3,"maxChildren":null}');
insert into public.app_settings (key, enabled) values ('fitness_enabled', true), ('p3_enabled', true);

insert into public.profiles (id, email, role, coach_validated, created_at) values
 ('00000000-0000-0000-0000-0000000000a1', 'admin@test.invalid',   'ADMIN',       false, now() - interval '9 days'),
 ('00000000-0000-0000-0000-0000000000a2', 'super@test.invalid',   'SUPER_ADMIN', false, now() - interval '9 days'),
 ('00000000-0000-0000-0000-0000000000c1', 'coach-a@test.invalid', 'COACH',       false, now() - interval '8 days'),
 ('00000000-0000-0000-0000-0000000000c2', 'coach-b@test.invalid', 'COACH',       false, now() - interval '7 days'),
 ('00000000-0000-0000-0000-0000000000b1', 'parent-p@test.invalid','PARENT',      true,  now() - interval '6 days'),
 ('00000000-0000-0000-0000-0000000000b2', 'parent-q@test.invalid','PARENT',      true,  now() - interval '5 days');

insert into public.families (id, name, parent_id, pack, created_at) values
 ('00000000-0000-0000-0000-0000000000f1', 'Famille P', '00000000-0000-0000-0000-0000000000b1', 'AVANCE', now() - interval '6 days'),
 ('00000000-0000-0000-0000-0000000000f2', 'Famille Q', '00000000-0000-0000-0000-0000000000b2', 'AVANCE', now() - interval '5 days');

insert into public.children (id, family_id, first_name, last_name, date_of_birth, validation_status) values
 ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 'Enfant', 'P', '2015-01-01', 'CONFIRMED'),
 ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f2', 'Enfant', 'Q', '2014-01-01', 'CONFIRMED');

-- coach_a suit les deux enfants ; coach_b ne suit personne
insert into public.coach_assignments (coach_id, child_id) values
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');

insert into public.programs (id, title, age_group, status, coach_id) values
 ('00000000-0000-0000-0000-0000000000e1', 'Programme A', '8-11', 'ACTIVE', '00000000-0000-0000-0000-0000000000c1');
insert into public.program_enrollments (program_id, child_id) values
 ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1'),
 ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2');

insert into public.sessions (program_id, child_id, session_number, title)
select '00000000-0000-0000-0000-0000000000e1', k, n, 'Séance ' || n
from unnest(array['00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2']::uuid[]) k,
     generate_series(1, 3) n;

insert into public.coach_reports (id, child_id, coach_id) values
 ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1'),
 ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1');
insert into public.parent_reports (coach_report_id, child_id) values
 ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000d1'),
 ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000d2');

insert into public.video_sessions (id, session_number, phase, title, age_group, theme) values
 ('00000000-0000-0000-0000-000000000021', 1, 'ANCRER', 'Vidéo 1', '8-11', 'confiance');
insert into public.video_session_runs (video_session_id, child_id, parent_id) values
 ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2');

insert into public.questionnaires (child_id, kind, access_token, status) values
 ('00000000-0000-0000-0000-0000000000d1', 'LSSS', gen_random_uuid(), 'COMPLETED'),
 ('00000000-0000-0000-0000-0000000000d2', 'LSSS', gen_random_uuid(), 'PENDING');

insert into public.skill_scores (child_id, skill_key, source, value) values
 ('00000000-0000-0000-0000-0000000000d1', 'confiance', 'MANUAL', 60),
 ('00000000-0000-0000-0000-0000000000d2', 'confiance', 'MANUAL', 70);

-- Triggers d'inscription (posés après le seed, comme en production)
create trigger trg_set_signup_app_role before insert on auth.users
  for each row execute function public.set_signup_app_role();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

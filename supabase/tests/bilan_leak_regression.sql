-- ════════════════════════════════════════════════════════════════════════════
-- Fuite F1 (diagnostic 2026-10) : un parent SANS AUCUN DROIT (ni pack, ni
-- abonnement, ni activation) lisait le dossier Bilan de son enfant via l'API.
-- N'utilise que des objets antérieurs à 080 : rejouable AVANT (doit échouer)
-- et APRÈS la migration 080 (doit passer).
--   BILAN_LEAK_FIXED {…}   ou   BILAN_LEAK_PRESENT {…}
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  co uuid := gen_random_uuid(); par uuid := gen_random_uuid();
  fam uuid; kid uuid; prog uuid; leaks jsonb := '{}'::jsonb; n int; t text;
begin
  insert into public.profiles (id, email, first_name, last_name, role, coach_validated) values
    (co, 'leak-co@example.test', 'C', 'C', 'COACH', true),
    (par, 'leak-p@example.test', 'P', 'P', 'PARENT', false);
  insert into public.families (name, parent_id) values ('F', par) returning id into fam;
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    values (fam, 'k', 'k', date '2015-01-01', 'CONFIRMED') returning id into kid;
  insert into public.programs (title, age_group, coach_id, status) values ('P', '8-11', co, 'ACTIVE') returning id into prog;
  insert into public.questionnaires (child_id, kind) values (kid, 'PERMA');
  insert into public.athlete_identity (child_id) values (kid);
  insert into public.athlete_objectives (child_id, title) values (kid, 'o');
  insert into public.athlete_next_steps (child_id, label) values (kid, 'n');
  insert into public.focus_word_history (child_id, word) values (kid, 'w');
  insert into public.skill_scores (child_id, skill_key, source, value) values (kid, 'k', 'X', 50);

  perform set_config('request.jwt.claims', json_build_object('sub', par, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  foreach t in array array['questionnaires', 'athlete_identity', 'athlete_objectives',
                           'athlete_next_steps', 'focus_word_history'] loop
    set local role authenticated;
    execute format('select count(*) from public.%I', t) into n;
    reset role;
    if n > 0 then leaks := leaks || jsonb_build_object(t, n); end if;
  end loop;
  set local role authenticated;
  select (public.gauge_summary(kid) ->> 'sample_size')::int into n;
  reset role;
  if n > 0 then leaks := leaks || jsonb_build_object('gauge_summary', n); end if;

  if leaks <> '{}'::jsonb then
    raise exception 'BILAN_LEAK_PRESENT %', leaks;
  end if;
  raise exception 'BILAN_LEAK_FIXED {}';
end
$test$;

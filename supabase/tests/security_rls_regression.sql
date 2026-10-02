-- ════════════════════════════════════════════════════════════════════════════
-- Tests de régression sécurité (audit final, migration 066).
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception : toutes les
-- écritures de test (familles, programmes, comptes simulés…) sont annulées.
-- Le message final vaut :
--   SECURITY_TESTS_PASSED {…}            → tout est conforme
--   SECURITY_TESTS_FAILED [échecs] {…}   → au moins une régression
--
-- Exécution : psql "$DB_URL" -f supabase/tests/security_rls_regression.sql
--   (base locale / branche Supabase / prod en lecture : rien n'est conservé).
-- Pré-requis : au moins 2 coachs, 1 parent avec enfant, 1 admin en base.
-- Identités simulées via request.jwt.claims + SET LOCAL ROLE authenticated,
-- exactement comme PostgREST le fait pour un vrai client.
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  coach_a uuid; coach_b uuid; parent_p uuid; admin_u uuid;
  kid_a uuid;           -- enfant suivi par coach_a et absent du périmètre de coach_b
  kid_p uuid;           -- un enfant de parent_p
  fam_new uuid; prog uuid; new_user uuid := gen_random_uuid();
  n int; legit int; ok boolean; t text;
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
begin
  select id into coach_a from public.profiles p where role = 'COACH'
    and exists (select 1 from public.coach_assignments ca where ca.coach_id = p.id and ca.is_active)
    order by created_at limit 1;
  select id into coach_b from public.profiles where role = 'COACH' and id <> coach_a order by created_at limit 1;
  select f.parent_id, c.id into parent_p, kid_p from public.families f
    join public.children c on c.family_id = f.id order by f.created_at limit 1;
  select id into admin_u from public.profiles where role = 'ADMIN' order by created_at limit 1;
  select ca.child_id into kid_a from public.coach_assignments ca
    where ca.coach_id = coach_a and ca.is_active
      and not exists (select 1 from public.coach_assignments x where x.child_id = ca.child_id and x.coach_id = coach_b and x.is_active)
      and not exists (select 1 from public.program_enrollments pe join public.programs pr on pr.id = pe.program_id
                      where pe.child_id = ca.child_id and pr.coach_id = coach_b)
    limit 1;
  if coach_a is null or coach_b is null or parent_p is null or admin_u is null or kid_a is null then
    raise exception 'SECURITY_TESTS_SKIPPED données insuffisantes (2 coachs, 1 parent, 1 admin requis)';
  end if;

  -- ── T1 · coach_b (étranger à kid_a) ne lit rien de kid_a ──────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', coach_b, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  foreach t in array array['sessions','parent_reports','video_session_runs','questionnaires','coach_reports','child_badges','skill_scores','athlete_identity'] loop
    execute format('select count(*) from public.%I where child_id = $1', t) into n using kid_a;
    res := res || jsonb_build_object('T1_coach_b_' || t, n);
    if n > 0 then fails := fails || ('T1 coach étranger lit ' || t); end if;
  end loop;
  select count(*) into n from public.children where id = kid_a;
  if n > 0 then fails := fails || 'T1 coach étranger lit children'::text; end if;

  -- ── T2 · coach_b ne peut pas s'inscrire kid_a dans un programme ──────────
  begin
    insert into public.programs (id, coach_id, title, age_group)
      values (gen_random_uuid(), coach_b, 'audit-test', '8-11')
      returning id into prog;
    insert into public.program_enrollments (program_id, child_id) values (prog, kid_a);
    fails := fails || 'T2 inscription programme sur enfant non assigné acceptée'::text;
  exception when insufficient_privilege then
    res := res || jsonb_build_object('T2_enroll_blocked', true);
  end;

  -- ── T3 · coach_b ne peut pas écrire de bilan sur kid_a ───────────────────
  begin
    insert into public.coach_reports (child_id, coach_id) values (kid_a, coach_b);
    fails := fails || 'T3 coach_report sur enfant non suivi accepté'::text;
  exception when insufficient_privilege then
    res := res || jsonb_build_object('T3_coach_report_blocked', true);
  end;
  reset role;

  -- ── T4 · non-régression : coach_a voit toujours les données de kid_a ─────
  select count(*) into legit from public.sessions where child_id = kid_a;
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  select count(*) into n from public.sessions where child_id = kid_a;
  res := res || jsonb_build_object('T4_coach_a_sessions', n, 'T4_legit', legit);
  if n <> legit then fails := fails || 'T4 coach assigné ne voit plus ses séances'::text; end if;
  select count(*) into n from public.children where id = kid_a;
  if n <> 1 then fails := fails || 'T4 coach assigné ne voit plus son enfant'::text; end if;
  reset role;

  -- ── T5 · parent : pas de fuite inter-familles ────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', parent_p, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  foreach t in array array['sessions','parent_reports','video_session_runs','questionnaires','child_badges'] loop
    execute format('select count(*) from public.%I x where not private.is_parent_of_child(x.child_id)', t) into n;
    res := res || jsonb_build_object('T5_parent_foreign_' || t, n);
    if n > 0 then fails := fails || ('T5 parent lit ' || t || ' d''une autre famille'); end if;
  end loop;

  -- ── T6 · parent : contournement du forfait ───────────────────────────────
  begin
    insert into public.families (id, parent_id, name, pack)
      values (gen_random_uuid(), parent_p, 'audit', 'PERFORMANCE') returning id into fam_new;
    select pack into t from public.families where id = fam_new;
    res := res || jsonb_build_object('T6_inserted_pack', t);
    if t <> 'ESSENTIEL' then fails := fails || 'T6 famille créée avec un pack payant'::text; end if;
  exception when others then
    res := res || jsonb_build_object('T6_insert_family_error', sqlerrm);
  end;
  begin
    update public.children set family_id = coalesce(fam_new, family_id) where id = kid_p;
    if fam_new is not null then fails := fails || 'T6 enfant déplacé vers une autre famille'::text; end if;
  exception when insufficient_privilege then
    res := res || jsonb_build_object('T6_move_child_blocked', true);
  end;

  -- ── T7 · parent : auto-validation (enfant / compte) ──────────────────────
  begin
    update public.children
       set validation_status = case when validation_status = 'CONFIRMED' then 'PENDING' else 'CONFIRMED' end
     where id = kid_p;
    get diagnostics n = row_count;
    if n > 0 then fails := fails || 'T7 parent confirme lui-même son enfant'::text; end if;
    res := res || jsonb_build_object('T7_child_confirm_rows', n);
  exception when insufficient_privilege then
    res := res || jsonb_build_object('T7_child_confirm_blocked', true);
  end;
  begin
    update public.profiles set coach_validated = not coach_validated where id = parent_p;
    fails := fails || 'T7 parent modifie coach_validated'::text;
  exception
    when insufficient_privilege then
      res := res || jsonb_build_object('T7_coach_validated_blocked', true);
    when others then  -- ex. récursion RLS : bloqué, mais par accident (voir T8)
      res := res || jsonb_build_object('T7_coach_validated_error', sqlerrm);
  end;
  begin
    update public.profiles set role = 'ADMIN' where id = parent_p;
    fails := fails || 'T7 parent se nomme ADMIN'::text;
  exception
    when check_violation or insufficient_privilege then
      res := res || jsonb_build_object('T7_role_escalation_blocked', true);
    when others then
      res := res || jsonb_build_object('T7_role_escalation_error', sqlerrm);
  end;

  -- ── T8 · non-régression : un parent peut modifier son propre profil ──────
  begin
    update public.profiles set notifications_enabled = notifications_enabled where id = parent_p;
    get diagnostics n = row_count;
    res := res || jsonb_build_object('T8_self_profile_update_rows', n);
    if n <> 1 then fails := fails || 'T8 mise à jour de son propre profil impossible'::text; end if;
  exception when others then
    fails := fails || ('T8 mise à jour de son propre profil en erreur : ' || sqlerrm);
  end;
  reset role;

  -- ── T9 · admin : validation toujours possible ────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  begin
    perform public.confirm_child(kid_p);
    update public.profiles set coach_validated = coach_validated where id = parent_p;
    res := res || jsonb_build_object('T9_admin_validation_ok', true);
  exception when others then
    fails := fails || ('T9 validation admin cassée : ' || sqlerrm);
  end;
  reset role;

  -- ── T10 · anon : aucune table lisible, liste d'attente seule ─────────────
  set local role anon;
  begin
    perform 1 from public.children limit 1;
    fails := fails || 'T10 anon lit children'::text;
  exception when insufficient_privilege then
    res := res || jsonb_build_object('T10_anon_children_denied', true);
  end;
  reset role;
  if not has_table_privilege('anon', 'public.waitlist', 'INSERT') then
    fails := fails || 'T10 anon ne peut plus s''inscrire en liste d''attente'::text;
  end if;

  -- ── T13 · coach désassigné : l'accès « coach de programme » est coupé ───
  update public.coach_assignments set is_active = false where coach_id = coach_a and child_id = kid_a;
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  select count(*) into n from public.children where id = kid_a;
  res := res || jsonb_build_object('T13_unassigned_coach_child_rows', n);
  if n > 0 then fails := fails || 'T13 coach désassigné garde l''accès à l''enfant'::text; end if;
  reset role;
  update public.coach_assignments set is_active = true where coach_id = coach_a and child_id = kid_a;

  -- ── T12 · non-régression des parcours légitimes ──────────────────────────
  -- Parent : lit les séances / bilans de SON enfant, ajoute un enfant.
  perform set_config('request.jwt.claims', json_build_object('sub', parent_p, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  select count(*) into n from public.sessions where child_id = kid_p;
  reset role;
  select count(*) into legit from public.sessions where child_id = kid_p;
  res := res || jsonb_build_object('T12_parent_own_sessions', n, 'T12_parent_own_legit', legit);
  if private.parent_access_unlocked(parent_p) and n <> legit then
    fails := fails || 'T12 parent débloqué ne voit plus les séances de son enfant'::text;
  end if;
  set local role authenticated;
  begin
    insert into public.children (family_id, first_name, last_name, date_of_birth)
      select c.family_id, 'Audit', 'Test', current_date - 3650 from public.children c where c.id = kid_p;
    res := res || jsonb_build_object('T12_parent_add_child', 'ok');
  exception
    when check_violation then  -- quota du forfait atteint : refus métier légitime
      res := res || jsonb_build_object('T12_parent_add_child', 'quota');
    when others then
      fails := fails || ('T12 parent ne peut plus ajouter d''enfant : ' || sqlerrm);
  end;
  reset role;
  -- Coach assigné : inscrit son enfant dans son programme, valide le parent.
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  begin
    insert into public.programs (id, coach_id, title, age_group)
      values (gen_random_uuid(), coach_a, 'audit-test', '8-11') returning id into prog;
    insert into public.program_enrollments (program_id, child_id) values (prog, kid_a);
    res := res || jsonb_build_object('T12_coach_enroll_own_child', 'ok');
  exception when others then
    fails := fails || ('T12 coach assigné ne peut plus inscrire son enfant : ' || sqlerrm);
  end;
  begin
    perform public.validate_parent_access(f.parent_id)
      from public.children c join public.families f on f.id = c.family_id where c.id = kid_a;
    res := res || jsonb_build_object('T12_coach_validate_parent', 'ok');
  exception when others then
    fails := fails || ('T12 coach assigné ne peut plus valider le parent : ' || sqlerrm);
  end;
  reset role;

  -- ── T11 · auto-inscription avec user_metadata.role = COACH ───────────────
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (new_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'audit-' || new_user || '@example.invalid',
            jsonb_build_object('role', 'COACH', 'firstName', 'Audit'), now(), now());
  select role::text into t from public.profiles where id = new_user;
  res := res || jsonb_build_object('T11_signup_profile_role', t);
  if t is distinct from 'PARENT' then fails := fails || ('T11 auto-inscription obtient le rôle ' || coalesce(t, 'NULL')); end if;
  -- ── T14 · Loi 25 : l'auto-inscription n'est pas confirmée d'office ───────
  select (email_confirmed_at is not null)::text into t from auth.users where id = new_user;
  res := res || jsonb_build_object('T14_signup_auto_confirmed', t);
  if t = 'true' then fails := fails || 'T14 e-mail confirmé automatiquement à l''inscription'::text; end if;

  if array_length(fails, 1) > 0 then
    raise exception 'SECURITY_TESTS_FAILED % %', fails, res;
  end if;
  raise exception 'SECURITY_TESTS_PASSED %', res;
end
$test$;

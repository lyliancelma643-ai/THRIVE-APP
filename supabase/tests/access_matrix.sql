-- ════════════════════════════════════════════════════════════════════════════
-- Matrice d'accès parents (migrations 068 + 070) — pack programme × niveau de
-- bilan × abonnement (réel / sandbox / QA) × forçage × co-parent × staff.
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   ACCESS_MATRIX_PASSED {…}   ou   ACCESS_MATRIX_FAILED [échecs] {…}
-- Exécution (base jetable avec les migrations, cf. supabase/tests/local/run.sh) :
--   psql -d <db> -f supabase/tests/access_matrix.sql
-- Données 100 % synthétiques créées en superuser, lues ensuite sous le rôle
-- `authenticated` avec des claims JWT simulés (comme PostgREST).
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
  admin_u uuid := gen_random_uuid();
  coach_u uuid := gen_random_uuid();
  -- parents : a=aucun droit, b=activé, c=abonné, d=abonné sandbox, e=sandbox QA (@thrive),
  --           f=forçage ouvert, g=activé+forçage bilan fermé, h=owner activé+abonné (co-parent i)
  pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid(); pc uuid := gen_random_uuid();
  pd uuid := gen_random_uuid(); pe uuid := gen_random_uuid(); pf uuid := gen_random_uuid();
  pg uuid := gen_random_uuid(); ph uuid := gen_random_uuid(); pi uuid := gen_random_uuid();
  fam uuid; st jsonb; n int;

  procedure_dummy int;
begin
  -- ── Données ────────────────────────────────────────────────────────────────
  insert into public.profiles (id, email, first_name, last_name, role, coach_validated) values
    (admin_u, 'adm@example.test', 'A', 'A', 'ADMIN', true),
    (coach_u, 'coach@example.test', 'C', 'C', 'COACH', true),
    (pa, 'a@example.test', 'a', 'a', 'PARENT', false),
    (pb, 'b@example.test', 'b', 'b', 'PARENT', true),
    (pc, 'c@example.test', 'c', 'c', 'PARENT', false),
    (pd, 'd@example.test', 'd', 'd', 'PARENT', false),
    (pe, 'e@thrivesportpositive.com', 'e', 'e', 'PARENT', false),
    (pf, 'f@example.test', 'f', 'f', 'PARENT', false),
    (pg, 'g@example.test', 'g', 'g', 'PARENT', true),
    (ph, 'h@example.test', 'h', 'h', 'PARENT', true),
    (pi, 'i@example.test', 'i', 'i', 'PARENT', false);

  -- une famille + un enfant confirmé par parent (pack de bilan : b=AVANCE, h=PERFORMANCE)
  for fam in select 1 loop null; end loop;
  insert into public.families (name, parent_id, pack)
    select 'F-' || left(p::text, 4), p,
           case when p = pb then 'AVANCE' when p = ph then 'PERFORMANCE' else 'ESSENTIEL' end
    from unnest(array[pa,pb,pc,pd,pe,pf,pg,ph]) p;
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    select f.id, 'k', 'k', date '2015-01-01', 'CONFIRMED' from public.families f
    where f.parent_id in (pa,pb,pc,pd,pe,pf,pg,ph);
  -- co-parent i de la famille de h (membre non OWNER)
  insert into public.family_members (family_id, profile_id, member_role)
    select id, pi, 'PARENT' from public.families where parent_id = ph;

  insert into public.billing_subscriptions (user_id, active, is_sandbox, store, expires_at) values
    (pc, true, false, 'stripe', now() + interval '30 days'),
    (pd, true, true,  'app_store', now() + interval '30 days'),
    (pe, true, true,  'app_store', now() + interval '30 days'),
    (ph, true, false, 'stripe', now() + interval '30 days');
  insert into public.parent_access (parent_id, program_pack, maison, bilan) values
    (pf, 'COMPLET', true, null),
    (pg, 'INDIVIDUEL', null, false);

  -- ── Vérifs access_state() par parent ──────────────────────────────────────
  -- (parent, maison, bilan, seances, niveau bilan)
  declare
    cases record;
  begin
    for cases in
      select * from (values
        (pa, false, false, false, 'ESSENTIEL'),   -- rien
        (pb, false, true,  true,  'AVANCE'),      -- activé par le coach, pas d'abonnement (067b)
        (pc, true,  false, false, 'ESSENTIEL'),   -- Maison seul : que Maison
        (pd, false, false, false, 'ESSENTIEL'),   -- sandbox ignoré
        (pe, true,  false, false, 'ESSENTIEL'),   -- sandbox accepté pour @thrivesportpositive.com
        (pf, true,  false, false, 'ESSENTIEL'),   -- forçage Maison ouvert
        (pg, false, false, true,  'ESSENTIEL'),   -- forçage bilan fermé, séances suit l'activation
        (ph, true,  true,  true,  'PERFORMANCE'), -- titulaire activé + abonné
        (pi, true,  true,  true,  'PERFORMANCE')  -- co-parent : hérite activation + abonnement
      ) as t(uid, maison, bilan, seances, lvl)
    loop
      perform set_config('request.jwt.claims', json_build_object('sub', cases.uid, 'role', 'authenticated',
        'app_metadata', json_build_object('role', 'PARENT'))::text, true);
      set local role authenticated;
      st := public.access_state();
      reset role;
      if (st #>> '{sections,maison}')::boolean  is distinct from cases.maison
      or (st #>> '{sections,bilan}')::boolean   is distinct from cases.bilan
      or (st #>> '{sections,seances}')::boolean is distinct from cases.seances
      or (st ->> 'bilan_level') is distinct from cases.lvl
      or (st ->> 'p3_access')::boolean is distinct from cases.maison
      or (st ->> 'is_staff')::boolean is distinct from false then
        fails := fails || ('access_state ' || left(cases.uid::text, 4) || ' ' || st::text);
      end if;
      res := res || jsonb_build_object('state_' || left(cases.uid::text, 4), st -> 'sections');

      -- RLS : sessions / parent_reports lisibles ssi Bilan ou Séances ouvert
      perform set_config('request.jwt.claims', json_build_object('sub', cases.uid, 'role', 'authenticated',
        'app_metadata', json_build_object('role', 'PARENT'))::text, true);
      set local role authenticated;
      select count(*) into n from public.sessions;
      reset role;
      -- (aucune séance synthétique : n doit simplement ne pas lever d'erreur de politique)
    end loop;
  end;

  -- ── Isolation : un parent ne lit ni parent_access d'autrui, ni ses droits ──
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  select count(*) into n from public.parent_access;
  if n > 0 then fails := fails || 'parent lit parent_access'; end if;
  if private.parent_section_access(pf, 'maison') then fails := fails || 'fuite parent_section_access(autrui)'; end if;
  select count(*) into n from public.qa_accounts;
  if n > 0 then fails := fails || 'parent lit qa_accounts'; end if;
  begin
    insert into public.parent_access (parent_id, maison) values (pa, true);
    fails := fails || 'parent écrit parent_access';
  exception when others then null; end;
  reset role;

  -- ── Admin lit la matrice effective ───────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  select count(*) into n from public.admin_parent_access_list() where parent_id = pf and eff_maison;
  if n <> 1 then fails := fails || 'admin_parent_access_list eff_maison forcé'; end if;
  reset role;

  -- ── Staff ────────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', coach_u, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  st := public.access_state();
  reset role;
  if (st ->> 'is_staff')::boolean is not true or (st ->> 'p3_access')::boolean is not true then
    fails := fails || 'staff access_state';
  end if;

  if array_length(fails, 1) > 0 then
    raise exception 'ACCESS_MATRIX_FAILED % %', fails, res;
  end if;
  raise exception 'ACCESS_MATRIX_PASSED %', res;
end
$test$;

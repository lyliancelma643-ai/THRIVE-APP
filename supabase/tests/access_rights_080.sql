-- ════════════════════════════════════════════════════════════════════════════
-- Droits d'accès parents — migration 080 (calcul unique, packs datés,
-- overrides Super Admin, RLS Bilan / Mes séances, audit).
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   ACCESS_080_PASSED {…}   ou   ACCESS_080_FAILED [échecs] {…}
-- Exécution : base jetable (supabase/tests/local/run-pglite.mjs ou run.sh).
-- Données synthétiques ; lectures sous le rôle `authenticated` avec des claims
-- JWT simulés, comme PostgREST (= « vrai JWT » côté base).
--
-- Scénarios (numéros du cahier de recette) :
--   S1-3  pack Individuel / Groupe / Complet → 3 sections, sans abonnement
--   S4    fin de pack → Maison fermée, Bilan / Séances en lecture seule (défaut)
--         + variante « floute » + délai de grâce
--   S5/6  abonnement Maison (Stripe / App Store) → Maison seule
--   S7    abonnement expiré → Maison fermée
--   S8    essai déjà consommé → trial_used
--   S9    Maison seul / aucun droit → 0 ligne Bilan / Séances via l'API
--   S10   override « Maison ouverte » expirant → ouvert puis fermé
--   S11   override « Maison fermée » sur pack → fermé, un webhook ne rouvre pas
--   S12   Admin / Coach / Parent ne peuvent pas écrire d'override
--   S13   pack + abonnement → accès, signalement, rien d'annulé
--   + B3 (ESSENTIEL ne crée plus de pack), B5 (cartes Maison), audit, temps réel
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
  today date := (now() at time zone 'America/Toronto')::date;
  sa  uuid := gen_random_uuid();   -- super admin
  adm uuid := gen_random_uuid();   -- admin
  co  uuid := gen_random_uuid();   -- coach
  p_ind uuid := gen_random_uuid(); p_grp uuid := gen_random_uuid(); p_cpl uuid := gen_random_uuid();
  p_end uuid := gen_random_uuid(); p_sub uuid := gen_random_uuid(); p_app uuid := gen_random_uuid();
  p_exp uuid := gen_random_uuid(); p_none uuid := gen_random_uuid(); p_ov uuid := gen_random_uuid();
  p_cl uuid := gen_random_uuid(); p_both uuid := gen_random_uuid(); p_co uuid := gen_random_uuid();
  p_sbx uuid := gen_random_uuid(); p_qa uuid := gen_random_uuid(); p_cosub uuid := gen_random_uuid();
  prog uuid; kid uuid; cr uuid; sess uuid;
  st jsonb; n int; v uuid; ok boolean; ver bigint;
begin
  -- ── Données ────────────────────────────────────────────────────────────────
  insert into public.profiles (id, email, first_name, last_name, role, coach_validated) values
    (sa,  'sa@example.test',  'S', 'A', 'SUPER_ADMIN', true),
    (adm, 'adm@example.test', 'A', 'A', 'ADMIN', true),
    (co,  'co@example.test',  'C', 'C', 'COACH', true),
    (p_ind, 'ind@example.test', 'i', 'i', 'PARENT', false),
    (p_grp, 'grp@example.test', 'g', 'g', 'PARENT', false),
    (p_cpl, 'cpl@example.test', 'c', 'c', 'PARENT', false),
    (p_end, 'end@example.test', 'e', 'e', 'PARENT', true),
    (p_sub, 'sub@example.test', 's', 's', 'PARENT', true),   -- activé coach mais SANS pack
    (p_app, 'app@example.test', 'a', 'a', 'PARENT', false),
    (p_exp, 'exp@example.test', 'x', 'x', 'PARENT', false),
    (p_none,'none@example.test','n', 'n', 'PARENT', false),
    (p_ov,  'ov@example.test',  'o', 'o', 'PARENT', false),
    (p_cl,  'cl@example.test',  'l', 'l', 'PARENT', false),
    (p_both,'both@example.test','b', 'b', 'PARENT', false),
    (p_co,  'coparent@example.test','k','k','PARENT', false),
    (p_sbx, 'sbx@example.test', 'x', 'x', 'PARENT', false),               -- achat sandbox ignoré
    (p_qa,  'qa@thrivesportpositive.com', 'q', 'q', 'PARENT', false),     -- sandbox QA accepté
    (p_cosub, 'cosub@example.test', 'y', 'y', 'PARENT', false);           -- co-parent d'un abonné

  insert into public.families (name, parent_id)
    select 'F-' || left(p::text, 4), p
    from unnest(array[p_ind,p_grp,p_cpl,p_end,p_sub,p_app,p_exp,p_none,p_ov,p_cl,p_both]) p;
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    select f.id, 'k', 'k', date '2015-01-01', 'CONFIRMED' from public.families f
    where f.parent_id in (p_ind,p_grp,p_cpl,p_end,p_sub,p_app,p_exp,p_none,p_ov,p_cl,p_both);
  -- co-parent de la famille du pack Complet
  insert into public.family_members (family_id, profile_id, member_role)
    select id, p_co, 'PARENT' from public.families where parent_id = p_cpl;
  -- co-parent de la famille de l'abonné Maison seul (partage de l'abonnement, 066d)
  insert into public.family_members (family_id, profile_id, member_role)
    select id, p_cosub, 'PARENT' from public.families where parent_id = p_sub;

  -- Données de Bilan / Séances pour CHAQUE enfant (pour mesurer les fuites)
  insert into public.programs (title, age_group, coach_id, status) values ('P', '8-11', co, 'ACTIVE') returning id into prog;
  for kid in select id from public.children loop
    insert into public.sessions (program_id, child_id, session_number, title) values (prog, kid, 1, 'S1') returning id into sess;
    insert into public.questionnaires (child_id, session_id, kind) values (kid, sess, 'PERMA');
    insert into public.athlete_identity (child_id) values (kid);
    insert into public.athlete_objectives (child_id, title) values (kid, 'o');
    insert into public.athlete_next_steps (child_id, label) values (kid, 'n');
    insert into public.focus_word_history (child_id, word) values (kid, 'w');
    insert into public.skill_scores (child_id, skill_key, source, value) values (kid, 'k', 'X', 50);
    insert into public.coach_reports (child_id, coach_id, session_id) values (kid, co, sess) returning id into cr;
    insert into public.parent_reports (coach_report_id, child_id) values (cr, kid);
  end loop;

  -- Packs (S1-S4, S11, S13)
  insert into public.pack_enrollments (parent_id, pack, starts_on, ends_on, source) values
    (p_ind,  'INDIVIDUEL', today - 10, today + 60, 'admin'),
    (p_grp,  'GROUPE',     today - 10, null,       'admin'),
    (p_cpl,  'COMPLET',    today - 10, today + 60, 'admin'),
    (p_end,  'GROUPE',     today - 90, today - 1,  'admin'),
    (p_cl,   'COMPLET',    today - 10, null,       'admin'),
    (p_both, 'INDIVIDUEL', today - 10, today + 30, 'admin');

  -- Abonnements (S5, S6, S7, S13) + essai consommé (S8)
  insert into public.billing_subscriptions (user_id, active, is_sandbox, store, expires_at, ever_subscribed) values
    (p_sub,  true,  false, 'stripe',    now() + interval '30 days', true),
    (p_app,  true,  false, 'app_store', now() + interval '30 days', true),
    (p_exp,  true,  false, 'stripe',    now() - interval '1 day',   true),   -- essai / abonnement échu
    (p_both, true,  false, 'stripe',    now() + interval '300 days', true),
    (p_sbx,  true,  true,  'app_store', now() + interval '30 days', true),
    (p_qa,   true,  true,  'app_store', now() + interval '30 days', true);

  -- ── Vérifs access_state() ──────────────────────────────────────────────────
  declare c record;
  begin
    for c in
      select * from (values
        -- uid, maison, bilan, seances, bilan_mode, src_maison, pack
        (p_ind,  true,  true,  true,  'complet',    'pack',       'individuel', 'S1'),
        (p_grp,  true,  true,  true,  'complet',    'pack',       'groupe',     'S2'),
        (p_cpl,  true,  true,  true,  'complet',    'pack',       'complet',    'S3'),
        (p_co,   true,  true,  true,  'complet',    'pack',       'complet',    'S3-coparent'),
        (p_end,  false, true,  true,  'lecture',    'aucune',     null,         'S4'),
        (p_sub,  true,  false, false, 'verrouille', 'abonnement', null,         'S5'),
        (p_app,  true,  false, false, 'verrouille', 'abonnement', null,         'S6'),
        (p_exp,  false, false, false, 'verrouille', 'aucune',     null,         'S7'),
        (p_none, false, false, false, 'verrouille', 'aucune',     null,         'S9-none'),
        (p_both, true,  true,  true,  'complet',    'pack',       'individuel', 'S13'),
        (p_sbx,  false, false, false, 'verrouille', 'aucune',     null,         'sandbox-ignore'),
        (p_qa,   true,  false, false, 'verrouille', 'abonnement', null,         'sandbox-qa'),
        (p_cosub,true,  false, false, 'verrouille', 'abonnement', null,         'coparent-abonnement')
      ) as t(uid, maison, bilan, seances, mode, src, pack, label)
    loop
      perform set_config('request.jwt.claims', json_build_object('sub', c.uid, 'role', 'authenticated',
        'app_metadata', json_build_object('role', 'PARENT'))::text, true);
      set local role authenticated;
      st := public.access_state();
      reset role;
      if (st ->> 'maison')::boolean is distinct from c.maison
      or (st ->> 'bilan')::boolean is distinct from c.bilan
      or (st ->> 'seances')::boolean is distinct from c.seances
      or (st ->> 'bilan_mode') is distinct from c.mode
      or (st ->> 'source_maison') is distinct from c.src
      or (st ->> 'pack_actif') is distinct from c.pack
      or (st ->> 'p3_access')::boolean is distinct from c.maison
      or (st #>> '{sections,bilan}')::boolean is distinct from c.bilan then
        fails := fails || (c.label || ' ' || st::text);
      end if;
      res := res || jsonb_build_object(c.label, jsonb_build_object('m', st -> 'maison', 'b', st -> 'bilan_mode', 's', st -> 'seances_mode', 'src', st -> 'source_maison'));
    end loop;
  end;

  -- S8 : essai déjà consommé
  perform set_config('request.jwt.claims', json_build_object('sub', p_exp, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  st := public.access_state();
  reset role;
  if (st ->> 'trial_used')::boolean is not true then fails := fails || 'S8 trial_used'::text; end if;

  -- S13 : signalement pack + abonnement, abonnement intact (lu hors JWT, comme l'admin)
  perform set_config('request.jwt.claims', '', true);
  if (select (private.access_compute(p_both) ->> 'pack_et_abonnement')::boolean) is not true then
    fails := fails || 'S13 pack_et_abonnement'::text;
  end if;
  if not exists (select 1 from public.billing_subscriptions where user_id = p_both and active) then
    fails := fails || 'S13 abonnement annulé'::text;
  end if;

  -- ── S9 : fuites via l'API (rôle authenticated + JWT) ───────────────────────
  declare
    who uuid; expect_rows boolean; total int; label text;
  begin
    for who, expect_rows, label in
      select * from (values (p_sub, false, 'S9-maison-seul'), (p_none, false, 'S9-aucun-droit'),
                            (p_exp, false, 'S9-expire'), (p_ind, true, 'S9-pack'),
                            (p_end, true, 'S9-lecture-seule')) x
    loop
      perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated',
        'app_metadata', json_build_object('role', 'PARENT'))::text, true);
      set local role authenticated;
      select (select count(*) from public.sessions) + (select count(*) from public.questionnaires)
           + (select count(*) from public.athlete_identity) + (select count(*) from public.athlete_objectives)
           + (select count(*) from public.athlete_next_steps) + (select count(*) from public.focus_word_history)
           + (select count(*) from public.parent_reports)
           + (select count(*) from public.children c where (public.gauge_summary(c.id) ->> 'sample_size')::int > 0)
        into total;
      reset role;
      if (total > 0) is distinct from expect_rows then
        fails := fails || (label || ' lignes=' || total);
      end if;
      res := res || jsonb_build_object(label, total);
    end loop;
  end;

  -- ── S10 : override « Maison ouverte » 7 jours, puis expiré ────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
  set local role authenticated;
  v := public.admin_set_access_override(p_ov, 'maison', 'ouvert', 'Geste commercial test', now() + interval '7 days');
  reset role;
  st := private.access_compute(p_ov);
  if (st ->> 'maison')::boolean is not true or st ->> 'source_maison' <> 'override'
     or (st ->> 'fin_acces_maison')::date <> ((now() + interval '7 days') at time zone 'America/Toronto')::date then
    fails := fails || ('S10 ouvert ' || st::text);
  end if;
  -- simulation du passage du temps : l'override est arrivé à échéance
  alter table public.access_overrides disable trigger trg_guard_access_overrides;
  update public.access_overrides set expire_le = now() - interval '1 minute' where id = v;
  alter table public.access_overrides enable trigger trg_guard_access_overrides;
  st := private.access_compute(p_ov);
  if (st ->> 'maison')::boolean is not false or st ->> 'source_maison' <> 'aucune' then
    fails := fails || ('S10 expiré ' || st::text);
  end if;

  -- ── S11 : override « Maison fermée » sur un pack + webhook entrant ─────────
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
  set local role authenticated;
  perform public.admin_set_access_override(p_cl, 'maison', 'ferme', 'Litige paiement test', null);
  reset role;
  -- webhook RevenueCat / Stripe (service role) : abonnement actif
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  insert into public.billing_subscriptions (user_id, active, store, expires_at)
    values (p_cl, true, 'stripe', now() + interval '30 days')
    on conflict (user_id) do update set active = true;
  st := private.access_compute(p_cl);
  if (st ->> 'maison')::boolean is not false or st ->> 'source_maison' <> 'override'
     or (st ->> 'bilan')::boolean is not true then
    fails := fails || ('S11 ' || st::text);
  end if;

  -- ── S12 : seul le Super Admin écrit un override ────────────────────────────
  declare
    who uuid; r text;
  begin
    for who, r in select * from (values (adm, 'ADMIN'), (co, 'COACH'), (p_none, 'PARENT')) x loop
      perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated',
        'app_metadata', json_build_object('role', r))::text, true);
      set local role authenticated;
      ok := false;
      begin
        perform public.admin_set_access_override(p_none, 'maison', 'ouvert', 'tentative', null);
      exception when others then ok := true; end;
      if not ok then fails := fails || ('S12 RPC autorisée pour ' || r); end if;
      ok := false;
      begin
        insert into public.access_overrides (user_id, section, etat, raison) values (p_none, 'maison', 'ouvert', 'tentative');
      exception when others then ok := true; end;
      if not ok then fails := fails || ('S12 INSERT direct autorisé pour ' || r); end if;
      reset role;
    end loop;
    -- même un super admin de JWT sans profil SUPER_ADMIN est refusé
    perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
      'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
    set local role authenticated;
    ok := false;
    begin
      perform public.admin_set_access_override(p_none, 'maison', 'ouvert', 'jwt forgé', null);
    exception when others then ok := true; end;
    reset role;
    if not ok then fails := fails || 'S12 JWT SUPER_ADMIN sans profil'::text; end if;
  end;
  if exists (select 1 from public.access_overrides where user_id = p_none) then
    fails := fails || 'S12 override écrit'::text;
  end if;

  -- Raison obligatoire
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
  set local role authenticated;
  ok := false;
  begin
    perform public.admin_set_access_override(p_none, 'bilan', 'ouvert', '  ', null);
  exception when others then ok := true; end;
  reset role;
  if not ok then fails := fails || 'raison vide acceptée'::text; end if;

  -- ── Audit : chaque écriture manuelle est journalisée avec sa raison ───────
  select count(*) into n from public.access_audit_log
   where cible = p_ov and objet = 'override' and acteur = sa and raison = 'Geste commercial test';
  if n < 1 then fails := fails || 'audit override'::text; end if;

  -- ── Packs : Admin peut attribuer / terminer, avec raison, audité ───────────
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  perform public.admin_set_pack(p_none, 'COMPLET', today, today + 90, 'Inscription programme automne');
  reset role;
  st := private.access_compute(p_none);
  if st ->> 'pack_actif' <> 'complet' or (st ->> 'seances')::boolean is not true then
    fails := fails || ('admin_set_pack ' || st::text);
  end if;
  if (select pack from public.families where parent_id = p_none) <> 'PERFORMANCE' then
    fails := fails || 'niveau de bilan non aligné sur le pack'::text;
  end if;
  set local role authenticated;
  perform public.admin_end_pack(p_none, null, 'Fin anticipée test');
  reset role;
  st := private.access_compute(p_none);
  if (st ->> 'maison')::boolean or st ->> 'bilan_mode' <> 'lecture' then
    fails := fails || ('admin_end_pack ' || st::text);
  end if;
  if not exists (select 1 from public.access_audit_log where cible = p_none and objet = 'pack' and raison = 'Fin anticipée test') then
    fails := fails || 'audit pack'::text;
  end if;

  -- ── S4 variantes : grâce et « floute » (paramètres Super Admin) ───────────
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
  set local role authenticated;
  perform public.admin_set_access_parameter('delai_grace_jours', '3'::jsonb, 'Test grâce');
  reset role;
  st := private.access_compute(p_end);
  if (st ->> 'maison')::boolean is not true or (st ->> 'maison_en_grace')::boolean is not true
     or (st ->> 'fin_acces_maison')::date <> today + 2 then
    fails := fails || ('S4 grâce ' || st::text);
  end if;
  set local role authenticated;
  perform public.admin_set_access_parameter('delai_grace_jours', '0'::jsonb, 'Retour défaut');
  perform public.admin_set_access_parameter('fin_pack_mode', '"floute"'::jsonb, 'Test floute');
  reset role;
  st := private.access_compute(p_end);
  if (st ->> 'bilan')::boolean or (st ->> 'seances')::boolean or (st ->> 'maison')::boolean then
    fails := fails || ('S4 floute ' || st::text);
  end if;
  -- Admin (non super) ne peut pas changer les paramètres
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  ok := false;
  begin
    perform public.admin_set_access_parameter('fin_pack_mode', '"lecture_seule"'::jsonb, 'tentative admin');
  exception when others then ok := true; end;
  reset role;
  if not ok then fails := fails || 'paramètre écrit par Admin'::text; end if;

  -- ── B3 : baisser families.pack ne crée plus de pack ───────────────────────
  update public.families set pack = 'AVANCE' where parent_id = p_sub;
  update public.families set pack = 'ESSENTIEL' where parent_id = p_sub;
  if exists (select 1 from public.pack_enrollments where parent_id = p_sub) then
    fails := fails || 'B3 pack créé depuis families.pack'::text;
  end if;
  if (private.access_compute(p_sub) ->> 'pack_actif') is not null then
    fails := fails || 'B3 pack actif'::text;
  end if;

  -- ── Isolation : le parent ne lit ni overrides, ni packs, ni journal ───────
  perform set_config('request.jwt.claims', json_build_object('sub', p_ov, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  select (select count(*) from public.access_overrides) + (select count(*) from public.pack_enrollments)
       + (select count(*) from public.access_audit_log) + (select count(*) from public.access_parameters)
    into n;
  if private.parent_section_access(p_ind, 'bilan') then fails := fails || 'lecture des droits d''autrui'::text; end if;
  -- temps réel : il voit SA version (bumpée par l'override), et elle seule
  select count(*), max(version) into n, ver from public.access_versions;
  reset role;
  if n <> 1 or ver < 2 then fails := fails || ('access_versions visibles=' || n || ' v=' || coalesce(ver, 0)); end if;

  -- ── Staff inchangé ────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', co, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  st := public.access_state();
  select count(*) into n from public.questionnaires;
  reset role;
  if (st ->> 'is_staff')::boolean is not true or (st ->> 'bilan')::boolean is not true then
    fails := fails || 'staff access_state'::text;
  end if;

  if array_length(fails, 1) > 0 then
    raise exception 'ACCESS_080_FAILED % %', fails, res;
  end if;
  raise exception 'ACCESS_080_PASSED %', res;
end
$test$;

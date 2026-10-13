-- ════════════════════════════════════════════════════════════════════════════
-- Demandes d'appel de 15 min — migration 082 (RLS, RPC, quota, alerte admin).
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   CALL_REQUESTS_PASSED {…}   ou   CALL_REQUESTS_FAILED [échecs] {…}
-- Exécution : base jetable (réplique supabase/tests/local + migration 082).
-- Données synthétiques ; claims JWT simulés sous le rôle `authenticated`.
-- Si private.notify_admins est absente (réplique locale), un bouchon qui
-- journalise les appels est posé le temps du test (annulé avec le reste).
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
  pa uuid := gen_random_uuid();   -- parent A
  pb uuid := gen_random_uuid();   -- parent B
  co uuid := gen_random_uuid();   -- coach assigné à l'enfant de A
  co2 uuid := gen_random_uuid();  -- coach sans lien avec A ni B
  adm uuid := gen_random_uuid();  -- admin
  ka uuid; kb uuid; ra uuid; rb uuid; r uuid;
  n int; s text; ok boolean; stubbed boolean := false;
  slot timestamptz := date_trunc('hour', now()) + interval '2 days';
begin
  -- ── Bouchon d'alerte admin si la vraie fonction n'existe pas ────────────────
  if to_regprocedure('private.notify_admins(text,text,text,text,text,jsonb,uuid,uuid[],uuid[],boolean,text)') is null then
    stubbed := true;
    execute 'create table private._test_admin_alerts (event text, data jsonb)';
    execute $f$
      create function private.notify_admins(p_event text, p_category text, p_title text, p_body text,
        p_path text default null, p_data jsonb default '{}'::jsonb, p_actor uuid default null,
        p_targets uuid[] default null, p_exclude uuid[] default null, p_super_only boolean default false,
        p_type text default 'ADMIN_ALERT') returns integer language sql security definer set search_path = '' as
      $$ insert into private._test_admin_alerts values (p_event, p_data); select 1 $$ $f$;
  end if;

  -- ── Données ───────────────────────────────────────────────────────────────
  insert into auth.users (id, email, raw_app_meta_data) values
    (pa, 'pa@example.test', '{"role":"PARENT"}'), (pb, 'pb@example.test', '{"role":"PARENT"}');
  insert into public.families (name, parent_id) values ('FA', pa), ('FB', pb);
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    select f.id, 'k', 'k', date '2015-01-01', 'CONFIRMED' from public.families f where f.parent_id = pa
    returning id into ka;
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    select f.id, 'k', 'k', date '2015-01-01', 'CONFIRMED' from public.families f where f.parent_id = pb
    returning id into kb;
  insert into public.coach_assignments (coach_id, child_id) values (co, ka);

  -- ── Parent A : création valide ─────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  ra := public.request_intro_call('video', slot, ka, '  Merci !  ');
  select statut, count(*) over () into s, n from public.call_requests where id = ra;
  if s is distinct from 'demande' or n <> 1 then fails := fails || 'A ne lit pas sa demande en statut demande'::text; end if;

  -- erreurs attendues (code stable)
  foreach s in array array['child_not_owned', 'invalid_slot', 'invalid_mode', 'invalid_note', 'duplicate_slot'] loop
    begin
      case s
        when 'child_not_owned' then perform public.request_intro_call('video', slot + interval '1 hour', kb, null);
        when 'invalid_slot'    then perform public.request_intro_call('video', now() - interval '1 hour', null, null);
        when 'invalid_mode'    then perform public.request_intro_call('sms', slot + interval '1 hour', null, null);
        when 'invalid_note'    then perform public.request_intro_call('video', slot + interval '1 hour', null, repeat('x', 501));
        when 'duplicate_slot'  then perform public.request_intro_call('telephone', slot, null, null);
      end case;
      fails := fails || ('accepté à tort : ' || s);
    exception when others then
      if sqlerrm <> s then fails := fails || (s || ' → ' || sqlerrm); end if;
    end;
  end loop;

  -- INSERT direct interdit
  ok := false;
  begin
    insert into public.call_requests (parent_id, mode, creneau) values (pa, 'video', slot + interval '5 hours');
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'INSERT direct accepté'::text; end if;

  -- Le parent ne change pas le statut (0 ligne), ni une autre colonne, ni ne supprime
  update public.call_requests set statut = 'confirme' where id = ra;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'parent a changé le statut'::text; end if;
  ok := false;
  begin update public.call_requests set creneau = slot + interval '3 hours' where id = ra;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'parent a modifié creneau'::text; end if;
  ok := false;
  begin delete from public.call_requests where id = ra;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'parent a supprimé'::text; end if;
  reset role;

  -- ── Parent B : isolation ───────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  rb := public.request_intro_call('telephone', slot, null, null);  -- même créneau qu'A : permis
  select count(*) into n from public.call_requests where id = ra;
  if n <> 0 then fails := fails || 'B voit la demande de A'::text; end if;
  select count(*) into n from public.call_requests;
  if n <> 1 then fails := fails || ('B voit ' || n || ' lignes au lieu de 1'); end if;
  update public.call_requests set statut = 'annule' where id = ra;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'B a changé la demande de A'::text; end if;
  reset role;

  -- ── Rôle non parent : RPC refusée ──────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', co, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  begin
    perform public.request_intro_call('video', slot + interval '6 hours', null, null);
    fails := fails || 'coach a créé une demande'::text;
  exception when others then
    if sqlerrm <> 'not_parent' then fails := fails || ('coach → ' || sqlerrm); end if;
  end;

  -- ── Coach lié : ne voit que la famille qu'il suit (Loi 25), change le statut ─
  select count(*) into n from public.call_requests where id in (ra, rb);
  if n <> 1 then fails := fails || ('coach lié voit ' || n || '/1'); end if;
  update public.call_requests set statut = 'confirme' where id = rb;
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'coach a changé une demande hors de ses familles'::text; end if;
  update public.call_requests set statut = 'confirme' where id = ra;
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || 'coach ne peut pas confirmer'::text; end if;
  ok := false;
  begin update public.call_requests set note = 'x' where id = ra;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'staff a modifié la note'::text; end if;
  ok := false;
  begin update public.call_requests set statut = 'perdu' where id = ra;
  exception when check_violation then ok := true; end;
  if not ok then fails := fails || 'statut hors liste accepté'::text; end if;
  ok := false;
  begin delete from public.call_requests where id = ra;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'coach a supprimé'::text; end if;
  reset role;

  -- ── Coach sans lien : ne voit rien, ne change rien ─────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', co2, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  select count(*) into n from public.call_requests;
  if n <> 0 then fails := fails || ('coach non lié voit ' || n); end if;
  update public.call_requests set statut = 'annule' where id in (ra, rb);
  get diagnostics n = row_count;
  if n <> 0 then fails := fails || 'coach non lié a changé une demande'::text; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  update public.call_requests set statut = 'fait' where id = rb;
  get diagnostics n = row_count;
  if n <> 1 then fails := fails || 'admin ne peut pas clore'::text; end if;
  reset role;

  -- ── Quota : 3 demandes ouvertes max par parent ─────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  select statut into s from public.call_requests where id = ra;
  if s is distinct from 'confirme' then fails := fails || 'A ne voit pas la confirmation'::text; end if;
  perform public.request_intro_call('video', slot + interval '1 day', null, null);
  perform public.request_intro_call('video', slot + interval '2 days', null, null);
  begin
    perform public.request_intro_call('video', slot + interval '3 days', null, null);
    fails := fails || 'quota dépassé accepté'::text;
  exception when others then
    if sqlerrm <> 'quota_reached' then fails := fails || ('quota → ' || sqlerrm); end if;
  end;
  reset role;

  -- ── Alerte admin ───────────────────────────────────────────────────────────
  if stubbed then
    execute 'select count(*) from private._test_admin_alerts where event = ''intro_call_requested''' into n;
    res := res || jsonb_build_object('alertes', n);
    if n <> 4 then fails := fails || ('alertes admin : ' || n || ' au lieu de 4'); end if;
    execute 'select count(*) from private._test_admin_alerts where data ? ''note''' into n;
    if n <> 0 then fails := fails || 'la note fuit dans l''alerte'::text; end if;
  end if;

  select count(*) into n from public.call_requests;
  res := res || jsonb_build_object('lignes', n, 'bouchon_alerte', stubbed);
  -- note normalisée (trim)
  select note into s from public.call_requests where id = ra;
  if s is distinct from 'Merci !' then fails := fails || ('note non normalisée : ' || coalesce(s, 'null')); end if;

  if array_length(fails, 1) > 0 then
    raise exception 'CALL_REQUESTS_FAILED % %', fails, res;
  end if;
  raise exception 'CALL_REQUESTS_PASSED %', res;
end
$test$;

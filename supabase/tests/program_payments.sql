-- ════════════════════════════════════════════════════════════════════════════
-- Programmes payés par Stripe — migration 081.
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   PROGRAM_081_PASSED {…}   ou   PROGRAM_081_FAILED [échecs] {…}
-- Exécution : base jetable APRÈS 080 + 081 (supabase/tests/local/run-pglite.mjs
-- ou run.sh). Données synthétiques. Jamais sur la production.
--
--   R1  RLS : un parent ne lit que ses commandes / versements ; anon rien ;
--       authenticated n'écrit rien et n'appelle aucune fonction d'écriture ;
--       stripe_processed_events invisible.
--   M1  montant ≠ grille canonique → amount_mismatch ; taxes ×1,14975.
--   P1  second pack refusé (commande active / pack en cours).
--   W1  checkout.session.completed → versement 1 payé + pack daté 'stripe'
--       → access_state() ouvre Maison + Bilan + Mes séances.
--   W2  même event.id rejoué → duplicate, aucun effet.
--   S7  séance 7 COMPLETED → versement 2 « due » (une seule fois).
--   W3  échec SCA puis succès du versement 2 → echouee/requires_action puis soldee.
--   W4  charge.refunded → remboursee, pack NON retiré.
--   W5  événement Maison (abonnement) → not_program ; compte incohérent → mismatch.
--   D1  fonctions SECURITY DEFINER de 081 : search_path figé.
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res   jsonb := '{}'::jsonb;
  pa uuid := gen_random_uuid();   -- parent qui achète
  pb uuid := gen_random_uuid();   -- autre parent
  pc uuid := gen_random_uuid();   -- parent avec pack posé par l'admin
  co uuid := gen_random_uuid();
  fam uuid; kid uuid; prog uuid; sess7 uuid;
  r jsonb; v text; n int; ok boolean; st jsonb;
  ord uuid; inst1 uuid; inst2 uuid;
begin
  -- Stub du distributeur d'alertes (060) si la base jetable ne l'a pas.
  if to_regprocedure('private.notify_admins(text,text,text,text,text,jsonb,uuid,uuid[],uuid[],boolean,text)') is null then
    execute $f$
      create function private.notify_admins(p_event text, p_category text, p_title text, p_body text,
        p_path text default null, p_data jsonb default '{}'::jsonb, p_actor uuid default null,
        p_targets uuid[] default null, p_exclude uuid[] default null, p_super_only boolean default false,
        p_type text default 'ADMIN_ALERT') returns integer language sql as 'select 0'
    $f$;
  end if;

  insert into public.profiles (id, email, first_name, last_name, role, coach_validated) values
    (pa, 'pa@example.test', 'a', 'a', 'PARENT', false),
    (pb, 'pb@example.test', 'b', 'b', 'PARENT', false),
    (pc, 'pc@example.test', 'c', 'c', 'PARENT', false),
    (co, 'co81@example.test', 'c', 'o', 'COACH', true);
  insert into public.families (name, parent_id) values ('F-A', pa) returning id into fam;
  insert into public.children (family_id, first_name, last_name, date_of_birth, validation_status)
    values (fam, 'k', 'k', date '2015-01-01', 'CONFIRMED') returning id into kid;
  insert into public.programs (title, age_group, coach_id, status) values ('P', '8-11', co, 'ACTIVE') returning id into prog;
  insert into public.sessions (program_id, child_id, session_number, title) values (prog, kid, 7, 'S7') returning id into sess7;
  insert into public.pack_enrollments (parent_id, pack, starts_on, source)
    values (pc, 'GROUPE', (now() at time zone 'America/Toronto')::date - 5, 'admin');

  -- ── M1 : taxes ────────────────────────────────────────────────────────────
  if private.program_qc_tax(30000) <> 4493 or private.program_qc_tax(75000) <> 11231
     or private.program_qc_tax(100000) <> 14975 then
    fails := fails || 'taxes QC'::text;
  end if;
  if private.program_installment_ht('GROUPE', 'deux_versements', 2) <> 30000
     or private.program_installment_ht('COMPLET', 'une_fois', 1) <> 200000 then
    fails := fails || 'grille canonique'::text;
  end if;

  -- ── Service role (edge functions) : pas de JWT utilisateur ────────────────
  perform set_config('request.jwt.claims', '', true);
  set local role service_role;

  ok := false;
  begin
    perform public.program_create_order(pa, 'GROUPE', 'deux_versements', 1, 'cus_test');
  exception when others then ok := sqlerrm = 'amount_mismatch'; end;
  if not ok then fails := fails || 'M1 montant client accepté'::text; end if;

  r := public.program_create_order(pa, 'GROUPE', 'deux_versements', 30000, 'cus_test');
  ord := (r ->> 'order_id')::uuid; inst1 := (r ->> 'installment_id')::uuid;
  if (r ->> 'tax_cents')::int <> 4493 then fails := fails || 'taxe versement 1'::text; end if;

  -- P1 : parent avec pack en cours
  ok := false;
  begin
    perform public.program_create_order(pc, 'INDIVIDUEL', 'une_fois', 150000, null);
  exception when others then ok := sqlerrm = 'pack_active'; end;
  if not ok then fails := fails || 'P1 pack en cours accepté'::text; end if;

  -- W1 : paiement du versement 1
  v := public.program_apply_stripe_event('evt_1', 'checkout.session.completed', jsonb_build_object(
    'id', 'cs_1', 'mode', 'payment', 'payment_status', 'paid', 'payment_intent', 'pi_1', 'customer', 'cus_test',
    'amount_total', 30000, 'metadata', jsonb_build_object('kind', 'program', 'order_id', ord,
      'installment', '1', 'app_user_id', pa, 'pack', 'GROUPE')));
  res := res || jsonb_build_object('w1', v);
  if v <> 'paid_rank_1' then fails := fails || ('W1 résultat ' || v); end if;
  select count(*) into n from public.pack_enrollments where parent_id = pa and source = 'stripe' and pack = 'GROUPE';
  if n <> 1 then fails := fails || 'W1 pack non posé'::text; end if;
  if (select status from public.program_orders where id = ord) <> 'active' then fails := fails || 'W1 commande'::text; end if;
  if (select pack from public.families where id = fam) <> 'ESSENTIEL' then fails := fails || 'W1 niveau famille'::text; end if;

  -- W2 : rejeu
  v := public.program_apply_stripe_event('evt_1', 'checkout.session.completed', jsonb_build_object(
    'id', 'cs_1', 'payment_status', 'paid', 'payment_intent', 'pi_1', 'amount_total', 30000,
    'metadata', jsonb_build_object('kind', 'program', 'order_id', ord, 'installment', '1', 'app_user_id', pa)));
  if v <> 'duplicate' then fails := fails || ('W2 rejeu ' || v); end if;
  -- PI du même paiement (autre event.id) : idempotent par état
  v := public.program_apply_stripe_event('evt_1b', 'payment_intent.succeeded', jsonb_build_object(
    'id', 'pi_1', 'amount_received', 30000, 'payment_method', 'pm_1', 'customer', 'cus_test',
    'metadata', jsonb_build_object('kind', 'program', 'order_id', ord, 'installment', '1', 'app_user_id', pa)));
  if v <> 'already_paid' then fails := fails || ('W2 PI ' || v); end if;
  select count(*) into n from public.pack_enrollments where parent_id = pa;
  if n <> 1 then fails := fails || 'W2 pack dupliqué'::text; end if;
  if (select stripe_payment_method_id from public.program_orders where id = ord) is distinct from 'pm_1' then
    fails := fails || 'W2 carte non mémorisée'::text;
  end if;

  -- P1 bis : second pack refusé
  ok := false;
  begin
    perform public.program_create_order(pa, 'COMPLET', 'une_fois', 200000, null);
  exception when others then ok := sqlerrm in ('pack_active', 'already_enrolled'); end;
  if not ok then fails := fails || 'P1 second pack accepté'::text; end if;

  -- W5 : événements hors programmes
  v := public.program_apply_stripe_event('evt_m', 'checkout.session.completed',
    jsonb_build_object('id', 'cs_m', 'mode', 'subscription', 'metadata', jsonb_build_object('app_user_id', pa, 'plan', 'mensuel')));
  if v <> 'not_program' then fails := fails || ('W5 maison ' || v); end if;
  if exists (select 1 from public.stripe_processed_events where event_id = 'evt_m') then
    fails := fails || 'W5 événement Maison enregistré'::text;
  end if;
  v := public.program_apply_stripe_event('evt_x', 'payment_intent.succeeded', jsonb_build_object(
    'id', 'pi_x', 'metadata', jsonb_build_object('kind', 'program', 'order_id', ord, 'installment', '1', 'app_user_id', pb)));
  if v <> 'mismatch' then fails := fails || ('W5 mismatch ' || v); end if;
  reset role;

  -- ── W1 bis : access_state() du parent ─────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  st := public.access_state();
  if not ((st ->> 'maison')::boolean and (st ->> 'bilan')::boolean and (st ->> 'seances')::boolean) then
    fails := fails || ('W1 access_state ' || st::text);
  end if;
  -- R1 : lecture de ses lignes
  select count(*) into n from public.program_orders;
  if n <> 1 then fails := fails || ('R1 parent voit ' || n || ' commande(s)'); end if;
  select count(*) into n from public.program_installments;
  if n <> 1 then fails := fails || ('R1 parent voit ' || n || ' versement(s)'); end if;
  -- R1 : aucune écriture
  ok := false;
  begin update public.program_installments set status = 'payee' where id = inst1;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 update authenticated'::text; end if;
  ok := false;
  begin insert into public.program_orders (parent_id, pack, mode, total_ht_cents) values (pa, 'GROUPE', 'une_fois', 1);
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 insert authenticated'::text; end if;
  ok := false;
  begin perform public.program_apply_stripe_event('evt_hack', 'charge.refunded', '{}'::jsonb);
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 RPC webhook appelable'::text; end if;
  ok := false;
  begin perform public.program_create_order(pa, 'GROUPE', 'une_fois', 60000, null);
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 RPC commande appelable'::text; end if;
  ok := false;
  begin select count(*) into n from public.stripe_processed_events;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 événements lisibles'::text; end if;
  reset role;

  -- R1 : un autre parent ne voit rien
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  select count(*) into n from public.program_orders;
  if n <> 0 then fails := fails || 'R1 fuite commandes'::text; end if;
  select count(*) into n from public.program_installments;
  if n <> 0 then fails := fails || 'R1 fuite versements'::text; end if;
  reset role;

  -- R1 : anon
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  ok := false;
  begin select count(*) into n from public.program_orders;
  exception when insufficient_privilege then ok := true; end;
  if not ok then fails := fails || 'R1 anon lit'::text; end if;
  reset role;

  -- ── S7 : séance 7 validée (même chemin que 071 : UPDATE de status) ───────
  update public.sessions set status = 'COMPLETED', completed_at = now() where id = sess7;
  select id into inst2 from public.program_installments where order_id = ord and rank = 2 and status = 'due';
  if inst2 is null then fails := fails || 'S7 versement 2 non créé'::text; end if;
  update public.sessions set status = 'SCHEDULED' where id = sess7;
  update public.sessions set status = 'COMPLETED' where id = sess7;
  select count(*) into n from public.program_installments where order_id = ord and rank = 2;
  if n <> 1 then fails := fails || 'S7 versement 2 dupliqué'::text; end if;
  if (select amount_ht_cents + tax_cents from public.program_installments where id = inst2) <> 34493 then
    fails := fails || 'S7 montant'::text;
  end if;

  -- ── W3 : SCA puis succès ──────────────────────────────────────────────────
  perform set_config('request.jwt.claims', '', true);
  set local role service_role;
  perform public.program_record_installment_link(inst2, 'cs_2', 'https://checkout.stripe.com/c/pay/cs_2', now() + interval '1 day', 'autocharge_off');
  v := public.program_apply_stripe_event('evt_2f', 'payment_intent.payment_failed', jsonb_build_object(
    'id', 'pi_2', 'status', 'requires_action', 'last_payment_error', jsonb_build_object('code', 'authentication_required'),
    'metadata', jsonb_build_object('kind', 'program', 'order_id', ord, 'installment', '2', 'app_user_id', pa)));
  if v <> 'failed' or not (select requires_action from public.program_installments where id = inst2) then
    fails := fails || ('W3 SCA ' || v);
  end if;
  v := public.program_apply_stripe_event('evt_2s', 'checkout.session.completed', jsonb_build_object(
    'id', 'cs_2', 'payment_status', 'paid', 'payment_intent', 'pi_2', 'amount_total', 30000,
    'metadata', jsonb_build_object('kind', 'program', 'order_id', ord, 'installment', '2', 'app_user_id', pa)));
  if v <> 'paid_rank_2' or (select status from public.program_orders where id = ord) <> 'soldee' then
    fails := fails || ('W3 succès ' || v);
  end if;

  -- ── W4 : remboursement du versement 1 ────────────────────────────────────
  v := public.program_apply_stripe_event('evt_r', 'charge.refunded', jsonb_build_object(
    'id', 'ch_1', 'payment_intent', 'pi_1', 'amount_refunded', 30000));
  if v <> 'refunded' or (select status from public.program_installments where id = inst1) <> 'remboursee' then
    fails := fails || ('W4 ' || v);
  end if;
  v := public.program_apply_stripe_event('evt_r2', 'charge.refunded', jsonb_build_object(
    'id', 'ch_9', 'payment_intent', 'pi_inconnu', 'amount_refunded', 100));
  if v <> 'not_program' then fails := fails || ('W4 PI inconnu ' || v); end if;
  reset role;
  select count(*) into n from public.pack_enrollments where parent_id = pa
    and (ends_on is null or ends_on >= (now() at time zone 'America/Toronto')::date);
  if n <> 1 then fails := fails || 'W4 pack retiré'::text; end if;

  -- ── D1 : search_path figé ─────────────────────────────────────────────────
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where p.proname like 'program\_%' and p.prosecdef
     and not coalesce(p.proconfig, '{}') @> array['search_path=""'];
  if n <> 0 then fails := fails || ('D1 ' || n || ' fonction(s) sans search_path vide'); end if;

  if array_length(fails, 1) > 0 then
    raise exception 'PROGRAM_081_FAILED % %', fails, res;
  end if;
  raise exception 'PROGRAM_081_PASSED %', res;
end
$test$;

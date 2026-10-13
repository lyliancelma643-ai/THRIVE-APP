-- ─────────────────────────────────────────────────────────────────────────────
-- 081 — Programmes payés par Stripe (Groupe · Individuel · Complet).
--
-- GO 3 §5-O1. Écart avec le prompt (le dépôt fait foi) : depuis 080, le droit
-- « programme » ne vit plus dans parent_access.program_pack (OBSOLÈTE) mais dans
-- public.pack_enrollments (source = 'stripe' déjà prévue par 080). Le paiement du
-- versement 1 ouvre donc l'accès en insérant un pack daté, par une fonction
-- SECURITY DEFINER exécutée par le service_role (aucun JWT : la garde
-- enforce_pack_change_authority de families laisse passer, comme admin_set_pack).
-- access_state() le reflète sans modification (pack actif ⇒ Maison + Bilan +
-- Mes séances).
--
--   • program_orders          : une commande par achat (pack, mode, total HT) ;
--   • program_installments    : versements (rang 1 = inscription, rang 2 = séance 7) ;
--   • stripe_processed_events : idempotence des webhooks programmes (event.id unique).
--
-- Lecture : un parent ne lit QUE ses commandes / versements ; staff admin : tout.
-- Écriture : service_role seulement (edge functions), jamais authenticated / anon.
-- Montants : revérifiés ici contre la grille canonique (miroir de
-- supabase/functions/_shared/program_billing.ts) — un montant client n'entre jamais.
-- Versement 2 : trigger ADDITIF sur public.sessions (071 non modifiée) — la
-- séance n° 7 passée COMPLETED crée la ligne `due` et alerte les admins.
--
-- Additive, idempotente. Rollback :
--   supabase/rollbacks/20261012_081_program_payments_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Grille canonique (miroir SQL de _shared/program_billing.ts)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function private.program_total_ht(p_pack text)
returns integer language sql immutable
set search_path = ''
as $$
  select case p_pack
    when 'GROUPE' then 60000
    when 'INDIVIDUEL' then 150000
    when 'COMPLET' then 200000
  end;
$$;

create or replace function private.program_installment_ht(p_pack text, p_mode text, p_rank integer)
returns integer language sql immutable
set search_path = ''
as $$
  select case
    when private.program_total_ht(p_pack) is null then null
    when p_mode = 'une_fois' and p_rank = 1 then private.program_total_ht(p_pack)
    when p_mode = 'deux_versements' and p_rank = 1 then ceil(private.program_total_ht(p_pack) / 2.0)::integer
    when p_mode = 'deux_versements' and p_rank = 2
      then private.program_total_ht(p_pack) - ceil(private.program_total_ht(p_pack) / 2.0)::integer
  end;
$$;

-- Taxe d'affichage Québec : TPS 5 % + TVQ 9,975 %, arrondies séparément au cent.
create or replace function private.program_qc_tax(p_ht integer)
returns integer language sql immutable
set search_path = ''
as $$
  select (round(p_ht * 0.05) + round(p_ht * 0.09975))::integer;
$$;

revoke execute on function private.program_total_ht(text) from public, anon, authenticated;
revoke execute on function private.program_installment_ht(text, text, integer) from public, anon, authenticated;
revoke execute on function private.program_qc_tax(integer) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Tables
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.program_orders (
  id                          uuid primary key default gen_random_uuid(),
  -- set null : la pièce comptable survit à l'effacement du compte (Loi 25 / fisc).
  parent_id                   uuid references public.profiles(id) on delete set null,
  pack                        text not null check (pack in ('GROUPE', 'INDIVIDUEL', 'COMPLET')),
  mode                        text not null check (mode in ('deux_versements', 'une_fois')),
  currency                    text not null default 'cad' check (currency = 'cad'),
  total_ht_cents              integer not null check (total_ht_cents > 0),
  -- en_attente : Checkout créé, rien payé · active : versement 1 payé ·
  -- soldee : tout payé · annulee : abandonnée / expirée · remboursee : tout remboursé
  status                      text not null default 'en_attente'
                              check (status in ('en_attente', 'active', 'soldee', 'annulee', 'remboursee')),
  stripe_customer_id          text,
  stripe_payment_method_id    text,
  stripe_checkout_session_id  text unique,
  pack_enrollment_id          uuid references public.pack_enrollments(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists program_orders_parent_idx on public.program_orders (parent_id, created_at desc);
-- Une seule commande en cours par parent (refus d'un second pack).
create unique index if not exists program_orders_one_open_per_parent
  on public.program_orders (parent_id) where status in ('en_attente', 'active');
comment on table public.program_orders is
  'Commandes de programmes (Groupe / Individuel / Complet) payées par Stripe. Écriture : service_role (edge functions) seulement.';

create table if not exists public.program_installments (
  id                          uuid primary key default gen_random_uuid(),
  order_id                    uuid not null references public.program_orders(id) on delete cascade,
  rank                        smallint not null check (rank in (1, 2)),
  amount_ht_cents             integer not null check (amount_ht_cents > 0),
  -- Taxe d'affichage (TPS + TVQ) ; la taxe réellement perçue est tax_paid_cents.
  tax_cents                   integer not null check (tax_cents >= 0),
  status                      text not null default 'due'
                              check (status in ('due', 'payee', 'echouee', 'remboursee')),
  due_when                    text not null check (due_when in ('inscription', 'seance_7')),
  due_at                      timestamptz not null default now(),
  stripe_payment_intent_id    text unique,
  stripe_checkout_session_id  text,
  checkout_url                text,
  checkout_expires_at         timestamptz,
  requires_action             boolean not null default false,
  failure_code                text,
  charge_attempts             integer not null default 0,
  amount_paid_cents           integer check (amount_paid_cents is null or amount_paid_cents >= 0),
  tax_paid_cents              integer,
  amount_refunded_cents       integer not null default 0 check (amount_refunded_cents >= 0),
  paid_at                     timestamptz,
  refunded_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (order_id, rank),
  check ((rank = 1) = (due_when = 'inscription'))
);
create index if not exists program_installments_due_idx
  on public.program_installments (status, due_at) where status in ('due', 'echouee');
comment on table public.program_installments is
  'Versements des programmes (1 = inscription, 2 = séance 7). Écriture : service_role seulement.';

create table if not exists public.stripe_processed_events (
  event_id     text primary key,
  type         text not null,
  result       text,
  processed_at timestamptz not null default now()
);
comment on table public.stripe_processed_events is
  'Idempotence des webhooks Stripe des programmes : un event.id n''est traité qu''une fois.';

-- ── RLS + privilèges ────────────────────────────────────────────────────────
alter table public.program_orders enable row level security;
alter table public.program_installments enable row level security;
alter table public.stripe_processed_events enable row level security;

drop policy if exists program_orders_read on public.program_orders;
create policy program_orders_read on public.program_orders
  for select to authenticated
  using (parent_id = (select auth.uid()) or (select private.is_admin_or_super()));

drop policy if exists program_installments_read on public.program_installments;
create policy program_installments_read on public.program_installments
  for select to authenticated
  using (exists (
    select 1 from public.program_orders o
    where o.id = program_installments.order_id
      and (o.parent_id = (select auth.uid()) or (select private.is_admin_or_super()))
  ));
-- stripe_processed_events : aucune policy ⇒ invisible pour authenticated / anon.

revoke all on public.program_orders, public.program_installments, public.stripe_processed_events from anon;
revoke all on public.stripe_processed_events from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.program_orders, public.program_installments from authenticated;
grant select on public.program_orders, public.program_installments to authenticated;
grant all on public.program_orders, public.program_installments, public.stripe_processed_events to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Utilitaires internes
-- ════════════════════════════════════════════════════════════════════════════
-- Alerte admin best effort : une panne du centre de notifications (060) ne doit
-- jamais annuler un paiement ni la clôture d'une séance.
create or replace function private.program_notify(p_event text, p_title text, p_body text, p_data jsonb)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.notify_admins(p_event, 'billing', p_title, p_body, '/admin/parents', coalesce(p_data, '{}'::jsonb));
exception when others then
  raise warning 'program_notify(%): %', p_event, sqlerrm;
end;
$$;
revoke execute on function private.program_notify(text, text, text, jsonb) from public, anon, authenticated;

-- Pack actif (le sien ou celui du titulaire d'une famille dont il est membre).
create or replace function private.program_has_active_pack(p_parent uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pack_enrollments e
    where e.parent_id in (
        select p_parent
        union
        select f.parent_id from public.families f
        join public.family_members m on m.family_id = f.id
        where m.profile_id = p_parent)
      and e.starts_on <= (now() at time zone 'America/Toronto')::date
      and (e.ends_on is null or e.ends_on >= (now() at time zone 'America/Toronto')::date)
  );
$$;
revoke execute on function private.program_has_active_pack(uuid) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Création d'une commande (create-program-checkout, service_role)
-- ════════════════════════════════════════════════════════════════════════════
-- Erreurs (P0001) : invalid_pack · invalid_mode · parent_not_found ·
--                   amount_mismatch · pack_active · already_enrolled
create or replace function public.program_create_order(
  p_parent uuid, p_pack text, p_mode text, p_amount_ht integer, p_customer text
)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_inst1 integer := private.program_installment_ht(p_pack, p_mode, 1);
  v_order uuid;
  v_inst  uuid;
begin
  if private.program_total_ht(p_pack) is null then
    raise exception 'invalid_pack' using errcode = 'P0001';
  end if;
  if p_mode not in ('deux_versements', 'une_fois') then
    raise exception 'invalid_mode' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_parent and role::text = 'PARENT') then
    raise exception 'parent_not_found' using errcode = 'P0001';
  end if;
  -- Le montant annoncé par l'edge function doit être la grille canonique.
  if p_amount_ht is distinct from v_inst1 then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;
  -- Un pack en cours (payé, posé par un admin ou celui du titulaire) : pas de second pack.
  if private.program_has_active_pack(p_parent) then
    raise exception 'pack_active' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.program_orders where parent_id = p_parent and status = 'active') then
    raise exception 'already_enrolled' using errcode = 'P0001';
  end if;

  -- Une commande abandonnée est remplacée (sa session Checkout a été expirée).
  update public.program_orders set status = 'annulee', updated_at = now()
   where parent_id = p_parent and status = 'en_attente';

  insert into public.program_orders (parent_id, pack, mode, total_ht_cents, stripe_customer_id)
  values (p_parent, p_pack, p_mode, private.program_total_ht(p_pack), p_customer)
  returning id into v_order;

  insert into public.program_installments (order_id, rank, amount_ht_cents, tax_cents, status, due_when)
  values (v_order, 1, v_inst1, private.program_qc_tax(v_inst1), 'due', 'inscription')
  returning id into v_inst;

  return jsonb_build_object('order_id', v_order, 'installment_id', v_inst,
    'amount_ht_cents', v_inst1, 'tax_cents', private.program_qc_tax(v_inst1));
end;
$$;
revoke execute on function public.program_create_order(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.program_create_order(uuid, text, text, integer, text) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Après un paiement : ouverture du pack (chemin autorisé de 080)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function private.program_after_payment(p_order uuid, p_rank integer)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  o       public.program_orders%rowtype;
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_enr   uuid;
  v_result text;
begin
  select * into o from public.program_orders where id = p_order for update;

  if p_rank = 2 then
    update public.program_orders set status = 'soldee', updated_at = now()
     where id = o.id and status in ('active', 'en_attente');
    perform private.program_notify('program_installment_paid', 'Versement 2 payé',
      'Le 2e versement d''un programme ' || o.pack || ' a été payé.',
      jsonb_build_object('order_id', o.id, 'rank', 2));
    return 'paid_rank_2';
  end if;

  if o.status in ('en_attente', 'annulee') then
    if exists (select 1 from public.program_orders x
                where x.parent_id = o.parent_id and x.id <> o.id and x.status = 'active') then
      perform private.program_notify('program_double_payment', 'Paiement de programme en double',
        'Un parent a payé deux commandes de programme : rembourser la seconde.',
        jsonb_build_object('order_id', o.id, 'parent_id', o.parent_id));
      return 'double_payment';
    end if;
    update public.program_orders
       set status = case when o.mode = 'une_fois' then 'soldee' else 'active' end, updated_at = now()
     where id = o.id;
  end if;

  v_result := 'paid_rank_1';
  -- Ouvre l'accès : pack daté (080), source 'stripe', sans date de fin.
  if o.parent_id is not null and o.pack_enrollment_id is null then
    if private.program_has_active_pack(o.parent_id) then
      v_result := 'paid_rank_1_pack_already_active';
    else
      perform set_config('thrive.audit_raison', 'Programme payé par Stripe (commande ' || o.id || ')', true);
      insert into public.pack_enrollments (parent_id, pack, starts_on, ends_on, source, note)
      values (o.parent_id, o.pack, v_today, null, 'stripe', 'Programme payé par Stripe (commande ' || o.id || ')')
      returning id into v_enr;
      update public.program_orders set pack_enrollment_id = v_enr, updated_at = now() where id = o.id;
      -- Niveau de détail des bilans (comme admin_set_pack) ; pas de JWT ⇒ garde 023 OK.
      update public.families
         set pack = case o.pack when 'GROUPE' then 'ESSENTIEL' when 'INDIVIDUEL' then 'AVANCE' else 'PERFORMANCE' end
       where parent_id = o.parent_id;
    end if;
  end if;

  perform private.program_notify('program_paid', 'Programme payé',
    'Nouvelle inscription payée : ' || o.pack || ' (' || o.mode || ').',
    jsonb_build_object('order_id', o.id, 'parent_id', o.parent_id, 'pack', o.pack));
  return v_result;
end;
$$;
revoke execute on function private.program_after_payment(uuid, integer) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Webhook Stripe (programmes) — idempotent par event.id, une transaction
-- ════════════════════════════════════════════════════════════════════════════
-- Résultats : not_program · duplicate · ignored_* · paid_rank_1[_pack_already_active]
--             · paid_rank_2 · already_paid · failed · expired · link_expired
--             · refunded · partially_refunded · double_payment · mismatch
create or replace function public.program_apply_stripe_event(p_event_id text, p_type text, p_object jsonb)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  v_obj    jsonb := coalesce(p_object, '{}'::jsonb);
  v_meta   jsonb := coalesce(p_object -> 'metadata', '{}'::jsonb);
  v_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  o        public.program_orders%rowtype;
  i        public.program_installments%rowtype;
  v_rank   integer;
  v_amount integer;
  v_refund integer;
  v_result text;
begin
  if coalesce(btrim(p_event_id), '') = '' then
    raise exception 'event_id_required' using errcode = 'P0001';
  end if;

  -- ── Cible de l'événement (rien n'est enregistré s'il ne nous concerne pas) ──
  if p_type = 'charge.refunded' then
    select * into i from public.program_installments
     where stripe_payment_intent_id = v_obj ->> 'payment_intent' for update;
    if not found then return 'not_program'; end if;
    select * into o from public.program_orders where id = i.order_id for update;
  elsif p_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded',
                   'checkout.session.async_payment_failed', 'checkout.session.expired',
                   'payment_intent.succeeded', 'payment_intent.payment_failed') then
    if v_meta ->> 'kind' is distinct from 'program'
       or coalesce(v_meta ->> 'order_id', '') !~ v_uuid_re
       or coalesce(v_meta ->> 'installment', '') not in ('1', '2') then
      return 'not_program';
    end if;
    v_rank := (v_meta ->> 'installment')::integer;
    select * into o from public.program_orders where id = (v_meta ->> 'order_id')::uuid for update;
    if not found then return 'not_program'; end if;
    select * into i from public.program_installments where order_id = o.id and rank = v_rank for update;
  else
    return 'not_program';
  end if;

  -- ── Idempotence : un event.id n'est appliqué qu'une fois ──────────────────
  insert into public.stripe_processed_events (event_id, type) values (p_event_id, p_type)
  on conflict (event_id) do nothing;
  if not found then return 'duplicate'; end if;

  -- Le compte porté par l'événement doit être celui de la commande.
  if p_type <> 'charge.refunded' and o.parent_id is not null
     and coalesce(v_meta ->> 'app_user_id', '') <> o.parent_id::text then
    perform private.program_notify('program_event_mismatch', 'Paiement de programme incohérent',
      'Un événement Stripe ne correspond pas au compte de la commande.',
      jsonb_build_object('order_id', o.id, 'event_id', p_event_id));
    v_result := 'mismatch';

  elsif i.id is null then
    v_result := 'ignored_installment_missing';
    perform private.program_notify('program_installment_missing', 'Versement introuvable',
      'Événement Stripe reçu pour un versement inexistant.',
      jsonb_build_object('order_id', o.id, 'rank', v_rank, 'event_id', p_event_id));

  elsif p_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded',
                   'payment_intent.succeeded') then
    if p_type = 'checkout.session.completed'
       and coalesce(v_obj ->> 'payment_status', '') not in ('paid', 'no_payment_required') then
      v_result := 'ignored_awaiting_payment';
    else
      -- Carte enregistrée et client (pour le versement 2).
      if p_type = 'payment_intent.succeeded' and v_rank = 1 and v_obj ? 'payment_method' then
        update public.program_orders
           set stripe_payment_method_id = coalesce(v_obj ->> 'payment_method', stripe_payment_method_id),
               updated_at = now()
         where id = o.id;
      end if;
      if v_obj ->> 'customer' is not null then
        update public.program_orders set stripe_customer_id = coalesce(stripe_customer_id, v_obj ->> 'customer')
         where id = o.id;
      end if;

      if i.status = 'payee' then
        v_result := 'already_paid';
      else
        v_amount := coalesce((v_obj ->> 'amount_total')::integer, (v_obj ->> 'amount_received')::integer);
        update public.program_installments
           set status = 'payee',
               stripe_payment_intent_id = coalesce(stripe_payment_intent_id,
                 case when p_type = 'payment_intent.succeeded' then v_obj ->> 'id' else v_obj ->> 'payment_intent' end),
               stripe_checkout_session_id = case when p_type like 'checkout.session.%'
                 then v_obj ->> 'id' else stripe_checkout_session_id end,
               amount_paid_cents = coalesce(v_amount, amount_ht_cents),
               tax_paid_cents = coalesce((v_obj #>> '{total_details,amount_tax}')::integer, tax_paid_cents),
               requires_action = false,
               failure_code = null,
               paid_at = now(),
               updated_at = now()
         where id = i.id;
        v_result := private.program_after_payment(o.id, v_rank);
      end if;
    end if;

  elsif p_type in ('payment_intent.payment_failed', 'checkout.session.async_payment_failed') then
    if i.status = 'payee' then
      v_result := 'already_paid';
    else
      update public.program_installments
         set status = 'echouee',
             failure_code = coalesce(v_obj #>> '{last_payment_error,code}', 'payment_failed'),
             requires_action = (v_obj ->> 'status' = 'requires_action'
                                or v_obj #>> '{last_payment_error,code}' = 'authentication_required'),
             stripe_payment_intent_id = coalesce(stripe_payment_intent_id,
               case when p_type = 'payment_intent.payment_failed' then v_obj ->> 'id' end),
             updated_at = now()
       where id = i.id;
      v_result := 'failed';
      -- Versement 1 : le parent réessaie dans la même page Checkout ; on n'alerte que pour le 2.
      if v_rank = 2 then
        perform private.program_notify('program_installment_failed', 'Versement 2 non abouti',
          'Le prélèvement du 2e versement n''a pas abouti : un lien de paiement est nécessaire.',
          jsonb_build_object('order_id', o.id, 'installment_id', i.id));
      end if;
    end if;

  elsif p_type = 'checkout.session.expired' then
    if v_rank = 1 and o.status = 'en_attente' then
      update public.program_orders set status = 'annulee', updated_at = now() where id = o.id;
      v_result := 'expired';
    else
      update public.program_installments
         set checkout_url = null, checkout_expires_at = null, updated_at = now()
       where id = i.id and stripe_checkout_session_id = v_obj ->> 'id';
      v_result := 'link_expired';
    end if;

  elsif p_type = 'charge.refunded' then
    v_refund := coalesce((v_obj ->> 'amount_refunded')::integer, 0);
    update public.program_installments
       set amount_refunded_cents = greatest(amount_refunded_cents, v_refund),
           status = case when v_refund >= coalesce(amount_paid_cents, amount_ht_cents) then 'remboursee' else status end,
           refunded_at = now(),
           updated_at = now()
     where id = i.id
     returning * into i;
    v_result := case when i.status = 'remboursee' then 'refunded' else 'partially_refunded' end;
    -- Commande entièrement remboursée ⇒ statut « remboursee ». Le pack n'est PAS
    -- retiré : c'est une décision admin (admin_end_pack, 080).
    if not exists (select 1 from public.program_installments x
                    where x.order_id = o.id and x.status = 'payee') then
      update public.program_orders set status = 'remboursee', updated_at = now()
       where id = o.id and not exists (select 1 from public.program_installments x
                                        where x.order_id = o.id and x.status = 'due');
    end if;
    perform private.program_notify('program_refunded', 'Programme remboursé',
      'Un remboursement Stripe a été enregistré (' || v_refund || ' ¢). Le pack reste ouvert : à terminer manuellement si besoin.',
      jsonb_build_object('order_id', o.id, 'installment_id', i.id, 'amount_refunded_cents', v_refund));
  else
    v_result := 'ignored_type';
  end if;

  update public.stripe_processed_events set result = v_result where event_id = p_event_id;
  return v_result;
end;
$$;
revoke execute on function public.program_apply_stripe_event(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.program_apply_stripe_event(text, text, jsonb) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. Versement 2 : lien de paiement / SCA (program-installment-charge)
-- ════════════════════════════════════════════════════════════════════════════
-- p_reason : autocharge_off | sca | failed
create or replace function public.program_record_installment_link(
  p_installment uuid, p_session_id text, p_url text, p_expires_at timestamptz, p_reason text
)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  i public.program_installments%rowtype;
begin
  if p_reason not in ('autocharge_off', 'sca', 'failed') then
    raise exception 'invalid_reason' using errcode = 'P0001';
  end if;
  update public.program_installments
     set stripe_checkout_session_id = p_session_id,
         checkout_url = p_url,
         checkout_expires_at = p_expires_at,
         requires_action = (p_reason = 'sca') or requires_action,
         updated_at = now()
   where id = p_installment and status in ('due', 'echouee')
  returning * into i;
  if not found then
    raise exception 'installment_not_payable' using errcode = 'P0001';
  end if;
  perform private.program_notify('program_installment_link', 'Lien de paiement du versement 2',
    case p_reason
      when 'sca' then 'La banque exige une confirmation du parent : envoyer ce lien de paiement.'
      when 'failed' then 'Le prélèvement a échoué : envoyer ce lien de paiement au parent.'
      else 'Versement 2 dû (séance 7) : envoyer ce lien de paiement au parent.'
    end,
    jsonb_build_object('installment_id', i.id, 'order_id', i.order_id, 'checkout_url', p_url,
                       'expires_at', p_expires_at, 'reason', p_reason));
end;
$$;
revoke execute on function public.program_record_installment_link(uuid, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.program_record_installment_link(uuid, text, text, timestamptz, text) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Séance 7 validée ⇒ versement 2 `due` (trigger additif, 071 inchangée)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function private.program_on_session_completed()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  r     record;
  v_id  uuid;
  v_ht  integer;
begin
  -- Ne jamais bloquer la clôture d'une séance par le coach.
  begin
    for r in
      select o.id, o.pack, o.mode, o.total_ht_cents
      from public.program_orders o
      where o.status = 'active'
        and o.mode = 'deux_versements'
        and o.parent_id in (
          select f.parent_id from public.children c
          join public.families f on f.id = c.family_id
          where c.id = new.child_id
          union
          select m.profile_id from public.children c
          join public.family_members m on m.family_id = c.family_id
          where c.id = new.child_id)
        and not exists (select 1 from public.program_installments x where x.order_id = o.id and x.rank = 2)
    loop
      v_ht := r.total_ht_cents - coalesce(
        (select x.amount_ht_cents from public.program_installments x where x.order_id = r.id and x.rank = 1), 0);
      if v_ht > 0 then
        insert into public.program_installments (order_id, rank, amount_ht_cents, tax_cents, status, due_when)
        values (r.id, 2, v_ht, private.program_qc_tax(v_ht), 'due', 'seance_7')
        on conflict (order_id, rank) do nothing
        returning id into v_id;
        if v_id is not null then
          perform private.program_notify('program_installment_due', 'Versement 2 dû (séance 7)',
            'La séance 7 est validée : le 2e versement d''un programme ' || r.pack || ' est dû.',
            jsonb_build_object('order_id', r.id, 'installment_id', v_id));
        end if;
      end if;
    end loop;
  exception when others then
    raise warning 'program_on_session_completed: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke execute on function private.program_on_session_completed() from public, anon, authenticated;

drop trigger if exists trg_program_installment_on_session7 on public.sessions;
create trigger trg_program_installment_on_session7
  after update of status on public.sessions
  for each row
  when (new.session_number = 7 and new.status::text = 'COMPLETED' and old.status::text is distinct from 'COMPLETED')
  execute function private.program_on_session_completed();

reset lock_timeout;

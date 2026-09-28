-- ─────────────────────────────────────────────────────────────────────────────
-- 064 — Monétisation hybride de P3 « Le moment qui compte »
--
-- Modèle : un seul droit d'accès (entitlement RevenueCat `thrive_moments`),
-- trois façons de payer :
--   • Web      : Stripe Checkout (edge function create-checkout-session) ;
--   • iOS      : App Store, via le SDK RevenueCat ;
--   • Android  : Google Play, via le SDK RevenueCat.
-- L'App User ID RevenueCat est TOUJOURS l'id Supabase (auth.users.id) : un
-- abonnement suit le compte, quel que soit l'endroit où il a été pris.
--
-- Source de vérité : RevenueCat. Cette table n'en est que le miroir, écrit
-- EXCLUSIVEMENT par le service role (edge functions revenuecat-webhook,
-- stripe-webhook, billing-sync) après relecture de l'état chez RevenueCat.
-- Le client ne peut que LIRE sa propre ligne.
--
-- Accès à « Maison » (tables p3_*) pour un parent = compte activé par le coach
-- (familles P1/P2, inchangé) OU abonnement P3 actif (le sien, ou celui du
-- titulaire de la famille pour un co-parent listé dans family_members).
--
-- Rollback (down) :
--   restaurer les policies gate_parent_p3_* de la 062 ;
--   restaurer access_state() de la 035 ;
--   drop function private.parent_p3_access(uuid);
--   drop function private.has_p3_subscription(uuid);
--   drop table public.billing_subscriptions;
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Miroir de l'état d'abonnement ─────────────────────────────────────────
create table if not exists public.billing_subscriptions (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  entitlement        text not null default 'thrive_moments',
  -- Droit actif au sens RevenueCat au moment de la dernière synchro.
  active             boolean not null default false,
  -- stripe | app_store | play_store | promotional | test_store | rc_billing …
  store              text,
  product_id         text,
  -- normal | trial | intro | promotional
  period_type        text,
  will_renew         boolean,
  -- null = sans date de fin (ex. accès offert à vie)
  expires_at         timestamptz,
  billing_issue_at   timestamptz,
  is_sandbox         boolean not null default false,
  -- A déjà eu un abonnement (essai gratuit une seule fois par compte).
  ever_subscribed    boolean not null default false,
  -- Client Stripe réutilisé d'un paiement web à l'autre (portail client).
  stripe_customer_id text unique,
  synced_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.billing_subscriptions is
  'Miroir (service role uniquement) de l''entitlement RevenueCat thrive_moments, toutes plateformes confondues.';

alter table public.billing_subscriptions enable row level security;

drop policy if exists billing_subscriptions_read_own on public.billing_subscriptions;
create policy billing_subscriptions_read_own on public.billing_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin_or_super()));

-- Aucune policy d'écriture : seul le service role (qui contourne la RLS) écrit.
revoke all on public.billing_subscriptions from anon;
revoke insert, update, delete on public.billing_subscriptions from authenticated;
grant select on public.billing_subscriptions to authenticated;

drop trigger if exists trg_billing_subscriptions_updated_at on public.billing_subscriptions;
create or replace function private.touch_billing_subscriptions()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_billing_subscriptions_updated_at
  before update on public.billing_subscriptions
  for each row execute function private.touch_billing_subscriptions();

-- ── 2) Droit d'accès P3 ──────────────────────────────────────────────────────
-- Abonnement actif du parent, ou du titulaire de sa famille (co-parent).
create or replace function private.has_p3_subscription(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from billing_subscriptions s
    where s.active
      and (s.expires_at is null or s.expires_at > now())
      and (
        s.user_id = p_user
        or s.user_id in (
          select f.parent_id
          from family_members m
          join families f on f.id = m.family_id
          where m.profile_id = p_user
        )
      )
  );
$$;

-- Parent : accès à Maison si compte activé par le coach OU abonné P3.
create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.parent_access_unlocked(p_parent) or private.has_p3_subscription(p_parent);
$$;

revoke execute on function private.has_p3_subscription(uuid) from public, anon;
revoke execute on function private.parent_p3_access(uuid) from public, anon;
grant execute on function private.has_p3_subscription(uuid) to authenticated;
grant execute on function private.parent_p3_access(uuid) to authenticated;

-- ── 3) Garde des tables p3_* : même logique que la 062, élargie aux abonnés ─
do $$
declare t text;
begin
  foreach t in array array['p3_moments', 'p3_skips', 'p3_saved', 'p3_rewards', 'p3_letters'] loop
    execute format('drop policy if exists gate_parent_%1$s on public.%1$s', t);
    execute format($p$
      create policy gate_parent_%1$s on public.%1$s
        as restrictive for all to authenticated
        using ((select private.jwt_role()) <> 'PARENT'
               or ((select private.parent_p3_access((select auth.uid())))
                   and coalesce((select enabled from public.app_settings
                                 where key = 'p3_enabled'), false)))
        with check ((select private.jwt_role()) <> 'PARENT'
               or ((select private.parent_p3_access((select auth.uid())))
                   and coalesce((select enabled from public.app_settings
                                 where key = 'p3_enabled'), false)))
    $p$, t);
  end loop;
end $$;

-- ── 4) access_state() : + p3_subscribed / p3_access ─────────────────────────
-- Mêmes clés qu'avant (rétrocompatible), deux clés en plus.
create or replace function public.access_state()
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := private.jwt_role();
  v_has_child boolean;
  v_has_confirmed boolean;
  v_coach_ok boolean;
  v_fitness boolean;
  v_subscribed boolean;
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  -- Coach / Admin / Super Admin / Enfant : pas de cycle d'activation ni de paywall
  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role,
      'unlocked', true,
      'has_child', true,
      'has_confirmed_child', true,
      'coach_validated', true,
      'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false,
      'p3_access', true
    );
  end if;

  select
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active),
    exists (select 1 from children c join families f on f.id = c.family_id
            where f.parent_id = v_uid and c.is_active
              and c.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  select coalesce(coach_validated, false) into v_coach_ok
  from profiles where id = v_uid;

  v_subscribed := private.has_p3_subscription(v_uid);

  return jsonb_build_object(
    'role', v_role,
    'unlocked', v_has_confirmed and v_coach_ok,
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', v_coach_ok,
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', v_subscribed,
    'p3_access', (v_has_confirmed and v_coach_ok) or v_subscribed
  );
end;
$$;

revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;

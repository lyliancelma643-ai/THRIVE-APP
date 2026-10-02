-- ─────────────────────────────────────────────────────────────────────────────
-- 20261002_068_certificate_reward_grants.sql
-- « 1 mois offert » du Certificat THRIVE Maison (CGU §5) : la promesse affichée
-- sur le certificat est désormais appliquée par la facturation.
--
--   • reward_grants : UN crédit par famille et par récompense (unique), avec son
--     état — PENDING (réservé, appliqué au prochain Checkout web), APPLIED
--     (coupon posé sur l'abonnement Stripe ou utilisé au Checkout),
--     STORE_MANUAL (abonnement App Store / Google Play : remise manuelle par
--     l'équipe), FAILED (erreur Stripe, nouvel essai possible).
--     Écriture réservée au serveur (service_role) ; lecture par les parents de
--     la famille et l'équipe.
--   • Déclencheur : à l'insertion de la récompense « certificat » dans
--     p3_rewards, appel asynchrone (pg_net) de l'edge function
--     claim-certificate-reward — même mécanisme et mêmes secrets Vault que le
--     Web Push (edge_functions_url, push_trigger_secret). Sans secrets : no-op,
--     l'app appelle aussi la fonction (idempotente) après l'émission.
--   • L'éligibilité est REVÉRIFIÉE côté serveur (3 fiches de la semaine 13
--     dans p3_moments) : une ligne p3_rewards forgée ne suffit pas.
-- Dépend de 066 (private.is_family_member).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reward_grants (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  reward_id text not null default 'certificat',
  child_id uuid references public.children(id) on delete set null,
  payer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPLIED', 'STORE_MANUAL', 'FAILED')),
  channel text check (channel in ('stripe', 'checkout', 'store', 'deferred')),
  amount_minor integer check (amount_minor is null or amount_minor > 0),
  currency text,
  stripe_coupon_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  error text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (family_id, reward_id)
);

comment on table public.reward_grants is
  'Crédits promis par les récompenses Maison (certificat : 1 mois offert), un par famille.';

alter table public.reward_grants enable row level security;

-- Droits explicites (sans dépendre des privilèges par défaut du projet) :
-- lecture seule pour les comptes connectés, écriture réservée au serveur.
revoke all on public.reward_grants from anon, authenticated;
grant select on public.reward_grants to authenticated;
grant all on public.reward_grants to service_role;

drop policy if exists reward_grants_read on public.reward_grants;
create policy reward_grants_read on public.reward_grants for select to authenticated
  using (private.is_family_member(family_id) or private.is_admin());
-- Aucune politique d'écriture : seul le service_role (edge functions) écrit.

create index if not exists reward_grants_payer_pending
  on public.reward_grants (payer_id) where status = 'PENDING';

-- Déclencheur : émission du certificat → réclamation du mois offert
create or replace function private.claim_certificate_reward()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
begin
  if new.reward_id <> 'certificat' then return new; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'edge_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret';
  if v_url is null or v_secret is null then return new; end if;

  perform net.http_post(
    url := v_url || '/claim-certificate-reward',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('child_id', new.child_id),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  -- La récompense est acquise quoi qu'il arrive ; l'app relance la réclamation.
  return new;
end $$;

drop trigger if exists trg_p3_rewards_claim_certificate on public.p3_rewards;
create trigger trg_p3_rewards_claim_certificate
  after insert on public.p3_rewards
  for each row execute function private.claim_certificate_reward();

-- 20260711_045_web_push_subscriptions.sql
-- Abonnements Web Push (PWA) — un enregistrement par navigateur/appareil.
-- Écrits par l'utilisateur connecté (toggle Compte), lus par la fonction
-- d'envoi `send-web-push` (service_role). Idempotent.

create table if not exists public.web_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_web_push_subs_user
  on public.web_push_subscriptions(user_id);

alter table public.web_push_subscriptions enable row level security;

-- Une seule policy permissive par action/rôle, auth.uid() en sous-select
-- (conforme aux advisors auth_rls_initplan / multiple_permissive_policies).
drop policy if exists web_push_subs_own on public.web_push_subscriptions;
create policy web_push_subs_own on public.web_push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.web_push_subscriptions from anon;
grant select, insert, update, delete on public.web_push_subscriptions to authenticated;

comment on table public.web_push_subscriptions is
  'Abonnements Web Push PWA (endpoint + clés ECDH). RLS : chaque utilisateur gère les siens ; envoi via service_role (edge function send-web-push).';

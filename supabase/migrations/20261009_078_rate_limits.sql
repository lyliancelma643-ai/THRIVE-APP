-- ─────────────────────────────────────────────────────────────────────────────
-- 078 — Limitation de débit par utilisateur pour les Edge Functions (audit P1-8).
--
-- Table de compteurs à fenêtre fixe, une ligne par (user_id, bucket).
-- Aucun accès client : RLS activée SANS policy, privilèges révoqués pour
-- anon/authenticated. Seule la fonction consume_rate_limit (SECURITY DEFINER,
-- exécutable uniquement par service_role) lit et écrit la table ; elle est
-- appelée par supabase/functions/_shared/rate-limit.ts.
--
-- Atomicité : un seul INSERT … ON CONFLICT DO UPDATE (verrou de ligne) → pas
-- de course entre deux appels simultanés (pas de lecture puis écriture).
-- Purge : pg_cron horaire (purge_rate_limits) supprime les fenêtres échues
-- depuis plus de 24 h (la plus longue fenêtre utilisée est 1 h).
--
-- Rollback : select cron.unschedule('purge-rate-limits');
--            drop function public.purge_rate_limits();
--            drop function public.consume_rate_limit(uuid, text, integer, integer);
--            drop table public.rate_limits;
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

create table if not exists public.rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  bucket       text        not null check (char_length(bucket) between 1 and 64),
  window_start timestamptz not null default now(),
  hits         integer     not null default 0,
  primary key (user_id, bucket)
);

alter table public.rate_limits enable row level security;
-- Volontairement aucune policy : aucun accès via l'API client.
revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;

-- Consomme 1 jeton. Renvoie {"allowed": bool, "hits": int, "retry_after": int (s)}.
create or replace function public.consume_rate_limit(
  p_user uuid,
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window interval := make_interval(secs => greatest(p_window_seconds, 1));
  v_hits integer;
  v_start timestamptz;
begin
  if p_user is null or p_bucket is null or p_max is null or p_max < 1 then
    raise exception 'consume_rate_limit: paramètres invalides';
  end if;

  insert into public.rate_limits as r (user_id, bucket, window_start, hits)
  values (p_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set hits = case when r.window_start <= now() - v_window then 1 else r.hits + 1 end,
        window_start = case when r.window_start <= now() - v_window then now() else r.window_start end
  returning r.hits, r.window_start into v_hits, v_start;

  return jsonb_build_object(
    'allowed', v_hits <= p_max,
    'hits', v_hits,
    'retry_after', greatest(0, ceil(extract(epoch from (v_start + v_window - now()))))::integer
  );
end;
$$;

revoke execute on function public.consume_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(uuid, text, integer, integer) to service_role;

-- Purge des compteurs échus (fenêtres terminées depuis plus de 24 h).
create or replace function public.purge_rate_limits()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (
    delete from public.rate_limits where window_start < now() - interval '24 hours' returning 1
  )
  select count(*)::integer from d;
$$;

revoke execute on function public.purge_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_rate_limits() to service_role;

create extension if not exists pg_cron;

select cron.unschedule('purge-rate-limits')
where exists (select 1 from cron.job where jobname = 'purge-rate-limits');

select cron.schedule('purge-rate-limits', '17 * * * *', 'select public.purge_rate_limits();');

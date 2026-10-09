-- 079 — Suppressions planifiées (Loi 25) + alerte S1
-- Avant : demandes traitées à la main, aucune tâche planifiée.
-- Après : pg_cron quotidien → net.http_post vers l'edge function process-due-deletions
-- (URL + secret lus dans Vault, comme le push 047) + alerte admin si S1 > 0.
--
-- Secrets Vault à poser en prod (aucun en dur ici) :
--   edge_functions_url      (déjà posé pour le push 047)
--   deletions_cron_secret   (≥ 16 car. ; MÊME valeur que le secret edge DELETIONS_CRON_SECRET)

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Marqueur de traitement (idempotence). Les anciennes lignes restent non traitées.
alter table public.deletion_requests add column if not exists processed_at timestamptz;
create index if not exists deletion_requests_due_idx
  on public.deletion_requests (due_at) where processed_at is null;

-- Backfill : demandes déjà traitées à la main (statut ≠ PENDING) → marquées traitées.
update public.deletion_requests
set processed_at = now()
where status <> 'PENDING' and processed_at is null;

-- Exécutée par pg_cron : alerte S1 puis appel de l'edge function.
create or replace function private.run_due_deletions()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
  v_late   integer;
begin
  -- Alerte S1 : demandes échues ou à moins de 5 jours de l'échéance, non traitées.
  select count(*) into v_late
  from public.deletion_requests
  where processed_at is null and status = 'PENDING'
    and coalesce(due_at, requested_at + interval '30 days') < now() + interval '5 days';
  if v_late > 0 then
    perform private.notify_admins('deletion_due', 'accounts',
      'Suppressions à traiter',
      v_late || ' demande(s) de suppression échue(s) ou à moins de 5 jours de l''échéance.',
      '/admin/families', jsonb_build_object('count', v_late));
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_functions_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'deletions_cron_secret';
  if v_url is null or v_secret is null then
    perform private.notify_admins('deletion_cron_misconfigured', 'system',
      'Suppressions planifiées inactives',
      'Secrets Vault edge_functions_url / deletions_cron_secret absents : rien n''est supprimé automatiquement.',
      '/admin/families', '{}'::jsonb);
    return;
  end if;

  perform net.http_post(
    url := v_url || '/process-due-deletions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
exception when others then
  raise warning 'run_due_deletions: %', sqlerrm;
end $$;

revoke all on function private.run_due_deletions() from public, anon, authenticated;

-- Planification quotidienne (09:00 UTC), idempotente.
do $$
begin
  perform cron.unschedule('process-due-deletions')
  where exists (select 1 from cron.job where jobname = 'process-due-deletions');
  perform cron.schedule('process-due-deletions', '0 9 * * *', 'select private.run_due_deletions()');
end $$;

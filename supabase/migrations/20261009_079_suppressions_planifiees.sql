-- 079 — Suppressions planifiées (Loi 25) + alerte S1
-- Avant : demandes traitées à la main, aucune tâche planifiée.
-- Après : pg_cron quotidien → net.http_post vers l'edge function process-due-deletions
-- (URL + secret lus dans Vault, comme le push 047) + alerte admin si S1 > 0.
--
-- Secrets Vault à poser en prod (aucun en dur ici) :
--   edge_functions_url      (déjà posé pour le push 047)
--   deletions_cron_secret   (≥ 16 car. ; MÊME valeur que le secret edge DELETIONS_CRON_SECRET)
--
-- Statuts (deletion_requests.status, texte libre, aucune contrainte CHECK) :
--   seule la valeur 'PENDING' est prouvée dans le dépôt (défaut 037b, lue par
--   request-account-deletion, DeleteAccountSection, overdue_deletion_requests 066d).
--   Aucun écran admin n'écrit de statut « traité » : la suppression manuelle
--   (admin-delete-user) supprime le compte et la ligne part par cascade.
--   L'edge function écrit 'COMPLETED' APRÈS une suppression réussie (convention
--   du produit) ; tant que le compte n'est pas supprimé, la ligne reste PENDING.
--   À vérifier avant application : select status, count(*) from deletion_requests group by status;
--
-- Idempotence : processed_at = marqueur de prise (update conditionnel atomique
-- côté edge function) ; une prise vieille de plus de 6 h est reprise.

set lock_timeout = '5s';

-- Supabase : pg_net dans le schéma extensions (déjà installé par 047), pg_cron dans pg_catalog.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Marqueur de prise/traitement. Colonne déjà présente en prod (types générés) : no-op.
-- L'index existant deletion_requests_pending_due_idx (066d, where status = 'PENDING') suffit.
alter table public.deletion_requests add column if not exists processed_at timestamptz;

-- Backfill : lignes au statut ≠ PENDING (traitées ou annulées à la main) → marquées traitées.
-- Les lignes PENDING restent processed_at null et seront prises par le job.
update public.deletion_requests
set processed_at = coalesce(processed_at, now())
where status <> 'PENDING' and processed_at is null;

-- Exécutée par pg_cron : alerte S1 puis appel de l'edge function (asynchrone, pg_net).
create or replace function private.run_due_deletions()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
  v_late   integer;
begin
  -- Alerte S1 : demandes encore PENDING (prises ou non) échues ou à moins de
  -- 5 jours de l'échéance. Une prise bloquée reste donc visible. Bloc isolé :
  -- un échec de l'alerte n'empêche pas l'appel de l'edge function.
  begin
    select count(*) into v_late
    from public.deletion_requests
    where status = 'PENDING'
      and coalesce(due_at, requested_at + interval '30 days') < now() + interval '5 days';
    if v_late > 0 then
      perform private.notify_admins('deletion_due', 'accounts',
        'Suppressions à traiter',
        v_late || ' demande(s) de suppression échue(s) ou à moins de 5 jours de l''échéance.',
        '/admin/users', jsonb_build_object('count', v_late));
    end if;
  exception when others then
    raise warning 'run_due_deletions (alerte S1): %', sqlerrm;
  end;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_functions_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'deletions_cron_secret';
  if v_url is null or v_secret is null or length(v_secret) < 16 then
    perform private.notify_admins('deletion_cron_misconfigured', 'system',
      'Suppressions planifiées inactives',
      'Secrets Vault edge_functions_url / deletions_cron_secret absents ou trop courts : rien n''est supprimé automatiquement.',
      '/admin/users', '{}'::jsonb);
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/process-due-deletions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
exception when others then
  raise warning 'run_due_deletions: %', sqlerrm;
end $$;

revoke all on function private.run_due_deletions() from public, anon, authenticated;

-- Planification quotidienne : 09:00 UTC = 05:00 (EDT) / 04:00 (EST) à Montréal,
-- hors heures d'usage. Idempotente : unschedule si le job existe, puis schedule.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'process-due-deletions';
  perform cron.schedule('process-due-deletions', '0 9 * * *', 'select private.run_due_deletions()');
end $$;

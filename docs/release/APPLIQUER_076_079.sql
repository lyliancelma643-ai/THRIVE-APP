-- GO 2 : migrations 076 → 079, à coller en une fois dans Supabase › SQL Editor (projet THRIVE-CA kkdcgzvdmipmrgkawnky).
-- Généré depuis supabase/migrations/20261009_07{6,7,8,9}_*.sql ; ne pas modifier ici.

-- ════════════ supabase/migrations/20261009_076_sandbox_revue_stores.sql ════════════
-- ─────────────────────────────────────────────────────────────────────────────
-- 076 — interrupteur « achats sandbox acceptés ».
--
-- Problème : 070 ignore les achats sandbox sauf pour le staff, les adresses
-- @thrivesportpositive.com et public.qa_accounts. Or l'App Review et la revue
-- Google achètent TOUJOURS en sandbox. Si le reviewer crée son propre compte
-- (ce que demandent les notes de revue actuelles), l'achat réussit mais
-- Maison reste verrouillée → rejet 2.1 (« IAP ne débloque pas le contenu »).
--
-- Correctif : app_settings.accept_sandbox_purchases. OFF par défaut à la
-- création (décision GO2 / P0-4) : à passer ON manuellement pendant les
-- revues stores, puis à repasser OFF après publication pour refermer l'accès
-- aux testeurs TestFlight. Un achat sandbox ne
-- peut venir QUE d'un build TestFlight / revue / développement.
--
-- Rollback : remettre le corps de has_p3_subscription de la migration 070.
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

insert into public.app_settings (key, enabled, note)
values ('accept_sandbox_purchases', false,
        'Achats sandbox (App Review, Play review, TestFlight) acceptés pour ouvrir Maison. OFF = seulement staff/QA.')
on conflict (key) do nothing;

create or replace function private.has_p3_subscription(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select
    (auth.uid() is null or auth.uid() = p_user or private.is_admin())
    and exists (
      select 1
      from billing_subscriptions s
      where s.active
        and (s.expires_at is null or s.expires_at > now())
        and (
          not s.is_sandbox
          or private.is_qa_account(s.user_id)
          or coalesce((select a.enabled from app_settings a where a.key = 'accept_sandbox_purchases'), false)
        )
        and (
          s.user_id = p_user
          or s.user_id in (
            select f.parent_id
            from families f
            where (
              select m.profile_id
              from family_members m
              where m.family_id = f.id
                and m.profile_id <> f.parent_id
                and m.member_role <> 'OWNER'
              order by m.created_at, m.id
              limit 1
            ) = p_user
          )
        )
    );
$$;
revoke execute on function private.has_p3_subscription(uuid) from public, anon;
grant execute on function private.has_p3_subscription(uuid) to authenticated;

reset lock_timeout;

-- ════════════ supabase/migrations/20261009_077_signalement_blocage.sql ════════════
-- 077 — Messagerie : signalement + blocage (Apple 1.2) et push sans extrait (Loi 25)
-- Idempotent. Autorité du rôle = private.is_admin_or_super() (app_metadata.role).

-- ── 1) Signalements de messages ─────────────────────────────────────────────
create table if not exists public.message_reports (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reporter_id     uuid not null references auth.users(id) on delete cascade,
  reason          text not null default 'AUTRE'
                  check (reason in ('HARCELEMENT','INAPPROPRIE','SPAM','AUTRE')),
  details         text check (details is null or char_length(details) <= 1000),
  status          text not null default 'OPEN' check (status in ('OPEN','REVIEWED','DISMISSED')),
  created_at      timestamptz not null default now(),
  unique (message_id, reporter_id)
);
create index if not exists message_reports_status_idx on public.message_reports (status, created_at desc);
create index if not exists message_reports_conversation_idx on public.message_reports (conversation_id);
create index if not exists message_reports_reporter_idx on public.message_reports (reporter_id);
alter table public.message_reports enable row level security;
-- Droits minimaux : jamais anon ; pas de suppression côté client (preuve).
revoke all on public.message_reports from anon, authenticated;
grant select, insert on public.message_reports to authenticated;
grant update (status) on public.message_reports to authenticated;

drop policy if exists message_reports_insert on public.message_reports;
drop policy if exists message_reports_select on public.message_reports;
drop policy if exists message_reports_admin_update on public.message_reports;

create policy message_reports_insert on public.message_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid())
              and private.can_access_conversation(conversation_id));
create policy message_reports_select on public.message_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_admin_or_super());
create policy message_reports_admin_update on public.message_reports
  for update to authenticated
  using (private.is_admin_or_super()) with check (private.is_admin_or_super());

-- Cohérence message/fil + alerte admin (sans reproduire le contenu du message).
create or replace function private.message_reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_conv uuid;
begin
  select m.conversation_id into v_conv from public.messages m where m.id = new.message_id;
  if v_conv is null or v_conv <> new.conversation_id then
    raise exception 'Message introuvable dans cette conversation' using errcode = '22023';
  end if;
  -- Un signalement naît toujours ouvert : seul un admin change le statut ensuite.
  new.status := 'OPEN';
  return new;
end $$;

create or replace function private.message_reports_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify_admins(
    'message_report', 'messages',
    'Message signalé',
    'Un message a été signalé (' || lower(new.reason) || '). À traiter sous 24 h.',
    '/admin/messages?c=' || new.conversation_id::text,
    jsonb_build_object('report_id', new.id, 'message_id', new.message_id,
                       'conversation_id', new.conversation_id),
    new.reporter_id, null, null, false, 'ADMIN_ALERT');
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_message_reports_before_insert on public.message_reports;
create trigger trg_message_reports_before_insert
  before insert on public.message_reports
  for each row execute function private.message_reports_before_insert();
drop trigger if exists trg_message_reports_notify on public.message_reports;
create trigger trg_message_reports_notify
  after insert on public.message_reports
  for each row execute function private.message_reports_notify();

-- ── 2) Blocage de conversation ──────────────────────────────────────────────
create table if not exists public.conversation_blocks (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  blocker_id      uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (conversation_id, blocker_id)
);
create index if not exists conversation_blocks_blocker_idx on public.conversation_blocks (blocker_id);
create index if not exists conversation_blocks_blocked_user_idx on public.conversation_blocks (blocked_user_id);
alter table public.conversation_blocks enable row level security;
revoke all on public.conversation_blocks from anon, authenticated;
grant select, insert, delete on public.conversation_blocks to authenticated;

drop policy if exists conversation_blocks_insert on public.conversation_blocks;
drop policy if exists conversation_blocks_select on public.conversation_blocks;
drop policy if exists conversation_blocks_delete on public.conversation_blocks;

create policy conversation_blocks_insert on public.conversation_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid())
              and private.can_access_conversation(conversation_id));
create policy conversation_blocks_select on public.conversation_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()) or private.is_admin_or_super());
create policy conversation_blocks_delete on public.conversation_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Remplit l'utilisateur bloqué (l'autre participant du fil COACH). Le fil
-- SUPPORT ne se bloque pas : c'est le canal d'aide de THRIVE.
create or replace function private.conversation_blocks_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.conversations%rowtype;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found or c.kind <> 'COACH' then
    raise exception 'Seules les conversations avec un coach peuvent être bloquées' using errcode = '22023';
  end if;
  -- Seul un participant bloque (le coach, le parent du fil ou un parent de la
  -- famille) : la supervision admin, en lecture seule, ne bloque pas un fil.
  if not (new.blocker_id = c.coach_id or new.blocker_id = c.parent_id
          or private.is_family_parent(c.family_id)) then
    raise exception 'Seuls les participants peuvent bloquer cette conversation' using errcode = '42501';
  end if;
  new.blocked_user_id := case when new.blocker_id = c.coach_id then c.parent_id else c.coach_id end;
  return new;
end $$;

drop trigger if exists trg_conversation_blocks_before_insert on public.conversation_blocks;
create trigger trg_conversation_blocks_before_insert
  before insert on public.conversation_blocks
  for each row execute function private.conversation_blocks_before_insert();

-- Un fil bloqué n'accepte plus aucun message (ni de l'un, ni de l'autre).
create or replace function private.messages_block_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_system and exists (
    select 1 from public.conversation_blocks b where b.conversation_id = new.conversation_id
  ) then
    raise exception 'Conversation bloquée' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_messages_block_guard on public.messages;
create trigger trg_messages_block_guard
  before insert on public.messages
  for each row execute function private.messages_block_guard();

-- ── 3) Push sans extrait de message (P1-11) ─────────────────────────────────
-- Le texte transitait par Expo/APNs/FCM (hors Québec). Pour les notifications
-- de message : libellé générique, aucun nom ni extrait. Reste identique à 047.
create or replace function private.notify_send_web_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
  v_title  text := new.title;
  v_body   text := new.body;
  v_role   text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_functions_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_trigger_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  -- Titre selon le destinataire et le fil ; corps vide (et non null : le
  -- service worker passerait null à showNotification, affiché « null »).
  if new.type::text in ('MESSAGE', 'MESSAGE_RECEIVED') then
    select p.role::text into v_role from public.profiles p where p.id = new.user_id;
    v_title := case
      when v_role in ('COACH', 'ADMIN', 'SUPER_ADMIN') then 'Nouveau message'
      when new.data ->> 'kind' = 'SUPPORT' then 'Nouveau message de l''équipe THRIVE'
      else 'Nouveau message de votre coach'
    end;
    v_body := '';
  end if;

  perform net.http_post(
    url := v_url || '/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', v_title,
      'body', coalesce(v_body, ''),
      'data', jsonb_build_object('url', coalesce(new.data ->> 'path', '/'))),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;
end $$;

reset lock_timeout;

-- ════════════ supabase/migrations/20261009_078_rate_limits.sql ════════════
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

reset lock_timeout;

-- ════════════ supabase/migrations/20261009_079_suppressions_planifiees.sql ════════════
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

reset lock_timeout;

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

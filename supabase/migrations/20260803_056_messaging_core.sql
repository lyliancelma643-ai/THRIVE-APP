-- ─────────────────────────────────────────────────────────────────────────────
-- 20260803_056_messaging_core.sql
-- Messagerie THRIVE — socle complet.
--
-- Contexte : le schéma vivant (participant_1/participant_2, messages.receiver_id,
-- messages.status) ne correspondait à AUCUN écran. Le code parent/coach lisait
-- `conversations.coach_id` (colonne inexistante) et le trigger
-- `notify_on_new_message` insérait une notification de type 'MESSAGE', valeur
-- absente de l'enum `notification_type` : tout INSERT de message échouait. La
-- messagerie n'a donc jamais fonctionné (0 conversation, 0 message en base).
--
-- Cette migration pose le modèle définitif :
--   • conversations.kind = COACH (parent ↔ coach attribué) | SUPPORT (parent ↔ THRIVE)
--   • un fil COACH par (parent, coach, enfant) ; UN SEUL fil SUPPORT par parent
--   • conversation_reads : état de lecture par participant (accusés « Lu »,
--     compteurs de non-lus, et support multi-agents sans se marcher dessus)
--   • création des fils par RPC SECURITY DEFINER (plus de course côté client)
--   • notifications MESSAGE_RECEIVED avec data.path → cloche + Web Push (mig. 047/053)
--   • pièces jointes dans un bucket privé cloisonné par conversation
--
-- Droits : la messagerie coach reste l'exclusivité du forfait PERFORMANCE
-- (feature coachMessaging, cf. mig. 041) ; le SUPPORT est ouvert à TOUS les
-- parents, y compris compte non encore activé — c'est précisément là qu'on a
-- besoin d'écrire à THRIVE.
--
-- Rollback : cf. bloc commenté en fin de fichier.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0) Garde-fou ─────────────────────────────────────────────────────────────
-- On ne restructure que si l'ancien schéma est encore là ET vide. Si des
-- conversations existent sous l'ancien modèle, la migration s'arrête plutôt que
-- de détruire de l'historique.
do $$
begin
  if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'conversations'
          and column_name = 'participant_1')
     and (select count(*) from public.conversations) > 0 then
    raise exception
      'Messagerie : des conversations existent sous l''ancien schéma — migration à adapter avant application.';
  end if;
end $$;

-- Les policies de l'ancien modèle référencent participant_1/2 et receiver_id :
-- elles tombent d'abord, sinon Postgres refuse de retirer les colonnes (2BP01).
drop policy if exists "Conversation participants only"        on public.conversations;
drop policy if exists participants_can_access_conversation    on public.conversations;
drop policy if exists admins_can_see_all_conversations        on public.conversations;
drop policy if exists conversations_parent_requires_messaging on public.conversations;
drop policy if exists "Message participants only"             on public.messages;
drop policy if exists sender_or_receiver_messages             on public.messages;
drop policy if exists admins_read_all_messages                on public.messages;
drop policy if exists messages_parent_requires_messaging      on public.messages;

-- ── 1) Types ─────────────────────────────────────────────────────────────────
do $$ begin
  create type conversation_kind as enum ('COACH', 'SUPPORT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_status as enum ('OPEN', 'CLOSED');
exception when duplicate_object then null; end $$;

-- ── 2) conversations ─────────────────────────────────────────────────────────
alter table public.conversations
  add column if not exists kind                conversation_kind   not null default 'COACH',
  add column if not exists status              conversation_status not null default 'OPEN',
  add column if not exists parent_id           uuid references public.profiles(id) on delete cascade,
  add column if not exists coach_id            uuid references public.profiles(id) on delete set null,
  add column if not exists child_id            uuid references public.children(id) on delete set null,
  add column if not exists assigned_admin_id   uuid references public.profiles(id) on delete set null,
  add column if not exists subject             text,
  add column if not exists last_message_preview text,
  add column if not exists last_sender_id      uuid references public.profiles(id) on delete set null,
  add column if not exists closed_at           timestamptz,
  add column if not exists closed_by           uuid references public.profiles(id) on delete set null;

-- Les deux colonnes de l'ancien modèle « deux participants anonymes » : le rôle
-- de chacun (parent / coach / support) est désormais explicite.
alter table public.conversations
  drop column if exists participant_1,
  drop column if exists participant_2;

alter table public.conversations alter column parent_id set not null;

alter table public.conversations drop constraint if exists conversations_kind_shape;
alter table public.conversations add constraint conversations_kind_shape check (
  (kind = 'COACH'   and coach_id is not null and child_id is not null)
  or
  (kind = 'SUPPORT' and coach_id is null)
);

-- Un fil par duo coach·parent ET par athlète (le coach lit le fil dans le
-- contexte de l'athlète concerné) ; un seul guichet support par parent.
create unique index if not exists conversations_coach_thread_uniq
  on public.conversations (parent_id, coach_id, child_id) where kind = 'COACH';
create unique index if not exists conversations_support_thread_uniq
  on public.conversations (parent_id) where kind = 'SUPPORT';

create index if not exists conversations_parent_idx  on public.conversations (parent_id, last_message_at desc);
create index if not exists conversations_coach_idx   on public.conversations (coach_id, last_message_at desc);
create index if not exists conversations_support_idx on public.conversations (status, last_message_at desc) where kind = 'SUPPORT';

-- ── 3) messages ──────────────────────────────────────────────────────────────
alter table public.messages
  add column if not exists attachment_name text,
  add column if not exists attachment_size integer,
  add column if not exists edited_at       timestamptz,
  add column if not exists deleted_at      timestamptz,
  add column if not exists is_system       boolean not null default false;

-- receiver_id ne sait pas décrire « le support » (plusieurs agents) ; status et
-- read_at sont remplacés par conversation_reads (état par participant).
alter table public.messages
  drop column if exists receiver_id,
  drop column if exists status,
  drop column if exists read_at,
  drop column if exists family_id;

alter table public.messages alter column conversation_id set not null;
alter table public.messages alter column content set default '';

-- Clés étrangères : posées seulement si la colonne n'en a pas déjà une (le
-- schéma vivant porte messages_conversation_id_fkey / messages_reply_to_id_fkey).
do $$
declare
  v_col text;
  v_ddl text;
begin
  foreach v_col in array array['conversation_id', 'reply_to_id'] loop
    if not exists (
      select 1 from pg_constraint c
      where c.conrelid = 'public.messages'::regclass and c.contype = 'f'
        and c.conkey = array[(select attnum from pg_attribute
                               where attrelid = 'public.messages'::regclass and attname = v_col)]
    ) then
      v_ddl := case v_col
        when 'conversation_id' then
          'alter table public.messages add constraint messages_conversation_fkey
             foreign key (conversation_id) references public.conversations(id) on delete cascade'
        else
          'alter table public.messages add constraint messages_reply_to_fkey
             foreign key (reply_to_id) references public.messages(id) on delete set null'
      end;
      execute v_ddl;
    end if;
  end loop;
end $$;

-- attachment_type portait un vocabulaire maison ('image' | 'file' | 'audio') :
-- on stocke désormais le type MIME réel ('image/jpeg', 'application/pdf'), qui
-- est aussi ce que contrôle le bucket. L'ancienne contrainte rejetterait TOUTES
-- les pièces jointes.
alter table public.messages drop constraint if exists messages_attachment_type_check;

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check check (
  char_length(content) <= 4000
  and (char_length(btrim(content)) > 0 or attachment_url is not null or deleted_at is not null)
);

alter table public.messages drop constraint if exists messages_attachment_size_check;
alter table public.messages add constraint messages_attachment_size_check check (
  attachment_size is null or (attachment_size > 0 and attachment_size <= 10485760)
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ── 4) conversation_reads ────────────────────────────────────────────────────
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_reads enable row level security;
alter table public.conversation_reads replica identity full;

-- ── 5) Helpers d'accès ───────────────────────────────────────────────────────

-- Co-parent : second parent rattaché à la famille (family_members). Le fil
-- COACH appartient à la famille — les deux parents le lisent et y écrivent.
-- Le fil SUPPORT, lui, reste strictement personnel au compte qui l'a ouvert.
create or replace function private.is_family_parent(p_family uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_family is not null and (
    exists (select 1 from public.families f where f.id = p_family and f.parent_id = auth.uid())
    or exists (select 1 from public.family_members m
                where m.family_id = p_family and m.profile_id = auth.uid())
  );
$$;

-- Lecture : les participants (parents de la famille, coach), plus les admins
-- (supervision des fils coach + file du support).
create or replace function private.can_access_conversation(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conv
      and (c.parent_id = auth.uid()
        or c.coach_id  = auth.uid()
        or (c.kind = 'COACH' and private.is_family_parent(c.family_id))
        or private.is_admin_or_super())
  );
$$;

-- Écriture : le parent (avec le droit de forfait de SA famille pour le fil
-- coach), le coach du fil, et le support pour les fils SUPPORT. Un admin
-- n'écrit JAMAIS dans un fil coach ↔ parent : la supervision est en lecture seule.
create or replace function private.can_write_conversation(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conv
      and case c.kind
        when 'COACH' then
          c.coach_id = auth.uid()
          or ((c.parent_id = auth.uid() or private.is_family_parent(c.family_id))
              and private.pack_feature(c.child_id, 'coachMessaging'))
        when 'SUPPORT' then
          c.parent_id = auth.uid() or private.is_admin_or_super()
        else false
      end
  );
$$;

revoke all on function private.is_family_parent(uuid)        from public, anon;
revoke all on function private.can_access_conversation(uuid) from public, anon;
revoke all on function private.can_write_conversation(uuid)  from public, anon;

-- Une expression de policy est évaluée AVEC LES DROITS DE L'APPELANT : ces
-- helpers doivent donc être exécutables par `authenticated`, comme
-- private.is_admin_or_super() ou private.pack_feature() l'étaient déjà. Sans ce
-- grant, tout INSERT de message échoue (« permission denied for function »).
-- Sans risque : SECURITY DEFINER, ils ne répondent qu'à « ai-je accès à ce
-- fil ? » et ne renvoient aucune donnée de conversation.
grant execute on function private.is_family_parent(uuid)        to authenticated;
grant execute on function private.can_access_conversation(uuid) to authenticated;
grant execute on function private.can_write_conversation(uuid)  to authenticated;

-- ── 6) RLS ───────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

drop policy if exists conversations_select                        on public.conversations;
drop policy if exists conversations_admin_update                  on public.conversations;
drop policy if exists conversations_super_delete                  on public.conversations;

-- Création des fils : exclusivement par les RPC ci-dessous (SECURITY DEFINER).
-- Aucune policy INSERT → pas de fil bricolé depuis le client.
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    parent_id = (select auth.uid())
    or coach_id = (select auth.uid())
    or (kind = 'COACH' and private.is_family_parent(family_id))
    or private.is_admin_or_super()
  );

-- Triage du support : assignation, clôture, réouverture — admins uniquement.
create policy conversations_admin_update on public.conversations
  for update to authenticated
  using (kind = 'SUPPORT' and private.is_admin_or_super())
  with check (kind = 'SUPPORT' and private.is_admin_or_super());

create policy conversations_super_delete on public.conversations
  for delete to authenticated
  using (private.is_super_admin());

drop policy if exists messages_select                      on public.messages;
drop policy if exists messages_insert                      on public.messages;
drop policy if exists messages_update_own                  on public.messages;
drop policy if exists messages_admin_moderate              on public.messages;

create policy messages_select on public.messages
  for select to authenticated
  using (private.can_access_conversation(conversation_id));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and is_system = false
    and private.can_write_conversation(conversation_id)
  );

-- Correction / suppression de son propre message dans les 15 minutes.
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender_id = (select auth.uid()) and created_at > now() - interval '15 minutes')
  with check (sender_id = (select auth.uid()));

-- Modération : un admin peut masquer un message (deleted_at), jamais le réécrire.
create policy messages_admin_moderate on public.messages
  for update to authenticated
  using (private.is_admin_or_super())
  with check (private.is_admin_or_super());

drop policy if exists conversation_reads_select on public.conversation_reads;
drop policy if exists conversation_reads_write  on public.conversation_reads;
drop policy if exists conversation_reads_update on public.conversation_reads;

-- Lecture ouverte aux participants : c'est ce qui alimente l'accusé « Lu ».
create policy conversation_reads_select on public.conversation_reads
  for select to authenticated
  using (private.can_access_conversation(conversation_id));

create policy conversation_reads_write on public.conversation_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_access_conversation(conversation_id));

create policy conversation_reads_update on public.conversation_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── 7) Intégrité des messages ────────────────────────────────────────────────
-- Un message ne change ni de fil, ni d'auteur, ni de date ; une édition estampille
-- edited_at. La modération admin ne peut que masquer (deleted_at + contenu vidé).
create or replace function private.messages_guard_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id              := old.id;
  new.conversation_id := old.conversation_id;
  new.sender_id       := old.sender_id;
  new.created_at      := old.created_at;
  new.is_system       := old.is_system;

  if new.deleted_at is not null and old.deleted_at is null then
    new.content         := '';
    new.attachment_url  := null;
    new.attachment_name := null;
    new.attachment_type := null;
    new.attachment_size := null;
  elsif new.content is distinct from old.content then
    if old.sender_id <> auth.uid() then
      raise exception 'Seul l''auteur peut modifier son message';
    end if;
    new.edited_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_messages_guard_update on public.messages;
create trigger trg_messages_guard_update
  before update on public.messages
  for each row execute function private.messages_guard_update();

-- ── 8) Dénormalisation du fil + notifications ────────────────────────────────
-- Anciens producteurs : `notify_on_new_message` insérait un type 'MESSAGE'
-- inexistant dans l'enum (tout envoi échouait) et `notify_new_message` lisait
-- `conversations.coach_id` de l'ancien modèle. Les deux disparaissent.
drop trigger if exists on_new_message_notify   on public.messages;
drop trigger if exists trg_notify_new_message  on public.messages;
drop trigger if exists on_message_sent         on public.messages;
drop function if exists public.notify_on_new_message() cascade;
drop function if exists public.notify_new_message() cascade;
drop function if exists public.update_conversation_last_message() cascade;

create or replace function private.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv        public.conversations%rowtype;
  v_sender_name text;
  v_preview     text;
  v_title       text;
  v_recipient   uuid;
  v_path        text;
  v_role        text;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  v_preview := left(
    coalesce(nullif(btrim(new.content), ''),
             case when new.attachment_url is not null then 'Pièce jointe' else '' end), 140);

  -- 8a) Tête de fil (tri des listes, aperçu) + réouverture d'un ticket clos
  update public.conversations
     set last_message_at      = coalesce(new.created_at, now()),
         last_message_preview = v_preview,
         last_sender_id       = new.sender_id,
         status               = case when status = 'CLOSED' then 'OPEN'::conversation_status else status end,
         closed_at            = case when status = 'CLOSED' then null else closed_at end,
         closed_by            = case when status = 'CLOSED' then null else closed_by end
   where id = new.conversation_id;

  -- 8b) L'auteur a forcément lu son propre message
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, coalesce(new.created_at, now()))
  on conflict (conversation_id, user_id)
    do update set last_read_at = greatest(conversation_reads.last_read_at, excluded.last_read_at);

  if new.is_system then return new; end if;

  -- 8c) Destinataires, dans un bloc à part : un message part TOUJOURS, même si
  -- la notification échoue (la tête de fil ci-dessus, elle, n'est pas couverte
  -- par ce filet — elle doit réussir ou faire échouer l'envoi).
  begin
    select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
      into v_sender_name from public.profiles where id = new.sender_id;

    -- Fil coach : l'autre participant. Fil support : le parent si le support
    -- répond, sinon l'agent assigné — à défaut toute l'équipe.
    if v_conv.kind = 'COACH' then
      v_recipient := case when new.sender_id = v_conv.coach_id then v_conv.parent_id else v_conv.coach_id end;
      if v_recipient is not null then
        select role::text into v_role from public.profiles where id = v_recipient;
        v_path := case when v_role = 'COACH' then '/coach/messages?c=' else '/parent/messages?c=' end
                  || new.conversation_id::text;
        v_title := case when v_role = 'COACH'
                        then coalesce(v_sender_name, 'Un parent') || ' vous a écrit'
                        else coalesce(v_sender_name, 'Votre coach') || ' vous a écrit' end;
        insert into public.notifications (user_id, type, title, body, data)
        values (v_recipient, 'MESSAGE_RECEIVED', v_title, v_preview,
                jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id,
                                   'sender_id', new.sender_id, 'kind', 'COACH', 'path', v_path));
      end if;

    else -- SUPPORT
      if new.sender_id = v_conv.parent_id then
        for v_recipient in
          select p.id from public.profiles p
          where p.role in ('ADMIN', 'SUPER_ADMIN')
            and coalesce(p.is_active, true)
            and (v_conv.assigned_admin_id is null or p.id = v_conv.assigned_admin_id)
        loop
          insert into public.notifications (user_id, type, title, body, data)
          values (v_recipient, 'MESSAGE_RECEIVED',
                  'Support — ' || coalesce(v_sender_name, 'un parent'), v_preview,
                  jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id,
                                     'sender_id', new.sender_id, 'kind', 'SUPPORT',
                                     'path', '/admin/messages?c=' || new.conversation_id::text));
        end loop;
      else
        insert into public.notifications (user_id, type, title, body, data)
        values (v_conv.parent_id, 'MESSAGE_RECEIVED', 'Support THRIVE vous a répondu', v_preview,
                jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id,
                                   'sender_id', new.sender_id, 'kind', 'SUPPORT',
                                   'path', '/parent/messages?c=' || new.conversation_id::text));
      end if;
    end if;
  exception when others then
    null;
  end;

  return new;
end $$;

drop trigger if exists trg_messages_after_insert on public.messages;
create trigger trg_messages_after_insert
  after insert on public.messages
  for each row execute function private.messages_after_insert();

-- ── 9) Routage des notifications (complète mig. 053) ─────────────────────────
-- MESSAGE_RECEIVED ouvre le BON fil (?c=<conversation>) plutôt que la liste.
create or replace function private.notification_default_path(
  p_user uuid, p_type text, p_data jsonb)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_role    text;
  v_child   text := p_data ->> 'child_id';
  v_subtype text := p_data ->> 'subtype';
  v_kind    text := p_data ->> 'kind';
  v_token   text := p_data ->> 'token';
  v_conv    text := p_data ->> 'conversation_id';
  v_session int  := nullif(p_data ->> 'session_number', '')::int;
  v_thread  text := case when p_data ? 'conversation_id' then '?c=' || (p_data ->> 'conversation_id') else '' end;
begin
  select role::text into v_role from public.profiles where id = p_user;

  -- ── Espace coach ──
  if v_role = 'COACH' then
    return case
      when p_type in ('QUESTIONNAIRE_COMPLETED', 'DOSSIER_INCOMPLET') and v_child is not null
        then '/coach/athletes/' || v_child
      when p_type = 'DOSSIER_INCOMPLET' then '/coach/dossiers'
      when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then '/coach/messages' || v_thread
      else '/coach/dashboard'
    end;
  end if;

  -- ── Espace admin ──
  if v_role in ('ADMIN', 'SUPER_ADMIN') then
    return case
      when p_type = 'DOSSIER_INCOMPLET' and v_child is not null
        then '/admin/dossiers/' || v_child
      when p_type = 'DOSSIER_INCOMPLET' then '/admin/dossiers'
      when p_type = 'TASK_UPDATE'       then '/admin/roadmap'
      when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then '/admin/messages' || v_thread
      else '/admin'
    end;
  end if;

  -- ── Espace parent (défaut) ──
  return case
    when p_type = 'QUESTIONNAIRE_PENDING' then
      case when v_token is not null then '/q/' || v_token else '/parent/bilans' end
    when p_type = 'QUESTIONNAIRE_COMPLETED' then
      private.parent_bilan_focus(v_child, case when v_kind = 'LSSS' then 'competences' else 'perma' end)
    when p_type = 'REPORT_READY' then
      private.parent_bilan_focus(v_child, 'parcours')
    when p_type = 'PROGRESS_UPDATE' then
      case v_subtype
        when 'milestone' then private.parent_bilan_focus(v_child,
          case when v_session >= 13 then 'certificat'
               when v_session >= 7  then 'competences'
               else 'programme' end)
        when 'thrive_moment' then private.parent_bilan_focus(v_child, 'parcours')
        else private.parent_bilan_focus(v_child, 'programme')
      end
    when p_type = 'PROGRAM_UPDATED' then
      case when v_subtype = 'renewal_window' then '/parent/upgrade' else '/parent/bilans' end
    when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then '/parent/messages' || v_thread
    when p_type in ('SESSION', 'SESSION_REMINDER') then '/parent/my-sessions'
    else '/parent/bilans'
  end;
exception when others then
  return null;
end $$;

revoke all on function private.notification_default_path(uuid, text, jsonb) from public, anon, authenticated;

-- ── 10) API applicative ──────────────────────────────────────────────────────

-- Fil coach de l'enfant sélectionné : créé au premier passage, sans course
-- possible côté client. Renvoie null s'il n'y a pas encore de coach attribué.
create or replace function public.get_or_create_coach_conversation(p_child_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_parent uuid;
  v_coach  uuid;
  v_family uuid;
  v_id     uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;

  select c.family_id, f.parent_id into v_family, v_parent
    from public.children c join public.families f on f.id = c.family_id
   where c.id = p_child_id;
  if v_parent is null then raise exception 'CHILD_NOT_FOUND'; end if;

  select ca.coach_id into v_coach
    from public.coach_assignments ca
   where ca.child_id = p_child_id and ca.is_active
   order by ca.created_at desc limit 1;
  if v_coach is null then return null; end if;

  -- Les parents de la famille, le coach attribué ou un admin ouvrent le fil.
  if v_me <> v_parent and v_me <> v_coach
     and not private.is_family_parent(v_family) and not private.is_admin_or_super() then
    raise exception 'FORBIDDEN';
  end if;
  -- Droit de forfait lu sur la famille de L'ENFANT (vaut aussi pour un co-parent).
  if v_me <> v_coach and not private.is_admin_or_super()
     and not private.pack_feature(p_child_id, 'coachMessaging') then
    raise exception 'FEATURE_LOCKED';
  end if;

  select id into v_id from public.conversations
   where kind = 'COACH' and parent_id = v_parent and coach_id = v_coach and child_id = p_child_id;
  if v_id is not null then return v_id; end if;

  insert into public.conversations (kind, parent_id, coach_id, child_id, family_id, last_message_at)
  values ('COACH', v_parent, v_coach, p_child_id, v_family, now())
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations
     where kind = 'COACH' and parent_id = v_parent and coach_id = v_coach and child_id = p_child_id;
  end if;
  return v_id;
end $$;

-- Guichet unique du support. Ouvert à tout parent, y compris compte en cours
-- d'activation ou forfait sans messagerie coach.
create or replace function public.get_or_create_support_conversation()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_family uuid;
  v_id     uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if private.jwt_role() <> 'PARENT' then raise exception 'PARENT_ONLY'; end if;

  select id into v_id from public.conversations where kind = 'SUPPORT' and parent_id = v_me;
  if v_id is not null then return v_id; end if;

  select id into v_family from public.families where parent_id = v_me limit 1;

  insert into public.conversations (kind, parent_id, family_id, subject, last_message_at)
  values ('SUPPORT', v_me, v_family, 'Support THRIVE', now())
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations where kind = 'SUPPORT' and parent_id = v_me;
  end if;
  return v_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_conversation(p_conversation_id) then raise exception 'FORBIDDEN'; end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), v_now)
  on conflict (conversation_id, user_id)
    do update set last_read_at = greatest(conversation_reads.last_read_at, excluded.last_read_at);
  return v_now;
end $$;

-- Liste unifiée des fils, avec non-lus et libellé de l'interlocuteur.
--   p_scope = 'mine'        → mes fils (parent, coach, ou support qui m'est assigné)
--             'support'     → la file du support (admins)
--             'supervision' → tous les fils coach ↔ parent, en lecture (admins)
create or replace function public.list_my_conversations(p_scope text default 'mine')
returns table (
  id uuid, kind conversation_kind, status conversation_status,
  parent_id uuid, coach_id uuid, child_id uuid, assigned_admin_id uuid,
  subject text, created_at timestamptz, last_message_at timestamptz,
  last_message_preview text, last_sender_id uuid,
  unread_count integer, counterpart_name text, counterpart_role text,
  child_name text, parent_name text, coach_name text
) language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_admin  boolean := private.is_admin_or_super();
  v_scope  text := coalesce(p_scope, 'mine');
  v_client boolean := private.jwt_role() = 'PARENT'; -- côté client vs côté THRIVE
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_scope in ('support', 'supervision') and not v_admin then raise exception 'FORBIDDEN'; end if;

  return query
  select c.id, c.kind, c.status, c.parent_id, c.coach_id, c.child_id, c.assigned_admin_id,
         c.subject, c.created_at, c.last_message_at, c.last_message_preview, c.last_sender_id,
         (select count(*)::int from public.messages m
           where m.conversation_id = c.id
             and m.sender_id <> v_me
             and m.deleted_at is null
             and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)) as unread_count,
         -- Vu du parent : « qui me parle » = le coach ou le support. Vu de
         -- THRIVE (coach, admin) : le parent en face.
         case
           when v_client and c.kind = 'SUPPORT' then 'Support THRIVE'
           when v_client then nullif(btrim(coalesce(pc.first_name,'') || ' ' || coalesce(pc.last_name,'')), '')
           else nullif(btrim(coalesce(pp.first_name,'') || ' ' || coalesce(pp.last_name,'')), '')
         end as counterpart_name,
         case when v_client then (case when c.kind = 'SUPPORT' then 'SUPPORT' else 'COACH' end)
              else 'PARENT' end as counterpart_role,
         ch.first_name as child_name,
         nullif(btrim(coalesce(pp.first_name,'') || ' ' || coalesce(pp.last_name,'')), '') as parent_name,
         nullif(btrim(coalesce(pc.first_name,'') || ' ' || coalesce(pc.last_name,'')), '') as coach_name
    from public.conversations c
    left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = v_me
    left join public.profiles pp on pp.id = c.parent_id
    left join public.profiles pc on pc.id = c.coach_id
    left join public.children ch on ch.id = c.child_id
   where case v_scope
           when 'support'     then c.kind = 'SUPPORT'
           when 'supervision' then c.kind = 'COACH'
           else c.parent_id = v_me
                or c.coach_id = v_me
                or (c.kind = 'COACH' and private.is_family_parent(c.family_id))
                or (v_admin and c.kind = 'SUPPORT' and c.assigned_admin_id = v_me)
         end
   order by c.last_message_at desc nulls last;
end $$;

-- Badge des barres de navigation : total des messages non lus qui me sont
-- destinés (la supervision admin des fils coach n'est jamais comptée).
create or replace function public.my_unread_messages()
returns integer language sql security definer set search_path = public as $$
  select coalesce(sum(x.unread_count), 0)::int
    from public.list_my_conversations('mine') x;
$$;

-- Triage du support (admins) : prise en charge, clôture, réouverture.
create or replace function public.set_support_conversation_state(
  p_conversation_id uuid, p_status conversation_status default null, p_assign boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if not private.is_admin_or_super() then raise exception 'FORBIDDEN'; end if;
  if not exists (select 1 from public.conversations where id = p_conversation_id and kind = 'SUPPORT') then
    raise exception 'SUPPORT_CONVERSATION_NOT_FOUND';
  end if;

  update public.conversations
     set status            = coalesce(p_status, status),
         closed_at         = case when p_status = 'CLOSED' then now()
                                  when p_status = 'OPEN'   then null else closed_at end,
         closed_by         = case when p_status = 'CLOSED' then v_me
                                  when p_status = 'OPEN'   then null else closed_by end,
         assigned_admin_id = case when p_assign is null then assigned_admin_id
                                  when p_assign then v_me else null end
   where id = p_conversation_id;
end $$;

revoke all on function public.get_or_create_coach_conversation(uuid)   from public, anon;
revoke all on function public.get_or_create_support_conversation()     from public, anon;
revoke all on function public.mark_conversation_read(uuid)             from public, anon;
revoke all on function public.list_my_conversations(text)              from public, anon;
revoke all on function public.my_unread_messages()                     from public, anon;
revoke all on function public.set_support_conversation_state(uuid, conversation_status, boolean) from public, anon;

grant execute on function public.get_or_create_coach_conversation(uuid)   to authenticated;
grant execute on function public.get_or_create_support_conversation()     to authenticated;
grant execute on function public.mark_conversation_read(uuid)             to authenticated;
grant execute on function public.list_my_conversations(text)              to authenticated;
grant execute on function public.my_unread_messages()                     to authenticated;
grant execute on function public.set_support_conversation_state(uuid, conversation_status, boolean) to authenticated;

-- ── 11) Temps réel ───────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.conversation_reads;
exception when duplicate_object then null; end $$;

-- ── 12) Pièces jointes ───────────────────────────────────────────────────────
-- Bucket privé, cloisonné par conversation : <conversation_id>/<fichier>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-attachments', 'message-attachments', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','image/gif','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_conversation_id(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when (storage.foldername(p_name))[1] ~ '^[0-9a-fA-F-]{36}$'
              then ((storage.foldername(p_name))[1])::uuid end;
$$;
revoke all on function private.storage_conversation_id(text) from public, anon;
grant execute on function private.storage_conversation_id(text) to authenticated; -- utilisé en policy storage

drop policy if exists message_attachments_read   on storage.objects;
drop policy if exists message_attachments_write  on storage.objects;
drop policy if exists message_attachments_delete on storage.objects;

create policy message_attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'message-attachments'
         and private.can_access_conversation(private.storage_conversation_id(name)));

create policy message_attachments_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'message-attachments'
              and owner_id = (select auth.uid())::text
              and private.can_write_conversation(private.storage_conversation_id(name)));

create policy message_attachments_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'message-attachments'
         and (owner_id = (select auth.uid())::text or private.is_admin_or_super()));

-- ── 13) Audit : minimisation des données (Loi 25) ────────────────────────────
-- `audit_messages` recopiait le contenu INTÉGRAL de chaque message envoyé dans
-- audit_logs : une seconde base de toutes les conversations familiales, sans
-- usage. On garde la trace qui sert vraiment — qui a modifié ou supprimé quoi —
-- et on cesse de dupliquer les envois.
drop trigger if exists audit_messages on public.messages;
create trigger audit_messages
  after update or delete on public.messages
  for each row execute function private.audit_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback (down) — pour mémoire :
--   drop function if exists public.set_support_conversation_state(uuid, conversation_status, boolean);
--   drop function if exists public.my_unread_messages();
--   drop function if exists public.list_my_conversations(text);
--   drop function if exists public.mark_conversation_read(uuid);
--   drop function if exists public.get_or_create_support_conversation();
--   drop function if exists public.get_or_create_coach_conversation(uuid);
--   drop trigger  if exists trg_messages_after_insert on public.messages;
--   drop trigger  if exists trg_messages_guard_update on public.messages;
--   drop function if exists private.messages_after_insert();
--   drop function if exists private.messages_guard_update();
--   drop function if exists private.can_write_conversation(uuid);
--   drop function if exists private.can_access_conversation(uuid);
--   drop function if exists private.storage_conversation_id(text);
--   drop table    if exists public.conversation_reads;
--   (les colonnes ajoutées à conversations/messages et le bucket restent)
-- ─────────────────────────────────────────────────────────────────────────────

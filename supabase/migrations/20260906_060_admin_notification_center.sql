-- Rapatriée de la production (version 20260906183711 « admin_notification_center ») :
-- appliquée en prod sans fichier dans le dépôt. Contenu reproduit à l'identique.
-- 060 — Centre de notifications ADMIN / SUPER ADMIN (cf. fichier de migration
-- supabase/migrations/20260906_060_admin_notification_center.sql).

-- ── 1) Préférences par administrateur ────────────────────────────────────────
create table if not exists public.admin_notification_prefs (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  enabled      boolean not null default true,
  categories   text[]  not null default array['tasks','messages','mentions','accounts','billing','activity','system'],
  -- Par défaut on ne se notifie pas soi-même de ses propres actions.
  include_self boolean not null default false,
  updated_at   timestamptz not null default now()
);

alter table public.admin_notification_prefs enable row level security;

drop policy if exists admin_notif_prefs_select on public.admin_notification_prefs;
create policy admin_notif_prefs_select on public.admin_notification_prefs
  for select to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists admin_notif_prefs_insert on public.admin_notification_prefs;
create policy admin_notif_prefs_insert on public.admin_notification_prefs
  for insert to authenticated
  with check ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop policy if exists admin_notif_prefs_update on public.admin_notification_prefs;
create policy admin_notif_prefs_update on public.admin_notification_prefs
  for update to authenticated
  using ((select private.is_admin_or_super()) and user_id = (select auth.uid()))
  with check ((select private.is_admin_or_super()) and user_id = (select auth.uid()));

drop trigger if exists admin_notification_prefs_updated_at on public.admin_notification_prefs;
create trigger admin_notification_prefs_updated_at
  before update on public.admin_notification_prefs
  for each row execute function public.update_updated_at();

-- Cloche : compter les non-lues doit rester instantané.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where not is_read;

-- ── 2) Le distributeur ───────────────────────────────────────────────────────
create or replace function private.notify_admins(
  p_event      text,
  p_category   text,
  p_title      text,
  p_body       text,
  p_path       text    default null,
  p_data       jsonb   default '{}'::jsonb,
  p_actor      uuid    default null,
  p_targets    uuid[]  default null,   -- null = tous les admins
  p_exclude    uuid[]  default null,
  p_super_only boolean default false,
  p_type       text    default 'ADMIN_ALERT'
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := coalesce(p_actor, auth.uid());
  v_sent  integer := 0;
  r       record;
begin
  for r in
    select p.id,
           coalesce(pr.enabled, true)      as enabled,
           coalesce(pr.include_self, false) as include_self,
           pr.categories                    as categories
    from public.profiles p
    left join public.admin_notification_prefs pr on pr.user_id = p.id
    where p.role in ('ADMIN', 'SUPER_ADMIN')
      and coalesce(p.is_active, true)
      and (not p_super_only or p.role = 'SUPER_ADMIN')
      and (p_targets is null or p.id = any(p_targets))
      and (p_exclude is null or not (p.id = any(p_exclude)))
  loop
    continue when not r.enabled;
    continue when r.categories is not null and not (p_category = any(r.categories));
    continue when v_actor is not null and r.id = v_actor and not r.include_self;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      r.id,
      p_type::public.notification_type,
      p_title,
      p_body,
      coalesce(p_data, '{}'::jsonb)
        || jsonb_build_object('event', p_event, 'category', p_category)
        || case when v_actor is not null
                then jsonb_build_object('actor_id', v_actor) else '{}'::jsonb end
        || case when p_path is not null
                then jsonb_build_object('path', p_path) else '{}'::jsonb end
    );
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
exception when others then
  return v_sent;
end $$;

revoke all on function private.notify_admins(text, text, text, text, text, jsonb, uuid, uuid[], uuid[], boolean, text)
  from public, anon, authenticated;

-- Nom d'affichage court d'un acteur pour le corps des alertes.
create or replace function private.actor_label(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  -- Jamais NULL : une action de service (seed, edge function, formulaire public)
  -- n'a pas d'auteur, et un NULL contaminerait tout le corps de la notification.
  select coalesce((
    select coalesce(
             nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
             split_part(email, '@', 1))
    from public.profiles where id = p_user), 'Quelqu''un');
$$;

revoke all on function private.actor_label(uuid) from public, anon, authenticated;

-- Compat : l'ancien helper (mig. 037) passe désormais par le distributeur.
create or replace function private.notify_admin(p_user uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  perform private.notify_admins('legacy', 'tasks', p_title, p_body,
    '/admin/roadmap', '{}'::jsonb, auth.uid(), array[p_user]);
exception when others then null;
end $$;

-- ── 3) Tâches de la roadmap ──────────────────────────────────────────────────
create or replace function private.notify_admin_task_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_path  text;
  v_who   text := private.actor_label(auth.uid());
begin
  -- Tâche privée du Super Admin : personne d'autre ne doit en entendre parler.
  if coalesce(new.is_private, false) then return new; end if;

  v_path := '/admin/roadmap?task=' || new.id::text;

  if tg_op = 'INSERT' then
    perform private.notify_admins('task_created', 'tasks',
      'Nouvelle tâche', v_who || ' a ajouté « ' || new.title || ' » à la roadmap.',
      v_path, jsonb_build_object('task_id', new.id), v_actor);

    if new.assignee is not null then
      perform private.notify_admins('task_assigned', 'tasks',
        'Tâche attribuée', 'On vous a confié : « ' || new.title || ' »',
        v_path, jsonb_build_object('task_id', new.id), v_actor, array[new.assignee]);
    end if;
    return new;
  end if;

  if new.assignee is distinct from old.assignee and new.assignee is not null then
    perform private.notify_admins('task_assigned', 'tasks',
      'Tâche attribuée', 'On vous a confié : « ' || new.title || ' »',
      v_path, jsonb_build_object('task_id', new.id), v_actor, array[new.assignee]);
  end if;

  if new.status = 'DONE' and old.status is distinct from 'DONE' then
    perform private.notify_admins('task_completed', 'tasks',
      'Tâche terminée ✅', v_who || ' a complété « ' || new.title || ' ».',
      v_path, jsonb_build_object('task_id', new.id), v_actor);
  elsif old.status = 'DONE' and new.status is distinct from 'DONE' then
    perform private.notify_admins('task_reopened', 'tasks',
      'Tâche rouverte', v_who || ' a rouvert « ' || new.title || ' ».',
      v_path, jsonb_build_object('task_id', new.id), v_actor);
  elsif new.status is distinct from old.status then
    perform private.notify_admins('task_status', 'tasks',
      'Tâche mise à jour',
      '« ' || new.title || ' » : ' || old.status || ' → ' || new.status,
      v_path, jsonb_build_object('task_id', new.id), v_actor);
  end if;

  if new.problem is not null and new.problem is distinct from old.problem then
    perform private.notify_admins('task_problem', 'tasks',
      'Problème signalé ⚠️', '« ' || new.title || ' » : ' || left(new.problem, 140),
      v_path, jsonb_build_object('task_id', new.id), v_actor);
  end if;

  return new;
end $$;

-- ── 4) Commentaires de tâche & chat d'équipe (dont mentions) ────────────────
drop function if exists private.notify_mentions() cascade;

create or replace function private.notify_task_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_task   record;
  v_actor  uuid := coalesce(new.author, auth.uid());
  v_who    text := private.actor_label(coalesce(new.author, auth.uid()));
  v_path   text;
  v_body   text := left(new.body, 140);
begin
  select title, is_private into v_task from public.admin_tasks where id = new.task_id;
  if not found or coalesce(v_task.is_private, false) then return new; end if;

  v_path := '/admin/roadmap?task=' || new.task_id::text;

  if array_length(new.mentions, 1) is not null then
    perform private.notify_admins('mention', 'mentions',
      v_who || ' vous a mentionné', v_body,
      v_path, jsonb_build_object('task_id', new.task_id, 'comment_id', new.id),
      v_actor, new.mentions);
  end if;

  perform private.notify_admins('task_comment', 'tasks',
    'Nouveau commentaire — ' || v_task.title, v_who || ' : ' || v_body,
    v_path, jsonb_build_object('task_id', new.task_id, 'comment_id', new.id),
    v_actor, null, new.mentions);

  return new;
end $$;

drop trigger if exists trg_task_comments_notify on public.admin_task_comments;
create trigger trg_task_comments_notify
  after insert on public.admin_task_comments
  for each row execute function private.notify_task_comment();

create or replace function private.notify_admin_chat()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := coalesce(new.author, auth.uid());
  v_who   text := private.actor_label(coalesce(new.author, auth.uid()));
  v_path  text := '/admin/roadmap?chat=' || new.channel;
  v_body  text := left(new.body, 140);
begin
  if array_length(new.mentions, 1) is not null then
    perform private.notify_admins('mention', 'mentions',
      v_who || ' vous a mentionné (#' || lower(new.channel) || ')', v_body,
      v_path, jsonb_build_object('channel', new.channel, 'message_id', new.id),
      v_actor, new.mentions);
  end if;

  perform private.notify_admins('chat_message', 'messages',
    v_who || ' — #' || lower(new.channel), v_body,
    v_path, jsonb_build_object('channel', new.channel, 'message_id', new.id),
    v_actor, null, new.mentions);

  return new;
end $$;

drop trigger if exists trg_admin_chat_notify on public.admin_chat_messages;
create trigger trg_admin_chat_notify
  after insert on public.admin_chat_messages
  for each row execute function private.notify_admin_chat();

-- ── 5) Comptes : inscriptions, enfants, liste d'attente, suppressions ────────
create or replace function private.notify_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_label text := case new.role::text
    when 'PARENT' then 'Nouveau parent'
    when 'COACH'  then 'Nouveau coach'
    when 'CHILD'  then 'Nouvel athlète'
    else 'Nouveau compte ' || new.role::text end;
begin
  perform private.notify_admins('signup', 'accounts',
    v_label || ' inscrit',
    coalesce(nullif(btrim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''),
             new.email) || ' vient de créer un compte.',
    case when new.role::text = 'PARENT' then '/admin/validations' else '/admin/users' end,
    jsonb_build_object('profile_id', new.id, 'role', new.role::text),
    null);
  return new;
end $$;

drop trigger if exists trg_profiles_notify_admins on public.profiles;
create trigger trg_profiles_notify_admins
  after insert on public.profiles
  for each row execute function private.notify_new_profile();

create or replace function private.notify_new_child()
returns trigger language plpgsql security definer set search_path = public as $$
-- children.validation_status ∈ {PENDING, CONFIRMED} (cycle d'activation, mig. 035)
declare v_pending boolean := coalesce(new.validation_status, 'PENDING') = 'PENDING';
begin
  perform private.notify_admins('child_created', 'accounts',
    case when v_pending then 'Enfant à confirmer' else 'Nouvel enfant' end,
    coalesce(new.first_name, 'Un enfant')
      || case when new.sport is not null then ' — ' || new.sport else '' end
      || case when v_pending then ' attend une confirmation.' else ' a été ajouté.' end,
    case when v_pending then '/admin/validations' else '/admin/children' end,
    jsonb_build_object('child_id', new.id, 'family_id', new.family_id),
    auth.uid());
  return new;
end $$;

drop trigger if exists trg_children_notify_admins on public.children;
create trigger trg_children_notify_admins
  after insert on public.children
  for each row execute function private.notify_new_child();

create or replace function private.notify_new_waitlist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.notify_admins('waitlist_lead', 'accounts',
    'Nouvelle demande — liste d''attente',
    coalesce(new.first_name, 'Quelqu''un')
      || coalesce(' (' || new.email || ')', '')
      || case when new.pack is not null then ' — pack ' || new.pack else '' end,
    '/admin/waitlist',
    jsonb_build_object('lead_id', new.id, 'source', new.source),
    null);
  return new;
end $$;

drop trigger if exists trg_waitlist_notify_admins on public.waitlist;
create trigger trg_waitlist_notify_admins
  after insert on public.waitlist
  for each row execute function private.notify_new_waitlist();

create or replace function private.notify_deletion_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.notify_admins('deletion_request', 'accounts',
    'Demande de suppression de compte',
    private.actor_label(coalesce(new.target_profile_id, new.requested_by))
      || ' demande la suppression de son compte.',
    '/admin/users',
    jsonb_build_object('request_id', new.id, 'target_profile_id', new.target_profile_id),
    null);
  return new;
end $$;

drop trigger if exists trg_deletion_requests_notify_admins on public.deletion_requests;
create trigger trg_deletion_requests_notify_admins
  after insert on public.deletion_requests
  for each row execute function private.notify_deletion_request();

-- ── 6) Facturation & activité ────────────────────────────────────────────────
create or replace function private.notify_entitlement_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.plan_id is not distinct from old.plan_id then
    return new;
  end if;

  perform private.notify_admins('entitlement', 'billing',
    case when tg_op = 'INSERT' then 'Nouvel abonnement' else 'Abonnement mis à jour' end,
    'Forfait ' || coalesce(new.plan_id, '—') || ' — statut ' || new.status::text,
    '/admin/families',
    jsonb_build_object('family_id', new.family_id, 'plan_id', new.plan_id,
                       'status', new.status::text),
    auth.uid());
  return new;
end $$;

drop trigger if exists trg_entitlements_notify_admins on public.entitlements;
create trigger trg_entitlements_notify_admins
  after insert or update on public.entitlements
  for each row execute function private.notify_entitlement_change();

create or replace function private.notify_questionnaire_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_child text;
begin
  if new.status::text <> 'COMPLETED' or old.status::text = 'COMPLETED' then
    return new;
  end if;
  select first_name into v_child from public.children where id = new.child_id;

  perform private.notify_admins('questionnaire_completed', 'activity',
    'Questionnaire complété',
    coalesce(v_child, 'Un athlète') || ' a répondu : ' || coalesce(new.title, new.kind),
    '/admin/questionnaires',
    jsonb_build_object('questionnaire_id', new.id, 'child_id', new.child_id,
                       'kind', new.kind),
    auth.uid());
  return new;
end $$;

drop trigger if exists trg_questionnaires_notify_admins on public.questionnaires;
create trigger trg_questionnaires_notify_admins
  after update on public.questionnaires
  for each row execute function private.notify_questionnaire_completed();

create or replace function private.notify_coach_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_child text;
begin
  select first_name into v_child from public.children where id = new.child_id;
  perform private.notify_admins('coach_assigned', 'activity',
    'Coach assigné',
    private.actor_label(new.coach_id) || ' suit désormais ' || coalesce(v_child, 'un athlète') || '.',
    '/admin/assignments',
    jsonb_build_object('child_id', new.child_id, 'coach_id', new.coach_id),
    auth.uid());
  return new;
end $$;

drop trigger if exists trg_coach_assignments_notify_admins on public.coach_assignments;
create trigger trg_coach_assignments_notify_admins
  after insert on public.coach_assignments
  for each row execute function private.notify_coach_assignment();

-- ── 7) Messagerie support : passe par le distributeur ────────────────────────
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

  update public.conversations
     set last_message_at      = coalesce(new.created_at, now()),
         last_message_preview = v_preview,
         last_sender_id       = new.sender_id,
         status               = case when status = 'CLOSED' then 'OPEN'::conversation_status else status end,
         closed_at            = case when status = 'CLOSED' then null else closed_at end,
         closed_by            = case when status = 'CLOSED' then null else closed_by end
   where id = new.conversation_id;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, coalesce(new.created_at, now()))
  on conflict (conversation_id, user_id)
    do update set last_read_at = greatest(conversation_reads.last_read_at, excluded.last_read_at);

  if new.is_system then return new; end if;

  begin
    select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
      into v_sender_name from public.profiles where id = new.sender_id;

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
        perform private.notify_admins(
          'support_message', 'messages',
          'Support — ' || coalesce(v_sender_name, 'un parent'), v_preview,
          '/admin/messages?c=' || new.conversation_id::text,
          jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id,
                             'sender_id', new.sender_id, 'kind', 'SUPPORT'),
          new.sender_id,
          case when v_conv.assigned_admin_id is not null
               then array[v_conv.assigned_admin_id] else null end,
          null, false, 'MESSAGE_RECEIVED');
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

-- ── 8) Routage du clic pour le nouveau type ─────────────────────────────────
create or replace function private.notification_default_path(
  p_user uuid, p_type text, p_data jsonb)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_role    text;
  v_child   text := p_data ->> 'child_id';
  v_subtype text := p_data ->> 'subtype';
  v_kind    text := p_data ->> 'kind';
  v_token   text := p_data ->> 'token';
  v_session int  := nullif(p_data ->> 'session_number', '')::int;
  v_conv    text := p_data ->> 'conversation_id';
begin
  select role::text into v_role from public.profiles where id = p_user;

  -- ── Espace coach ──
  if v_role = 'COACH' then
    return case
      when p_type in ('QUESTIONNAIRE_COMPLETED', 'DOSSIER_INCOMPLET') and v_child is not null
        then '/coach/athletes/' || v_child
      when p_type = 'DOSSIER_INCOMPLET' then '/coach/dossiers'
      when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then
        case when v_conv is not null then '/coach/messages?c=' || v_conv
             else '/coach/messages' end
      else '/coach/dashboard'
    end;
  end if;

  -- ── Espace admin ──
  if v_role in ('ADMIN', 'SUPER_ADMIN') then
    return case
      when p_type = 'ADMIN_ALERT'       then '/admin/notifications'
      when p_type = 'DOSSIER_INCOMPLET' and v_child is not null
        then '/admin/dossiers/' || v_child
      when p_type = 'DOSSIER_INCOMPLET' then '/admin/dossiers'
      when p_type = 'TASK_UPDATE'       then '/admin/roadmap'
      when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then
        case when v_conv is not null then '/admin/messages?c=' || v_conv
             else '/admin/messages' end
      else '/admin'
    end;
  end if;

  -- ── Espace parent (défaut) ──
  return case
    when p_type = 'QUESTIONNAIRE_PENDING' then
      case when v_token is not null then '/q/' || v_token
           else '/parent/bilans' end
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
      case when v_subtype = 'renewal_window' then '/parent/upgrade'
           else '/parent/bilans' end
    when p_type in ('MESSAGE', 'MESSAGE_RECEIVED') then
      case when v_conv is not null then '/parent/messages?c=' || v_conv
           else '/parent/messages' end
    when p_type in ('SESSION', 'SESSION_REMINDER') then '/parent/my-sessions'
    else '/parent/bilans'
  end;
end $$;

revoke all on function private.notification_default_path(uuid, text, jsonb) from public, anon, authenticated;

-- ── 9) RPC : tester ses notifications, écrire à un utilisateur ou à l'équipe ──
create or replace function public.admin_notification_test()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'not authorized';
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (auth.uid(), 'ADMIN_ALERT', 'Notification de test 🔔',
          'Si vous lisez ceci, vos notifications administrateur fonctionnent.',
          jsonb_build_object('event', 'test', 'category', 'system',
                             'path', '/admin/notifications'));
end $$;

revoke all on function public.admin_notification_test() from public, anon;
grant execute on function public.admin_notification_test() to authenticated;

-- La RLS de public.notifications interdit (à raison) d'insérer une ligne pour
-- quelqu'un d'autre depuis le navigateur : l'envoi manuel passe par cette RPC.
create or replace function public.admin_send_notification(
  p_title    text,
  p_body     text default null,
  p_user     uuid default null,
  p_path     text default null,
  p_audience text default 'USER'
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_path text := nullif(btrim(coalesce(p_path, '')), '');
begin
  if not private.is_admin_or_super() then
    raise exception 'not authorized';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'title required';
  end if;
  if v_path is not null and left(v_path, 1) <> '/' then
    raise exception 'path must be an internal path starting with /';
  end if;

  if p_audience in ('ADMINS', 'SUPER_ADMINS') then
    return private.notify_admins('manual', 'system', p_title, p_body, v_path,
      '{}'::jsonb, auth.uid(), null, null, p_audience = 'SUPER_ADMINS');
  end if;

  if p_user is null then
    raise exception 'recipient required';
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, 'ADMIN_ALERT', p_title, nullif(btrim(coalesce(p_body, '')), ''),
          jsonb_build_object('event', 'manual', 'category', 'system', 'actor_id', auth.uid())
            || case when v_path is not null then jsonb_build_object('path', v_path)
                    else '{}'::jsonb end);
  return 1;
end $$;

revoke all on function public.admin_send_notification(text, text, uuid, text, text) from public, anon;
grant execute on function public.admin_send_notification(text, text, uuid, text, text) to authenticated;

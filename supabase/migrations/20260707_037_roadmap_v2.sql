-- ─────────────────────────────────────────────────────────────────────────────
-- 037 — Roadmap v2 : outil de gestion de projet interne complet.
--
--   · Groupes (coaching, contenu, développement, pratique, urgent, marketing,
--     administratif, général) + priorités (basse/moyenne/haute).
--   · Statuts étendus : à faire / en cours / en révision / bloquée / terminée
--     + section « Problème » (posée par l'assigné, résolue par le Super Admin).
--   · Classement AUTOMATIQUE par horizon selon la deadline (semaine / mois /
--     3 mois / année) — trigger.
--   · Signature : créée par, complétée par (+ horodatage automatique).
--   · MODIFICATION / SUPPRESSION des tâches = SUPER ADMIN uniquement.
--     L'admin conserve : créer, « je m'en occupe »/libérer, changer le statut
--     de SES tâches, signaler un problème, commenter, joindre des fichiers.
--   · Commentaires (écriture libre : liens Google Docs, etc.) avec mentions,
--     pièces jointes (liens Drive/Dropbox + upload direct vers Storage),
--     historique complet (qui, quand, quoi), chat par groupe, notifications.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Colonnes v2 sur admin_tasks -----------------------------------------------
alter table public.admin_tasks
  add column if not exists category     text not null default 'GENERAL',
  add column if not exists priority     text not null default 'MEDIUM',
  add column if not exists problem      text,
  add column if not exists problem_by   uuid references public.profiles(id) on delete set null,
  add column if not exists problem_at   timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

alter table public.admin_tasks drop constraint if exists admin_tasks_status_check;
alter table public.admin_tasks add constraint admin_tasks_status_check
  check (status in ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'));

alter table public.admin_tasks drop constraint if exists admin_tasks_category_check;
alter table public.admin_tasks add constraint admin_tasks_category_check
  check (category in ('COACHING','CONTENU','DEVELOPPEMENT','PRATIQUE','URGENT','MARKETING','ADMINISTRATIF','GENERAL'));

alter table public.admin_tasks drop constraint if exists admin_tasks_priority_check;
alter table public.admin_tasks add constraint admin_tasks_priority_check
  check (priority in ('LOW','MEDIUM','HIGH'));

create index if not exists admin_tasks_category_idx on public.admin_tasks (category);
create index if not exists admin_tasks_deadline_idx on public.admin_tasks (deadline);

-- 2) Droits : SUPPRESSION = Super Admin uniquement ------------------------------
drop policy if exists admin_tasks_delete on public.admin_tasks;
create policy admin_tasks_delete on public.admin_tasks
  for delete to authenticated
  using (private.jwt_role() = 'SUPER_ADMIN');

-- 3) Garde par colonne : MODIFICATION structurelle = Super Admin uniquement -----
-- (nommé trg_a_* pour s'exécuter AVANT le trigger de dérivation trg_b_*)
create or replace function private.enforce_admin_task_edit_rights()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if private.jwt_role() = 'SUPER_ADMIN' then
    return new;
  end if;

  -- Champs structurels : intouchables hors Super Admin
  if new.title          is distinct from old.title
     or new.description is distinct from old.description
     or new.deadline    is distinct from old.deadline
     or new.horizon     is distinct from old.horizon
     or new.category    is distinct from old.category
     or new.priority    is distinct from old.priority
     or new.created_by  is distinct from old.created_by
  then
    raise exception 'Modification des tâches réservée au Super Admin';
  end if;

  -- Attribution : uniquement se prendre une tâche libre ou libérer la sienne
  if new.assignee is distinct from old.assignee
     and not (
       (old.assignee is null and new.assignee = auth.uid())
       or (old.assignee = auth.uid() and new.assignee is null)
     )
  then
    raise exception 'Réattribution des tâches réservée au Super Admin';
  end if;

  -- Statut : seulement par la personne en charge (ou qui vient de se l'attribuer)
  if new.status is distinct from old.status
     and coalesce(new.assignee, old.assignee) is distinct from auth.uid()
  then
    raise exception 'Seul l''assigné (ou le Super Admin) change le statut';
  end if;

  -- Problème : l'assigné peut le SIGNALER ; seul le Super Admin peut l'effacer
  if new.problem is distinct from old.problem then
    if old.problem is not null and (new.problem is null or new.problem = '') then
      raise exception 'La résolution d''un problème est réservée au Super Admin';
    end if;
    if coalesce(new.assignee, old.assignee) is distinct from auth.uid()
       and old.created_by is distinct from auth.uid()
    then
      raise exception 'Seul l''assigné (ou le créateur) signale un problème';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_tasks_edit_rights on public.admin_tasks;
drop trigger if exists trg_a_admin_tasks_rights on public.admin_tasks;
create trigger trg_a_admin_tasks_rights
  before update on public.admin_tasks
  for each row execute function private.enforce_admin_task_edit_rights();

-- 4) Dérivations automatiques : horizon depuis la deadline + signatures ---------
create or replace function private.derive_admin_task_fields()
returns trigger language plpgsql
set search_path = public
as $$
begin
  -- Classement automatique par échéance (sinon l'horizon manuel est conservé)
  if new.deadline is not null then
    new.horizon := case
      when new.deadline <= current_date + 7  then 'WEEK'
      when new.deadline <= current_date + 31 then 'MONTH'
      when new.deadline <= current_date + 92 then 'QUARTER'
      else 'YEAR'
    end;
  end if;

  -- Signature de complétion automatique
  if new.status = 'DONE' and (tg_op = 'INSERT' or old.status is distinct from 'DONE') then
    new.completed_by := coalesce(new.completed_by, auth.uid());
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'DONE' then
    new.completed_by := null;
    new.completed_at := null;
  end if;

  -- Horodatage du problème
  if new.problem is not null
     and (tg_op = 'INSERT' or new.problem is distinct from old.problem) then
    new.problem_by := auth.uid();
    new.problem_at := now();
  elsif new.problem is null then
    new.problem_by := null;
    new.problem_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_b_admin_tasks_derive on public.admin_tasks;
create trigger trg_b_admin_tasks_derive
  before insert or update on public.admin_tasks
  for each row execute function private.derive_admin_task_fields();

-- 5) Commentaires (écriture libre + mentions) -----------------------------------
create table if not exists public.admin_task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.admin_tasks(id) on delete cascade,
  author     uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  mentions   uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_task_comments_task_idx on public.admin_task_comments (task_id, created_at);

alter table public.admin_task_comments enable row level security;
alter table public.admin_task_comments replica identity full;

drop policy if exists task_comments_read on public.admin_task_comments;
create policy task_comments_read on public.admin_task_comments
  for select to authenticated using (private.is_admin_or_super());

drop policy if exists task_comments_insert on public.admin_task_comments;
create policy task_comments_insert on public.admin_task_comments
  for insert to authenticated
  with check (private.is_admin_or_super() and author = auth.uid());

drop policy if exists task_comments_delete on public.admin_task_comments;
create policy task_comments_delete on public.admin_task_comments
  for delete to authenticated
  using (private.jwt_role() = 'SUPER_ADMIN' or author = auth.uid());

-- 6) Pièces jointes : liens (Drive/Dropbox/Docs…) + fichiers uploadés ------------
create table if not exists public.admin_task_attachments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.admin_tasks(id) on delete cascade,
  kind       text not null default 'LINK' check (kind in ('LINK','FILE')),
  url        text not null,            -- URL externe ou chemin storage
  label      text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists admin_task_attachments_task_idx on public.admin_task_attachments (task_id);

alter table public.admin_task_attachments enable row level security;
alter table public.admin_task_attachments replica identity full;

drop policy if exists task_attachments_read on public.admin_task_attachments;
create policy task_attachments_read on public.admin_task_attachments
  for select to authenticated using (private.is_admin_or_super());

drop policy if exists task_attachments_insert on public.admin_task_attachments;
create policy task_attachments_insert on public.admin_task_attachments
  for insert to authenticated
  with check (private.is_admin_or_super() and created_by = auth.uid());

drop policy if exists task_attachments_delete on public.admin_task_attachments;
create policy task_attachments_delete on public.admin_task_attachments
  for delete to authenticated
  using (private.jwt_role() = 'SUPER_ADMIN' or created_by = auth.uid());

-- Bucket privé pour les uploads directs
insert into storage.buckets (id, name, public)
values ('admin-attachments', 'admin-attachments', false)
on conflict (id) do nothing;

drop policy if exists admin_attachments_read on storage.objects;
create policy admin_attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'admin-attachments' and private.is_admin_or_super());

drop policy if exists admin_attachments_write on storage.objects;
create policy admin_attachments_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'admin-attachments' and private.is_admin_or_super());

drop policy if exists admin_attachments_delete on storage.objects;
create policy admin_attachments_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'admin-attachments' and private.jwt_role() = 'SUPER_ADMIN');

-- 7) Historique (qui a modifié quoi, quand, comment) + flux d'activité -----------
create table if not exists public.admin_task_history (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.admin_tasks(id) on delete set null,
  task_title text not null,             -- snapshot : le flux survit à la suppression
  actor      uuid references public.profiles(id) on delete set null,
  action     text not null,             -- created | updated | deleted | commented | attached
  field      text,
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);
create index if not exists admin_task_history_task_idx on public.admin_task_history (task_id, created_at desc);
create index if not exists admin_task_history_feed_idx on public.admin_task_history (created_at desc);

alter table public.admin_task_history enable row level security;
alter table public.admin_task_history replica identity full;

drop policy if exists task_history_read on public.admin_task_history;
create policy task_history_read on public.admin_task_history
  for select to authenticated using (private.is_admin_or_super());
-- Aucune policy insert/update/delete : seuls les triggers (SECURITY DEFINER) écrivent.

create or replace function private.log_admin_task_change()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into admin_task_history (task_id, task_title, actor, action)
    values (new.id, new.title, v_actor, 'created');
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into admin_task_history (task_id, task_title, actor, action)
    values (null, old.title, v_actor, 'deleted');
    return old;
  end if;

  -- UPDATE : une ligne par champ modifié
  if new.title is distinct from old.title then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'title', old.title, new.title);
  end if;
  if new.description is distinct from old.description then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'description', left(old.description, 120), left(new.description, 120));
  end if;
  if new.status is distinct from old.status then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'status', old.status, new.status);
  end if;
  if new.priority is distinct from old.priority then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'priority', old.priority, new.priority);
  end if;
  if new.category is distinct from old.category then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'category', old.category, new.category);
  end if;
  if new.deadline is distinct from old.deadline then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'deadline', old.deadline::text, new.deadline::text);
  end if;
  if new.assignee is distinct from old.assignee then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'assignee', old.assignee::text, new.assignee::text);
  end if;
  if new.problem is distinct from old.problem then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'problem',
            case when old.problem is null then null else left(old.problem, 120) end,
            case when new.problem is null then '(résolu)' else left(new.problem, 120) end);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_admin_tasks_history on public.admin_tasks;
create trigger trg_admin_tasks_history
  after insert or update or delete on public.admin_tasks
  for each row execute function private.log_admin_task_change();

create or replace function private.log_admin_task_activity()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_title text;
begin
  select title into v_title from admin_tasks where id = new.task_id;
  insert into admin_task_history (task_id, task_title, actor, action, new_value)
  values (
    new.task_id,
    coalesce(v_title, '?'),
    auth.uid(),
    case tg_table_name when 'admin_task_comments' then 'commented' else 'attached' end,
    case tg_table_name when 'admin_task_comments' then left(new.body, 120) else new.label end
  );
  return new;
end;
$$;

drop trigger if exists trg_task_comments_activity on public.admin_task_comments;
create trigger trg_task_comments_activity
  after insert on public.admin_task_comments
  for each row execute function private.log_admin_task_activity();

drop trigger if exists trg_task_attachments_activity on public.admin_task_attachments;
create trigger trg_task_attachments_activity
  after insert on public.admin_task_attachments
  for each row execute function private.log_admin_task_activity();

-- 8) Chat d'équipe par groupe ----------------------------------------------------
create table if not exists public.admin_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null default 'GENERAL',
  author     uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  mentions   uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_chat_channel_idx on public.admin_chat_messages (channel, created_at desc);

alter table public.admin_chat_messages enable row level security;
alter table public.admin_chat_messages replica identity full;

drop policy if exists admin_chat_read on public.admin_chat_messages;
create policy admin_chat_read on public.admin_chat_messages
  for select to authenticated using (private.is_admin_or_super());

drop policy if exists admin_chat_insert on public.admin_chat_messages;
create policy admin_chat_insert on public.admin_chat_messages
  for insert to authenticated
  with check (private.is_admin_or_super() and author = auth.uid());

drop policy if exists admin_chat_delete on public.admin_chat_messages;
create policy admin_chat_delete on public.admin_chat_messages
  for delete to authenticated
  using (private.jwt_role() = 'SUPER_ADMIN' or author = auth.uid());

-- 9) Notifications (assignation, problème, mentions, échéances) ------------------
create or replace function private.notify_admin(p_user uuid, p_title text, p_body text)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  insert into notifications (user_id, type, title, body)
  values (p_user, 'TASK_UPDATE', p_title, p_body);
exception when others then null; -- la notification ne doit jamais bloquer l'action
end;
$$;

create or replace function private.notify_admin_task_events()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Nouvelle attribution → notifier l'assigné
  if (tg_op = 'INSERT' and new.assignee is not null)
     or (tg_op = 'UPDATE' and new.assignee is distinct from old.assignee and new.assignee is not null)
  then
    perform private.notify_admin(new.assignee, 'Tâche attribuée',
      'On vous a confié : « ' || new.title || ' »');
  end if;

  -- Problème signalé → notifier tous les Super Admins
  if tg_op = 'UPDATE' and new.problem is not null and new.problem is distinct from old.problem then
    for r in select id from profiles where role = 'SUPER_ADMIN' and is_active loop
      perform private.notify_admin(r.id, 'Problème signalé',
        '« ' || new.title || ' » : ' || left(new.problem, 140));
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_tasks_notify on public.admin_tasks;
create trigger trg_admin_tasks_notify
  after insert or update on public.admin_tasks
  for each row execute function private.notify_admin_task_events();

create or replace function private.notify_mentions()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  foreach v_target in array new.mentions loop
    perform private.notify_admin(v_target, 'Vous avez été mentionné',
      left(new.body, 140));
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_task_comments_mentions on public.admin_task_comments;
create trigger trg_task_comments_mentions
  after insert on public.admin_task_comments
  for each row execute function private.notify_mentions();

drop trigger if exists trg_admin_chat_mentions on public.admin_chat_messages;
create trigger trg_admin_chat_mentions
  after insert on public.admin_chat_messages
  for each row execute function private.notify_mentions();

-- Échéances proches (≤ 48 h) : appelable par un admin (dédupliquée par jour).
-- À brancher sur pg_cron quand l'extension sera activée ; en attendant, le
-- tableau de bord l'appelle à l'ouverture.
create or replace function public.notify_admin_task_deadlines()
returns int language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;
  for r in
    select t.id, t.title, t.assignee, t.deadline
    from admin_tasks t
    where t.assignee is not null
      and t.status <> 'DONE'
      and t.deadline between current_date and current_date + 2
      and not exists (
        select 1 from notifications nf
        where nf.user_id = t.assignee
          and nf.type = 'TASK_UPDATE'
          and nf.title = 'Échéance proche'
          and nf.body like '%' || t.title || '%'
          and nf.created_at > now() - interval '20 hours'
      )
  loop
    insert into notifications (user_id, type, title, body)
    values (r.assignee, 'TASK_UPDATE', 'Échéance proche',
            '« ' || r.title || ' » arrive à échéance le ' || to_char(r.deadline, 'DD/MM'));
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.notify_admin_task_deadlines() from public, anon;
grant  execute on function public.notify_admin_task_deadlines() to authenticated;

-- 10) Realtime --------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.admin_task_comments;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.admin_task_attachments;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.admin_task_history;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.admin_chat_messages;
exception when duplicate_object then null;
end $$;

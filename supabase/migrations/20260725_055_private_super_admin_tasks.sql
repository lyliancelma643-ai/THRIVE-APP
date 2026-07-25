-- ─────────────────────────────────────────────────────────────────────────────
-- 055 — Tâches PRIVÉES du Super Admin sur la roadmap interne.
--
--   · admin_tasks.is_private : une tâche privée n'est visible QUE par le Super
--     Admin qui l'a créée. Les autres administrateurs (ADMIN comme les autres
--     SUPER_ADMIN) ne la voient nulle part : ni colonnes, ni calendrier, ni
--     vue d'ensemble, ni flux d'activité, ni temps réel.
--   · Seul un SUPER_ADMIN peut créer / rendre une tâche privée, et seulement
--     pour lui-même (is_private ⇒ created_by = moi).
--   · Une tâche privée n'est attribuable qu'à son auteur (sinon l'attribution
--     révélerait son titre à quelqu'un d'autre).
--   · Confidentialité en profondeur : commentaires, pièces jointes, historique
--     et notifications d'une tâche privée sont eux aussi masqués/supprimés.
--   · Repasser une tâche privée en partagée (ou l'inverse) reste possible à
--     tout moment pour son auteur.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Colonnes -------------------------------------------------------------------
alter table public.admin_tasks
  add column if not exists is_private boolean not null default false;

-- Index partiel : les tâches privées sont rares, la lecture courante les ignore.
create index if not exists admin_tasks_private_idx
  on public.admin_tasks (created_by) where is_private;

-- L'historique porte le propriétaire quand la tâche est privée (null = visible
-- de tous les admins). Snapshot : le flux survit à la suppression de la tâche.
alter table public.admin_task_history
  add column if not exists private_owner uuid references public.profiles(id) on delete set null;

create index if not exists admin_task_history_private_idx
  on public.admin_task_history (private_owner) where private_owner is not null;

-- 2) Helper : cette tâche m'est-elle visible ? -----------------------------------
-- SECURITY DEFINER : appelé depuis les policies des tables filles, il doit
-- pouvoir lire admin_tasks sans repasser par sa propre RLS.
create or replace function private.admin_task_visible(p_task uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_tasks t
    where t.id = p_task
      and (not t.is_private or t.created_by = auth.uid())
  );
$$;

-- 3) Lecture des tâches : les privées ne sortent que pour leur auteur -----------
drop policy if exists admin_tasks_read on public.admin_tasks;
create policy admin_tasks_read on public.admin_tasks
  for select to authenticated
  using (
    (select private.is_admin_or_super())
    and (not is_private or created_by = (select auth.uid()))
  );

-- Création : « privée » réservée au Super Admin, en son nom
drop policy if exists admin_tasks_insert on public.admin_tasks;
create policy admin_tasks_insert on public.admin_tasks
  for insert to authenticated
  with check (
    (select private.is_admin_or_super())
    and created_by = (select auth.uid())
    and (not is_private or (select private.jwt_role()) = 'SUPER_ADMIN')
  );

-- Mise à jour : mêmes droits qu'avant + interdiction pour un ADMIN de rendre
-- une tâche privée (la RLS de lecture l'empêche déjà d'en voir une).
-- Le WITH CHECK reprend explicitement l'expression du USING : sans lui,
-- PostgreSQL la réutilisait implicitement sur la ligne d'arrivée.
drop policy if exists admin_tasks_update on public.admin_tasks;
create policy admin_tasks_update on public.admin_tasks
  for update to authenticated
  using ((select private.jwt_role()) = 'SUPER_ADMIN'
         or ((select private.jwt_role()) = 'ADMIN'
             and (created_by = (select auth.uid())
                  or assignee = (select auth.uid())
                  or assignee is null)))
  with check (
    ((select private.jwt_role()) = 'SUPER_ADMIN'
     or ((select private.jwt_role()) = 'ADMIN'
         and (created_by = (select auth.uid())
              or assignee = (select auth.uid())
              or assignee is null)))
    and ((select private.jwt_role()) = 'SUPER_ADMIN' or not is_private)
  );

-- 4) Invariants du mode privé (INSERT + UPDATE) ---------------------------------
-- trg_a0_* : s'exécute avant trg_a (droits), trg_b (dérivations), trg_c (récurrence).
create or replace function private.enforce_admin_task_privacy()
returns trigger language plpgsql
set search_path = public
as $$
begin
  -- Contexte hors session utilisateur (service_role, seed, migrations) : rien à valider.
  if auth.uid() is null then
    return new;
  end if;

  if new.is_private then
    if private.jwt_role() <> 'SUPER_ADMIN' then
      raise exception 'Les tâches privées sont réservées au Super Admin';
    end if;
    if new.created_by is distinct from auth.uid() then
      raise exception 'Une tâche privée appartient au Super Admin qui l''a créée';
    end if;
    -- Attribuer une tâche privée à quelqu'un d'autre révélerait son titre.
    if new.assignee is not null and new.assignee is distinct from new.created_by then
      raise exception 'Une tâche privée ne peut être attribuée qu''à son auteur';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_a0_admin_tasks_privacy on public.admin_tasks;
create trigger trg_a0_admin_tasks_privacy
  before insert or update on public.admin_tasks
  for each row execute function private.enforce_admin_task_privacy();

-- 5) Droits d'édition : « privée » est un champ structurel (Super Admin) --------
-- (copie de 054 + is_private dans les champs intouchables hors Super Admin)
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
     or new.recurrence  is distinct from old.recurrence
     or new.is_private  is distinct from old.is_private
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

-- 6) Récurrence : l'occurrence suivante hérite du caractère privé -------------
-- (copie de 054 + is_private propagé à la nouvelle occurrence)
create or replace function private.spawn_recurring_task()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_step interval;
  v_next date;
begin
  if new.status = 'DONE' and old.status is distinct from 'DONE' and new.recurrence <> 'NONE' then
    v_step := case new.recurrence
      when 'DAILY'     then interval '1 day'
      when 'WEEKLY'    then interval '7 days'
      when 'BIWEEKLY'  then interval '14 days'
      when 'MONTHLY'   then interval '1 month'
      when 'BIMONTHLY' then interval '2 months'
      when 'QUARTERLY' then interval '3 months'
    end;
    if v_step is null then
      return new;
    end if;

    -- Prochaine échéance : à partir de l'échéance prévue (sinon aujourd'hui),
    -- avancée jusqu'à tomber strictement dans le futur si complétée en retard.
    v_next := (coalesce(new.deadline, current_date) + v_step)::date;
    while v_next <= current_date loop
      v_next := (v_next + v_step)::date;
    end loop;

    insert into admin_tasks
      (title, description, category, priority, assignee, created_by,
       status, deadline, horizon, recurrence, is_private)
    values
      (new.title, new.description, new.category, new.priority, new.assignee,
       new.created_by, 'TODO', v_next, new.horizon, new.recurrence, new.is_private);

    -- La récurrence est portée par la nouvelle occurrence uniquement.
    new.recurrence := 'NONE';
  end if;
  return new;
end;
$$;

-- 7) Historique : marquer les lignes privées + les masquer aux autres ----------
create or replace function private.log_admin_task_change()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
begin
  if tg_op = 'DELETE' then
    insert into admin_task_history (task_id, task_title, actor, action, private_owner)
    values (null, old.title, v_actor, 'deleted',
            case when old.is_private then old.created_by end);
    return old;
  end if;

  -- Propriétaire privé de la ligne d'historique (null = visible de tous les admins)
  v_owner := case when new.is_private then new.created_by end;

  if tg_op = 'INSERT' then
    insert into admin_task_history (task_id, task_title, actor, action, private_owner)
    values (new.id, new.title, v_actor, 'created', v_owner);
    return new;
  end if;

  -- UPDATE : une ligne par champ modifié
  if new.title is distinct from old.title then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'title', old.title, new.title, v_owner);
  end if;
  if new.description is distinct from old.description then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'description', left(old.description, 120), left(new.description, 120), v_owner);
  end if;
  if new.status is distinct from old.status then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'status', old.status, new.status, v_owner);
  end if;
  if new.priority is distinct from old.priority then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'priority', old.priority, new.priority, v_owner);
  end if;
  if new.category is distinct from old.category then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'category', old.category, new.category, v_owner);
  end if;
  if new.deadline is distinct from old.deadline then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'deadline', old.deadline::text, new.deadline::text, v_owner);
  end if;
  if new.assignee is distinct from old.assignee then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'assignee', old.assignee::text, new.assignee::text, v_owner);
  end if;
  if new.recurrence is distinct from old.recurrence
     and not (new.status = 'DONE' and old.status is distinct from 'DONE')
  then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'recurrence', old.recurrence, new.recurrence, v_owner);
  end if;
  -- Bascule privé/partagé : tracée côté propriétaire uniquement (une tâche qui
  -- redevient partagée ne doit pas exposer rétroactivement son passé privé).
  if new.is_private is distinct from old.is_private then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'is_private',
            old.is_private::text, new.is_private::text,
            coalesce(v_owner, old.created_by));
  end if;
  if new.problem is distinct from old.problem then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value, private_owner)
    values (new.id, new.title, v_actor, 'updated', 'problem',
            case when old.problem is null then null else left(old.problem, 120) end,
            case when new.problem is null then '(résolu)' else left(new.problem, 120) end,
            v_owner);
  end if;
  return new;
end;
$$;

-- Commentaires / pièces jointes : même marquage.
-- to_jsonb(new) est CONSERVÉ de la migration 048 : référencer new.body et
-- new.label dans un même CASE fait échouer le parsing PL/pgSQL (42703), la
-- branche non prise étant résolue elle aussi.
create or replace function private.log_admin_task_activity()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_title text;
  v_owner uuid;
  v_row   jsonb := to_jsonb(new);
begin
  select t.title, case when t.is_private then t.created_by end
    into v_title, v_owner
    from admin_tasks t where t.id = new.task_id;

  insert into admin_task_history (task_id, task_title, actor, action, new_value, private_owner)
  values (
    new.task_id,
    coalesce(v_title, '?'),
    auth.uid(),
    case tg_table_name when 'admin_task_comments' then 'commented' else 'attached' end,
    case tg_table_name when 'admin_task_comments' then left(v_row ->> 'body', 120) else v_row ->> 'label' end,
    v_owner
  );
  return new;
end;
$$;

drop policy if exists task_history_read on public.admin_task_history;
create policy task_history_read on public.admin_task_history
  for select to authenticated
  using (
    (select private.is_admin_or_super())
    and (private_owner is null or private_owner = (select auth.uid()))
  );

-- 8) Commentaires + pièces jointes d'une tâche privée : invisibles aux autres ---
drop policy if exists task_comments_read on public.admin_task_comments;
create policy task_comments_read on public.admin_task_comments
  for select to authenticated
  using ((select private.is_admin_or_super()) and private.admin_task_visible(task_id));

drop policy if exists task_comments_insert on public.admin_task_comments;
create policy task_comments_insert on public.admin_task_comments
  for insert to authenticated
  with check ((select private.is_admin_or_super())
              and author = (select auth.uid())
              and private.admin_task_visible(task_id));

drop policy if exists task_attachments_read on public.admin_task_attachments;
create policy task_attachments_read on public.admin_task_attachments
  for select to authenticated
  using ((select private.is_admin_or_super()) and private.admin_task_visible(task_id));

drop policy if exists task_attachments_insert on public.admin_task_attachments;
create policy task_attachments_insert on public.admin_task_attachments
  for insert to authenticated
  with check ((select private.is_admin_or_super())
              and created_by = (select auth.uid())
              and private.admin_task_visible(task_id));

-- Fichiers joints (Storage) : les uploads vivent dans un dossier nommé d'après
-- l'id de la tâche → même règle de visibilité. Les chemins hors format uuid
-- (héritage) restent lisibles comme avant.
drop policy if exists admin_attachments_read on storage.objects;
create policy admin_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'admin-attachments'
    and private.is_admin_or_super()
    and (
      (storage.foldername(name))[1] !~ '^[0-9a-fA-F-]{36}$'
      or private.admin_task_visible(((storage.foldername(name))[1])::uuid)
    )
  );

-- 9) Notifications : une tâche privée n'en déclenche aucune --------------------
-- (attribution = soi-même, et les problèmes ne partent pas aux autres Super Admins)
create or replace function private.notify_admin_task_events()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.is_private then
    return new;
  end if;

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

-- Rappels d'échéance : uniquement pour l'auteur d'une tâche privée
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
      and (not t.is_private or t.assignee = t.created_by)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 054 — Tâches récurrentes sur la roadmap admin.
--
--   · admin_tasks.recurrence : NONE / DAILY / WEEKLY / BIWEEKLY / MONTHLY /
--     BIMONTHLY / QUARTERLY. Champ structurel : modification réservée au
--     Super Admin (même règle que titre/échéance).
--   · Quand une tâche récurrente passe à TERMINÉE, la prochaine occurrence est
--     créée automatiquement : mêmes titre/description/groupe/priorité/assigné,
--     échéance décalée de l'intervalle (rattrapée après aujourd'hui si la
--     tâche a été finie en retard).
--   · La récurrence vit sur la NOUVELLE occurrence : l'occurrence terminée
--     repasse à NONE, donc la rouvrir puis la re-terminer ne crée pas de
--     doublon.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Colonne + contrainte --------------------------------------------------------
alter table public.admin_tasks
  add column if not exists recurrence text not null default 'NONE';

alter table public.admin_tasks drop constraint if exists admin_tasks_recurrence_check;
alter table public.admin_tasks add constraint admin_tasks_recurrence_check
  check (recurrence in ('NONE','DAILY','WEEKLY','BIWEEKLY','MONTHLY','BIMONTHLY','QUARTERLY'));

-- 2) Droits : la récurrence est un champ structurel (Super Admin uniquement) ----
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

-- 3) Reprogrammation automatique à la complétion ---------------------------------
-- trg_c_* : s'exécute APRÈS trg_a (droits) et trg_b (dérivations) — ordre
-- alphabétique des triggers BEFORE UPDATE. SECURITY DEFINER : l'insertion de
-- la prochaine occurrence conserve le créateur d'origine malgré la RLS.
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
       status, deadline, horizon, recurrence)
    values
      (new.title, new.description, new.category, new.priority, new.assignee,
       new.created_by, 'TODO', v_next, new.horizon, new.recurrence);

    -- La récurrence est portée par la nouvelle occurrence uniquement.
    new.recurrence := 'NONE';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_c_admin_tasks_recur on public.admin_tasks;
create trigger trg_c_admin_tasks_recur
  before update on public.admin_tasks
  for each row execute function private.spawn_recurring_task();

-- 4) Historique : tracer les changements de récurrence ---------------------------
-- (copie de 037 + bloc recurrence ; le reset automatique NONE fait par le
-- trigger de complétion n'est pas tracé pour ne pas polluer le flux.)
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
  if new.recurrence is distinct from old.recurrence
     and not (new.status = 'DONE' and old.status is distinct from 'DONE')
  then
    insert into admin_task_history (task_id, task_title, actor, action, field, old_value, new_value)
    values (new.id, new.title, v_actor, 'updated', 'recurrence', old.recurrence, new.recurrence);
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

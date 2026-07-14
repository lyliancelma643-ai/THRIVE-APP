-- ──────────────────────────────────────────────────────────────────────────────
-- 20260714_048_fix_task_activity_trigger.sql
-- Correctif roadmap : publier une note libre (ou une pièce jointe) échouait
-- systématiquement — erreur 42703 « record "new" has no field "label" ».
--
-- Cause : private.log_admin_task_activity() (migration 037) référençait
-- new.body ET new.label dans la même expression CASE. PL/pgSQL résout tous
-- les champs du record au parsing, même ceux de la branche non prise :
--   · admin_task_comments n'a pas de colonne label → insert de note bloqué ;
--   · admin_task_attachments n'a pas de colonne body → insert de lien bloqué.
--
-- Correctif : passer par to_jsonb(new) — l'accès JSON est dynamique et ne
-- déclenche aucune résolution de champ au parsing.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function private.log_admin_task_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_title text;
  v_row   jsonb := to_jsonb(new);
begin
  select title into v_title from admin_tasks where id = new.task_id;
  insert into admin_task_history (task_id, task_title, actor, action, new_value)
  values (
    new.task_id,
    coalesce(v_title, '?'),
    auth.uid(),
    case tg_table_name when 'admin_task_comments' then 'commented' else 'attached' end,
    case tg_table_name when 'admin_task_comments' then left(v_row ->> 'body', 120) else v_row ->> 'label' end
  );
  return new;
end;
$$;

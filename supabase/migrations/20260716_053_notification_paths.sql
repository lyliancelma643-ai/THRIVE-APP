-- ─────────────────────────────────────────────────────────────────────────────
-- 20260716_053_notification_paths.sql
-- Notifications « actives » : chaque notification porte une destination
-- (data.path) pour que le clic — cloche in-app comme Web Push — emmène
-- l'utilisateur sur la bonne page ET le bon bloc (?focus=<carte du bilan>).
--
-- Plutôt que de retoucher chaque producteur (questionnaire_submit,
-- evaluate_family_week, notify_on_*, notify_incomplete_dossiers, roadmap…),
-- le routage vit en UN endroit : un trigger BEFORE INSERT dérive data.path
-- quand il manque, selon le type, le sous-type et le rôle du destinataire.
-- Le trigger Web Push (AFTER INSERT, mig. 047) lit new.data->>'path' → les
-- push sortent enrichis sans autre changement. Backfill des lignes existantes.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Petit assembleur d'URL de carte du bilan parent
create or replace function private.parent_bilan_focus(p_child text, p_focus text)
returns text language sql immutable set search_path = '' as $$
  select '/parent/bilans?'
         || case when p_child is not null then 'child=' || p_child || '&' else '' end
         || 'focus=' || p_focus;
$$;

-- 2) Dérivation de la destination par défaut d'une notification
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
begin
  select role::text into v_role from public.profiles where id = p_user;

  -- ── Espace coach ──
  if v_role = 'COACH' then
    return case
      when p_type in ('QUESTIONNAIRE_COMPLETED', 'DOSSIER_INCOMPLET') and v_child is not null
        then '/coach/athletes/' || v_child
      when p_type = 'DOSSIER_INCOMPLET' then '/coach/dossiers'
      when p_type = 'MESSAGE'           then '/coach/messages'
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
      when p_type = 'MESSAGE'           then '/admin/messages'
      else '/admin'
    end;
  end if;

  -- ── Espace parent (défaut) ──
  -- Les cartes du bilan sont ciblées via /parent/bilans?child=<id>&focus=<clé>
  -- (clés data-info du gabarit : programme, competences, perma, parcours,
  --  certificat, …) — la page scrolle vers la carte et la met en évidence.
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
        else private.parent_bilan_focus(v_child, 'programme') -- streak & co
      end
    when p_type = 'PROGRAM_UPDATED' then
      case when v_subtype = 'renewal_window' then '/parent/upgrade'
           else '/parent/bilans' end
    when p_type = 'MESSAGE' then '/parent/messages'
    when p_type in ('SESSION', 'SESSION_REMINDER') then '/parent/my-sessions'
    else '/parent/bilans'
  end;
end $$;

revoke all on function private.notification_default_path(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function private.parent_bilan_focus(text, text) from public, anon, authenticated;

-- 3) Trigger : complète data.path à l'insertion quand le producteur ne l'a pas mis.
--    BEFORE INSERT → le trigger Web Push (AFTER, mig. 047) voit le path enrichi.
create or replace function private.notifications_fill_path()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_path text;
begin
  if coalesce(new.data ->> 'path', '') = '' then
    v_path := private.notification_default_path(new.user_id, new.type::text,
                                                coalesce(new.data, '{}'::jsonb));
    if v_path is not null then
      new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{path}', to_jsonb(v_path));
    end if;
  end if;
  return new;
exception when others then
  return new; -- le routage ne doit jamais bloquer la notification
end $$;

drop trigger if exists trg_notifications_fill_path on public.notifications;
create trigger trg_notifications_fill_path
  before insert on public.notifications
  for each row execute function private.notifications_fill_path();

-- 4) Backfill : les notifications déjà en base deviennent cliquables aussi
update public.notifications n
set data = jsonb_set(coalesce(n.data, '{}'::jsonb), '{path}',
  to_jsonb(private.notification_default_path(n.user_id, n.type::text,
                                             coalesce(n.data, '{}'::jsonb))))
where coalesce(n.data ->> 'path', '') = ''
  and private.notification_default_path(n.user_id, n.type::text,
                                        coalesce(n.data, '{}'::jsonb)) is not null;

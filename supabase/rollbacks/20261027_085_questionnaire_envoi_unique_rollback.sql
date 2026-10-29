-- ─────────────────────────────────────────────────────────────────────────────
-- Retour arrière de 085 (envoi unique des questionnaires). Idempotent.
-- Remet les corps de production d'avant 085 (sans verrou, cast direct) et
-- supprime les index uniques. Aucune donnée supprimée.
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

drop index if exists public.perma_scores_questionnaire_pillar_uq;
drop index if exists public.skill_scores_lsss_source_skill_uq;

-- ── 2) questionnaire_submit (PERMA et LSSS) ─────────────────────────────────
create or replace function public.questionnaire_submit(p_token uuid, p_answers jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_q record; v_expected int; v_answered int; v_global numeric;
  v_coach uuid; v_parent uuid; r record;
begin
  select * into v_q from public.questionnaires where access_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_q.status = 'COMPLETED' then return jsonb_build_object('error','already_completed'); end if;
  if v_q.token_expires_at is not null and v_q.token_expires_at < now() then
    return jsonb_build_object('error','expired');
  end if;

  if v_q.kind = 'PERMA' then
    select count(*) into v_expected from public.perma_items where is_active and lang = v_q.lang;
    select count(*) into v_answered
      from public.perma_items i
      where i.is_active and i.lang = v_q.lang
        and (p_answers ->> i.id::text) is not null and (p_answers ->> i.id::text)::numeric between 1 and 5;
    if v_answered < v_expected then
      return jsonb_build_object('error','incomplete','answered',v_answered,'expected',v_expected);
    end if;

    delete from public.perma_scores where questionnaire_id = v_q.id;
    for r in
      select i.pillar,
             round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) as val
      from public.perma_items i
      where i.is_active and i.lang = v_q.lang
      group by i.pillar
    loop
      insert into public.perma_scores (child_id, questionnaire_id, session_number, pillar, value)
      values (v_q.child_id, v_q.id, v_q.session_number, r.pillar, r.val);
    end loop;

    select round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) into v_global
    from public.perma_items i where i.is_active and i.lang = v_q.lang;

  else
    select count(*) into v_expected from public.lsss_items where is_active and lang='fr';
    select count(*) into v_answered
      from public.lsss_items i
      where i.is_active and i.lang='fr'
        and (p_answers ->> i.id::text) is not null and (p_answers ->> i.id::text)::numeric between 1 and 5;
    if v_answered < v_expected then
      return jsonb_build_object('error','incomplete','answered',v_answered,'expected',v_expected);
    end if;

    delete from public.skill_scores where source_id = v_q.id and source = 'QUESTIONNAIRE_LSSS';
    for r in
      select i.subscale,
             round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) as val
      from public.lsss_items i
      where i.is_active and i.lang='fr'
      group by i.subscale
    loop
      insert into public.skill_scores (child_id, skill_key, source, source_id, value)
      values (v_q.child_id, r.subscale, 'QUESTIONNAIRE_LSSS', v_q.id, r.val);
    end loop;

    select round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) into v_global
    from public.lsss_items i where i.is_active and i.lang='fr';
  end if;

  update public.questionnaires
     set status = 'COMPLETED', answers = p_answers, completed_at = now(), updated_at = now()
   where id = v_q.id;

  v_coach := v_q.created_by;
  if v_coach is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_coach, 'QUESTIONNAIRE_COMPLETED',
      case when v_q.kind='PERMA' then 'Météo PERMA complétée' else 'Questionnaire LSSS complété' end,
      case when v_q.lang='en' then 'Overall result: ' || v_global || '/100.' else 'Résultat global : ' || v_global || '/100.' end,
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id,
                         'kind', v_q.kind, 'global', v_global, 'session_number', v_q.session_number));
  end if;
  for v_parent in
    select f.parent_id from public.children c join public.families f on f.id = c.family_id
    where c.id = v_q.child_id
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_parent, 'QUESTIONNAIRE_COMPLETED',
      case when v_q.kind='PERMA' then 'Météo du bien-être complétée' else 'Questionnaire complété' end,
      case when v_q.kind='PERMA' then 'La progression du bien-être du bilan a été mise à jour.'
           else 'Les compétences de vie du bilan ont été mises à jour.' end,
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id, 'kind', v_q.kind));
  end loop;

  return jsonb_build_object('ok', true, 'kind', v_q.kind, 'global', v_global);
end $function$;

-- ── 3) lsss_submit (ancienne entrée LSSS, toujours exposée) ─────────────────
create or replace function public.lsss_submit(p_token uuid, p_answers jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public'
as $function$
declare v_q record; v_expected int; v_answered int; v_global numeric; v_coach uuid; v_parent uuid; r record;
begin
  select * into v_q from public.questionnaires where access_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_q.status = 'COMPLETED' then return jsonb_build_object('error','already_completed'); end if;
  if v_q.token_expires_at is not null and v_q.token_expires_at < now() then return jsonb_build_object('error','expired'); end if;
  select count(*) into v_expected from public.lsss_items where is_active and lang='fr';
  select count(*) into v_answered from public.lsss_items i where i.is_active and i.lang='fr'
    and (p_answers ->> i.id::text) is not null and (p_answers ->> i.id::text)::numeric between 1 and 5;
  if v_answered < v_expected then return jsonb_build_object('error','incomplete','answered',v_answered,'expected',v_expected); end if;
  delete from public.skill_scores where source_id = v_q.id and source = 'QUESTIONNAIRE_LSSS';
  for r in select i.subscale, round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) as val
    from public.lsss_items i where i.is_active and i.lang='fr' group by i.subscale loop
    insert into public.skill_scores (child_id, skill_key, source, source_id, value)
    values (v_q.child_id, r.subscale, 'QUESTIONNAIRE_LSSS', v_q.id, r.val);
  end loop;
  select round(avg(((p_answers ->> i.id::text)::numeric - 1) / 4 * 100)) into v_global from public.lsss_items i where i.is_active and i.lang='fr';
  update public.questionnaires set status = 'COMPLETED', answers = p_answers, completed_at = now(), updated_at = now() where id = v_q.id;
  v_coach := v_q.created_by;
  if v_coach is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_coach, 'QUESTIONNAIRE_COMPLETED', 'Questionnaire LSSS complété', 'Résultat global : ' || v_global || '/100.',
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id, 'global', v_global));
  end if;
  for v_parent in select f.parent_id from public.children c join public.families f on f.id = c.family_id where c.id = v_q.child_id loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_parent, 'QUESTIONNAIRE_COMPLETED', 'Questionnaire complété', 'Les compétences de vie du bilan ont été mises à jour.',
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id));
  end loop;
  return jsonb_build_object('ok', true, 'global', v_global);
end $function$;

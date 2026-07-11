-- ─────────────────────────────────────────────────────────────────────────────
-- 20260711_042_perma_engine.sql
-- Moteur PERMA (Seligman 2011 ; Uusiautti, Leskisenoja & Hyvärinen 2017 —
-- « PERMA-based Perspectives on Sports »). Mesure de BIEN-ÊTRE administrée à
-- CHAQUE séance (contrairement au LSSS qui reste aux séances 3/7/13).
--
--   5 piliers : Émotions positives · Engagement · Relations · Sens ·
--   Accomplissement. 1 énoncé court par pilier (pulse post-séance), bilingue
--   FR/EN, échelle 1..5. Réponses de l'ENFANT via le lien tokenisé /q/<token>.
--
--   • Le coach déclenche l'envoi (perma_send) pour une séance donnée → notifie
--     le parent (lien à transmettre à l'enfant).
--   • À la soumission → alimente public.perma_scores (SÉPARÉ de skill_scores :
--     PERMA = bien-être, ne touche PAS la jauge « compétences de vie » LSSS).
--   • perma_progression() → courbe de bien-être par séance (parent/coach).
--
-- Chargement/soumission unifiés : questionnaire_get / questionnaire_submit
-- gèrent LSSS *et* PERMA (dispatch par `kind`). Les anciennes RPC lsss_get /
-- lsss_submit restent en place (rétro-compat, plus appelées par le front).
-- ─────────────────────────────────────────────────────────────────────────────

-- 0) Colonnes questionnaires : séance rattachée (PERMA) + langue
alter table public.questionnaires
  add column if not exists session_number int,
  add column if not exists lang text not null default 'fr'
                           check (lang in ('fr', 'en'));

-- 1) Référentiel des énoncés PERMA (bilingue)
create table if not exists public.perma_items (
  id           uuid primary key default gen_random_uuid(),
  pillar       text not null
               check (pillar in ('positive_emotion','engagement','relationships','meaning','accomplishment')),
  pillar_label text not null,               -- libellé affiché (selon lang)
  local_number int  not null default 1,     -- k dans le pilier (si >1 énoncé)
  prompt       text not null,
  lang         text not null default 'fr' check (lang in ('fr','en')),
  is_active    boolean not null default true,
  sort_order   int  not null default 0,
  unique (pillar, local_number, lang)
);
create index if not exists idx_perma_items_active on public.perma_items(is_active, lang, sort_order);

alter table public.perma_items enable row level security;
drop policy if exists perma_items_read on public.perma_items;
create policy perma_items_read on public.perma_items for select to authenticated using (true);
drop policy if exists perma_items_admin_write on public.perma_items;
create policy perma_items_admin_write on public.perma_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Seed idempotent : 5 piliers × 1 énoncé × 2 langues (FR + EN)
insert into public.perma_items (pillar, pillar_label, local_number, prompt, lang, sort_order)
values
  -- FR
  ('positive_emotion','Émotions positives',1,
   'Aujourd''hui, pendant ma séance, je me suis senti·e bien et de bonne humeur.','fr',1),
  ('engagement','Engagement',1,
   'J''étais vraiment concentré·e et pris·e dans ce que je faisais.','fr',2),
  ('relationships','Relations',1,
   'Je me suis senti·e soutenu·e par mon coach et mes coéquipiers.','fr',3),
  ('meaning','Sens',1,
   'Ce que j''ai fait aujourd''hui avait du sens et comptait pour moi.','fr',4),
  ('accomplishment','Accomplissement',1,
   'J''ai réussi des choses et je suis fier·ère de mes progrès.','fr',5),
  -- EN
  ('positive_emotion','Positive emotions',1,
   'Today during my session, I felt good and in a positive mood.','en',1),
  ('engagement','Engagement',1,
   'I was really focused and absorbed in what I was doing.','en',2),
  ('relationships','Relationships',1,
   'I felt supported by my coach and my teammates.','en',3),
  ('meaning','Meaning',1,
   'What I did today felt meaningful and mattered to me.','en',4),
  ('accomplishment','Accomplishment',1,
   'I achieved things and I''m proud of my progress.','en',5)
on conflict (pillar, local_number, lang) do update set
  pillar_label = excluded.pillar_label,
  prompt       = excluded.prompt,
  sort_order   = excluded.sort_order;

-- 2) Scores PERMA (bien-être) — table dédiée, indépendante de skill_scores
create table if not exists public.perma_scores (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children(id) on delete cascade,
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  session_number   int,
  pillar           text not null,
  value            numeric not null check (value between 0 and 100),
  created_at       timestamptz not null default now()
);
create index if not exists idx_perma_scores_child on public.perma_scores(child_id, session_number);

alter table public.perma_scores enable row level security;
-- Lecture réservée aux personnes autorisées à voir le dossier (parent/coach/admin)
drop policy if exists perma_scores_read on public.perma_scores;
create policy perma_scores_read on public.perma_scores for select to authenticated
  using (private.can_view_child_bilan(child_id));
-- Aucune policy d'écriture : seules les RPC SECURITY DEFINER écrivent.

-- 3) RPC — le coach déclenche l'envoi PERMA pour une séance
create or replace function public.perma_send(p_child uuid, p_session int, p_lang text default 'fr')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := gen_random_uuid();
  v_qid   uuid;
  v_lang  text := case when p_lang = 'en' then 'en' else 'fr' end;
  v_title text;
  v_desc  text;
  v_parent uuid;
  v_name  text;
begin
  if not private.can_edit_child_bilan(p_child) then
    raise exception 'not authorized';
  end if;
  if p_session is null or p_session < 1 or p_session > 13 then
    raise exception 'invalid session number';
  end if;

  select first_name into v_name from public.children where id = p_child;

  if v_lang = 'en' then
    v_title := 'Well-being check-in (PERMA) — Session ' || p_session;
    v_desc  := 'Answer thinking about today''s session. There are no right or wrong answers.';
  else
    v_title := 'Météo du bien-être (PERMA) — Séance ' || p_session;
    v_desc  := 'Réponds en pensant à ta séance d''aujourd''hui. Il n''y a pas de bonne ou de mauvaise réponse.';
  end if;

  insert into public.questionnaires
    (child_id, session_id, kind, moment, session_number, lang, title, description, status,
     access_token, token_expires_at, created_by)
  values
    (p_child, null, 'PERMA', null, p_session, v_lang, v_title, v_desc,
     'PENDING', v_token, now() + interval '30 days', auth.uid())
  returning id into v_qid;

  for v_parent in
    select f.parent_id from public.children c join public.families f on f.id = c.family_id
    where c.id = p_child
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_parent, 'QUESTIONNAIRE_PENDING',
      case when v_lang='en' then 'Well-being check-in to complete' else 'Météo du bien-être à compléter' end,
      case when v_lang='en'
           then 'A quick PERMA check-in is waiting for ' || coalesce(v_name,'your child') || ' (session ' || p_session || ').'
           else 'Une courte météo PERMA attend ' || coalesce(v_name,'votre enfant') || ' (séance ' || p_session || ').' end,
      jsonb_build_object('questionnaire_id', v_qid, 'child_id', p_child,
                         'kind','PERMA','session_number', p_session, 'token', v_token, 'path', '/q/' || v_token));
  end loop;

  return jsonb_build_object('questionnaire_id', v_qid, 'token', v_token, 'path', '/q/' || v_token);
end $$;

-- 4) RPC unifiée — chargement d'un questionnaire (LSSS ou PERMA) par token (anon)
create or replace function public.questionnaire_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q record; v_items jsonb;
begin
  select q.*, c.first_name as child_first_name
    into v_q
  from public.questionnaires q
  join public.children c on c.id = q.child_id
  where q.access_token = p_token;

  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if v_q.token_expires_at is not null and v_q.token_expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  if v_q.kind = 'PERMA' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'group_key', pillar, 'group_label', pillar_label,
             'prompt', prompt, 'sort_order', sort_order) order by sort_order), '[]'::jsonb)
      into v_items
    from public.perma_items where is_active and lang = v_q.lang;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'group_key', subscale, 'group_label', subscale_label,
             'prompt', prompt, 'sort_order', sort_order) order by sort_order), '[]'::jsonb)
      into v_items
    from public.lsss_items where is_active and lang = 'fr';
  end if;

  return jsonb_build_object(
    'questionnaire_id', v_q.id,
    'kind', v_q.kind,
    'lang', v_q.lang,
    'session_number', v_q.session_number,
    'moment', v_q.moment,
    'child_first_name', v_q.child_first_name,
    'title', v_q.title,
    'description', v_q.description,
    'status', v_q.status,
    'completed', v_q.status = 'COMPLETED',
    'items', v_items
  );
end $$;

-- 5) RPC unifiée — soumission (dispatch LSSS/PERMA). p_answers = {"<item_id>": 1..5}
create or replace function public.questionnaire_submit(p_token uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
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
        and (p_answers ->> i.id::text) is not null
        and (p_answers ->> i.id::text)::numeric between 1 and 5;
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
    -- LSSS (comportement historique : alimente skill_scores → jauge)
    select count(*) into v_expected from public.lsss_items where is_active and lang='fr';
    select count(*) into v_answered
      from public.lsss_items i
      where i.is_active and i.lang='fr'
        and (p_answers ->> i.id::text) is not null
        and (p_answers ->> i.id::text)::numeric between 1 and 5;
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

  -- Notifications coach (auteur) + parent(s)
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
end $$;

-- 6) RPC — série temporelle PERMA par séance (courbe de bien-être)
create or replace function public.perma_progression(p_child uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.can_view_child_bilan(p_child) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(row order by session_number)
    from (
      select q.session_number,
             q.completed_at as created_at,
             round(avg(ps.value)) as value,
             jsonb_object_agg(ps.pillar, round(ps.value)) as pillars
      from public.questionnaires q
      join public.perma_scores ps on ps.questionnaire_id = q.id
      where q.child_id = p_child and q.kind = 'PERMA' and q.status = 'COMPLETED'
      group by q.id, q.session_number, q.completed_at
    ) row
  ), '[]'::jsonb);
end $$;

-- 7) Grants — lien enfant (anon) + coach/parent
grant execute on function public.questionnaire_get(uuid)          to anon, authenticated;
grant execute on function public.questionnaire_submit(uuid, jsonb) to anon, authenticated;
grant execute on function public.perma_send(uuid, int, text)      to authenticated;
grant execute on function public.perma_progression(uuid)          to authenticated;

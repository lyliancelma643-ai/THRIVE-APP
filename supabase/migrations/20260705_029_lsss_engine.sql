-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — Partie 1.7 : moteur LSSS (Life Skills Scale for Sport,
-- Cronin & Allen 2017) — 43 items / 8 sous-échelles.
--   • Administré à l'ENFANT via un lien dédié tokenisé (/q/<token>), aucune
--     authentification requise (l'enfant n'a pas forcément de compte).
--   • Déclenché par le coach (RPC lsss_send) → notifie le parent (questionnaire
--     en attente) ; à la soumission → alimente skill_scores (source
--     QUESTIONNAIRE_LSSS) et notifie coach + parent.
--   • gauge_summary() (migration 021) agrège déjà skill_scores par sous-échelle.
--
-- NB LIBELLÉS : les énoncés ci-dessous sont des GABARITS de travail. Remplacer
-- par la formulation officielle du questionnaire (update public.lsss_items set
-- prompt=… where item_number=…) sans changer les clés de sous-échelle.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) questionnaires : colonnes LSSS + lien tokenisé + session facultative
alter table public.questionnaires
  add column if not exists kind             text not null default 'GENERIC',
  add column if not exists moment           text
                           check (moment is null or moment in ('BASELINE','MID','FINAL')),
  add column if not exists access_token     uuid,
  add column if not exists token_expires_at timestamptz;

alter table public.questionnaires alter column session_id drop not null;

create unique index if not exists idx_questionnaires_token
  on public.questionnaires(access_token) where access_token is not null;

-- 2) Référentiel des 43 items (8 sous-échelles)
create table if not exists public.lsss_items (
  id             uuid primary key default gen_random_uuid(),
  item_number    int  not null unique,          -- 1..43 (ordre global)
  subscale       text not null,                 -- clé technique (= skill_key)
  subscale_label text not null,                 -- libellé FR affiché
  local_number   int  not null,                 -- k dans la sous-échelle
  prompt         text not null,
  lang           text not null default 'fr',
  is_active      boolean not null default true,
  sort_order     int  not null default 0
);
create index if not exists idx_lsss_items_active on public.lsss_items(is_active, sort_order);

alter table public.lsss_items enable row level security;
drop policy if exists lsss_items_read on public.lsss_items;
create policy lsss_items_read on public.lsss_items for select to authenticated using (true);
drop policy if exists lsss_items_admin_write on public.lsss_items;
create policy lsss_items_admin_write on public.lsss_items for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Seed idempotent : répartition officielle Cronin & Allen (7+3+3+4+3+4+8+11 = 43)
do $$
declare
  subs jsonb := jsonb_build_array(
    jsonb_build_object('key','teamwork',        'label','Travailler en équipe',        'n',7),
    jsonb_build_object('key','goal_setting',    'label','Fixer des objectifs',          'n',3),
    jsonb_build_object('key','time_management', 'label','Gérer son temps',              'n',3),
    jsonb_build_object('key','emotional_skills','label','Gérer ses émotions',           'n',4),
    jsonb_build_object('key','communication',   'label','Communiquer',                  'n',3),
    jsonb_build_object('key','social_skills',   'label','Créer des liens',              'n',4),
    jsonb_build_object('key','leadership',      'label','Prendre le leadership',         'n',8),
    jsonb_build_object('key','problem_solving', 'label','Résoudre des problèmes',        'n',11)
  );
  s jsonb; k int; gnum int := 0; sord int := 0;
begin
  if not exists (select 1 from public.lsss_items) then
    for s in select * from jsonb_array_elements(subs) loop
      for k in 1..(s->>'n')::int loop
        gnum := gnum + 1; sord := sord + 1;
        insert into public.lsss_items (item_number, subscale, subscale_label, local_number, prompt, sort_order)
        values (
          gnum, s->>'key', s->>'label', k,
          'Le sport m''a appris à… — ' || (s->>'label') || ' (énoncé ' || k || ') [gabarit à remplacer]',
          sord
        );
      end loop;
    end loop;
  end if;
end $$;

-- 3) RPC — le coach déclenche l'envoi (crée le questionnaire + notifie le parent)
create or replace function public.lsss_send(p_child uuid, p_moment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := gen_random_uuid();
  v_qid   uuid;
  v_title text;
  v_parent uuid;
begin
  if not private.can_edit_child_bilan(p_child) then
    raise exception 'not authorized';
  end if;
  if p_moment not in ('BASELINE','MID','FINAL') then
    raise exception 'invalid moment';
  end if;

  v_title := case p_moment
    when 'BASELINE' then 'Questionnaire LSSS — Départ (S1)'
    when 'MID'      then 'Questionnaire LSSS — Mi-parcours (S7)'
    else                 'Questionnaire LSSS — Bilan final (S13)' end;

  insert into public.questionnaires
    (child_id, session_id, kind, moment, title, description, status,
     access_token, token_expires_at, created_by)
  values
    (p_child, null, 'LSSS', p_moment, v_title,
     'Réponds en pensant à ton sport. Il n''y a pas de bonne ou de mauvaise réponse.',
     'PENDING', v_token, now() + interval '45 days', auth.uid())
  returning id into v_qid;

  -- Notifie le(s) parent(s) : questionnaire en attente
  for v_parent in
    select f.parent_id from public.children c join public.families f on f.id = c.family_id
    where c.id = p_child
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_parent, 'QUESTIONNAIRE_PENDING',
      'Questionnaire à compléter',
      'Un questionnaire LSSS attend ' || (select first_name from public.children where id = p_child) || '.',
      jsonb_build_object('questionnaire_id', v_qid, 'child_id', p_child,
                         'moment', p_moment, 'token', v_token, 'path', '/q/' || v_token));
  end loop;

  return jsonb_build_object('questionnaire_id', v_qid, 'token', v_token, 'path', '/q/' || v_token);
end $$;

-- 4) RPC — chargement du questionnaire par l'enfant (anon), via token
create or replace function public.lsss_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q record; v_items jsonb;
begin
  select q.*, c.first_name as child_first_name
    into v_q
  from public.questionnaires q
  join public.children c on c.id = q.child_id
  where q.access_token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_q.token_expires_at is not null and v_q.token_expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'subscale', subscale, 'subscale_label', subscale_label,
           'prompt', prompt, 'sort_order', sort_order) order by sort_order), '[]'::jsonb)
    into v_items
  from public.lsss_items where is_active and lang = 'fr';

  return jsonb_build_object(
    'questionnaire_id', v_q.id,
    'child_first_name', v_q.child_first_name,
    'title', v_q.title,
    'description', v_q.description,
    'moment', v_q.moment,
    'status', v_q.status,
    'completed', v_q.status = 'COMPLETED',
    'items', v_items
  );
end $$;

-- 5) RPC — soumission : score par sous-échelle → skill_scores + notifications
--    p_answers = { "<item_id>": <1..5>, ... }
create or replace function public.lsss_submit(p_token uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_q record;
  v_expected int;
  v_answered int;
  v_global numeric;
  v_coach uuid;
  v_parent uuid;
  r record;
begin
  select * into v_q from public.questionnaires where access_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_q.status = 'COMPLETED' then return jsonb_build_object('error','already_completed'); end if;
  if v_q.token_expires_at is not null and v_q.token_expires_at < now() then
    return jsonb_build_object('error','expired');
  end if;

  select count(*) into v_expected from public.lsss_items where is_active and lang='fr';
  select count(*) into v_answered
    from public.lsss_items i
    where i.is_active and i.lang='fr'
      and (p_answers ->> i.id::text) is not null
      and (p_answers ->> i.id::text)::numeric between 1 and 5;

  if v_answered < v_expected then
    return jsonb_build_object('error','incomplete','answered',v_answered,'expected',v_expected);
  end if;

  -- Purge d'un éventuel envoi précédent pour ce questionnaire (ré-idempotence)
  delete from public.skill_scores where source_id = v_q.id and source = 'QUESTIONNAIRE_LSSS';

  -- Score par sous-échelle : moyenne des items (1..5) → 0..100
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

  update public.questionnaires
     set status = 'COMPLETED', answers = p_answers, completed_at = now(), updated_at = now()
   where id = v_q.id;

  -- Notifie coach (auteur) + parent(s)
  v_coach := v_q.created_by;
  if v_coach is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_coach, 'QUESTIONNAIRE_COMPLETED', 'Questionnaire LSSS complété',
      'Résultat global : ' || v_global || '/100.',
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id, 'global', v_global));
  end if;
  for v_parent in
    select f.parent_id from public.children c join public.families f on f.id = c.family_id
    where c.id = v_q.child_id
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (v_parent, 'QUESTIONNAIRE_COMPLETED', 'Questionnaire complété',
      'Les compétences de vie du bilan ont été mises à jour.',
      jsonb_build_object('questionnaire_id', v_q.id, 'child_id', v_q.child_id));
  end loop;

  return jsonb_build_object('ok', true, 'global', v_global);
end $$;

-- 6) Accès anon aux RPC du lien enfant (get/submit uniquement)
grant execute on function public.lsss_get(uuid)        to anon, authenticated;
grant execute on function public.lsss_submit(uuid, jsonb) to anon, authenticated;
grant execute on function public.lsss_send(uuid, text)  to authenticated;

-- 7) Série temporelle des scores LSSS pour la courbe de progression (parent/coach)
--    Garde d'autorisation : réservé aux personnes pouvant voir le dossier.
create or replace function public.lsss_progression(p_child uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.can_view_child_bilan(p_child) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(row order by created_at)
    from (
      select q.moment,
             q.completed_at as created_at,
             round(avg(ss.value)) as value
      from public.questionnaires q
      join public.skill_scores ss on ss.source_id = q.id and ss.source = 'QUESTIONNAIRE_LSSS'
      where q.child_id = p_child and q.kind = 'LSSS' and q.status = 'COMPLETED'
      group by q.id, q.moment, q.completed_at
    ) row
  ), '[]'::jsonb);
end $$;
grant execute on function public.lsss_progression(uuid) to authenticated;

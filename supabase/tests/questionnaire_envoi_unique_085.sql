-- ════════════════════════════════════════════════════════════════════════════
-- Envoi unique des questionnaires — migration 085 (audit QA 2026-10-27, C-2).
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   SUBMIT_085_PASSED {…}   ou   SUBMIT_085_FAILED [échecs] {…}
-- Avant 085 le même fichier doit échouer (cast « abc » → exception, ni verrou ni
-- index unique).
--
-- PGlite n'a qu'une connexion : la course réelle entre deux envois ne peut pas
-- être jouée ici. On vérifie donc ce qui la neutralise : le `for update` dans les
-- deux fonctions, l'index unique qui refuse un second jeu de scores, et le
-- comportement d'un second envoi (already_completed, aucun score ni notif en plus).
--
-- La réplique locale n'a pas perma_items / lsss_items / notifications : des
-- tables minimales sont créées le temps du test (annulées avec le reste).
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
  co  constant uuid := '00000000-0000-0000-0000-0000000000c1';
  kid constant uuid := '00000000-0000-0000-0000-0000000000d1';
  pe1 uuid := gen_random_uuid(); pe2 uuid := gen_random_uuid();
  ls1 uuid := gen_random_uuid(); ls2 uuid := gen_random_uuid();
  t_perma uuid := gen_random_uuid(); t_lsss uuid := gen_random_uuid(); t_old uuid := gen_random_uuid();
  q_perma uuid; q_lsss uuid; q_old uuid;
  out jsonb; n int; ok boolean;
begin
  -- ── Tables d'items / notifications minimales si absentes ──────────────────
  create table if not exists public.perma_items (id uuid primary key default gen_random_uuid(),
    pillar text not null, lang text not null default 'fr', is_active boolean not null default true);
  create table if not exists public.lsss_items (id uuid primary key default gen_random_uuid(),
    subscale text not null, lang text not null default 'fr', is_active boolean not null default true);
  create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),
    user_id uuid, type text, title text, body text, data jsonb, created_at timestamptz default now());
  update public.perma_items set is_active = false;
  update public.lsss_items set is_active = false;
  insert into public.perma_items (id, pillar) values (pe1, 'P'), (pe2, 'E');
  insert into public.lsss_items (id, subscale) values (ls1, 'TEAM'), (ls2, 'GOALS');

  insert into public.questionnaires (child_id, kind, lang, access_token, token_expires_at, created_by, session_number)
    values (kid, 'PERMA', 'fr', t_perma, now() + interval '7 days', co, 1) returning id into q_perma;
  insert into public.questionnaires (child_id, kind, lang, access_token, token_expires_at, created_by, moment)
    values (kid, 'LSSS', 'fr', t_lsss, now() + interval '7 days', co, 'BASELINE') returning id into q_lsss;
  insert into public.questionnaires (child_id, kind, lang, access_token, token_expires_at, created_by, moment)
    values (kid, 'LSSS', 'fr', t_old, now() + interval '7 days', co, 'FINAL') returning id into q_old;

  -- Appels comme en production : enfant anonyme via le lien.
  set local role anon;

  -- ── Réponse non numérique : erreur métier, pas d'exception ────────────────
  begin
    out := public.questionnaire_submit(t_perma, jsonb_build_object(pe1, 'abc', pe2, 3));
    if out ->> 'error' is distinct from 'incomplete' then
      fails := fails || ('« abc » : attendu incomplete, obtenu ' || out::text);
    end if;
  exception when others then
    fails := fails || ('« abc » lève une exception : ' || sqlerrm);
  end;
  out := public.questionnaire_submit(t_perma, jsonb_build_object(pe1, 6, pe2, 3));
  if out ->> 'error' is distinct from 'incomplete' then fails := fails || ('6 accepté : ' || out::text); end if;

  -- ── PERMA : premier envoi OK, second refusé, scores uniques ───────────────
  out := public.questionnaire_submit(t_perma, jsonb_build_object(pe1, 5, pe2, 1));
  res := res || jsonb_build_object('perma_1', out);
  if (out ->> 'ok') is distinct from 'true' then fails := fails || ('PERMA 1er envoi : ' || out::text); end if;
  out := public.questionnaire_submit(t_perma, jsonb_build_object(pe1, 1, pe2, 1));
  if out ->> 'error' is distinct from 'already_completed' then fails := fails || ('PERMA 2e envoi : ' || out::text); end if;
  reset role;

  select count(*) into n from public.perma_scores where questionnaire_id = q_perma;
  res := res || jsonb_build_object('perma_scores', n);
  if n <> 2 then fails := fails || ('perma_scores : ' || n || ' lignes au lieu de 2'); end if;
  select count(*) into n from public.perma_scores where questionnaire_id = q_perma and pillar = 'P' and value = 100;
  if n <> 1 then fails := fails || 'score P écrasé par le second envoi'::text; end if;
  select count(*) into n from public.notifications where (data ->> 'questionnaire_id')::uuid = q_perma;
  res := res || jsonb_build_object('perma_notifs', n);
  if n <> 2 then fails := fails || ('notifications PERMA : ' || n || ' au lieu de 2 (coach + parent)'); end if;

  -- ── LSSS par questionnaire_submit puis par lsss_submit ────────────────────
  set local role anon;
  out := public.questionnaire_submit(t_lsss, jsonb_build_object(ls1, 4, ls2, '2'));
  if (out ->> 'ok') is distinct from 'true' then fails := fails || ('LSSS 1er envoi : ' || out::text); end if;
  out := public.lsss_submit(t_lsss, jsonb_build_object(ls1, 4, ls2, 2));
  if out ->> 'error' is distinct from 'already_completed' then fails := fails || ('lsss_submit après envoi : ' || out::text); end if;
  begin
    out := public.lsss_submit(t_old, jsonb_build_object(ls1, 'x', ls2, 2));
    if out ->> 'error' is distinct from 'incomplete' then fails := fails || ('lsss_submit « x » : ' || out::text); end if;
  exception when others then
    fails := fails || ('lsss_submit « x » lève une exception : ' || sqlerrm);
  end;
  out := public.lsss_submit(t_old, jsonb_build_object(ls1, 3, ls2, 3.0));
  if (out ->> 'ok') is distinct from 'true' then fails := fails || ('lsss_submit 3.0 refusé : ' || out::text); end if;
  reset role;

  select count(*) into n from public.skill_scores where source = 'QUESTIONNAIRE_LSSS' and source_id = q_lsss;
  res := res || jsonb_build_object('lsss_scores', n);
  if n <> 2 then fails := fails || ('skill_scores LSSS : ' || n || ' lignes au lieu de 2'); end if;

  -- ── Filets : index uniques et verrou ──────────────────────────────────────
  ok := false;
  begin
    insert into public.perma_scores (child_id, questionnaire_id, session_number, pillar, value)
      values (kid, q_perma, 1, 'P', 50);
  exception when unique_violation then ok := true; end;
  if not ok then fails := fails || 'second score PERMA (même pilier) accepté'::text; end if;

  ok := false;
  begin
    insert into public.skill_scores (child_id, skill_key, source, source_id, value)
      values (kid, 'TEAM', 'QUESTIONNAIRE_LSSS', q_lsss, 50);
  exception when unique_violation then ok := true; end;
  if not ok then fails := fails || 'second score LSSS (même sous-échelle) accepté'::text; end if;

  -- Hors LSSS, plusieurs scores par source restent permis (index partiel).
  insert into public.skill_scores (child_id, skill_key, source, source_id, value)
    values (kid, 'TEAM', 'COACH', q_lsss, 10), (kid, 'TEAM', 'COACH', q_lsss, 20);

  if pg_get_functiondef('public.questionnaire_submit(uuid,jsonb)'::regprocedure) !~* 'for update' then
    fails := fails || 'questionnaire_submit sans verrou (for update)'::text;
  end if;
  if pg_get_functiondef('public.lsss_submit(uuid,jsonb)'::regprocedure) !~* 'for update' then
    fails := fails || 'lsss_submit sans verrou (for update)'::text;
  end if;

  if array_length(fails, 1) is null then
    raise exception 'SUBMIT_085_PASSED %', res;
  end if;
  raise exception 'SUBMIT_085_FAILED % %', fails, res;
end
$test$;

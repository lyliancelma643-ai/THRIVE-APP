-- ─────────────────────────────────────────────────────────────────────────────
-- 20260713_047_questionnaire_unique_and_push.sql
-- Correctif « envois multiples » + push téléphone.
--
-- 1) Un seul questionnaire PERMA/EPOCH par (enfant, séance) et un seul LSSS
--    par (enfant, moment) : purge des doublons existants, index uniques
--    partiels, RPC perma_send / lsss_send idempotentes (le 2e appel renvoie
--    l'existant avec already_sent=true au lieu de créer un doublon — c'était
--    la cause des questionnaires en double côté parent et des notifications
--    dupliquées).
-- 2) Web Push : trigger sur public.notifications → net.http_post vers l'edge
--    function send-web-push. La configuration (clés VAPID, secret du trigger,
--    URL des functions) vit dans Vault ; sans secrets le trigger est un no-op
--    et la notification in-app part quand même.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0) pg_net pour les appels HTTP asynchrones depuis le trigger
create extension if not exists pg_net;

-- 1) Purge des doublons PERMA : on garde le « meilleur » par (enfant, séance)
--    (complété de préférence, sinon le plus récent)
with ranked as (
  select id,
         row_number() over (
           partition by child_id, session_number
           order by (status = 'COMPLETED') desc, created_at desc, id
         ) as rn
  from public.questionnaires
  where kind = 'PERMA' and session_number is not null
)
delete from public.questionnaires q
using ranked r
where q.id = r.id and r.rn > 1;

-- Idem LSSS par (enfant, moment)
with ranked as (
  select id,
         row_number() over (
           partition by child_id, moment
           order by (status = 'COMPLETED') desc, created_at desc, id
         ) as rn
  from public.questionnaires
  where kind = 'LSSS' and moment is not null
)
delete from public.questionnaires q
using ranked r
where q.id = r.id and r.rn > 1;

-- Notifications « questionnaire en attente » orphelines (questionnaire purgé)
delete from public.notifications n
where n.type = 'QUESTIONNAIRE_PENDING'
  and (n.data ? 'questionnaire_id')
  and not exists (
    select 1 from public.questionnaires q
    where q.id = (n.data ->> 'questionnaire_id')::uuid
  );

-- 2) Verrous d'unicité (filet de sécurité sous les RPC idempotentes)
create unique index if not exists uq_questionnaires_perma_session
  on public.questionnaires (child_id, session_number)
  where kind = 'PERMA' and session_number is not null;

create unique index if not exists uq_questionnaires_lsss_moment
  on public.questionnaires (child_id, moment)
  where kind = 'LSSS' and moment is not null;

-- 3) perma_send v2 — un seul envoi par séance ; le 2e appel renvoie l'existant
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
  v_existing record;
begin
  if not private.can_edit_child_bilan(p_child) then
    raise exception 'not authorized';
  end if;
  if p_session is null or p_session < 1 or p_session > 13 then
    raise exception 'invalid session number';
  end if;

  -- Déjà envoyé pour cette séance → on renvoie l'existant, sans doublon
  select id, status, access_token into v_existing
  from public.questionnaires
  where child_id = p_child and kind = 'PERMA' and session_number = p_session
  order by created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'already_sent', true,
      'status', v_existing.status,
      'questionnaire_id', v_existing.id,
      'token', v_existing.access_token,
      'path', case when v_existing.access_token is not null
                   then '/q/' || v_existing.access_token end);
  end if;

  select first_name into v_name from public.children where id = p_child;

  if v_lang = 'en' then
    v_title := 'Well-being check-in (EPOCH) — Session ' || p_session;
    v_desc  := 'Answer thinking about today''s session. There are no right or wrong answers.';
  else
    v_title := 'Météo du bien-être (EPOCH) — Séance ' || p_session;
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
           then 'A quick EPOCH check-in is waiting for ' || coalesce(v_name,'your child') || ' (session ' || p_session || ').'
           else 'Une courte météo du bien-être attend ' || coalesce(v_name,'votre enfant') || ' (séance ' || p_session || ').' end,
      jsonb_build_object('questionnaire_id', v_qid, 'child_id', p_child,
                         'kind','PERMA','session_number', p_session, 'token', v_token, 'path', '/q/' || v_token));
  end loop;

  return jsonb_build_object('already_sent', false, 'questionnaire_id', v_qid,
                            'token', v_token, 'path', '/q/' || v_token);
exception when unique_violation then
  -- Deux clics simultanés : l'index partiel a tranché, on renvoie l'existant
  select id, status, access_token into v_existing
  from public.questionnaires
  where child_id = p_child and kind = 'PERMA' and session_number = p_session
  limit 1;
  return jsonb_build_object('already_sent', true, 'status', v_existing.status,
    'questionnaire_id', v_existing.id, 'token', v_existing.access_token,
    'path', case when v_existing.access_token is not null
                 then '/q/' || v_existing.access_token end);
end $$;

-- 4) lsss_send v2 — même verrou par (enfant, moment)
create or replace function public.lsss_send(p_child uuid, p_moment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_token uuid := gen_random_uuid();
  v_qid   uuid;
  v_title text;
  v_parent uuid;
  v_existing record;
begin
  if not private.can_edit_child_bilan(p_child) then
    raise exception 'not authorized';
  end if;
  if p_moment not in ('BASELINE','MID','FINAL') then
    raise exception 'invalid moment';
  end if;

  select id, status, access_token into v_existing
  from public.questionnaires
  where child_id = p_child and kind = 'LSSS' and moment = p_moment
  order by created_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'already_sent', true,
      'status', v_existing.status,
      'questionnaire_id', v_existing.id,
      'token', v_existing.access_token,
      'path', case when v_existing.access_token is not null
                   then '/q/' || v_existing.access_token end);
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

  return jsonb_build_object('already_sent', false, 'questionnaire_id', v_qid,
                            'token', v_token, 'path', '/q/' || v_token);
exception when unique_violation then
  select id, status, access_token into v_existing
  from public.questionnaires
  where child_id = p_child and kind = 'LSSS' and moment = p_moment
  limit 1;
  return jsonb_build_object('already_sent', true, 'status', v_existing.status,
    'questionnaire_id', v_existing.id, 'token', v_existing.access_token,
    'path', case when v_existing.access_token is not null
                 then '/q/' || v_existing.access_token end);
end $$;

-- 5) Config push lue par l'edge function send-web-push (service_role uniquement)
create or replace function public.push_config()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
       <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select jsonb_object_agg(name, decrypted_secret) into v
  from vault.decrypted_secrets
  where name in ('vapid_public_key','vapid_private_key','vapid_subject','push_trigger_secret');
  return coalesce(v, '{}'::jsonb);
end $$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- Clé VAPID publique (non sensible) pour l'abonnement côté client
create or replace function public.vapid_public_key()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key';
$$;
revoke all on function public.vapid_public_key() from public;
grant execute on function public.vapid_public_key() to anon, authenticated;

-- 6) Trigger : chaque notification in-app part aussi en Web Push (asynchrone).
--    Sans secrets Vault → no-op silencieux ; l'échec du push ne bloque jamais
--    l'insertion de la notification.
create or replace function private.notify_send_web_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_functions_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'push_trigger_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url || '/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'title', new.title,
      'body', new.body,
      'data', jsonb_build_object('url', coalesce(new.data ->> 'path', '/'))),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_notifications_web_push on public.notifications;
create trigger trg_notifications_web_push
  after insert on public.notifications
  for each row execute function private.notify_send_web_push();

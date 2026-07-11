-- ─────────────────────────────────────────────────────────────────────────────
-- 20260711_043_epoch_items.sql
-- Remplace les 5 items PERMA « maison » (migration 042) par l'instrument VALIDÉ :
-- EPOCH Measure of Adolescent Well-Being (Kern, Benson, Steinberg & Steinberg,
-- 2016, Psychological Assessment). 20 items officiels, 5 sous-échelles × 4 items,
-- échelle 1–5 (Presque jamais → Presque toujours), score = moyenne par sous-échelle.
-- Source : www.peggykern.org (Table 2, mesure finale à 20 items).
--
-- NB : le sous-système « questionnaire de bien-être » garde son nommage technique
-- perma_* (kind='PERMA', perma_items, perma_scores, perma_send/progression) pour
-- éviter une refonte risquée ; le CONTENU et les libellés affichés sont EPOCH.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Élargir le CHECK des piliers aux 5 dimensions EPOCH
alter table public.perma_items drop constraint if exists perma_items_pillar_check;
alter table public.perma_items
  add constraint perma_items_pillar_check
  check (pillar in ('engagement','perseverance','optimism','connectedness','happiness'));

-- 2) Repartir d'une base propre (données de test uniquement à ce stade)
delete from public.questionnaires where kind = 'PERMA';  -- cascade → perma_scores
delete from public.perma_items;

-- 3) Seed EPOCH — 20 items × FR/EN (libellés officiels EN, traduction FR fidèle)
insert into public.perma_items (pillar, pillar_label, local_number, prompt, lang, sort_order)
values
  -- ── Engagement ──
  ('engagement','Engagement',1,'Quand je fais une activité, je l''apprécie tellement que je perds la notion du temps.','fr',1),
  ('engagement','Engagement',2,'Je suis complètement absorbé·e par ce que je fais.','fr',2),
  ('engagement','Engagement',3,'Je m''implique tellement dans mes activités que j''oublie tout le reste.','fr',3),
  ('engagement','Engagement',4,'Quand j''apprends quelque chose de nouveau, je perds la notion du temps.','fr',4),
  ('engagement','Engagement',1,'When I do an activity, I enjoy it so much that I lose track of time.','en',1),
  ('engagement','Engagement',2,'I get completely absorbed in what I am doing.','en',2),
  ('engagement','Engagement',3,'I get so involved in activities that I forget about everything else.','en',3),
  ('engagement','Engagement',4,'When I am learning something new, I lose track of how much time has passed.','en',4),
  -- ── Persévérance ──
  ('perseverance','Persévérance',1,'Je termine tout ce que je commence.','fr',5),
  ('perseverance','Persévérance',2,'Je persévère dans mon travail scolaire jusqu''à ce qu''il soit terminé.','fr',6),
  ('perseverance','Persévérance',3,'Une fois que j''ai fait un plan pour accomplir quelque chose, je m''y tiens.','fr',7),
  ('perseverance','Persévérance',4,'Je suis quelqu''un qui travaille dur.','fr',8),
  ('perseverance','Perseverance',1,'I finish whatever I begin.','en',5),
  ('perseverance','Perseverance',2,'I keep at my schoolwork until I am done with it.','en',6),
  ('perseverance','Perseverance',3,'Once I make a plan to get something done, I stick to it.','en',7),
  ('perseverance','Perseverance',4,'I am a hard worker.','en',8),
  -- ── Optimisme ──
  ('optimism','Optimisme',1,'Je suis optimiste quant à mon avenir.','fr',9),
  ('optimism','Optimisme',2,'Dans les moments incertains, je m''attends au meilleur.','fr',10),
  ('optimism','Optimisme',3,'Je pense que de bonnes choses vont m''arriver.','fr',11),
  ('optimism','Optimisme',4,'Je crois que les choses vont s''arranger, même quand elles semblent difficiles.','fr',12),
  ('optimism','Optimism',1,'I am optimistic about my future.','en',9),
  ('optimism','Optimism',2,'In uncertain times, I expect the best.','en',10),
  ('optimism','Optimism',3,'I think good things are going to happen to me.','en',11),
  ('optimism','Optimism',4,'I believe that things will work out, no matter how difficult they seem.','en',12),
  -- ── Connexion aux autres ──
  ('connectedness','Connexion aux autres',1,'Quand quelque chose de bien m''arrive, j''ai des personnes avec qui j''aime partager la bonne nouvelle.','fr',13),
  ('connectedness','Connexion aux autres',2,'Quand j''ai un problème, j''ai quelqu''un qui sera là pour moi.','fr',14),
  ('connectedness','Connexion aux autres',3,'Il y a des personnes dans ma vie qui tiennent vraiment à moi.','fr',15),
  ('connectedness','Connexion aux autres',4,'J''ai des amis auxquels je tiens vraiment.','fr',16),
  ('connectedness','Connectedness',1,'When something good happens to me, I have people who I like to share the good news with.','en',13),
  ('connectedness','Connectedness',2,'When I have a problem, I have someone who will be there for me.','en',14),
  ('connectedness','Connectedness',3,'There are people in my life who really care about me.','en',15),
  ('connectedness','Connectedness',4,'I have friends that I really care about.','en',16),
  -- ── Bonheur ──
  ('happiness','Bonheur',1,'Je me sens heureux·se.','fr',17),
  ('happiness','Bonheur',2,'Je m''amuse beaucoup.','fr',18),
  ('happiness','Bonheur',3,'J''aime la vie.','fr',19),
  ('happiness','Bonheur',4,'Je suis quelqu''un de joyeux·se.','fr',20),
  ('happiness','Happiness',1,'I feel happy.','en',17),
  ('happiness','Happiness',2,'I have a lot of fun.','en',18),
  ('happiness','Happiness',3,'I love life.','en',19),
  ('happiness','Happiness',4,'I am a cheerful person.','en',20);

-- 4) perma_send : titre + consigne alignés EPOCH (bien-être général, pas « la séance »)
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
    v_title := 'Well-being survey (EPOCH) — Session ' || p_session;
    v_desc  := 'A short survey about you. For each sentence, show how much it describes you. Be honest — there are no right or wrong answers!';
  else
    v_title := 'Questionnaire bien-être (EPOCH) — Séance ' || p_session;
    v_desc  := 'Un petit questionnaire sur toi. Pour chaque phrase, indique à quel point c''est vrai pour toi. Sois honnête, il n''y a pas de bonne ou de mauvaise réponse !';
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
      case when v_lang='en' then 'Well-being survey to complete' else 'Questionnaire bien-être à compléter' end,
      case when v_lang='en'
           then 'A short EPOCH well-being survey is waiting for ' || coalesce(v_name,'your child') || ' (session ' || p_session || ').'
           else 'Un court questionnaire de bien-être EPOCH attend ' || coalesce(v_name,'votre enfant') || ' (séance ' || p_session || ').' end,
      jsonb_build_object('questionnaire_id', v_qid, 'child_id', p_child,
                         'kind','PERMA','session_number', p_session, 'token', v_token, 'path', '/q/' || v_token));
  end loop;

  return jsonb_build_object('questionnaire_id', v_qid, 'token', v_token, 'path', '/q/' || v_token);
end $$;

grant execute on function public.perma_send(uuid, int, text) to authenticated;

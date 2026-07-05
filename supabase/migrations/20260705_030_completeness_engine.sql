-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — Partie 4 : système de vérification & d'alerte.
--   dossier_completeness(child) : checklist normalisée + % de complétion
--   list_dossiers()             : tableau de suivi filtré par rôle (coach/admin/
--                                 super admin), source unique du % pour tous les UI
--   notify_incomplete_dossiers(): rappels (in-app) au coach + admin superviseur
--                                 pour tout dossier incomplet depuis > N jours
-- Choix de design (documenté) : 13 items « socle » toujours requis ; le
-- certificat devient requis uniquement une fois les 13 séances complétées.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Complétude d'un dossier (jsonb : pct, done, total, missing[], items[])
create or replace function public.dossier_completeness(p_child uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  ai        public.athlete_identity%rowtype;
  n_obj     int;
  n_next    int;
  has_contract boolean;
  has_letter_doc boolean;
  has_cert  boolean;
  lsss_base boolean;
  sess_done int;
  sess_tot  int;
  items     jsonb := '[]'::jsonb;
  toolbox_n int := 0;
  done      int;
  total     int;
  missing   jsonb := '[]'::jsonb;
  it        jsonb;
begin
  if not private.can_view_child_bilan(p_child) then
    raise exception 'not authorized';
  end if;

  select * into ai from public.athlete_identity where child_id = p_child;
  select count(*) into n_obj  from public.athlete_objectives where child_id = p_child;
  select count(*) into n_next from public.athlete_next_steps where child_id = p_child;
  select exists(select 1 from public.athlete_documents where child_id=p_child and kind='CONTRACT')  into has_contract;
  select exists(select 1 from public.athlete_documents where child_id=p_child and kind='LETTER')    into has_letter_doc;
  select exists(select 1 from public.athlete_documents where child_id=p_child and kind='CERTIFICATE') into has_cert;
  select exists(select 1 from public.questionnaires where child_id=p_child and kind='LSSS'
                and moment='BASELINE' and status='COMPLETED') into lsss_base;
  select count(*) filter (where status='COMPLETED'), count(*)
    into sess_done, sess_tot from public.sessions where child_id = p_child;

  if ai.toolbox is not null and jsonb_typeof(ai.toolbox) = 'array' then
    toolbox_n := jsonb_array_length(ai.toolbox);
  end if;

  -- helper local : ajoute un item {key,label,ok}
  -- (construit progressivement le tableau)
  items := items
    || jsonb_build_object('key','sport','label','Sport renseigné','ok', coalesce(ai.sport,'')<>'')
    || jsonb_build_object('key','position','label','Poste / position','ok', coalesce(ai.position,'')<>'')
    || jsonb_build_object('key','strengths','label','≥ 1 force identifiée','ok', coalesce(array_length(ai.strengths,1),0) >= 1)
    || jsonb_build_object('key','sport_story','label','Histoire sportive','ok', coalesce(ai.sport_story,'')<>'')
    || jsonb_build_object('key','season_dream','label','Rêve de saison','ok', coalesce(ai.season_dream,'')<>'')
    || jsonb_build_object('key','objectives','label','≥ 1 objectif SMART','ok', n_obj >= 1 or coalesce(ai.smart_goal,'')<>'')
    || jsonb_build_object('key','life_skill','label','Objectif compétence de vie','ok', coalesce(ai.life_skill_goal,'')<>'' or exists(select 1 from public.athlete_objectives where child_id=p_child and kind='LIFE_SKILL'))
    || jsonb_build_object('key','focus_word','label','Focus word','ok', coalesce(ai.focus_word,'')<>'')
    || jsonb_build_object('key','toolbox','label','≥ 1 outil dans la boîte','ok', toolbox_n >= 1)
    || jsonb_build_object('key','contract','label','Contrat de confiance (PDF)','ok', has_contract)
    || jsonb_build_object('key','letter','label','Lettre à moi-même','ok', has_letter_doc or coalesce(ai.letter,'')<>'')
    || jsonb_build_object('key','lsss_baseline','label','LSSS de départ complété','ok', lsss_base)
    || jsonb_build_object('key','next_steps','label','≥ 1 prochaine étape','ok', n_next >= 1);

  -- Certificat : requis seulement quand le parcours est terminé (13/13)
  if sess_tot > 0 and sess_done >= sess_tot then
    items := items || jsonb_build_object('key','certificate','label','Certificat THRIVE','ok', has_cert);
  end if;

  total := jsonb_array_length(items);
  done  := 0;
  for it in select * from jsonb_array_elements(items) loop
    if (it->>'ok')::boolean then
      done := done + 1;
    else
      missing := missing || to_jsonb(it->>'label');
    end if;
  end loop;

  return jsonb_build_object(
    'pct', case when total = 0 then 0 else round(done::numeric / total * 100) end,
    'done', done, 'total', total,
    'sessions_completed', sess_done, 'total_sessions', sess_tot,
    'missing', missing, 'items', items
  );
end $$;
grant execute on function public.dossier_completeness(uuid) to authenticated;

-- 2) Tableau de suivi filtré par rôle
create or replace function public.list_dossiers()
returns table (
  child_id uuid, first_name text, last_name text,
  coach_id uuid, coach_name text, admin_id uuid, admin_name text,
  pct int, missing_count int, sessions_completed int, total_sessions int,
  pending_lsss boolean, updated_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
  with visible as (
    select c.id
    from public.children c
    where c.is_active and (
      private.is_super_admin()
      or exists (
        select 1 from public.admin_coach_supervision s
        join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active
        where s.admin_id = auth.uid() and s.is_active and ca.child_id = c.id)
      or exists (
        select 1 from public.coach_assignments ca
        where ca.child_id = c.id and ca.coach_id = auth.uid() and ca.is_active)
    )
  )
  select
    c.id, c.first_name, c.last_name,
    ca.coach_id,
    nullif(trim(coalesce(cp.first_name,'') || ' ' || coalesce(cp.last_name,'')), '') as coach_name,
    sup.admin_id,
    nullif(trim(coalesce(ap.first_name,'') || ' ' || coalesce(ap.last_name,'')), '') as admin_name,
    (dc.dc->>'pct')::int,
    jsonb_array_length(dc.dc->'missing'),
    (dc.dc->>'sessions_completed')::int,
    (dc.dc->>'total_sessions')::int,
    coalesce(pend.pending, false),
    ai.updated_at
  from visible v
  join public.children c on c.id = v.id
  left join lateral (
    select coach_id from public.coach_assignments
    where child_id = c.id and is_active order by created_at desc limit 1
  ) ca on true
  left join public.profiles cp on cp.id = ca.coach_id
  left join lateral (
    select admin_id from public.admin_coach_supervision
    where coach_id = ca.coach_id and is_active order by created_at asc limit 1
  ) sup on true
  left join public.profiles ap on ap.id = sup.admin_id
  left join public.athlete_identity ai on ai.child_id = c.id
  left join lateral (
    select exists (
      select 1 from public.questionnaires
      where child_id = c.id and kind = 'LSSS' and status in ('PENDING','IN_PROGRESS')
    ) as pending
  ) pend on true
  cross join lateral (select public.dossier_completeness(c.id) as dc) dc
  order by (dc.dc->>'pct')::int asc, c.first_name;
end $$;
grant execute on function public.list_dossiers() to authenticated;

-- 3) Rappels de dossiers incomplets (in-app) — throttle 7 jours
create table if not exists public.dossier_reminders (
  child_id     uuid primary key references public.children(id) on delete cascade,
  last_sent_at timestamptz not null default now(),
  last_pct     int
);

create or replace function public.notify_incomplete_dossiers(p_days int default 7)
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_pct int;
  v_started timestamptz;
  v_count int := 0;
  v_scope text;  -- 'all' (super/cron) | 'admin' | user id restreint
begin
  -- Portée selon l'appelant
  if auth.uid() is null or private.is_super_admin() then
    v_scope := 'all';
  elsif private.is_admin() then
    v_scope := 'admin';
  else
    raise exception 'not authorized';
  end if;

  for r in
    select c.id as child_id
    from public.children c
    where c.is_active
      and (
        v_scope = 'all'
        or exists (
          select 1 from public.admin_coach_supervision s
          join public.coach_assignments ca on ca.coach_id = s.coach_id and ca.is_active
          where s.admin_id = auth.uid() and s.is_active and ca.child_id = c.id)
      )
  loop
    -- Programme démarré depuis > N jours ?
    select min(created_at) into v_started from public.sessions where child_id = r.child_id;
    if v_started is null or v_started > now() - make_interval(days => p_days) then
      continue;
    end if;

    v_pct := (public.dossier_completeness(r.child_id)->>'pct')::int;
    if v_pct >= 100 then continue; end if;

    -- Throttle : pas de rappel si déjà notifié dans les 7 derniers jours
    if exists (select 1 from public.dossier_reminders dr
               where dr.child_id = r.child_id and dr.last_sent_at > now() - interval '7 days') then
      continue;
    end if;

    -- Notifie le coach assigné
    insert into public.notifications (user_id, type, title, body, data)
    select ca.coach_id, 'DOSSIER_INCOMPLET', 'Dossier à compléter',
           'Le dossier de ' || c.first_name || ' est complété à ' || v_pct || '%.',
           jsonb_build_object('child_id', r.child_id, 'pct', v_pct)
    from public.coach_assignments ca
    join public.children c on c.id = ca.child_id
    where ca.child_id = r.child_id and ca.is_active;

    -- Notifie l'admin superviseur du coach
    insert into public.notifications (user_id, type, title, body, data)
    select distinct s.admin_id, 'DOSSIER_INCOMPLET', 'Dossier coach incomplet',
           'Le dossier de ' || c.first_name || ' (coach ' || coalesce(cp.first_name,'') || ') est à ' || v_pct || '%.',
           jsonb_build_object('child_id', r.child_id, 'pct', v_pct)
    from public.coach_assignments ca
    join public.admin_coach_supervision s on s.coach_id = ca.coach_id and s.is_active
    join public.children c on c.id = ca.child_id
    left join public.profiles cp on cp.id = ca.coach_id
    where ca.child_id = r.child_id and ca.is_active;

    insert into public.dossier_reminders (child_id, last_sent_at, last_pct)
    values (r.child_id, now(), v_pct)
    on conflict (child_id) do update set last_sent_at = now(), last_pct = excluded.last_pct;

    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;
grant execute on function public.notify_incomplete_dossiers(int) to authenticated;

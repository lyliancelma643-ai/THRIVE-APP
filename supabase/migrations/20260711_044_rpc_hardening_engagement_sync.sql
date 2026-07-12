-- 20260711_044_rpc_hardening_engagement_sync.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- A) RAPATRIEMENT (dérive repo ↔ prod) : les 7 fonctions du moteur
--    d'engagement (streaks familiaux, révélation bilan, moments Thrive,
--    fenêtre de renouvellement) avaient été créées directement en prod le
--    2026-07-08 ; la 037b avait synchronisé les TABLES mais pas les FONCTIONS
--    ni les TRIGGERS. Ce fichier rétablit la parité complète (définitions
--    extraites de la prod le 2026-07-11 via pg_get_functiondef).
-- B) DURCISSEMENT : ces fonctions ayant été créées hors migration, elles ont
--    hérité du grant EXECUTE implicite à PUBLIC → exécutables par `anon` via
--    /rest/v1/rpc (advisors 0028). REVOKE ciblés + fin du grant implicite pour
--    les futures fonctions. Les 4 RPC tokenisées (lsss_get/submit,
--    questionnaire_get/submit) restent VOLONTAIREMENT ouvertes à anon
--    (lien enfant par token, garde dans le corps).
-- Idempotent : rejouable sans effet de bord.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── A.1) Validation de la semaine d'engagement famille (streak + jokers) ──
CREATE OR REPLACE FUNCTION public.evaluate_family_week(p_family uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week date := date_trunc('week', now())::date;
  v_has_seen boolean;
  v_has_run boolean;
  v_row public.family_streaks%rowtype;
  v_parent uuid;
  v_gap integer;
  v_new_weeks integer;
  v_jokers integer;
begin
  select exists (
    select 1 from public.parent_reports pr
    join public.children c on c.id = pr.child_id
    where c.family_id = p_family
      and pr.seen_at >= v_week and pr.seen_at < v_week + 7
  ) into v_has_seen;

  select exists (
    select 1 from public.video_session_runs r
    join public.children c on c.id = r.child_id
    where c.family_id = p_family
      and r.completed_at >= v_week and r.completed_at < v_week + 7
  ) into v_has_run;

  if not (v_has_seen and v_has_run) then
    return;
  end if;

  insert into public.family_streaks (family_id) values (p_family)
  on conflict (family_id) do nothing;

  select * into v_row from public.family_streaks where family_id = p_family for update;

  if v_row.last_validated_week = v_week then
    return; -- semaine déjà validée
  end if;

  v_jokers := v_row.jokers_remaining;

  if v_row.last_validated_week is null then
    v_new_weeks := 1;
  else
    v_gap := (v_week - v_row.last_validated_week) / 7;
    if v_gap = 1 then
      v_new_weeks := v_row.current_weeks + 1;
    elsif v_gap = 2 and v_jokers > 0 then
      v_jokers := v_jokers - 1; -- joker consommé : la semaine manquée est pardonnée
      v_new_weeks := v_row.current_weeks + 1;
    else
      v_new_weeks := 1;
    end if;
  end if;

  update public.family_streaks set
    current_weeks = v_new_weeks,
    longest_weeks = greatest(longest_weeks, v_new_weeks),
    jokers_remaining = v_jokers,
    last_validated_week = v_week,
    updated_at = now()
  where family_id = p_family;

  select parent_id into v_parent from public.families where id = p_family;
  if v_parent is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_parent,
      'PROGRESS_UPDATE',
      'Semaine validée ✔ ' || v_new_weeks || ' semaine' || case when v_new_weeks > 1 then 's' else '' end || ' au rendez-vous',
      'Bilan lu et séance faite ensemble. Votre présence construit sa confiance.',
      jsonb_build_object('subtype', 'streak', 'family_id', p_family,
                         'current_weeks', v_new_weeks, 'jokers_remaining', v_jokers)
    );
  end if;
end;
$function$;

-- ── A.2) Notification « bilan prêt » à la création d'un parent_report ──
CREATE OR REPLACE FUNCTION public.notify_on_parent_report_reveal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent uuid;
  v_first_name text;
begin
  select f.parent_id, c.first_name
    into v_parent, v_first_name
  from public.children c
  join public.families f on f.id = c.family_id
  where c.id = new.child_id;

  if v_parent is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_parent,
      'REPORT_READY',
      '🎁 Le coach a noté quelque chose sur ' || coalesce(v_first_name, 'votre enfant') || '…',
      'Le bilan de la séance est prêt. 2 minutes pour le découvrir.',
      jsonb_build_object(
        'subtype', 'report_reveal',
        'parent_report_id', new.id,
        'child_id', new.child_id
      )
    );
  end if;
  return new;
end;
$function$;

-- ── A.3) Notifications de jalons de parcours (séances 1 / 7 / 13) ──
CREATE OR REPLACE FUNCTION public.notify_on_session_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent uuid;
  v_first_name text;
  v_title text;
  v_body text;
begin
  if new.status = 'COMPLETED'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.session_number in (1, 7, 13) then

    select f.parent_id, c.first_name
      into v_parent, v_first_name
    from public.children c
    join public.families f on f.id = c.family_id
    where c.id = new.child_id;

    if v_parent is null then return new; end if;
    v_first_name := coalesce(v_first_name, 'votre enfant');

    if new.session_number = 1 then
      v_title := 'Point de départ établi pour ' || v_first_name;
      v_body  := 'Séance 1 complétée. Sa progression sera mesurée à partir d''ici — chaque semaine comptera.';
    elsif new.session_number = 7 then
      v_title := 'Mi-parcours : la progression de ' || v_first_name || ' en chiffres';
      v_body  := 'Séance 7 complétée. Consultez sa jauge de progression et le bilan mi-parcours.';
    else
      v_title := '🏆 Parcours complété — 13 séances';
      v_body  := v_first_name || ' a complété la méthode Thrive. Le rapport final arrive, avec sa progression mesurée depuis la séance 1.';
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_parent,
      'PROGRESS_UPDATE',
      v_title,
      v_body,
      jsonb_build_object(
        'subtype', 'milestone',
        'session_number', new.session_number,
        'child_id', new.child_id,
        'gauge', public.gauge_progress(new.child_id)
      )
    );
  end if;
  return new;
end;
$function$;

-- ── A.4) Notification « Moment Thrive » ──
CREATE OR REPLACE FUNCTION public.notify_on_thrive_moment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent uuid;
  v_first_name text;
begin
  select f.parent_id, c.first_name
    into v_parent, v_first_name
  from public.children c
  join public.families f on f.id = c.family_id
  where c.id = new.child_id;

  if v_parent is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_parent,
      'PROGRESS_UPDATE',
      '✨ Un Moment Thrive ajouté à l''album de ' || coalesce(v_first_name, 'votre enfant'),
      'Le coach a immortalisé un moment fort de la séance. Venez le découvrir.',
      jsonb_build_object('subtype', 'thrive_moment', 'moment_id', new.id, 'child_id', new.child_id)
    );
  end if;
  return new;
end;
$function$;

-- ── A.5) Bilan lu par le parent → réévaluation de la semaine ──
CREATE OR REPLACE FUNCTION public.on_parent_report_seen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_family uuid;
begin
  if new.seen_at is not null and (tg_op = 'INSERT' or old.seen_at is distinct from new.seen_at) then
    select family_id into v_family from public.children where id = new.child_id;
    if v_family is not null then
      perform public.evaluate_family_week(v_family);
    end if;
  end if;
  return new;
end;
$function$;

-- ── A.6) Séance vidéo complétée → réévaluation de la semaine ──
CREATE OR REPLACE FUNCTION public.on_video_run_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_family uuid;
begin
  if new.completed_at is not null and (tg_op = 'INSERT' or old.completed_at is distinct from new.completed_at) then
    select family_id into v_family from public.children where id = new.child_id;
    if v_family is not null then
      perform public.evaluate_family_week(v_family);
    end if;
  end if;
  return new;
end;
$function$;

-- ── A.7) Séance 7 complétée → fenêtre de renouvellement prioritaire 48 h ──
CREATE OR REPLACE FUNCTION public.open_renewal_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_family uuid;
  v_parent uuid;
  v_first_name text;
begin
  if new.status = 'COMPLETED'
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and new.session_number = 7 then

    select c.family_id, f.parent_id, c.first_name
      into v_family, v_parent, v_first_name
    from public.children c
    join public.families f on f.id = c.family_id
    where c.id = new.child_id;

    if v_family is null then return new; end if;

    insert into public.family_status (family_id, renewal_window_opens_at, renewal_window_expires_at)
    values (v_family, now(), now() + interval '48 hours')
    on conflict (family_id) do update set
      renewal_window_opens_at = excluded.renewal_window_opens_at,
      renewal_window_expires_at = excluded.renewal_window_expires_at,
      updated_at = now();

    if v_parent is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        v_parent,
        'PROGRAM_UPDATED',
        '⏳ Votre accès prioritaire est ouvert — 48 h',
        'Séance 7 complétée. La place de ' || coalesce(v_first_name, 'votre enfant') ||
        ' pour le prochain cycle vous est réservée en priorité pendant 48 heures (20 places par cycle).',
        jsonb_build_object(
          'subtype', 'renewal_window',
          'family_id', v_family,
          'expires_at', (now() + interval '48 hours')
        )
      );
    end if;
  end if;
  return new;
end;
$function$;

-- ── A.8) Triggers (drop + create : idempotent, définitions prod) ──
drop trigger if exists on_parent_report_reveal on public.parent_reports;
create trigger on_parent_report_reveal
  after insert on public.parent_reports
  for each row execute function public.notify_on_parent_report_reveal();

drop trigger if exists on_parent_report_seen_streak on public.parent_reports;
create trigger on_parent_report_seen_streak
  after insert or update of seen_at on public.parent_reports
  for each row execute function public.on_parent_report_seen();

drop trigger if exists on_session7_renewal_window on public.sessions;
create trigger on_session7_renewal_window
  after insert or update of status on public.sessions
  for each row execute function public.open_renewal_window();

drop trigger if exists on_session_milestone on public.sessions;
create trigger on_session_milestone
  after insert or update of status on public.sessions
  for each row execute function public.notify_on_session_milestone();

drop trigger if exists on_thrive_moment_created on public.thrive_moments;
create trigger on_thrive_moment_created
  after insert on public.thrive_moments
  for each row execute function public.notify_on_thrive_moment();

drop trigger if exists on_video_run_completed_streak on public.video_session_runs;
create trigger on_video_run_completed_streak
  after insert or update of completed_at on public.video_session_runs
  for each row execute function public.on_video_run_completed();

-- ── B.1) Fonctions trigger : jamais appelables via /rest/v1/rpc ──
-- (créées hors migration → grant PUBLIC implicite hérité par anon/authenticated)
revoke execute on function public.notify_on_parent_report_reveal() from public, anon, authenticated;
revoke execute on function public.notify_on_session_milestone()    from public, anon, authenticated;
revoke execute on function public.notify_on_thrive_moment()        from public, anon, authenticated;
revoke execute on function public.on_parent_report_seen()          from public, anon, authenticated;
revoke execute on function public.on_video_run_completed()         from public, anon, authenticated;
revoke execute on function public.open_renewal_window()            from public, anon, authenticated;

-- ── B.2) evaluate_family_week : usage interne aux triggers uniquement ──
-- (le front ne l'appelle jamais ; pas de garde interne → aucune raison de
-- l'exposer, même aux connectés)
revoke execute on function public.evaluate_family_week(uuid) from public, anon, authenticated;

-- ── B.3) RPC PERMA : gardées en interne (can_view/can_edit_child_bilan)
-- mais réservées aux connectés — retrait du grant PUBLIC/anon hérité.
revoke execute on function public.perma_progression(uuid)          from public, anon;
revoke execute on function public.perma_send(uuid, int, text)      from public, anon;
grant  execute on function public.perma_progression(uuid)          to authenticated;
grant  execute on function public.perma_send(uuid, int, text)      to authenticated;

-- ── C) Fin du grant EXECUTE implicite : toute future fonction devra granter
-- explicitement ses appelants (le style maison le fait déjà partout).
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- ── D) Documentation : table verrouillée par défaut (advisor 0008) ──
comment on table public.dossier_reminders is
  'Écrite/lue uniquement via service_role (edge functions / jobs) — RLS activée sans policy = verrouillée par défaut, volontaire.';

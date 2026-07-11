-- 20260710_039_pack_rls.sql
-- La matrice de droits appliquée en base : la RLS est la dernière ligne de
-- défense, l'UI ne fait que refléter. Modèle : on ne touche QUE la branche
-- PARENT des policies (pattern CASE) — coach/admin strictement inchangés.
--
-- Rollback (down) : les quals d'origine sont rappelés en commentaire au-dessus
-- de chaque policy recréée ; drop des helpers private.*, du RPC session_report,
-- des triggers de quota ; gauge_summary/lsss_progression : redéfinitions
-- d'origine dans les migrations 021 et 029.

-- ── A) Helpers pack (modèle : helpers RBAC de la migration 025) ──────────────

create or replace function private.family_pack_of(p_family uuid)
returns text language sql stable security definer set search_path = 'public'
as $$ select f.pack from public.families f where f.id = p_family; $$;

create or replace function private.family_pack(p_child uuid)
returns text language sql stable security definer set search_path = 'public'
as $$
  select f.pack from public.families f
  join public.children c on c.family_id = f.id
  where c.id = p_child;
$$;

-- Le forfait de la famille de l'enfant ouvre-t-il cette feature ?
create or replace function private.pack_feature(p_child uuid, p_feature text)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select coalesce((p.features ->> p_feature)::boolean, false)
  from public.plans p
  where p.code = private.family_pack(p_child);
$$;

create or replace function private.pack_detail_level(p_child uuid)
returns int language sql stable security definer set search_path = 'public'
as $$
  select coalesce((p.limits ->> 'detailLevel')::int, 1)
  from public.plans p
  where p.code = private.family_pack(p_child);
$$;

-- Bilan détaillé visible pour cette séance ?
-- limits.detailedBilanSessions : null = toutes, [] = aucune, [3,7,13] = étapes.
create or replace function private.can_see_detailed_bilan(p_child uuid, p_session_number int)
returns boolean language sql stable security definer set search_path = 'public'
as $$
  select coalesce((
    select case
      when not coalesce((p.features ->> 'detailedBilan')::boolean, false) then false
      when p.limits -> 'detailedBilanSessions' = 'null'::jsonb then true
      else exists (
        select 1 from jsonb_array_elements_text(p.limits -> 'detailedBilanSessions') s
        where s::int = p_session_number
      )
    end
    from public.plans p
    where p.code = private.family_pack(p_child)
  ), false);
$$;

-- ── B) RPC analytics : jauge globale pour tous, détail selon le pack ─────────

-- gauge_summary était SECURITY INVOKER (lisait skill_scores sous la RLS de
-- l'appelant) et exposait by_skill à tous les packs. Passée en DEFINER avec
-- contrôle d'accès interne : `global` reste servi à tous les packs (socle),
-- `by_skill` est réservé à skillBreakdown (Avancé+) pour les parents.
create or replace function public.gauge_summary(p_child_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when not private.can_view_child_bilan(p_child_id) then
      jsonb_build_object('global', 0, 'sample_size', 0, 'by_skill', '{}'::jsonb)
    else (
      select jsonb_build_object(
        'global',      coalesce(round(avg(value))::int, 0),
        'sample_size', count(*),
        'by_skill',
          case
            when private.jwt_role() = 'PARENT'
                 and not private.pack_feature(p_child_id, 'skillBreakdown')
            then '{}'::jsonb
            else coalesce((
              select jsonb_object_agg(skill_key, avg_val)
              from (
                select skill_key, round(avg(value))::int as avg_val
                from public.skill_scores
                where child_id = p_child_id
                group by skill_key
              ) s
            ), '{}'::jsonb)
          end
      )
      from public.skill_scores
      where child_id = p_child_id
    )
  end;
$$;

revoke execute on function public.gauge_summary(uuid) from anon, public;
grant execute on function public.gauge_summary(uuid) to authenticated;

-- Courbe LSSS : réservée à lsssCurve (Avancé+) pour les parents.
create or replace function public.lsss_progression(p_child uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  if not private.can_view_child_bilan(p_child) then return '[]'::jsonb; end if;
  if private.jwt_role() = 'PARENT' and not private.pack_feature(p_child, 'lsssCurve') then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(row order by created_at) from (
      select q.moment, q.completed_at as created_at, round(avg(ss.value)) as value
      from public.questionnaires q join public.skill_scores ss on ss.source_id = q.id and ss.source = 'QUESTIONNAIRE_LSSS'
      where q.child_id = p_child and q.kind = 'LSSS' and q.status = 'COMPLETED'
      group by q.id, q.moment, q.completed_at) row
  ), '[]'::jsonb);
end $$;

-- ── C) Policies conditionnées par le pack (branche PARENT uniquement) ────────

-- down: using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id)
--        or private.is_program_coach_of_child(child_id) or private.is_admin())
drop policy if exists skill_scores_read on public.skill_scores;
create policy skill_scores_read on public.skill_scores
  for select to authenticated
  using (
    case when private.is_parent_of_child(child_id)
      then private.pack_feature(child_id, 'skillBreakdown')
      else private.is_assigned_coach(child_id)
        or private.is_program_coach_of_child(child_id)
        or private.is_admin()
    end
  );

-- down: using (private.can_view_child_bilan(child_id))
drop policy if exists emotion_logs_read on public.emotion_logs;
create policy emotion_logs_read on public.emotion_logs
  for select to authenticated
  using (
    case when private.is_parent_of_child(child_id)
      then private.pack_feature(child_id, 'emotionWheel')
      else private.can_view_child_bilan(child_id)
    end
  );

-- down: using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id)
--        or private.is_program_coach_of_child(child_id) or private.is_admin())
drop policy if exists progress_log_read on public.progress_log;
create policy progress_log_read on public.progress_log
  for select to authenticated
  using (
    case when private.is_parent_of_child(child_id)
      then private.pack_feature(child_id, 'progressJournal')
      else private.is_assigned_coach(child_id)
        or private.is_program_coach_of_child(child_id)
        or private.is_admin()
    end
  );

-- down: using (private.is_parent_of_child(child_id) or private.is_assigned_coach(child_id)
--        or private.is_program_coach_of_child(child_id) or private.is_admin())
-- Un parent ne lit un rapport que si sa profondeur ne dépasse pas celle de son
-- forfait (les rapports sont régénérés au bon niveau après un upgrade).
drop policy if exists parent_reports_read on public.parent_reports;
create policy parent_reports_read on public.parent_reports
  for select to authenticated
  using (
    case when private.is_parent_of_child(child_id)
      then detail_level <= private.pack_detail_level(child_id)
      else private.is_assigned_coach(child_id)
        or private.is_program_coach_of_child(child_id)
        or private.is_admin()
    end
  );

-- down: using (private.can_edit_child_bilan(child_id)
--        or (parent_visible and private.is_parent_of_child(child_id)))
-- La lettre personnalisée du coach (kind LETTER) est un droit Avancé+ ;
-- contrat et certificat restent lisibles dans tous les packs.
drop policy if exists documents_read on public.athlete_documents;
create policy documents_read on public.athlete_documents
  for select to authenticated
  using (
    private.can_edit_child_bilan(child_id)
    or (
      parent_visible
      and private.is_parent_of_child(child_id)
      and (kind <> 'LETTER' or private.pack_feature(child_id, 'coachLetter'))
    )
  );

-- ── D) Lecture filtrée du bilan de séance (remplace la lecture brute côté parent) ──
-- Renvoie TOUJOURS le message du coach (socle, tous les packs) ; le bilan
-- détaillé et les notes d'observations uniquement si le pack le permet pour
-- cette séance. Verrouillé : les libellés d'observations sont renvoyés (pour le
-- teaser) mais JAMAIS les notes — aucune donnée réelle n'atteint le client.
create or replace function public.session_report(p_session uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_child uuid;
  v_num int;
  v_notes text;
  v_content jsonb;
  v_premium boolean;
  v_message text;
  v_bilan jsonb;
  v_obs jsonb;
begin
  select s.child_id, s.session_number, s.coach_notes
    into v_child, v_num, v_notes
  from public.sessions s where s.id = p_session;
  if v_child is null then return null; end if;

  if not private.can_view_child_bilan(v_child) then return null; end if;

  select r.content into v_content
  from public.reports r
  where r.child_id = v_child
    and ((r.content ->> 'session_id') = p_session::text
      or (v_num is not null and (r.content ->> 'session_number') = v_num::text))
  order by r.created_at desc
  limit 1;

  v_premium := case
    when private.jwt_role() = 'PARENT' then private.can_see_detailed_bilan(v_child, v_num)
    else true
  end;

  v_message := coalesce(nullif(btrim(coalesce(v_notes, '')), ''), v_content ->> 'message du coach');

  select jsonb_object_agg(key, value) into v_bilan
  from jsonb_each(coalesce(v_content, '{}'::jsonb))
  where key not in ('session_id', 'session_number', 'titre', 'observations', 'message du coach')
    and jsonb_typeof(value) in ('string', 'number', 'boolean')
    and value <> '""'::jsonb;

  v_obs := case
    when jsonb_typeof(v_content -> 'observations') = 'object' then v_content -> 'observations'
    else null
  end;

  return jsonb_build_object(
    'session_id', p_session,
    'session_number', v_num,
    'premium', v_premium,
    'message', v_message,
    'has_bilan', v_bilan is not null and v_bilan <> '{}'::jsonb,
    'has_observations', v_obs is not null and v_obs <> '{}'::jsonb,
    'bilan', case when v_premium then v_bilan else null end,
    'observations', case when v_premium then v_obs else null end,
    'observation_labels',
      case when not v_premium and v_obs is not null
        then (select jsonb_agg(k) from jsonb_object_keys(v_obs) k)
        else null
      end
  );
end $$;

revoke execute on function public.session_report(uuid) from anon, public;
grant execute on function public.session_report(uuid) to authenticated;

-- ── E) Quotas durs (maxChildren / maxParents) — l'UI affiche, la base garantit ──
-- Grandfathering : jamais rétroactif — seuls les NOUVEAUX ajouts sont bloqués.
-- Admins et service_role passent toujours (gestion manuelle).

create or replace function public.enforce_children_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack text;
  v_max int;
  v_count int;
begin
  if auth.uid() is null or private.is_admin_or_super() then return new; end if;
  select f.pack into v_pack from public.families f where f.id = new.family_id;
  select (p.limits ->> 'maxChildren')::int into v_max from public.plans p where p.code = v_pack;
  if v_max is not null then
    select count(*) into v_count
    from public.children c
    where c.family_id = new.family_id and coalesce(c.is_active, true);
    if v_count >= v_max then
      raise exception 'Quota d''enfants atteint pour le forfait % (max %). Passez à un forfait supérieur.', v_pack, v_max
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.enforce_children_quota() from anon, authenticated, public;

drop trigger if exists trg_enforce_children_quota on public.children;
create trigger trg_enforce_children_quota
  before insert on public.children
  for each row execute function public.enforce_children_quota();

create or replace function public.enforce_family_members_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pack text;
  v_max int;
  v_count int;
begin
  if auth.uid() is null or private.is_admin_or_super() then return new; end if;
  select f.pack into v_pack from public.families f where f.id = new.family_id;
  select (p.limits ->> 'maxParents')::int into v_max from public.plans p where p.code = v_pack;
  if v_max is not null then
    select count(*) into v_count
    from public.family_members m
    where m.family_id = new.family_id;
    if v_count >= v_max then
      raise exception 'Quota de comptes parents atteint pour le forfait % (max %). Passez à un forfait supérieur.', v_pack, v_max
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.enforce_family_members_quota() from anon, authenticated, public;

drop trigger if exists trg_enforce_family_members_quota on public.family_members;
create trigger trg_enforce_family_members_quota
  before insert on public.family_members
  for each row execute function public.enforce_family_members_quota();

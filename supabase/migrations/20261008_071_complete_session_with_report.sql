-- 20261008_071_complete_session_with_report.sql
-- Clôture d'une séance + envoi du bilan au parent en UNE transaction (T07 P0-3).
--
-- Avant : le navigateur du coach enchaînait trois écritures séparées
-- (sessions → reports → coach_reports). Une coupure entre la 1re et la 2e laissait
-- une séance « validée » sans bilan chez le parent ; « Renvoyer le bilan »
-- empilait un nouveau rapport à chaque clic.
--
-- Maintenant : un seul appel RPC, idempotent.
--   public.complete_session_with_report(p_session uuid, p_payload jsonb) → jsonb
--
-- Additif : aucune table ni colonne modifiée, aucune policy touchée. Les deux
-- index uniques ci-dessous ne sont créés QUE si les données existantes n'ont pas
-- de doublon (sinon la migration passe quand même ; l'idempotence est alors
-- garantie par le verrou de ligne sur la séance dans la fonction).
--
-- Payload attendu (tout est optionnel sauf `message`) :
--   {
--     "message":              "texte pour le parent",          -- obligatoire, non vide
--     "observations":         { "<indicateur>": 1..5, ... },
--     "fields":               { "<libellé>": "texte", ... },
--     "age_group":            "8-11",
--     "life_skill_target":    "…",
--     "performance_summary":  "…",
--     "success_count":        3
--   }
--
-- Erreurs (SQLSTATE P0001, le front les traduit en français) :
--   not_authenticated · forbidden · session_not_found · session_cancelled · message_required
--
-- Rollback : supabase/rollbacks/20261008_071_complete_session_with_report_rollback.sql

create or replace function public.complete_session_with_report(p_session uuid, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := auth.uid();
  v_payload      jsonb := coalesce(p_payload, '{}'::jsonb);
  v_sess         record;
  v_message      text;
  v_obs          jsonb;
  v_fields       jsonb;
  v_content      jsonb;
  v_report_id    uuid;
  v_cr_id        uuid;
  v_resent       boolean;
  v_success      int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- Verrou sur la séance : deux envois simultanés (double tap, deux onglets) se
  -- mettent en file ; le second voit le résultat du premier et le met à jour.
  select s.id, s.child_id, s.program_id, s.session_number, s.title, s.status, s.completed_at
    into v_sess
  from public.sessions s
  where s.id = p_session
  for update;

  if not found then
    raise exception 'session_not_found' using errcode = 'P0001';
  end if;

  -- Seul le coach assigné (ou du programme) — ou un admin responsable — peut clore.
  if not (
    public.current_user_role() = any (array['COACH','ADMIN','SUPER_ADMIN']::public.user_role[])
    and private.can_edit_child_bilan(v_sess.child_id)
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if v_sess.status = 'CANCELLED'::public.session_status then
    raise exception 'session_cancelled' using errcode = 'P0001';
  end if;

  v_message := btrim(coalesce(v_payload ->> 'message', ''));
  if v_message = '' then
    raise exception 'message_required' using errcode = 'P0001';
  end if;

  -- Observations : uniquement des entiers de 1 à 5.
  select coalesce(jsonb_object_agg(o.key, o.value), '{}'::jsonb)
    into v_obs
  from jsonb_each(
         case when jsonb_typeof(v_payload -> 'observations') = 'object'
              then v_payload -> 'observations' else '{}'::jsonb end
       ) o
  where jsonb_typeof(o.value) = 'number'
    and (o.value #>> '{}') ~ '^[1-5]$';

  -- Champs libres : uniquement du texte non vide.
  select coalesce(jsonb_object_agg(f.key, to_jsonb(btrim(f.value #>> '{}'))), '{}'::jsonb)
    into v_fields
  from jsonb_each(
         case when jsonb_typeof(v_payload -> 'fields') = 'object'
              then v_payload -> 'fields' else '{}'::jsonb end
       ) f
  where jsonb_typeof(f.value) = 'string'
    and btrim(f.value #>> '{}') <> '';

  -- Les clés réservées passent EN DERNIER : un champ libre ne peut pas les écraser.
  v_content := v_fields
    || jsonb_build_object(
         'session_id',      v_sess.id,
         'session_number',  v_sess.session_number,
         'titre',           v_sess.title,
         'message du coach', v_message
       )
    || case when v_obs <> '{}'::jsonb then jsonb_build_object('observations', v_obs) else '{}'::jsonb end;

  -- 1. La séance passe « validée ». `completed_at` garde la 1re date en cas de renvoi.
  update public.sessions
     set status       = 'COMPLETED'::public.session_status,
         completed_at = coalesce(v_sess.completed_at, now()),
         coach_notes  = v_message
   where id = v_sess.id;

  -- 2. Bilan (table historique `reports`, lue par session_report) — un par séance.
  select r.id into v_report_id
  from public.reports r
  where r.child_id = v_sess.child_id
    and r.content ->> 'session_id' = v_sess.id::text
  order by r.created_at desc
  limit 1;

  v_resent := v_report_id is not null;

  if v_resent then
    update public.reports set content = v_content where id = v_report_id;
  else
    insert into public.reports (child_id, program_id, generated_by, content)
    values (v_sess.child_id, v_sess.program_id, v_uid, v_content)
    returning id into v_report_id;
  end if;

  -- 3. Moteur de bilans (coach_reports → parent_reports par generate-parent-report).
  begin
    v_success := (v_payload ->> 'success_count')::int;
  exception when others then
    v_success := null;
  end;

  select c.id into v_cr_id
  from public.coach_reports c
  where c.session_id = v_sess.id
  order by c.created_at desc
  limit 1;

  if v_cr_id is not null then
    update public.coach_reports
       set age_group            = coalesce(nullif(v_payload ->> 'age_group', ''), age_group),
           life_skill_target    = coalesce(nullif(v_payload ->> 'life_skill_target', ''), life_skill_target),
           performance_summary  = nullif(v_payload ->> 'performance_summary', ''),
           success_count        = v_success,
           coach_message_parent = v_message,
           updated_at           = now()
     where id = v_cr_id;
  else
    insert into public.coach_reports
      (child_id, coach_id, session_id, age_group, life_skill_target,
       performance_summary, success_count, coach_message_parent)
    values
      (v_sess.child_id, v_uid, v_sess.id,
       nullif(v_payload ->> 'age_group', ''),
       nullif(v_payload ->> 'life_skill_target', ''),
       nullif(v_payload ->> 'performance_summary', ''),
       v_success, v_message)
    returning id into v_cr_id;
  end if;

  return jsonb_build_object(
    'session_id',      v_sess.id,
    'child_id',        v_sess.child_id,
    'report_id',       v_report_id,
    'coach_report_id', v_cr_id,
    'status',          'COMPLETED',
    'resent',          v_resent
  );
end
$$;

revoke all on function public.complete_session_with_report(uuid, jsonb) from public, anon;
grant execute on function public.complete_session_with_report(uuid, jsonb) to authenticated;

comment on function public.complete_session_with_report(uuid, jsonb) is
  'Clôture une séance et enregistre son bilan (reports + coach_reports) en une transaction, idempotent par séance. Réservé au coach assigné / admin responsable.';

-- Garde-fou de données : un seul bilan par séance, si (et seulement si) l'existant
-- n'a pas de doublon. Sinon on laisse tel quel (le verrou de la fonction suffit).
do $$
begin
  if not exists (
    select 1 from public.reports
    where content ? 'session_id'
    group by content ->> 'session_id'
    having count(*) > 1
  ) then
    create unique index if not exists reports_one_per_session_uidx
      on public.reports ((content ->> 'session_id'))
      where content ? 'session_id';
  else
    raise notice '071: doublons dans public.reports (session_id) — index unique non créé';
  end if;

  if not exists (
    select 1 from public.coach_reports
    where session_id is not null
    group by session_id
    having count(*) > 1
  ) then
    create unique index if not exists coach_reports_one_per_session_uidx
      on public.coach_reports (session_id)
      where session_id is not null;
  else
    raise notice '071: doublons dans public.coach_reports (session_id) — index unique non créé';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 082 — Demandes d'appel de 15 minutes (écran Y3, GO 3 lot O4). AUCUN paiement.
--
-- Idempotent. Autorité du rôle = app_metadata.role (private.jwt_role()).
--
-- Voie d'écriture choisie : INSERT UNIQUEMENT via la RPC public.request_intro_call
-- (SECURITY DEFINER), jamais d'INSERT direct pour `authenticated`. Raisons :
--   • le statut initial, le parent (= auth.uid()) et la propriété de l'enfant
--     sont imposés côté serveur, sans dépendre d'une combinaison policy + trigger ;
--   • le quota anti-abus (3 demandes ouvertes) est vérifié sous verrou
--     consultatif → pas de course entre deux envois simultanés ;
--   • l'alerte admin part dans la même transaction que la demande.
-- La fonction edge `request-intro-call` appelle cette RPC avec le JWT du parent
-- (et ajoute la limite de débit 078 par-dessus).
--
-- Lecture : le parent voit ses demandes ; ADMIN / SUPER_ADMIN voient tout ; un
-- COACH ne voit que les demandes des familles qu'il suit (Loi 25, minimisation) :
-- coach assigné à l'enfant visé, ou — demande sans enfant — à un enfant du parent
-- (coach_assignments actif). Mise à jour : mêmes personnes (hors parent),
-- colonne `statut` seulement.
-- Aucun DELETE pour authenticated (la ligne part avec le compte : ON DELETE CASCADE).
--
-- Rollback : supabase/rollbacks/20261012_082_call_requests_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────
set lock_timeout = '5s';

-- ── 1) Table ─────────────────────────────────────────────────────────────────
create table if not exists public.call_requests (
  id         uuid        primary key default gen_random_uuid(),
  parent_id  uuid        not null references auth.users(id) on delete cascade,
  child_id   uuid        references public.children(id) on delete set null,
  mode       text        not null check (mode in ('video', 'telephone')),
  creneau    timestamptz not null,
  note       text        check (note is null or char_length(note) <= 500),
  statut     text        not null default 'demande'
                         check (statut in ('demande', 'confirme', 'annule', 'fait')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_requests_parent_idx on public.call_requests (parent_id, created_at desc);
create index if not exists call_requests_statut_creneau_idx on public.call_requests (statut, creneau);
create index if not exists call_requests_child_idx on public.call_requests (child_id) where child_id is not null;
-- Un même parent ne réserve pas deux fois le même créneau tant que la demande est ouverte.
create unique index if not exists call_requests_parent_creneau_open_uidx
  on public.call_requests (parent_id, creneau) where statut in ('demande', 'confirme');

alter table public.call_requests enable row level security;

revoke all on table public.call_requests from public, anon, authenticated;
grant select on table public.call_requests to authenticated;
grant update (statut) on table public.call_requests to authenticated;
grant select, insert, update, delete on table public.call_requests to service_role;

-- ── 2) Policies ──────────────────────────────────────────────────────────────
-- Coach lié à la demande : assigné (actif) à l'enfant visé ; sans enfant visé,
-- assigné à au moins un enfant d'une famille dont le demandeur est titulaire.
create or replace function private.is_coach_of_call_request(p_parent uuid, p_child uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select private.jwt_role() = 'COACH'
     and case
           when p_child is not null then private.is_assigned_coach(p_child)
           else exists (select 1
                          from public.coach_assignments ca
                          join public.children c on c.id = ca.child_id
                          join public.families f on f.id = c.family_id
                         where f.parent_id = p_parent
                           and ca.coach_id = (select auth.uid())
                           and ca.is_active)
         end;
$$;
revoke all on function private.is_coach_of_call_request(uuid, uuid) from public, anon;
grant execute on function private.is_coach_of_call_request(uuid, uuid) to authenticated;

drop policy if exists call_requests_select on public.call_requests;
drop policy if exists call_requests_staff_update on public.call_requests;

create policy call_requests_select on public.call_requests
  for select to authenticated
  using (parent_id = (select auth.uid())
         or (select private.jwt_role()) in ('ADMIN', 'SUPER_ADMIN')
         or private.is_coach_of_call_request(parent_id, child_id));

create policy call_requests_staff_update on public.call_requests
  for update to authenticated
  using ((select private.jwt_role()) in ('ADMIN', 'SUPER_ADMIN')
         or private.is_coach_of_call_request(parent_id, child_id))
  with check ((select private.jwt_role()) in ('ADMIN', 'SUPER_ADMIN')
              or private.is_coach_of_call_request(parent_id, child_id));

-- ── 3) Horodatage de mise à jour ─────────────────────────────────────────────
create or replace function private.call_requests_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_call_requests_touch on public.call_requests;
create trigger trg_call_requests_touch
  before update on public.call_requests
  for each row execute function private.call_requests_touch();

-- ── 4) RPC de création ───────────────────────────────────────────────────────
-- Erreurs (message = code stable lu par la fonction edge, errcode P0001) :
--   not_parent · invalid_mode · invalid_slot · invalid_note · child_not_owned
--   · quota_reached · duplicate_slot
create or replace function public.request_intro_call(
  p_mode    text,
  p_creneau timestamptz,
  p_child   uuid default null,
  p_note    text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_open integer;
  v_id   uuid;
begin
  if v_uid is null or private.jwt_role() <> 'PARENT' then
    raise exception 'not_parent' using errcode = 'P0001';
  end if;
  if p_mode is null or p_mode not in ('video', 'telephone') then
    raise exception 'invalid_mode' using errcode = 'P0001';
  end if;
  -- Créneau futur (au moins 15 min) et dans les 90 jours.
  if p_creneau is null
     or p_creneau < now() + interval '15 minutes'
     or p_creneau > now() + interval '90 days' then
    raise exception 'invalid_slot' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;
  if p_child is not null and not private.is_parent_of_child(p_child) then
    raise exception 'child_not_owned' using errcode = 'P0001';
  end if;

  -- Sérialise les demandes d'un même parent (quota sans course).
  perform pg_advisory_xact_lock(hashtextextended('call_requests:' || v_uid::text, 0));

  select count(*) into v_open
  from public.call_requests r
  where r.parent_id = v_uid and r.statut in ('demande', 'confirme') and r.creneau > now();
  if v_open >= 3 then
    raise exception 'quota_reached' using errcode = 'P0001';
  end if;

  begin
    insert into public.call_requests (parent_id, child_id, mode, creneau, note, statut)
    values (v_uid, p_child, p_mode, p_creneau, v_note, 'demande')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'duplicate_slot' using errcode = 'P0001';
  end;

  -- Alerte admin : ne bloque jamais la demande. Le corps ne reprend ni la note
  -- ni le nom de l'enfant (Loi 25 : minimum nécessaire dans une notification).
  begin
    perform private.notify_admins(
      'intro_call_requested', 'accounts',
      'Demande d''appel de 15 min',
      'Un parent demande un appel '
        || case p_mode when 'video' then 'vidéo' else 'téléphonique' end
        || ' le ' || to_char(p_creneau at time zone 'America/Toronto', 'DD/MM/YYYY à HH24"h"MI')
        || ' (heure de l''Est).',
      null,  -- [À COMPLÉTER : page admin de suivi des appels, ex. '/admin/appels']
      jsonb_build_object('call_request_id', v_id, 'mode', p_mode, 'creneau', p_creneau),
      v_uid, null, null, false, 'ADMIN_ALERT');
  exception when others then
    null;
  end;

  return v_id;
end;
$$;

revoke all on function public.request_intro_call(text, timestamptz, uuid, text) from public, anon;
grant execute on function public.request_intro_call(text, timestamptz, uuid, text) to authenticated;

revoke all on function private.call_requests_touch() from public, anon, authenticated;

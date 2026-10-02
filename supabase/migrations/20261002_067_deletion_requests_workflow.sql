-- ─────────────────────────────────────────────────────────────────────────────
-- 20261002_067_deletion_requests_workflow.sql
-- Traitement des demandes de suppression de compte (droit à l'effacement).
--
-- Cadre : Loi 25 (Loi sur la protection des renseignements personnels dans le
-- secteur privé, RLRQ c. P-39.1, art. 28.1 et 32) — réponse au plus tard dans
-- les 30 jours suivant la réception de la demande. Règles des stores : la
-- suppression demandée dans l'app doit aboutir.
--
--   1. La trace survit à la suppression : jusqu'ici les FK étaient en
--      ON DELETE CASCADE → supprimer le compte effaçait la demande elle-même,
--      donc la preuve du traitement. Elles passent en SET NULL, et l'adresse
--      et le nom sont figés à la réception (target_email / target_name).
--   2. Échéance légale : due_at = réception + 30 jours, posée par trigger (une
--      colonne générée refuserait timestamptz + interval, non immuable).
--   3. Responsable : assigned_to = le super-administrateur actif le plus
--      ancien (le compte admin par défaut), choisi à la réception — aucun
--      identifiant écrit en dur. L'utilisateur ne peut pas forcer ces champs.
--   4. Une seule demande en attente par compte (index unique partiel).
--   5. Notification des administrateurs vers la nouvelle page
--      /admin/suppressions, avec l'échéance.
--   6. Minimisation : une demande traitée est purgée 12 mois après son
--      traitement (purge opportuniste à chaque nouvelle demande : pas de
--      pg_cron sur le projet).
--
-- Statuts existants conservés : PENDING → PURGED (compte supprimé) ou
-- CANCELLED (retirée / refusée, avec motif). ANONYMIZED reste disponible.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Trace durable
alter table public.deletion_requests
  alter column requested_by drop not null,
  alter column target_profile_id drop not null;

alter table public.deletion_requests drop constraint if exists deletion_requests_requested_by_fkey;
alter table public.deletion_requests drop constraint if exists deletion_requests_target_profile_id_fkey;
alter table public.deletion_requests drop constraint if exists deletion_requests_processed_by_fkey;
alter table public.deletion_requests
  add constraint deletion_requests_requested_by_fkey
    foreign key (requested_by) references public.profiles(id) on delete set null,
  add constraint deletion_requests_target_profile_id_fkey
    foreign key (target_profile_id) references public.profiles(id) on delete set null,
  add constraint deletion_requests_processed_by_fkey
    foreign key (processed_by) references public.profiles(id) on delete set null;

alter table public.deletion_requests
  add column if not exists target_email     text,
  add column if not exists target_name      text,
  add column if not exists due_at           timestamptz,
  add column if not exists assigned_to      uuid references public.profiles(id) on delete set null,
  add column if not exists resolution_note  text,
  add column if not exists store_subscription text;

comment on column public.deletion_requests.due_at is
  'Échéance légale de réponse : réception + 30 jours (Loi 25, art. 32).';
comment on column public.deletion_requests.assigned_to is
  'Responsable du traitement : super-administrateur actif le plus ancien à la réception.';
comment on column public.deletion_requests.store_subscription is
  'Abonnement App Store / Google Play encore actif à la suppression : le parent doit l''annuler depuis son téléphone.';

-- 2) Valeurs posées par le serveur à la réception (jamais par le client)
create or replace function private.deletion_request_defaults()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.requested_at := coalesce(new.requested_at, now());
  new.due_at       := new.requested_at + interval '30 days';
  new.status       := 'PENDING';
  new.processed_at := null;
  new.processed_by := null;
  select p.email, nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
    into new.target_email, new.target_name
    from public.profiles p where p.id = new.target_profile_id;
  select p.id into new.assigned_to
    from public.profiles p
   where p.role = 'SUPER_ADMIN' and coalesce(p.is_active, true)
   order by p.created_at
   limit 1;

  -- Minimisation : registre des demandes traitées conservé 12 mois.
  delete from public.deletion_requests d
   where d.status <> 'PENDING' and d.processed_at < now() - interval '12 months';
  return new;
end $$;

drop trigger if exists trg_deletion_request_defaults on public.deletion_requests;
create trigger trg_deletion_request_defaults
  before insert on public.deletion_requests
  for each row execute function private.deletion_request_defaults();

-- Rattrapage des demandes déjà reçues (aucune en production au 2026-10-02).
update public.deletion_requests d
   set due_at       = coalesce(d.due_at, d.requested_at + interval '30 days'),
       target_email = coalesce(d.target_email, p.email),
       assigned_to  = coalesce(d.assigned_to, (select s.id from public.profiles s
                        where s.role = 'SUPER_ADMIN' and coalesce(s.is_active, true)
                        order by s.created_at limit 1))
  from public.profiles p
 where p.id = d.target_profile_id;

-- 3) Une seule demande en attente par compte ; tri par échéance
create unique index if not exists deletion_requests_one_pending
  on public.deletion_requests (target_profile_id) where status = 'PENDING';
create index if not exists deletion_requests_status_due
  on public.deletion_requests (status, due_at);

-- 4) Notification admin → page de traitement, avec l'échéance
create or replace function private.notify_deletion_request()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.notify_admins('deletion_request', 'accounts',
    'Demande de suppression de compte',
    private.actor_label(coalesce(new.target_profile_id, new.requested_by))
      || ' demande la suppression de son compte. À traiter avant le '
      || to_char(new.due_at at time zone 'America/Toronto', 'DD/MM/YYYY') || '.',
    '/admin/suppressions',
    jsonb_build_object('request_id', new.id, 'target_profile_id', new.target_profile_id,
                       'due_at', new.due_at),
    null);
  return new;
end $$;

-- 5) Mise à jour par un administrateur : le traitant et la date sont imposés
create or replace function private.deletion_request_on_update()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status <> 'PENDING' then
    new.processed_at := coalesce(new.processed_at, now());
    new.processed_by := coalesce(auth.uid(), new.processed_by);
  end if;
  -- L'échéance et l'identité figée ne se réécrivent pas.
  new.due_at       := old.due_at;
  new.requested_at := old.requested_at;
  new.target_email := coalesce(old.target_email, new.target_email);
  return new;
end $$;

drop trigger if exists trg_deletion_request_on_update on public.deletion_requests;
create trigger trg_deletion_request_on_update
  before update on public.deletion_requests
  for each row execute function private.deletion_request_on_update();

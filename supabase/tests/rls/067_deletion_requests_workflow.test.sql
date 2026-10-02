-- ─────────────────────────────────────────────────────────────────────────────
-- Test de la migration 067 (demandes de suppression). Transaction annulée.
-- Miroir local : run-local.sh · Branche Supabase : éditeur SQL de la branche.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

-- P = parent demandeur · A = super-admin le plus ancien · B = super-admin récent · D = admin
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-4000-a000-000000000101', 'p.test067@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000102', 'a.test067@thrive.invalid', '{}', '{"role":"SUPER_ADMIN"}'),
  ('00000000-0000-4000-a000-000000000103', 'b.test067@thrive.invalid', '{}', '{"role":"SUPER_ADMIN"}'),
  ('00000000-0000-4000-a000-000000000104', 'd.test067@thrive.invalid', '{}', '{"role":"ADMIN"}');
insert into public.profiles (id, email, first_name, last_name, role, created_at) values
  ('00000000-0000-4000-a000-000000000101', 'p.test067@thrive.invalid', 'Paule', 'Test', 'PARENT', now()),
  ('00000000-0000-4000-a000-000000000102', 'a.test067@thrive.invalid', 'Alpha', 'Admin', 'SUPER_ADMIN', '2000-01-01'),
  ('00000000-0000-4000-a000-000000000103', 'b.test067@thrive.invalid', 'Bravo', 'Admin', 'SUPER_ADMIN', now()),
  ('00000000-0000-4000-a000-000000000104', 'd.test067@thrive.invalid', 'Delta', 'Admin', 'ADMIN', now())
on conflict (id) do update set role = excluded.role, created_at = excluded.created_at,
  first_name = excluded.first_name, last_name = excluded.last_name;

-- Demande ancienne, traitée il y a 13 mois : doit être purgée à la prochaine réception.
insert into public.deletion_requests (id, requested_by, target_profile_id, status)
values ('00000000-0000-4000-e000-000000000999', '00000000-0000-4000-a000-000000000104', '00000000-0000-4000-a000-000000000104', 'PENDING');
update public.deletion_requests set status = 'CANCELLED' where id = '00000000-0000-4000-e000-000000000999';
alter table public.deletion_requests disable trigger trg_deletion_request_on_update;
update public.deletion_requests set processed_at = now() - interval '13 months'
 where id = '00000000-0000-4000-e000-000000000999';
alter table public.deletion_requests enable trigger trg_deletion_request_on_update;

-- ── 1) Le parent dépose sa demande (et tente de forcer les champs serveur) ──
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000101","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);
insert into public.deletion_requests (id, requested_by, target_profile_id, reason, status, due_at, assigned_to, requested_at)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000101',
        'test', 'PURGED', now() + interval '10 years', '00000000-0000-4000-a000-000000000101', now() - interval '1 day');

do $$ declare r record; begin
  select * into r from public.deletion_requests where id = '00000000-0000-4000-e000-000000000001';
  assert r.status = 'PENDING', 'ÉCHEC 1.1 : statut forcé à PENDING';
  assert r.due_at = r.requested_at + interval '30 days', 'ÉCHEC 1.2 : échéance = réception + 30 jours';
  assert r.assigned_to = '00000000-0000-4000-a000-000000000102', 'ÉCHEC 1.3 : responsable = super-admin le plus ancien';
  assert r.target_email = 'p.test067@thrive.invalid', 'ÉCHEC 1.4 : adresse figée à la réception';
  assert r.target_name = 'Paule Test', 'ÉCHEC 1.5 : nom figé';
end $$;

-- 1.6 Une seule demande en attente par compte
do $$ begin
  begin
    insert into public.deletion_requests (requested_by, target_profile_id)
    values ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000101');
    raise exception 'ÉCHEC 1.6 : doublon accepté';
  exception when unique_violation then null;
  end;
end $$;

-- 1.7 Le parent ne peut pas modifier sa demande (réservé aux administrateurs)
do $$ declare n int; begin
  update public.deletion_requests set status = 'CANCELLED' where id = '00000000-0000-4000-e000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'ÉCHEC 1.7 : le parent a modifié sa demande';
end $$;
reset role;

do $$ begin
  assert exists (select 1 from public.notifications
                  where user_id = '00000000-0000-4000-a000-000000000102'
                    and data ->> 'path' = '/admin/suppressions'
                    and body like '%À traiter avant le%'),
    'ÉCHEC 1.8 : notification admin vers /admin/suppressions avec échéance';
  assert not exists (select 1 from public.deletion_requests where id = '00000000-0000-4000-e000-000000000999'),
    'ÉCHEC 1.9 : demande traitée depuis plus de 12 mois purgée';
end $$;

-- ── 2) Un administrateur refuse/annule avec motif ───────────────────────────
insert into public.deletion_requests (id, requested_by, target_profile_id)
values ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000103');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000104","role":"authenticated","app_metadata":{"role":"ADMIN"}}', true);
update public.deletion_requests
   set status = 'CANCELLED', resolution_note = 'Retirée par le demandeur', due_at = now() + interval '1 year'
 where id = '00000000-0000-4000-e000-000000000002';
do $$ declare r record; begin
  select * into r from public.deletion_requests where id = '00000000-0000-4000-e000-000000000002';
  assert r.processed_by = '00000000-0000-4000-a000-000000000104', 'ÉCHEC 2.1 : traitant = administrateur connecté';
  assert r.processed_at is not null, 'ÉCHEC 2.2 : date de traitement posée';
  assert r.due_at = r.requested_at + interval '30 days', 'ÉCHEC 2.3 : échéance non modifiable';
end $$;
reset role;

-- ── 3) Suppression du compte (ce que fait admin-delete-user) : la trace reste
delete from public.profiles where id = '00000000-0000-4000-a000-000000000101';
update public.deletion_requests set status = 'PURGED' where id = '00000000-0000-4000-e000-000000000001';
do $$ declare r record; begin
  select * into r from public.deletion_requests where id = '00000000-0000-4000-e000-000000000001';
  assert found, 'ÉCHEC 3.1 : la demande doit survivre à la suppression du compte';
  assert r.target_profile_id is null and r.target_email = 'p.test067@thrive.invalid',
    'ÉCHEC 3.2 : profil détaché, adresse conservée comme preuve';
  assert r.status = 'PURGED' and r.processed_at is not null, 'ÉCHEC 3.3 : demande close';
end $$;

select 'OK : 067 demandes de suppression — tous les contrôles passent' as resultat;
rollback;

-- ─────────────────────────────────────────────────────────────────────────────
-- Test de la migration 066 (accès co-parent). Tout se passe dans UNE
-- transaction annulée à la fin : aucune donnée ne subsiste.
--   • Miroir local : supabase/tests/rls/run-local.sh
--   • Branche Supabase (environnement miroir) : coller ce fichier dans l'éditeur
--     SQL de la BRANCHE — jamais sur la production (voir README.md).
-- Échec = une erreur « ÉCHEC … » et la transaction s'arrête.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

-- ── Jeu d'essai (en superutilisateur : la RLS ne s'applique pas ici) ────────
-- O = titulaire F1 · C = co-parent F1 · S = titulaire F2 (étranger)
-- Q = titulaire F3 (forfait ESSENTIEL + abonnement Maison) · R = parent invité par Q
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'o.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000002', 'c.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000003', 's.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000004', 'q.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000005', 'r.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000006', 't.test066@thrive.invalid', '{"role":"PARENT"}', '{"role":"PARENT"}'),
  ('00000000-0000-4000-a000-000000000009', 'k.test066@thrive.invalid', '{"role":"COACH"}', '{"role":"COACH"}');

-- Sur Supabase, handle_new_user a déjà créé les profils : on les complète.
insert into public.profiles (id, email, role, coach_validated)
select u.id, u.email, (case when u.email like 'k.%' then 'COACH' else 'PARENT' end)::public.user_role, u.email like 'o.%'
from auth.users u where u.email like '%.test066@thrive.invalid'
on conflict (id) do update set coach_validated = excluded.coach_validated, role = excluded.role;

insert into public.families (id, name, parent_id, pack) values
  ('00000000-0000-4000-b000-000000000001', 'Famille Test F1', '00000000-0000-4000-a000-000000000001', 'PERFORMANCE'),
  ('00000000-0000-4000-b000-000000000002', 'Famille Test F2', '00000000-0000-4000-a000-000000000003', 'ESSENTIEL'),
  ('00000000-0000-4000-b000-000000000003', 'Famille Test F3', '00000000-0000-4000-a000-000000000004', 'ESSENTIEL');

insert into public.family_members (family_id, profile_id, member_role) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'OWNER'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002', 'PARENT'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000003', 'OWNER'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000004', 'OWNER')
on conflict (family_id, profile_id) do nothing;

insert into public.children (id, family_id, first_name, last_name, date_of_birth, validation_status) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Ana', 'Test', '2015-05-01', 'CONFIRMED'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 'Ben', 'Test', '2012-05-01', 'PENDING'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', 'Xavier', 'Autre', '2014-05-01', 'CONFIRMED');

insert into public.programs (id, title, age_group, coach_id) values
  ('00000000-0000-4000-d000-000000000001', 'Programme test 066', '8-11', '00000000-0000-4000-a000-000000000009');
insert into public.sessions (program_id, child_id, session_number, title, status) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 1, 'Séance 1', 'COMPLETED');
insert into public.questionnaires (child_id, title, kind) values
  ('00000000-0000-4000-c000-000000000001', 'LSSS test', 'LSSS');
insert into public.billing_subscriptions (user_id, active, store) values
  ('00000000-0000-4000-a000-000000000004', true, 'stripe')
on conflict (user_id) do update set active = true, store = 'stripe', expires_at = null;

-- ── 1) Le co-parent C ────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);

do $$ begin
  assert (select count(*) from public.children
           where family_id = '00000000-0000-4000-b000-000000000001') = 2,
    'ÉCHEC 1.1 : le co-parent doit voir les 2 enfants de sa famille';
  assert not exists (select 1 from public.children where id = '00000000-0000-4000-c000-000000000003'),
    'ÉCHEC 1.2 : le co-parent ne doit voir aucun enfant d''une autre famille';
  assert exists (select 1 from public.families where id = '00000000-0000-4000-b000-000000000001'),
    'ÉCHEC 1.3 : le co-parent doit voir sa famille';
  assert not exists (select 1 from public.families where id = '00000000-0000-4000-b000-000000000002'),
    'ÉCHEC 1.4 : le co-parent ne doit pas voir une autre famille';
  assert (select count(*) from public.sessions where child_id = '00000000-0000-4000-c000-000000000001') = 1,
    'ÉCHEC 1.5 : séances visibles (accès activé par le coach du titulaire)';
  assert (select count(*) from public.questionnaires where child_id = '00000000-0000-4000-c000-000000000001') = 1,
    'ÉCHEC 1.6 : questionnaires visibles';
  assert (public.access_state() ->> 'unlocked')::boolean,
    'ÉCHEC 1.7 : access_state.unlocked doit être vrai pour le co-parent';
  assert (public.access_state() ->> 'has_child')::boolean, 'ÉCHEC 1.8 : access_state.has_child';
  assert (select count(*) from public.family_members
           where family_id = '00000000-0000-4000-b000-000000000001') = 2,
    'ÉCHEC 1.9 : le co-parent voit les membres de sa famille';
end $$;

-- 1.10 Ajout d'un enfant dans SA famille : permis
insert into public.children (family_id, first_name, last_name, date_of_birth)
values ('00000000-0000-4000-b000-000000000001', 'Chloé', 'Test', '2016-01-01');

-- 1.11 Ajout d'un enfant dans une AUTRE famille : refusé par la RLS
do $$ begin
  begin
    insert into public.children (family_id, first_name, last_name, date_of_birth)
    values ('00000000-0000-4000-b000-000000000002', 'Intrus', 'Test', '2016-01-01');
    raise exception 'ÉCHEC 1.11 : insertion dans une autre famille acceptée';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 1.12 Modifier la famille (forfait, nom) : titulaire seul → 0 ligne
do $$ declare n int; begin
  update public.families set name = 'piraté' where id = '00000000-0000-4000-b000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'ÉCHEC 1.12 : le co-parent ne doit pas modifier la famille';
end $$;

-- 1.13 Inviter un autre parent : titulaire seul
do $$ begin
  begin
    insert into public.family_members (family_id, profile_id, member_role)
    values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000006', 'PARENT');
    raise exception 'ÉCHEC 1.13 : le co-parent a pu inviter un membre';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 1.14 Maison : le co-parent enregistre un moment pour l'enfant
insert into public.p3_moments (child_id, parent_id, activity_id, week)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000002', 'ACT-0101', 1);

reset role;

-- ── 2) Le titulaire O : rien ne change pour lui ──────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);
do $$ begin
  assert (select count(*) from public.children
           where family_id = '00000000-0000-4000-b000-000000000001') = 3,
    'ÉCHEC 2.1 : le titulaire voit ses enfants (dont celui ajouté par le co-parent)';
  assert (public.access_state() ->> 'unlocked')::boolean, 'ÉCHEC 2.2 : titulaire déverrouillé';
  assert (select count(*) from public.sessions) = 1, 'ÉCHEC 2.3 : séances du titulaire';
end $$;
reset role;

-- ── 3) L'étranger S : aucune fuite ───────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);
do $$ begin
  assert not exists (select 1 from public.children where family_id = '00000000-0000-4000-b000-000000000001'),
    'ÉCHEC 3.1 : un étranger ne doit pas voir les enfants de F1';
  assert (select count(*) from public.sessions) = 0, 'ÉCHEC 3.2 : aucune séance visible';
  assert not (public.access_state() ->> 'unlocked')::boolean,
    'ÉCHEC 3.3 : S n''est pas activé par un coach';
end $$;
-- 3.4 Forfait ESSENTIEL sans abonnement Maison : 1 seul compte parent
do $$ begin
  begin
    insert into public.family_members (family_id, profile_id, member_role)
    values ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000006', 'PARENT');
    raise exception 'ÉCHEC 3.4 : quota ESSENTIEL dépassé sans abonnement';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- ── 4) Abonné Maison au forfait ESSENTIEL : « accès pour les deux parents » ──
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);
insert into public.family_members (family_id, profile_id, member_role)
values ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000005', 'PARENT');
do $$ begin
  begin
    insert into public.family_members (family_id, profile_id, member_role)
    values ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000006', 'PARENT');
    raise exception 'ÉCHEC 4.2 : un 3e compte parent ne doit pas passer';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- 4.3 Le parent invité R hérite de l'abonnement Maison du titulaire
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000005","role":"authenticated","app_metadata":{"role":"PARENT"}}', true);
do $$ begin
  assert (public.access_state() ->> 'p3_access')::boolean, 'ÉCHEC 4.3 : accès Maison du parent invité';
end $$;
reset role;

select 'OK : 066 accès co-parent — tous les contrôles passent' as resultat;
rollback;

-- ─────────────────────────────────────────────────────────────────────────────
-- Test de la migration 068 (« 1 mois offert » du certificat). Transaction annulée.
-- Nécessite 066 (private.is_family_member). Sur une branche Supabase, la
-- section 1 n'est valable que si les secrets Vault de test sont posés.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000201', 'o.test068@thrive.invalid'),
  ('00000000-0000-4000-a000-000000000202', 'c.test068@thrive.invalid'),
  ('00000000-0000-4000-a000-000000000203', 's.test068@thrive.invalid');
insert into public.profiles (id, email, role) values
  ('00000000-0000-4000-a000-000000000201', 'o.test068@thrive.invalid', 'PARENT'),
  ('00000000-0000-4000-a000-000000000202', 'c.test068@thrive.invalid', 'PARENT'),
  ('00000000-0000-4000-a000-000000000203', 's.test068@thrive.invalid', 'PARENT')
on conflict (id) do nothing;
insert into public.families (id, name, parent_id, pack) values
  ('00000000-0000-4000-b000-000000000201', 'Famille 068', '00000000-0000-4000-a000-000000000201', 'PERFORMANCE');
insert into public.family_members (family_id, profile_id, member_role) values
  ('00000000-0000-4000-b000-000000000201', '00000000-0000-4000-a000-000000000202', 'PARENT');
insert into public.children (id, family_id, first_name, last_name, date_of_birth) values
  ('00000000-0000-4000-c000-000000000201', '00000000-0000-4000-b000-000000000201', 'Zoé', 'Test', '2015-01-01');

-- Secrets de test (miroir local uniquement : la table vault y est un bouchon).
insert into vault.decrypted_secrets (name, decrypted_secret) values
  ('edge_functions_url', 'https://exemple.invalid/functions/v1'), ('push_trigger_secret', 's3cret')
on conflict (name) do nothing;

-- ── 1) Émission du certificat → appel de claim-certificate-reward ──────────
insert into public.p3_rewards (child_id, reward_id) values ('00000000-0000-4000-c000-000000000201', 'fiche_identite');
insert into public.p3_rewards (child_id, reward_id) values ('00000000-0000-4000-c000-000000000201', 'certificat');
do $$ begin
  assert (select count(*) from net.calls where url like '%/claim-certificate-reward') = 1,
    'ÉCHEC 1.1 : un seul appel, pour le certificat uniquement';
  assert (select headers ->> 'x-push-secret' from net.calls where url like '%/claim-certificate-reward') = 's3cret',
    'ÉCHEC 1.2 : appel authentifié par le secret partagé';
  assert (select body ->> 'child_id' from net.calls where url like '%/claim-certificate-reward') = '00000000-0000-4000-c000-000000000201',
    'ÉCHEC 1.3 : enfant transmis';
end $$;

insert into public.reward_grants (family_id, child_id, status, channel)
values ('00000000-0000-4000-b000-000000000201', '00000000-0000-4000-c000-000000000201', 'PENDING', 'deferred');

-- ── 2) Lecture : les deux parents de la famille ; personne d'autre ─────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000202","app_metadata":{"role":"PARENT"}}', true);
do $$ begin
  assert (select count(*) from public.reward_grants) = 1, 'ÉCHEC 2.1 : le co-parent voit le crédit de sa famille';
end $$;
-- 2.2 Aucun parent ne peut s'attribuer ou modifier un crédit
do $$ begin
  begin
    insert into public.reward_grants (family_id, status) values ('00000000-0000-4000-b000-000000000201', 'APPLIED');
    raise exception 'ÉCHEC 2.2 : insertion client acceptée';
  exception when insufficient_privilege or unique_violation then null;
  end;
end $$;
do $$ declare n int; begin
  begin
    update public.reward_grants set status = 'APPLIED';
    get diagnostics n = row_count;
    assert n = 0, 'ÉCHEC 2.3 : modification client acceptée';
  exception when insufficient_privilege then null;  -- refus par les droits : attendu
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000203","app_metadata":{"role":"PARENT"}}', true);
do $$ begin
  assert (select count(*) from public.reward_grants) = 0, 'ÉCHEC 2.4 : un étranger ne voit aucun crédit';
end $$;
reset role;

-- ── 3) Un seul crédit par famille ──────────────────────────────────────────
do $$ begin
  begin
    insert into public.reward_grants (family_id) values ('00000000-0000-4000-b000-000000000201');
    raise exception 'ÉCHEC 3.1 : second crédit accepté';
  exception when unique_violation then null;
  end;
end $$;

select 'OK : 068 mois offert du certificat — tous les contrôles passent' as resultat;
rollback;

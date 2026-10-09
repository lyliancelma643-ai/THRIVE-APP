-- ═════════════════════════════════════════════════════════════════════════════
-- THRIVE — Test d'étanchéité RLS en se faisant passer pour un PARENT (lecture +
-- tentatives d'écriture), le tout dans une transaction ANNULÉE à la fin.
-- Aucune donnée n'est modifiée. Exécuter tel quel dans Supabase › SQL Editor.
-- Résultat attendu : une seule ligne par test, colonne « verdict » = OK partout.
-- Pour tester un autre compte, remplacer l'adresse ci-dessous.
-- ═════════════════════════════════════════════════════════════════════════════
begin;

create temp table _audit (test text, verdict text, detail text) on commit drop;
grant insert, select on _audit to authenticated;

-- Parent testé : le compte de revue s'il existe, sinon le plus ancien parent.
select set_config('audit.uid', coalesce(
  (select id::text from public.profiles where email = 'parent-test@thrivesportpositive.com'),
  (select id::text from public.profiles where role = 'PARENT' order by created_at limit 1)), true);

select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('audit.uid'), 'role', 'authenticated',
  'app_metadata', json_build_object('role', 'PARENT'))::text, true);
set local role authenticated;

do $$
declare n int; me uuid := auth.uid();
begin
  -- ── Lectures ───────────────────────────────────────────────────────────────
  select count(*) into n from public.children c
  where c.family_id not in (select id from public.families where parent_id = me)
    and c.family_id not in (select family_id from public.family_members where profile_id = me);
  insert into _audit values ('R1 enfants d''autres familles visibles', case when n = 0 then 'OK' else 'FUITE' end, n::text);

  select count(*) into n from public.billing_subscriptions where user_id <> me;
  insert into _audit values ('R2 abonnements d''autres comptes visibles', case when n = 0 then 'OK' else 'FUITE' end, n::text);

  select count(*) into n from public.deletion_requests where coalesce(requested_by, target_profile_id) <> me;
  insert into _audit values ('R3 demandes de suppression d''autrui visibles', case when n = 0 then 'OK' else 'FUITE' end, n::text);

  select count(*) into n from public.profiles where id <> me and role = 'PARENT';
  insert into _audit values ('R4 profils d''autres parents visibles', case when n = 0 then 'OK' else 'À EXAMINER' end, n::text);

  select count(*) into n from public.qa_accounts;
  insert into _audit values ('R5 liste qa_accounts lisible', case when n = 0 then 'OK (vide ou masquée)' else 'FUITE' end, n::text);

  -- ── Écritures interdites ───────────────────────────────────────────────────
  begin
    update public.profiles set role = 'ADMIN' where id = me;
    get diagnostics n = row_count;
    insert into _audit values ('W1 s''auto-promouvoir ADMIN', case when n = 0 then 'OK' else 'FAILLE' end, n::text || ' ligne(s)');
  exception when others then insert into _audit values ('W1 s''auto-promouvoir ADMIN', 'OK (refusé)', sqlerrm); end;

  begin
    -- inverse la valeur actuelle : un « true → true » ne prouverait rien
    update public.profiles set coach_validated = not coalesce(coach_validated, false) where id = me;
    get diagnostics n = row_count;
    insert into _audit values ('W2 s''auto-valider coach_validated', case when n = 0 then 'OK' else 'FAILLE' end, n::text || ' ligne(s)');
  exception when others then insert into _audit values ('W2 s''auto-valider coach_validated', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.billing_subscriptions (user_id, active, ever_subscribed, synced_at)
    values (me, true, true, now())
    on conflict (user_id) do update set active = true, expires_at = null;
    insert into _audit values ('W3 s''offrir un abonnement actif', 'FAILLE', 'écriture acceptée');
  exception when others then insert into _audit values ('W3 s''offrir un abonnement actif', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.parent_access (parent_id, maison) values (me, true)
    on conflict (parent_id) do update set maison = true;
    insert into _audit values ('W4 forcer l''accès Maison (parent_access)', 'FAILLE', 'écriture acceptée');
  exception when others then insert into _audit values ('W4 forcer l''accès Maison (parent_access)', 'OK (refusé)', sqlerrm); end;

  begin
    insert into public.qa_accounts (email) values ('pirate@example.com');
    insert into _audit values ('W5 s''ajouter aux comptes QA (achats sandbox)', 'FAILLE', 'écriture acceptée');
  exception when others then insert into _audit values ('W5 s''ajouter aux comptes QA (achats sandbox)', 'OK (refusé)', sqlerrm); end;

  begin
    update public.children set first_name = first_name
    where family_id not in (select id from public.families where parent_id = me);
    get diagnostics n = row_count;
    insert into _audit values ('W6 modifier l''enfant d''une autre famille', case when n = 0 then 'OK' else 'FAILLE' end, n::text || ' ligne(s)');
  exception when others then insert into _audit values ('W6 modifier l''enfant d''une autre famille', 'OK (refusé)', sqlerrm); end;

  -- ── Le serveur reste la seule source de vérité de l'accès ──────────────────
  insert into _audit values ('I1 access_state() du parent testé', 'INFO',
    (select (public.access_state() - 'forced' - 'sections')::text));
end $$;

reset role;
select test, verdict, left(detail, 140) as detail from _audit order by test;
-- Rien n'est conservé :
rollback;

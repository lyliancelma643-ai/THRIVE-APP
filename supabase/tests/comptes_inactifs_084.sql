-- ════════════════════════════════════════════════════════════════════════════
-- Comptes désactivés / rétrogradés — migration 084 (audit QA 2026-10-27, C-1).
--
-- Bloc PL/pgSQL qui se termine TOUJOURS par une exception (tout est annulé) :
--   INACTIVE_084_PASSED {…}   ou   INACTIVE_084_FAILED [échecs] {…}
-- Avant 084 le même fichier doit échouer (preuve que le test voit la faille).
-- Base : réplique supabase/tests/local (seed 01 : coach_a suit d1 et d2,
-- parent_p = famille de d1, admin a1, super admin a2). JWT simulés, jamais
-- modifiés pendant le test : on reproduit un jeton émis AVANT la désactivation.
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  res jsonb := '{}'::jsonb;
  adm  constant uuid := '00000000-0000-0000-0000-0000000000a1';
  sup  constant uuid := '00000000-0000-0000-0000-0000000000a2';
  co   constant uuid := '00000000-0000-0000-0000-0000000000c1';
  par  constant uuid := '00000000-0000-0000-0000-0000000000b1';
  kid  constant uuid := '00000000-0000-0000-0000-0000000000d1';
  fam  constant uuid := '00000000-0000-0000-0000-0000000000f1';
  n int; b boolean; s text;
begin
  -- ── Comptes actifs : accès normaux (rien ne régresse) ─────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', co, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  if not private.can_edit_child_bilan(kid) then fails := fails || 'coach actif : can_edit_child_bilan faux'::text; end if;
  select count(*) into n from public.children where id = kid;
  if n <> 1 then fails := fails || 'coach actif ne voit pas l''enfant suivi'::text; end if;
  select count(*) into n from public.sessions where child_id = kid;
  res := res || jsonb_build_object('coach_actif_seances', n);
  if n = 0 then fails := fails || 'coach actif ne voit pas les séances'::text; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  if not private.is_admin_or_super() then fails := fails || 'admin actif : is_admin_or_super faux'::text; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', par, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  if not private.is_parent_of_child(kid) then fails := fails || 'parent actif : is_parent_of_child faux'::text; end if;
  reset role;

  -- ── Désactivation (comme admin-update-user, par le service) ───────────────
  perform set_config('request.jwt.claims', '', true);
  update public.profiles set is_active = false where id in (co, par, sup);
  update public.profiles set role = 'PARENT' where id = adm;   -- admin rétrogradé

  -- Coach désactivé, JWT encore valide
  perform set_config('request.jwt.claims', json_build_object('sub', co, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  if private.can_edit_child_bilan(kid) then fails := fails || 'coach inactif : can_edit_child_bilan vrai'::text; end if;
  if private.can_view_child_bilan(kid) then fails := fails || 'coach inactif : can_view_child_bilan vrai'::text; end if;
  if private.is_coach_of_family(fam) then fails := fails || 'coach inactif : is_coach_of_family vrai'::text; end if;
  if private.is_program_coach_of_child(kid) then fails := fails || 'coach inactif : is_program_coach_of_child vrai'::text; end if;
  select count(*) into n from public.children where id = kid;
  res := res || jsonb_build_object('coach_inactif_enfants', n);
  if n <> 0 then fails := fails || 'coach inactif voit encore l''enfant'::text; end if;
  select count(*) into n from public.sessions where child_id = kid;
  res := res || jsonb_build_object('coach_inactif_seances', n);
  if n <> 0 then fails := fails || 'coach inactif voit encore les séances'::text; end if;
  select count(*) into n from public.coach_reports where coach_id = co;
  if n <> 0 then fails := fails || 'coach inactif voit encore ses rapports'::text; end if;
  b := false;
  begin
    update public.sessions set coach_notes = 'écrit après désactivation' where child_id = kid;
    get diagnostics n = row_count;
    b := n = 0;
  exception when insufficient_privilege then b := true; end;
  if not b then fails := fails || 'coach inactif modifie encore les séances'::text; end if;
  -- Son profil reste lisible : AccountSync y lit is_active pour le déconnecter.
  select count(*) into n from public.profiles where id = co and not is_active;
  if n <> 1 then fails := fails || 'coach inactif ne lit plus son profil (AccountSync aveugle)'::text; end if;
  reset role;

  -- Admin rétrogradé, JWT encore « ADMIN »
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'ADMIN'))::text, true);
  set local role authenticated;
  if private.is_admin_or_super() then fails := fails || 'admin rétrogradé : is_admin_or_super vrai'::text; end if;
  if private.is_admin() then fails := fails || 'admin rétrogradé : is_admin vrai'::text; end if;
  b := false;
  begin
    perform public.confirm_child(kid);
  exception when others then b := true; end;
  if not b then fails := fails || 'admin rétrogradé : confirm_child accepté'::text; end if;
  reset role;

  -- Super admin désactivé
  perform set_config('request.jwt.claims', json_build_object('sub', sup, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'SUPER_ADMIN'))::text, true);
  set local role authenticated;
  if private.is_super_admin() then fails := fails || 'super admin inactif : is_super_admin vrai'::text; end if;
  if private.is_super_admin_jwt() then fails := fails || 'super admin inactif : is_super_admin_jwt vrai'::text; end if;
  if private.can_edit_child_bilan(kid) then fails := fails || 'super admin inactif : can_edit_child_bilan vrai'::text; end if;
  reset role;

  -- Parent désactivé : plus de lien avec l'enfant, et le verrou parent reste fermé
  perform set_config('request.jwt.claims', json_build_object('sub', par, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  if private.is_family_parent(fam) then fails := fails || 'parent inactif : is_family_parent vrai'::text; end if;
  if private.is_parent_of_child(kid) then fails := fails || 'parent inactif : is_parent_of_child vrai'::text; end if;
  select count(*) into n from public.children where family_id = fam;
  res := res || jsonb_build_object('parent_inactif_enfants', n);
  if n <> 0 then fails := fails || 'parent inactif voit encore ses enfants'::text; end if;
  s := private.jwt_role();
  if s is distinct from 'PARENT' then fails := fails || ('jwt_role modifié (verrous gate_parent_* ouverts) : ' || coalesce(s, 'null')); end if;
  reset role;

  -- ── Réactivation : les droits reviennent ──────────────────────────────────
  perform set_config('request.jwt.claims', '', true);
  update public.profiles set is_active = true where id = co;
  perform set_config('request.jwt.claims', json_build_object('sub', co, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'COACH'))::text, true);
  set local role authenticated;
  if not private.can_edit_child_bilan(kid) then fails := fails || 'coach réactivé : accès non rétabli'::text; end if;
  reset role;

  -- Appel sans utilisateur (service / cron) : aucun droit implicite
  perform set_config('request.jwt.claims', '', true);
  if to_regprocedure('private.caller_is_active()') is null then
    fails := fails || 'private.caller_is_active absente'::text;
  elsif private.caller_is_active() then
    fails := fails || 'caller_is_active vrai sans utilisateur'::text;
  end if;

  if array_length(fails, 1) is null then
    raise exception 'INACTIVE_084_PASSED %', res;
  end if;
  raise exception 'INACTIVE_084_FAILED % %', fails, res;
end
$test$;

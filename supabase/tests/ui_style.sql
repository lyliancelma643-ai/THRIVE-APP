-- ════════════════════════════════════════════════════════════════════════════
-- Style de l'app — migration 083 (GO 4 : lin | veillee). Bloc qui se termine
-- TOUJOURS par une exception (donc tout est annulé) :
--   UI_STYLE_PASSED {…}   ou   UI_STYLE_FAILED [échecs] {…}
-- Données synthétiques ; claims JWT simulés sous le rôle `authenticated`.
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  pa uuid := gen_random_uuid();
  pb uuid := gen_random_uuid();
  s text; r text; ok boolean; n int;
  claims_a text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values
    (pa, 'ua@example.test', '{"role":"PARENT"}'), (pb, 'ub@example.test', '{"role":"PARENT"}');
  insert into public.profiles (id, email, role) values (pa, 'ua@example.test', 'PARENT'), (pb, 'ub@example.test', 'PARENT')
    on conflict (id) do nothing;
  claims_a := json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text;

  -- 0) défaut : NULL (l'app retombe sur 'lin')
  select ui_style into s from public.profiles where id = pa;
  if s is not null then fails := array_append(fails, 'defaut_non_null'); end if;

  perform set_config('request.jwt.claims', claims_a, true);
  set local role authenticated;

  -- 1) valeurs GO 4 acceptées telles quelles (et renvoyées)
  r := public.set_ui_style('veillee');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'veillee' or r is distinct from 'veillee' then fails := array_append(fails, 'veillee_refuse'); end if;
  r := public.set_ui_style('lin');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'lin' or r is distinct from 'lin' then fails := array_append(fails, 'lin_refuse'); end if;

  -- 2) anciennes valeurs (clients GO 3) normalisées : natif|carnet → lin, nuit → veillee
  r := public.set_ui_style('nuit');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'veillee' or r is distinct from 'veillee' then fails := array_append(fails, 'nuit_non_normalise'); end if;
  r := public.set_ui_style('natif');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'lin' or r is distinct from 'lin' then fails := array_append(fails, 'natif_non_normalise'); end if;
  perform public.set_ui_style('veillee');
  r := public.set_ui_style('carnet');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'lin' or r is distinct from 'lin' then fails := array_append(fails, 'carnet_non_normalise'); end if;

  -- 3) valeur inconnue refusée en 22023, sans altérer la valeur en place
  perform public.set_ui_style('veillee');
  begin perform public.set_ui_style('fluo'); fails := array_append(fails, 'inconnue_acceptee');
  exception when sqlstate '22023' then null; when others then fails := array_append(fails, 'inconnue_mauvais_code_' || sqlstate); end;
  begin perform public.set_ui_style(''); fails := array_append(fails, 'vide_accepte');
  exception when sqlstate '22023' then null; when others then fails := array_append(fails, 'vide_mauvais_code_' || sqlstate); end;
  begin perform public.set_ui_style('LIN'); fails := array_append(fails, 'casse_acceptee');
  exception when sqlstate '22023' then null; when others then fails := array_append(fails, 'casse_mauvais_code_' || sqlstate); end;
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'veillee' then fails := array_append(fails, 'style_altere_par_refus'); end if;

  -- 4) NULL remet le défaut (NULL)
  r := public.set_ui_style(null);
  select ui_style into s from public.profiles where id = pa;
  if s is not null or r is not null then fails := array_append(fails, 'null_non_accepte'); end if;

  -- 5) un parent n'écrit que sa ligne
  reset role;
  update public.profiles set ui_style = 'veillee' where id = pb;
  perform set_config('request.jwt.claims', claims_a, true);
  set local role authenticated;
  --   a) via la RPC (aucun identifiant en paramètre) : seule la ligne de A bouge
  perform public.set_ui_style('lin');
  --   b) UPDATE direct sur la ligne de B : la RLS (profiles_update_own) ne laisse rien passer
  update public.profiles set ui_style = 'lin' where id = pb;
  get diagnostics n = row_count;
  if n <> 0 then fails := array_append(fails, 'update_direct_autre_ligne'); end if;
  --   c) UPDATE direct sur sa propre ligne : une ancienne valeur ne passe pas la contrainte
  begin
    update public.profiles set ui_style = 'nuit' where id = pa;
    fails := array_append(fails, 'update_direct_ancienne_valeur_acceptee');
  exception when check_violation then null; when others then fails := array_append(fails, 'update_direct_mauvais_code_' || sqlstate); end;
  reset role;
  select ui_style into s from public.profiles where id = pb;
  if s is distinct from 'veillee' then fails := array_append(fails, 'style_autre_parent_modifie'); end if;
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'lin' then fails := array_append(fails, 'style_propre_perdu'); end if;
  select role::text into r from public.profiles where id = pa;
  if r is distinct from 'PARENT' then fails := array_append(fails, 'role_touche'); end if;
  --   d) une seule signature, set_ui_style(text) : aucun paramètre d'identifiant
  select count(*) = 1 and bool_and(p.pronargs = 1 and p.proargtypes[0] = 'text'::regtype) into ok
    from pg_proc p where p.proname = 'set_ui_style' and p.pronamespace = 'public'::regnamespace;
  if not coalesce(ok, false) then fails := array_append(fails, 'signature_inattendue'); end if;

  -- 6) contrainte : seules lin | veillee | NULL sont stockables, même hors RPC
  foreach s in array array['natif', 'nuit', 'carnet', 'fluo'] loop
    begin
      update public.profiles set ui_style = s where id = pb;
      fails := array_append(fails, 'contrainte_laisse_passer_' || s);
    exception when check_violation then null; end;
  end loop;

  -- 7) EXECUTE : ni public ni anon ; authenticated oui
  if has_function_privilege('anon', 'public.set_ui_style(text)', 'execute') then fails := array_append(fails, 'anon_peut_executer'); end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
              where p.oid = 'public.set_ui_style(text)'::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    fails := array_append(fails, 'public_peut_executer');
  end if;
  if not has_function_privilege('authenticated', 'public.set_ui_style(text)', 'execute') then fails := array_append(fails, 'authenticated_ne_peut_pas'); end if;
  begin
    perform set_config('request.jwt.claims', '{}', true);
    set local role anon;
    perform public.set_ui_style('veillee');
    fails := array_append(fails, 'anon_a_execute');
  exception when insufficient_privilege then null; when others then fails := array_append(fails, 'anon_erreur_inattendue_' || sqlstate);
  end;
  reset role;
  --   anon n'écrit pas non plus par UPDATE direct
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  begin
    update public.profiles set ui_style = 'lin' where id = pb;
    get diagnostics n = row_count;
    if n <> 0 then fails := array_append(fails, 'anon_update_direct'); end if;
  exception when insufficient_privilege then null; end;
  reset role;

  -- 8) sans identité (authenticated sans sub) : refusé en 28000
  perform set_config('request.jwt.claims', '{}', true);
  set local role authenticated;
  begin perform public.set_ui_style('veillee'); fails := array_append(fails, 'sans_uid_accepte');
  exception when sqlstate '28000' then null; when others then fails := array_append(fails, 'sans_uid_mauvais_code_' || sqlstate); end;
  reset role;
  select ui_style into s from public.profiles where id = pb;
  if s is distinct from 'veillee' then fails := array_append(fails, 'style_b_altere_fin'); end if;

  -- 9) fonction définer verrouillée : SECURITY DEFINER + search_path vide
  select p.prosecdef and ('search_path=""' = any(p.proconfig)) into ok
    from pg_proc p where p.oid = 'public.set_ui_style(text)'::regprocedure;
  if not coalesce(ok, false) then fails := array_append(fails, 'definer_ou_search_path'); end if;

  if array_length(fails, 1) is null then
    raise exception 'UI_STYLE_PASSED {}';
  else
    raise exception 'UI_STYLE_FAILED % {}', fails;
  end if;
end
$test$;

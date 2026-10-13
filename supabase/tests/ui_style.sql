-- ════════════════════════════════════════════════════════════════════════════
-- Style de l'app — migration 083. Bloc qui se termine TOUJOURS par une exception :
--   UI_STYLE_PASSED {…}   ou   UI_STYLE_FAILED [échecs] {…}
-- Données synthétiques ; claims JWT simulés sous le rôle `authenticated`.
-- ════════════════════════════════════════════════════════════════════════════
do $test$
declare
  fails text[] := '{}';
  pa uuid := gen_random_uuid();
  pb uuid := gen_random_uuid();
  s text; r text; ok boolean;
begin
  insert into auth.users (id, email, raw_app_meta_data) values
    (pa, 'ua@example.test', '{"role":"PARENT"}'), (pb, 'ub@example.test', '{"role":"PARENT"}');
  insert into public.profiles (id, email, role) values (pa, 'ua@example.test', 'PARENT'), (pb, 'ub@example.test', 'PARENT')
    on conflict (id) do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;

  -- 1) un parent règle son style et le relit
  perform public.set_ui_style('nuit');
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'nuit' then fails := array_append(fails, 'reglage_propre_style'); end if;

  -- 2) valeur hors liste refusée
  begin perform public.set_ui_style('fluo'); fails := array_append(fails, 'valeur_hors_liste_acceptee');
  exception when others then null; end;
  select ui_style into s from public.profiles where id = pa;
  if s is distinct from 'nuit' then fails := array_append(fails, 'style_altere_par_refus'); end if;

  -- 3) NULL remet le défaut
  perform public.set_ui_style(null);
  select ui_style into s from public.profiles where id = pa;
  if s is not null then fails := array_append(fails, 'null_non_accepte'); end if;

  -- 4) le style de B n'est pas touché par A (la RPC ne prend aucun identifiant)
  reset role;
  update public.profiles set ui_style = 'carnet' where id = pb;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'PARENT'))::text, true);
  set local role authenticated;
  perform public.set_ui_style('natif');
  reset role;
  select ui_style into s from public.profiles where id = pb;
  if s is distinct from 'carnet' then fails := array_append(fails, 'style_autre_parent_modifie'); end if;
  select role::text into r from public.profiles where id = pa;
  if r is distinct from 'PARENT' then fails := array_append(fails, 'role_touche'); end if;

  -- 5) la fonction n'est exécutable ni par anon ni par public ; authentifié oui
  if has_function_privilege('anon', 'public.set_ui_style(text)', 'execute') then fails := array_append(fails, 'anon_peut_executer'); end if;
  if not has_function_privilege('authenticated', 'public.set_ui_style(text)', 'execute') then fails := array_append(fails, 'authenticated_ne_peut_pas'); end if;
  begin
    perform set_config('request.jwt.claims', '{}', true);
    set local role anon;
    perform public.set_ui_style('nuit');
    fails := array_append(fails, 'anon_a_execute');
  exception when insufficient_privilege then null; when others then fails := array_append(fails, 'anon_erreur_inattendue');
  end;
  reset role;

  -- 6) sans identité (authenticated sans sub) : refusé
  perform set_config('request.jwt.claims', '{}', true);
  set local role authenticated;
  begin perform public.set_ui_style('nuit'); fails := array_append(fails, 'sans_uid_accepte');
  exception when others then null; end;
  reset role;

  -- 7) search_path vide sur la fonction définer
  select ('search_path=""' = any(proconfig)) into ok from pg_proc where oid = 'public.set_ui_style(text)'::regprocedure;
  if not coalesce(ok, false) then fails := array_append(fails, 'search_path_non_verrouille'); end if;

  if array_length(fails, 1) is null then
    raise exception 'UI_STYLE_PASSED {}';
  else
    raise exception 'UI_STYLE_FAILED % {}', fails;
  end if;
end
$test$;

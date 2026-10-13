-- ════════════════════════════════════════════════════════════════════════════
-- 083 · Style de l'app synchronisé (GO 3 lot O5, révisé GO 4 lot O6) — idempotente.
-- Deux styles : 'lin' (clair) et 'veillee' (sombre). NULL = défaut décidé côté
-- app ('lin'). Colonne profiles.ui_style et une RPC qui n'écrit QUE cette
-- colonne, pour la ligne de l'appelant (auth.uid(), aucun identifiant en
-- paramètre). Aucune policy ni aucun trigger existant n'est modifié (role,
-- coach_validated restent protégés par les gardes 018 et 066). Lecture : policy
-- profiles_select_policy (le parent lit déjà sa propre ligne).
--
-- Compatibilité : les valeurs du GO 3 (natif, carnet, nuit) sont converties
-- (natif|carnet → lin, nuit → veillee), à la fois dans les données déjà
-- présentes (base où la version GO 3 de 083 aurait tourné) et dans la RPC, pour
-- qu'un ancien client ne casse pas. Même table que
-- apps/mobile/src/design/styleMigration.ts.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles add column if not exists ui_style text;

do $$
declare
  v_def text;
begin
  -- 1) Ancienne contrainte GO 3 (natif|nuit|carnet) : on la retire avant de convertir.
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.profiles'::regclass and conname = 'profiles_ui_style_check';
  if v_def is not null and v_def not like '%veillee%' then
    alter table public.profiles drop constraint profiles_ui_style_check;
    v_def := null;
  end if;

  -- 2) Normalisation des données existantes (aucune valeur perdue ; inconnue → défaut).
  update public.profiles
     set ui_style = case ui_style
                      when 'natif'  then 'lin'
                      when 'carnet' then 'lin'
                      when 'nuit'   then 'veillee'
                      else null
                    end
   where ui_style is not null and ui_style not in ('lin', 'veillee');

  -- 3) Contrainte GO 4.
  if v_def is null then
    alter table public.profiles
      add constraint profiles_ui_style_check check (ui_style in ('lin', 'veillee'));
  end if;
end $$;

comment on column public.profiles.ui_style is
  'Style visuel choisi dans l''app mobile (lin, veillee). NULL = défaut de l''app (lin). Écrit uniquement via public.set_ui_style.';

create or replace function public.set_ui_style(p_style text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_style text;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  v_style := case p_style
               when 'lin'     then 'lin'
               when 'veillee' then 'veillee'
               -- anciennes valeurs (clients GO 3)
               when 'natif'   then 'lin'
               when 'carnet'  then 'lin'
               when 'nuit'    then 'veillee'
             end;

  if p_style is not null and v_style is null then
    raise exception 'Style inconnu' using errcode = '22023';
  end if;

  update public.profiles set ui_style = v_style where id = v_uid;
  return v_style;
end;
$$;

comment on function public.set_ui_style(text) is
  'Règle le style de l''app du parent connecté (colonne ui_style de sa seule ligne de profil) : lin | veillee ; '
  'natif|carnet → lin et nuit → veillee (anciens clients) ; NULL remet le défaut ; autre valeur → 22023. Renvoie la valeur enregistrée.';

revoke all on function public.set_ui_style(text) from public, anon;
grant execute on function public.set_ui_style(text) to authenticated;

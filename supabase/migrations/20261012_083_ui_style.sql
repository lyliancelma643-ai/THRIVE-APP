-- ════════════════════════════════════════════════════════════════════════════
-- 083 · Style de l'app synchronisé (GO 3, lot O5) — idempotente.
-- Colonne profiles.ui_style (NULL = style par défaut décidé côté app) et une
-- RPC qui n'écrit QUE cette colonne, pour la ligne de l'appelant. Aucune policy
-- ni aucun trigger existant n'est modifié (role, coach_validated restent
-- protégés par les gardes 018 et 066). Lecture : policy profiles_select_policy
-- (le parent lit déjà sa propre ligne).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles add column if not exists ui_style text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.profiles'::regclass and conname = 'profiles_ui_style_check') then
    alter table public.profiles
      add constraint profiles_ui_style_check check (ui_style in ('natif', 'nuit', 'carnet'));
  end if;
end $$;

comment on column public.profiles.ui_style is
  'Style visuel choisi dans l''app mobile (natif, nuit, carnet). NULL = défaut de l''app. Écrit uniquement via public.set_ui_style.';

create or replace function public.set_ui_style(p_style text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;
  if p_style is not null and p_style not in ('natif', 'nuit', 'carnet') then
    raise exception 'Style inconnu' using errcode = '22023';
  end if;
  update public.profiles set ui_style = p_style where id = v_uid;
  return p_style;
end;
$$;

comment on function public.set_ui_style(text) is
  'Règle le style de l''app du parent connecté (colonne ui_style de sa seule ligne de profil). NULL remet le défaut.';

revoke all on function public.set_ui_style(text) from public, anon;
grant execute on function public.set_ui_style(text) to authenticated;

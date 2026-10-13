-- Rollback 083 : retire la RPC puis la colonne de style (la contrainte tombe avec elle).
drop function if exists public.set_ui_style(text);
alter table public.profiles drop constraint if exists profiles_ui_style_check;
alter table public.profiles drop column if exists ui_style;

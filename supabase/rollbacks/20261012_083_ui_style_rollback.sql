-- Rollback 083 (style de l'app, lin | veillee) — idempotent, rejouable.
-- Retire la RPC, la contrainte puis la colonne : la base revient à l'état d'avant 083.
-- Le choix de style des parents est perdu côté serveur ; l'app garde sa copie locale
-- (AsyncStorage) et retombe sur le défaut 'lin' sans erreur.
drop function if exists public.set_ui_style(text);
alter table public.profiles drop constraint if exists profiles_ui_style_check;
alter table public.profiles drop column if exists ui_style;

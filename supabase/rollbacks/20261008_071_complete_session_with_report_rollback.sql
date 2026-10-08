-- Rollback de 20261008_071_complete_session_with_report.sql
-- Sans effet sur les données : retire la fonction et les deux index uniques.
-- Les bilans déjà enregistrés restent en place ; le front d'avant 071 (écritures
-- séparées) refonctionne tel quel après ce rollback.
drop index if exists public.reports_one_per_session_uidx;
drop index if exists public.coach_reports_one_per_session_uidx;
drop function if exists public.complete_session_with_report(uuid, jsonb);

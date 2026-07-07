-- ─────────────────────────────────────────────────────────────────────────────
-- 034 — Durcissement search_path des fonctions SECURITY DEFINER historiques.
--
-- Les migrations 002/003/004/010 créent des fonctions SECURITY DEFINER sans
-- `SET search_path` : sur un REPLAY complet des migrations (nouvel env, CI,
-- branche de dev), ces fonctions seraient vulnérables au détournement de
-- search_path (CVE-classique Postgres : un objet malicieux dans un schéma
-- prioritaire intercepte les références non qualifiées).
--
-- La prod THRIVE-CA a déjà été corrigée via la passe advisors (vérifié le
-- 2026-07-06 : 0 fonction SECURITY DEFINER sans search_path). Cette migration
-- codifie l'état dans le dépôt — idempotente et no-op si déjà appliquée.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- 002 — push notifications
  if to_regprocedure('public.notify_new_message()') is not null then
    alter function public.notify_new_message() set search_path = public;
  end if;
  if to_regprocedure('public.notify_badge_awarded()') is not null then
    alter function public.notify_badge_awarded() set search_path = public;
  end if;

  -- Les triggers réels en prod portent des noms légèrement différents
  if to_regprocedure('public.notify_on_new_message()') is not null then
    alter function public.notify_on_new_message() set search_path = public;
  end if;
  if to_regprocedure('public.notify_on_badge_awarded()') is not null then
    alter function public.notify_on_badge_awarded() set search_path = public;
  end if;

  -- 003 — analytics (export CSV des séances)
  if to_regprocedure('public.export_sessions_csv(uuid, date, date)') is not null then
    alter function public.export_sessions_csv(uuid, date, date) set search_path = public;
  end if;

  -- 004 — onboarding
  if to_regprocedure('public.complete_onboarding(uuid)') is not null then
    alter function public.complete_onboarding(uuid) set search_path = public;
  end if;

  -- 010 — notification de séance planifiée
  if to_regprocedure('public.notify_on_session_scheduled()') is not null then
    alter function public.notify_on_session_scheduled() set search_path = public;
  end if;

  -- Filet de sécurité : toute autre fonction SECURITY DEFINER de public/private
  -- encore sans search_path est alignée sur public.
  declare
    r record;
  begin
    for r in
      select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and p.prosecdef
        and (p.proconfig is null
             or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
    loop
      execute format('alter function %s set search_path = public', r.sig);
    end loop;
  end;
end;
$$;

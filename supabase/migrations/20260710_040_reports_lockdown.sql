-- 20260710_040_reports_lockdown.sql
-- ⚠️ NE PAS APPLIQUER AVANT LE DÉPLOIEMENT DU CODE DE CETTE BRANCHE.
--
-- Dernière marche de la Phase 3 : couper la lecture BRUTE de `reports` (legacy)
-- côté parent. Aujourd'hui le code déployé (my-sessions) lit `reports` en direct
-- et floute côté client — un parent Essentiel peut donc lire le bilan détaillé
-- via l'API REST. La branche remplace cette lecture par le RPC filtré
-- public.session_report (migration 039).
--
-- Cette migration est BREAKING pour l'ancien code : à appliquer dans la même
-- release que le déploiement du front (sinon les bilans disparaissent de
-- l'ancienne UI). Coach/admin strictement inchangés.
--
-- Rollback (down) :
--   create policy reports_parent_read on public.reports for select to authenticated
--     using (private.is_parent_of_child(child_id));
--   -- et recréer reports_read avec sa branche parent (voir qual d'origine ci-dessous).

-- down: qual d'origine de reports_read :
--   ((generated_by = (select auth.uid())) or private.is_admin()
--    or (exists (select 1 from children c join families f on f.id = c.family_id
--                where c.id = reports.child_id and f.parent_id = (select auth.uid()))))
drop policy if exists reports_parent_read on public.reports;

drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports
  for select
  using (
    (generated_by = (select auth.uid()))
    or private.is_admin()
  );

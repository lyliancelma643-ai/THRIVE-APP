-- ============================================================
-- Migration 014 — Casse la récursion RLS children <-> families
-- <-> coach_assignments via des fonctions SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_parent_of_child(p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM children c
    JOIN families f ON f.id = c.family_id
    WHERE c.id = p_child AND f.parent_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_coach(p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_assignments ca
    WHERE ca.child_id = p_child AND ca.coach_id = auth.uid() AND ca.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach_of_family(p_family uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_assignments ca
    JOIN children c ON c.id = ca.child_id
    WHERE c.family_id = p_family AND ca.coach_id = auth.uid() AND ca.is_active
  );
$$;

DROP POLICY IF EXISTS children_coach_assigned_read ON public.children;
CREATE POLICY children_coach_assigned_read ON public.children
  FOR SELECT TO authenticated
  USING (public.is_assigned_coach(id));

DROP POLICY IF EXISTS families_select_policy ON public.families;
CREATE POLICY families_select_policy ON public.families
  FOR SELECT TO authenticated
  USING (
    auth.uid() = parent_id
    OR public.is_admin()
    OR public.is_coach_of_family(id)
  );

DROP POLICY IF EXISTS assignments_parent_read ON public.coach_assignments;
CREATE POLICY assignments_parent_read ON public.coach_assignments
  FOR SELECT TO authenticated
  USING (public.is_parent_of_child(child_id));

DROP POLICY IF EXISTS sessions_parent_read ON public.sessions;
CREATE POLICY sessions_parent_read ON public.sessions
  FOR SELECT TO authenticated
  USING (public.is_parent_of_child(child_id));

DROP POLICY IF EXISTS reports_parent_read ON public.reports;
CREATE POLICY reports_parent_read ON public.reports
  FOR SELECT TO authenticated
  USING (public.is_parent_of_child(child_id));

DROP POLICY IF EXISTS runs_coach_read ON public.video_session_runs;
CREATE POLICY runs_coach_read ON public.video_session_runs
  FOR SELECT TO authenticated
  USING (public.is_assigned_coach(child_id));

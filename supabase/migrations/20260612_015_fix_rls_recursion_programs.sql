-- ============================================================
-- Migration 015 — Fin de la récursion children <-> programs
-- + politiques manquantes sur program_enrollments
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_program_coach_of_child(p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM program_enrollments pe
    JOIN programs pr ON pr.id = pe.program_id
    WHERE pe.child_id = p_child AND pr.coach_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_program(p_program uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM program_enrollments pe
    JOIN children c ON c.id = pe.child_id
    JOIN families f ON f.id = c.family_id
    WHERE pe.program_id = p_program AND f.parent_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS children_coach_read ON public.children;
DROP POLICY IF EXISTS children_coach_select ON public.children;
CREATE POLICY children_coach_select ON public.children
  FOR SELECT TO authenticated
  USING (public.is_program_coach_of_child(id));

DROP POLICY IF EXISTS programs_parent_read ON public.programs;
CREATE POLICY programs_parent_read ON public.programs
  FOR SELECT TO authenticated
  USING (public.is_parent_of_program(id));

DROP POLICY IF EXISTS enrollments_coach_read ON public.program_enrollments;
CREATE POLICY enrollments_coach_read ON public.program_enrollments
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM programs pr WHERE pr.id = program_id AND pr.coach_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM programs pr WHERE pr.id = program_id AND pr.coach_id = auth.uid())
  );

DROP POLICY IF EXISTS enrollments_parent_read ON public.program_enrollments;
CREATE POLICY enrollments_parent_read ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (public.is_parent_of_child(child_id));

-- Rattrapage : tous les enfants actifs d'une famille déjà suivie par un
-- coach sont assignés à ce coach (enfants créés avant le trigger 013)
INSERT INTO coach_assignments (coach_id, child_id, assigned_by, is_active)
SELECT DISTINCT ca.coach_id, c2.id, ca.assigned_by, true
FROM coach_assignments ca
JOIN children c1 ON c1.id = ca.child_id
JOIN children c2 ON c2.family_id = c1.family_id AND c2.is_active
WHERE ca.is_active
ON CONFLICT (coach_id, child_id) DO UPDATE SET is_active = true;

-- ============================================================
-- Migration 013 — Visibilité des enfants : parent / admin /
-- coach assigné + rattachement automatique des nouveaux
-- enfants au coach de la famille.
--
-- Sécurité : supprime aussi l'accès global qu'avaient TOUS les
-- coaches à TOUS les enfants et TOUTES les familles.
-- ============================================================

-- 1. Le coach voit les enfants qui lui sont assignés
DROP POLICY IF EXISTS children_coach_assigned_read ON public.children;
CREATE POLICY children_coach_assigned_read ON public.children
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_assignments ca
      WHERE ca.child_id = children.id
        AND ca.coach_id = auth.uid()
        AND ca.is_active
    )
  );

-- 2. Suppression de l'accès global des coaches à tous les enfants
DROP POLICY IF EXISTS "Parents can view their children" ON public.children;

-- 3. Familles : le coach voit la famille de ses enfants assignés
DROP POLICY IF EXISTS families_select_policy ON public.families;
CREATE POLICY families_select_policy ON public.families
  FOR SELECT TO authenticated
  USING (
    auth.uid() = parent_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.coach_assignments ca
      JOIN public.children c ON c.id = ca.child_id
      WHERE c.family_id = families.id
        AND ca.coach_id = auth.uid()
        AND ca.is_active
    )
  );

-- 4. Rattachement automatique au coach de la famille
CREATE OR REPLACE FUNCTION public.auto_assign_family_coach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coach_assignments (coach_id, child_id, assigned_by, is_active)
  SELECT DISTINCT ca.coach_id, NEW.id, ca.assigned_by, true
  FROM public.coach_assignments ca
  JOIN public.children sibling ON sibling.id = ca.child_id
  WHERE sibling.family_id = NEW.family_id
    AND ca.is_active
  ON CONFLICT (coach_id, child_id) DO UPDATE SET is_active = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_family_coach ON public.children;
CREATE TRIGGER trg_auto_assign_family_coach
  AFTER INSERT ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_family_coach();

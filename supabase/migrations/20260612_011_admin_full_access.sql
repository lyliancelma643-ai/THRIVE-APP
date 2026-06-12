-- ============================================================
-- Migration 011 — Pouvoir complet du super admin / admin
-- 1. Admin : gestion complète des familles (création d'enfants
--    pour un parent depuis le dashboard)
-- 2. Realtime sur profiles/children/families : les nouveaux
--    comptes apparaissent en direct au dashboard admin
-- ============================================================
DROP POLICY IF EXISTS families_admin_all ON public.families;
CREATE POLICY families_admin_all ON public.families
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.children;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.families;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

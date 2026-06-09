-- ============================================================
-- Migration 006 : Realtime + RLS — profiles, families, children
-- Appliquée le 2026-06-09
-- Schema réel : programs.coach_id, program_enrollments(program_id, child_id)
--               children(family_id), families(parent_id)
-- ============================================================

-- 1. Activer Realtime sur les 3 tables clés
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE families;
ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- 2. RLS activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own"        ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"        ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger"    ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_select_all"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
  ));

CREATE POLICY "profiles_admin_update_all"
  ON profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
  ));

CREATE POLICY "profiles_insert_trigger"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- FAMILIES
-- ============================================================
DROP POLICY IF EXISTS "families_parent_select"     ON families;
DROP POLICY IF EXISTS "families_parent_insert"     ON families;
DROP POLICY IF EXISTS "families_parent_update"     ON families;
DROP POLICY IF EXISTS "families_coach_select"      ON families;
DROP POLICY IF EXISTS "families_admin_select_all"  ON families;

CREATE POLICY "families_parent_select"
  ON families FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "families_parent_insert"
  ON families FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "families_parent_update"
  ON families FOR UPDATE USING (parent_id = auth.uid());

-- Coach voit les familles dont il suit au moins un enfant
CREATE POLICY "families_coach_select"
  ON families FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM children c
    JOIN program_enrollments pe ON pe.child_id = c.id
    JOIN programs pr             ON pr.id = pe.program_id
    WHERE c.family_id = families.id
      AND pr.coach_id = auth.uid()
  ));

CREATE POLICY "families_admin_select_all"
  ON families FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
  ));

-- ============================================================
-- CHILDREN
-- ============================================================
DROP POLICY IF EXISTS "children_parent_select"     ON children;
DROP POLICY IF EXISTS "children_parent_insert"     ON children;
DROP POLICY IF EXISTS "children_parent_update"     ON children;
DROP POLICY IF EXISTS "children_coach_select"      ON children;
DROP POLICY IF EXISTS "children_admin_select_all"  ON children;

CREATE POLICY "children_parent_select"
  ON children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = children.family_id AND f.parent_id = auth.uid()
  ));

CREATE POLICY "children_parent_insert"
  ON children FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = children.family_id AND f.parent_id = auth.uid()
  ));

CREATE POLICY "children_parent_update"
  ON children FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = children.family_id AND f.parent_id = auth.uid()
  ));

-- Coach voit les enfants inscrits à ses programmes
CREATE POLICY "children_coach_select"
  ON children FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM program_enrollments pe
    JOIN programs pr ON pr.id = pe.program_id
    WHERE pe.child_id = children.id
      AND pr.coach_id = auth.uid()
  ));

CREATE POLICY "children_admin_select_all"
  ON children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
  ));

-- ============================================================
-- Index performances Realtime
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_families_parent_id           ON families(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_family_id           ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role                ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_registration_status ON profiles(registration_status);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_child    ON program_enrollments(child_id);
CREATE INDEX IF NOT EXISTS idx_programs_coach_id            ON programs(coach_id);

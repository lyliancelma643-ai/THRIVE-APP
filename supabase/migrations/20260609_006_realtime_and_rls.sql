-- ============================================================
-- Migration : Activation du Realtime sur les tables principales
-- Nécessaire pour que les admins voient les nouvelles inscriptions
-- en temps réel sans recharger la page.
-- ============================================================

-- Activer la réplication Realtime sur les tables clés
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE families;
ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- S'assurer que le RLS est bien activé sur families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Politique : les admins peuvent tout voir
CREATE POLICY IF NOT EXISTS "Admins can view all families"
  ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
  );

-- Politique : un parent peut voir sa propre famille
CREATE POLICY IF NOT EXISTS "Parents can view own family"
  ON families FOR SELECT
  USING (parent_id = auth.uid());

-- Politique : un parent peut créer sa famille
CREATE POLICY IF NOT EXISTS "Parents can create own family"
  ON families FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- Politique : un parent peut mettre à jour sa famille
CREATE POLICY IF NOT EXISTS "Parents can update own family"
  ON families FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- S'assurer que le RLS est bien activé sur children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Politique : les admins peuvent tout voir dans children
CREATE POLICY IF NOT EXISTS "Admins can view all children"
  ON children FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ADMIN', 'super_admin', 'SUPER_ADMIN')
    )
  );

-- Politique : un parent peut voir les enfants de sa famille
CREATE POLICY IF NOT EXISTS "Parents can view own children"
  ON children FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = children.family_id
      AND families.parent_id = auth.uid()
    )
  );

-- Politique : un parent peut créer des enfants dans sa famille
CREATE POLICY IF NOT EXISTS "Parents can create children in own family"
  ON children FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_id
      AND families.parent_id = auth.uid()
    )
  );

-- Normalisation du rôle : s'assurer que les profils parents
-- créés via self-register ont bien le bon format
UPDATE profiles
SET role = 'parent'
WHERE role = 'PARENT';

UPDATE profiles
SET role = 'coach'
WHERE role = 'COACH';

UPDATE profiles
SET role = 'admin'
WHERE role = 'ADMIN';

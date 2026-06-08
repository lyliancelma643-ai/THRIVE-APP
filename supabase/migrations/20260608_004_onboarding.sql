-- ============================================================
-- Étape 12 — Onboarding
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach','parent')),
  step_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, step_key)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own onboarding"
  ON onboarding_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET onboarding_completed = TRUE, onboarding_completed_at = NOW()
  WHERE id = p_user_id;
END;
$$;

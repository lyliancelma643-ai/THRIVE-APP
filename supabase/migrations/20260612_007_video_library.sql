-- ============================================================
-- Migration 007 — Bibliothèque vidéo (séances 20 min THRIVE)
-- + assignations coach/enfant + RLS + realtime
-- ============================================================

-- ------------------------------------------------------------
-- Helper sécurisé : rôle de l'utilisateur courant (évite la
-- récursion RLS sur profiles)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- ------------------------------------------------------------
-- 1. Catalogue des séances vidéo 20 minutes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number int NOT NULL CHECK (session_number BETWEEN 1 AND 13),
  phase text NOT NULL CHECK (phase IN ('ANCRER', 'DEVELOPPER', 'INTEGRER')),
  title text NOT NULL,
  subtitle text,
  description text,
  age_group age_group NOT NULL,
  theme text NOT NULL,
  life_skill text,
  thrive_action text, -- A1..A6, EVAL, INTEG, CONTRIB
  duration_minutes int NOT NULL DEFAULT 20,
  video_url text,
  thumbnail_url text,
  lang text NOT NULL DEFAULT 'fr',
  is_free boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_number, age_group, lang)
);

-- ------------------------------------------------------------
-- 2. Points d'interaction (overlay A/B/C/D pendant la vidéo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_interaction_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_session_id uuid NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  timecode_seconds int NOT NULL,
  question_text text NOT NULL,
  -- [{ "key": "A", "label": "...", "score": 2, "tag": "confiance" }, ...]
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_video_session
  ON public.video_interaction_points (video_session_id, timecode_seconds);

-- ------------------------------------------------------------
-- 3. Visionnages (runs) — un enfant qui suit une séance 20 min
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_session_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_session_id uuid NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  progress_seconds int NOT NULL DEFAULT 0,
  -- [{ "interaction_id": "...", "answer_key": "A", "answered_at": "..." }]
  answers_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  rpe int CHECK (rpe BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_child ON public.video_session_runs (child_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_parent ON public.video_session_runs (parent_id, started_at DESC);

-- ------------------------------------------------------------
-- 4. Assignations coach <-> enfant (accordées par l'admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_coach ON public.coach_assignments (coach_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_assignments_child ON public.coach_assignments (child_id) WHERE is_active;

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_interaction_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_session_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

-- Catalogue : lisible par tout utilisateur connecté (actives), admins gèrent tout
DROP POLICY IF EXISTS video_sessions_read ON public.video_sessions;
CREATE POLICY video_sessions_read ON public.video_sessions
  FOR SELECT TO authenticated
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS video_sessions_admin_write ON public.video_sessions;
CREATE POLICY video_sessions_admin_write ON public.video_sessions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS vip_read ON public.video_interaction_points;
CREATE POLICY vip_read ON public.video_interaction_points
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS vip_admin_write ON public.video_interaction_points;
CREATE POLICY vip_admin_write ON public.video_interaction_points
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Runs : le parent gère ses propres runs, le coach lit ceux de ses enfants assignés
DROP POLICY IF EXISTS runs_parent_all ON public.video_session_runs;
CREATE POLICY runs_parent_all ON public.video_session_runs
  FOR ALL TO authenticated
  USING (parent_id = auth.uid() OR public.is_admin())
  WITH CHECK (parent_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS runs_coach_read ON public.video_session_runs;
CREATE POLICY runs_coach_read ON public.video_session_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_assignments ca
      WHERE ca.child_id = video_session_runs.child_id
        AND ca.coach_id = auth.uid()
        AND ca.is_active
    )
  );

-- Assignations : coach voit les siennes, parent voit celles de ses enfants, admin gère
DROP POLICY IF EXISTS assignments_coach_read ON public.coach_assignments;
CREATE POLICY assignments_coach_read ON public.coach_assignments
  FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS assignments_parent_read ON public.coach_assignments;
CREATE POLICY assignments_parent_read ON public.coach_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = coach_assignments.child_id
        AND f.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS assignments_admin_all ON public.coach_assignments;
CREATE POLICY assignments_admin_all ON public.coach_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Séances 1:1 (table sessions) : le parent doit voir les séances de ses enfants
DROP POLICY IF EXISTS sessions_parent_read ON public.sessions;
CREATE POLICY sessions_parent_read ON public.sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = sessions.child_id
        AND f.parent_id = auth.uid()
    )
  );

-- Bilans (reports) : le parent lit ceux de ses enfants
DROP POLICY IF EXISTS reports_parent_read ON public.reports;
CREATE POLICY reports_parent_read ON public.reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = reports.child_id
        AND f.parent_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 6. Realtime (mise à jour automatique côté parent)
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_session_runs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ------------------------------------------------------------
-- 7. updated_at triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_video_sessions_updated ON public.video_sessions;
CREATE TRIGGER trg_video_sessions_updated
  BEFORE UPDATE ON public.video_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_runs_updated ON public.video_session_runs;
CREATE TRIGGER trg_runs_updated
  BEFORE UPDATE ON public.video_session_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

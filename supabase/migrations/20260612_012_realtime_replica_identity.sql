-- ============================================================
-- Migration 012 — Realtime fiable de bout en bout
-- REPLICA IDENTITY FULL : nécessaire pour que les événements
-- UPDATE/DELETE soient diffusés aux abonnés sous RLS
-- (sinon seuls les INSERT passent).
-- ============================================================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.children REPLICA IDENTITY FULL;
ALTER TABLE public.families REPLICA IDENTITY FULL;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.coach_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.video_session_runs REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.programs REPLICA IDENTITY FULL;
ALTER TABLE public.program_enrollments REPLICA IDENTITY FULL;

-- Catalogue vidéo + programmes : diffusés aussi en temps réel
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.programs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.program_enrollments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

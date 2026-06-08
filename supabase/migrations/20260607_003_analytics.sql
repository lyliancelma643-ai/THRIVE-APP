-- ============================================================
-- Étape 10 — Analytics & Rapports
-- ============================================================

-- Vue: KPIs globaux
CREATE OR REPLACE VIEW analytics_global_kpis AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'coach') AS total_coaches,
  (SELECT COUNT(*) FROM profiles WHERE role = 'parent') AS total_parents,
  (SELECT COUNT(*) FROM children) AS total_children,
  (SELECT COUNT(*) FROM sessions) AS total_sessions,
  (SELECT COUNT(*) FROM sessions WHERE status = 'completed') AS completed_sessions,
  (SELECT COUNT(*) FROM messages) AS total_messages,
  (SELECT COUNT(*) FROM child_badges) AS total_badges_awarded,
  (SELECT COUNT(*) FROM profiles WHERE onboarding_completed = TRUE) AS onboarded_users;

-- Vue: activité mensuelle (12 derniers mois)
CREATE OR REPLACE VIEW analytics_monthly_activity AS
SELECT
  DATE_TRUNC('month', s.scheduled_at) AS month,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  COUNT(DISTINCT s.coach_id) AS active_coaches,
  COUNT(DISTINCT sa.child_id) AS active_children
FROM sessions s
LEFT JOIN session_attendances sa ON sa.session_id = s.id
WHERE s.scheduled_at >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;

-- Vue: performance coaches
CREATE OR REPLACE VIEW analytics_coach_performance AS
SELECT
  p.id AS coach_id,
  COALESCE(p.first_name || ' ' || p.last_name, p.email) AS coach_name,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  ROUND(
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') * 100.0
    / NULLIF(COUNT(DISTINCT s.id), 0), 1
  ) AS completion_rate,
  COUNT(DISTINCT c.id) AS total_children,
  COUNT(DISTINCT cb.id) AS badges_awarded
FROM profiles p
LEFT JOIN sessions s ON s.coach_id = p.id
LEFT JOIN children c ON c.coach_id = p.id
LEFT JOIN child_badges cb ON cb.awarded_by = p.id
WHERE p.role = 'coach'
GROUP BY p.id, p.first_name, p.last_name, p.email;

-- Vue: progression enfants
CREATE OR REPLACE VIEW analytics_child_progress AS
SELECT
  c.id AS child_id,
  c.first_name,
  c.last_name,
  COUNT(DISTINCT sa.session_id) AS sessions_attended,
  COUNT(DISTINCT cb.badge_id) AS badges_earned,
  COUNT(DISTINCT qr.id) AS questionnaires_completed,
  c.created_at
FROM children c
LEFT JOIN session_attendances sa ON sa.child_id = c.id
LEFT JOIN child_badges cb ON cb.child_id = c.id
LEFT JOIN questionnaire_responses qr ON qr.child_id = c.id
GROUP BY c.id, c.first_name, c.last_name, c.created_at;

-- Fonction: export CSV sessions
CREATE OR REPLACE FUNCTION export_sessions_csv(
  p_coach_id UUID DEFAULT NULL,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID, coach_name TEXT, title TEXT,
  scheduled_at TIMESTAMPTZ, status TEXT, attendees BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    s.id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email),
    s.title,
    s.scheduled_at,
    s.status,
    COUNT(sa.id)
  FROM sessions s
  JOIN profiles p ON p.id = s.coach_id
  LEFT JOIN session_attendances sa ON sa.session_id = s.id
  WHERE
    (p_coach_id IS NULL OR s.coach_id = p_coach_id)
    AND (p_from IS NULL OR s.scheduled_at::DATE >= p_from)
    AND (p_to IS NULL OR s.scheduled_at::DATE <= p_to)
  GROUP BY s.id, p.first_name, p.last_name, p.email, s.title, s.scheduled_at, s.status
  ORDER BY s.scheduled_at DESC;
$$;

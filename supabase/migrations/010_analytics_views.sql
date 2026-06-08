-- ============================================================
-- ÉTAPE 10 — Analytics & Rapports
-- ============================================================

-- Vue KPIs globaux
CREATE OR REPLACE VIEW analytics_global_kpis AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'coach') AS total_coaches,
  (SELECT COUNT(*) FROM profiles WHERE role = 'parent') AS total_parents,
  (SELECT COUNT(*) FROM children) AS total_children,
  (SELECT COUNT(*) FROM sessions) AS total_sessions,
  (SELECT COUNT(*) FROM sessions WHERE status = 'completed') AS completed_sessions,
  (SELECT COUNT(*) FROM sessions WHERE status = 'planned' AND date >= now()) AS upcoming_sessions,
  (SELECT COUNT(*) FROM child_badges) AS total_badges_awarded,
  (SELECT COUNT(*) FROM messages) AS total_messages,
  (SELECT COUNT(*) FROM conversations) AS total_conversations,
  ROUND(
    (SELECT COUNT(*)::NUMERIC FROM sessions WHERE status = 'completed') /
    NULLIF((SELECT COUNT(*)::NUMERIC FROM sessions), 0) * 100, 1
  ) AS completion_rate_pct;

-- Vue activité mensuelle (12 derniers mois)
CREATE OR REPLACE VIEW analytics_monthly_activity AS
SELECT
  DATE_TRUNC('month', gs.month) AS month,
  COUNT(DISTINCT s.id) AS sessions_count,
  COUNT(DISTINCT m.id) AS messages_count,
  COUNT(DISTINCT cb.id) AS badges_awarded
FROM
  generate_series(
    DATE_TRUNC('month', now() - INTERVAL '11 months'),
    DATE_TRUNC('month', now()),
    '1 month'::INTERVAL
  ) gs(month)
  LEFT JOIN sessions s ON DATE_TRUNC('month', s.date) = gs.month
  LEFT JOIN messages m ON DATE_TRUNC('month', m.created_at) = gs.month
  LEFT JOIN child_badges cb ON DATE_TRUNC('month', cb.awarded_at) = gs.month
GROUP BY gs.month
ORDER BY gs.month ASC;

-- Vue performance par coach
CREATE OR REPLACE VIEW analytics_coach_performance AS
SELECT
  p.id AS coach_id,
  p.full_name AS coach_name,
  p.avatar_url,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  ROUND(
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed')::NUMERIC /
    NULLIF(COUNT(DISTINCT s.id)::NUMERIC, 0) * 100, 1
  ) AS completion_rate_pct,
  COUNT(DISTINCT ch.id) AS total_children,
  COUNT(DISTINCT cb.id) AS badges_awarded,
  MAX(s.date) AS last_session_date
FROM profiles p
LEFT JOIN sessions s ON s.coach_id = p.id
LEFT JOIN children ch ON ch.coach_id = p.id
LEFT JOIN child_badges cb ON cb.awarded_by = p.id
WHERE p.role = 'coach'
GROUP BY p.id, p.full_name, p.avatar_url
ORDER BY completed_sessions DESC;

-- Vue progression par enfant
CREATE OR REPLACE VIEW analytics_child_progress AS
SELECT
  ch.id AS child_id,
  ch.first_name,
  ch.last_name,
  ch.age,
  p_coach.full_name AS coach_name,
  p_parent.full_name AS parent_name,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  COUNT(DISTINCT cb.id) AS total_badges,
  COUNT(DISTINCT qr.id) AS questionnaires_completed,
  ROUND(AVG(qr.score) FILTER (WHERE qr.score IS NOT NULL), 1) AS avg_score,
  MAX(s.date) AS last_session_date
FROM children ch
LEFT JOIN profiles p_coach ON p_coach.id = ch.coach_id
LEFT JOIN profiles p_parent ON p_parent.id = ch.parent_id
LEFT JOIN sessions s ON s.child_id = ch.id
LEFT JOIN child_badges cb ON cb.child_id = ch.id
LEFT JOIN questionnaire_responses qr ON qr.child_id = ch.id
GROUP BY ch.id, ch.first_name, ch.last_name, ch.age, p_coach.full_name, p_parent.full_name
ORDER BY completed_sessions DESC;

-- Vue distribution des badges
CREATE OR REPLACE VIEW analytics_badge_distribution AS
SELECT
  b.id AS badge_id,
  b.name AS badge_name,
  b.icon,
  b.category,
  COUNT(cb.id) AS awarded_count,
  COUNT(DISTINCT cb.child_id) AS unique_children,
  MAX(cb.awarded_at) AS last_awarded_at
FROM badges b
LEFT JOIN child_badges cb ON cb.badge_id = b.id
GROUP BY b.id, b.name, b.icon, b.category
ORDER BY awarded_count DESC;

-- Fonction export CSV sessions
CREATE OR REPLACE FUNCTION export_sessions_csv(
  p_coach_id UUID DEFAULT NULL,
  p_from DATE DEFAULT (now() - INTERVAL '90 days')::DATE,
  p_to DATE DEFAULT now()::DATE
)
RETURNS TABLE (
  session_id TEXT, date TEXT, duration_minutes TEXT,
  status TEXT, child_name TEXT, coach_name TEXT,
  notes TEXT, created_at TEXT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    s.id::TEXT,
    s.date::TEXT,
    s.duration_minutes::TEXT,
    s.status,
    (ch.first_name || ' ' || ch.last_name),
    p.full_name,
    COALESCE(s.notes, ''),
    s.created_at::TEXT
  FROM sessions s
  JOIN children ch ON ch.id = s.child_id
  JOIN profiles p ON p.id = s.coach_id
  WHERE
    (p_coach_id IS NULL OR s.coach_id = p_coach_id)
    AND s.date::DATE BETWEEN p_from AND p_to
  ORDER BY s.date DESC;
$$;

-- RLS sur les vues (via security definer functions)
GRANT SELECT ON analytics_global_kpis TO authenticated;
GRANT SELECT ON analytics_monthly_activity TO authenticated;
GRANT SELECT ON analytics_coach_performance TO authenticated;
GRANT SELECT ON analytics_child_progress TO authenticated;
GRANT SELECT ON analytics_badge_distribution TO authenticated;

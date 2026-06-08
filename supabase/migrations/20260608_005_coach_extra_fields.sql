-- Migration: ajout des champs optionnels au profil coach
-- phone, speciality, bio étaient absents de la table profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS speciality  TEXT,
  ADD COLUMN IF NOT EXISTS bio         TEXT;

-- Vue enrichie pour le dashboard admin : liste des coaches avec stats
CREATE OR REPLACE VIEW public.admin_coaches_view AS
SELECT
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.phone,
  p.speciality,
  p.bio,
  p.is_active,
  p.created_at,
  COUNT(DISTINCT pr.id) AS program_count,
  COUNT(DISTINCT s.id)  AS session_count,
  COUNT(DISTINCT cf.child_id) AS children_count
FROM public.profiles p
LEFT JOIN public.programs pr ON pr.coach_id = p.id
LEFT JOIN public.sessions  s  ON s.coach_id = p.id
LEFT JOIN public.coach_families cf ON cf.coach_id = p.id
WHERE p.role = 'COACH'
GROUP BY p.id;

-- RLS sur la vue : accessible aux admins uniquement
GRANT SELECT ON public.admin_coaches_view TO authenticated;

COMMENT ON VIEW public.admin_coaches_view IS 'Vue enrichie des coaches pour le dashboard admin';

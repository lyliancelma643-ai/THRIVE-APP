-- ============================================================
-- Migration 016 — Assignation coach => les 13 séances THRIVE
-- existent automatiquement pour l'enfant (programme + séances
-- hebdomadaires) + rattrapage des assignations existantes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_thrive_program(p_coach uuid, p_child uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child record;
  v_group age_group;
  v_prog uuid;
  v_age int;
  s record;
  v_start timestamptz;
BEGIN
  IF EXISTS (SELECT 1 FROM sessions WHERE child_id = p_child) THEN
    RETURN;
  END IF;

  SELECT * INTO v_child FROM children WHERE id = p_child;
  IF v_child IS NULL THEN RETURN; END IF;

  v_age := COALESCE(date_part('year', age(v_child.date_of_birth))::int, 10);
  v_group := CASE WHEN v_age <= 11 THEN '8-11'::age_group
                  WHEN v_age <= 14 THEN '12-14'::age_group
                  ELSE '15-17'::age_group END;

  INSERT INTO programs (title, description, age_group, status, total_sessions, coach_id)
  VALUES ('Programme THRIVE 13 séances — ' || v_child.first_name,
          'Protocole 1:1 méthode THRIVE.', v_group, 'ACTIVE', 13, p_coach)
  RETURNING id INTO v_prog;

  INSERT INTO program_enrollments (program_id, child_id) VALUES (v_prog, p_child);

  v_start := date_trunc('week', now()) + interval '1 week' + interval '17 hours';

  FOR s IN
    SELECT * FROM (VALUES
      (1,'Diagnostic de départ / alliance'),
      (2,'Mes objectifs, mon plan'),
      (3,'Confiance et courage'),
      (4,'Identifier l''émotion pendant l''action'),
      (5,'Agir : stratégies de recentrage'),
      (6,'Relaxation sous pression'),
      (7,'Bilan mi-parcours'),
      (8,'Demander de l''aide'),
      (9,'Concentration : le focus word'),
      (10,'Imagerie mentale'),
      (11,'Ma boîte à outils complète'),
      (12,'Leadership et impact'),
      (13,'Bilan final / célébration')
    ) AS v(num, title)
  LOOP
    INSERT INTO sessions (program_id, child_id, session_number, title, status, scheduled_at, duration_minutes)
    VALUES (v_prog, p_child, s.num, s.title, 'SCHEDULED',
            v_start + ((s.num - 1) * interval '7 days'), 60);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_assignment_create_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    PERFORM public.create_thrive_program(NEW.coach_id, NEW.child_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignment_program ON public.coach_assignments;
CREATE TRIGGER trg_assignment_program
  AFTER INSERT OR UPDATE OF is_active ON public.coach_assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_assignment_create_program();

DO $$
DECLARE a record;
BEGIN
  FOR a IN
    SELECT ca.coach_id, ca.child_id
    FROM coach_assignments ca
    WHERE ca.is_active
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.child_id = ca.child_id)
  LOOP
    PERFORM public.create_thrive_program(a.coach_id, a.child_id);
  END LOOP;
END $$;

-- ============================================================
-- Migration 010 — Fix critique : notify_on_session_scheduled()
-- Utilisait 'SESSION', valeur absente de l'enum notification_type
-- => l'insertion de TOUTE séance échouait (22P02).
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_session_scheduled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  child_parent_id UUID;
  child_name TEXT;
BEGIN
  IF NEW.status = 'SCHEDULED' AND (OLD.status IS NULL OR OLD.status <> 'SCHEDULED') THEN
    SELECT f.parent_id, c.first_name INTO child_parent_id, child_name
    FROM public.children c
    JOIN public.families f ON f.id = c.family_id
    WHERE c.id = NEW.child_id;

    IF child_parent_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        child_parent_id,
        'SESSION_REMINDER',
        '📅 Séance programmée',
        'Une nouvelle séance a été planifiée pour ' || COALESCE(child_name, 'votre enfant'),
        jsonb_build_object('session_id', NEW.id, 'child_id', NEW.child_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- Migration 009 — Fix critique : handle_new_user()
-- 1. Bug 42804 : v_role (TEXT) inséré sans cast dans
--    profiles.role (enum user_role) => TOUTE inscription échouait.
-- 2. Sécurité : impossible de s'auto-attribuer ADMIN/SUPER_ADMIN
--    via les metadata d'inscription (promotion manuelle uniquement).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_role       TEXT;
BEGIN
  v_first_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''),
    ''
  );
  v_last_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''),
    ''
  );
  v_role := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
    'PARENT'
  );
  IF v_role NOT IN ('PARENT', 'COACH', 'CHILD') THEN
    v_role := 'PARENT';
  END IF;

  INSERT INTO public.profiles (
    id, email, first_name, last_name, role,
    is_active, registration_status, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_role::user_role,
    true,
    'approved',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name  = CASE WHEN profiles.last_name  = '' THEN EXCLUDED.last_name  ELSE profiles.last_name  END,
    updated_at = NOW();

  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;

  RETURN NEW;
END;
$function$;

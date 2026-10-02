-- ════════════════════════════════════════════════════════════════════════════
-- 20261002_067_require_email_confirmation.sql
-- Loi 25 (Québec) : un compte qui donne accès à des données de mineurs ne doit
-- pas être actif sans preuve que le titulaire contrôle son adresse e-mail.
-- handle_new_user confirmait d'office toute inscription
-- (UPDATE auth.users SET email_confirmed_at = NOW()) : supprimé.
--   • Auto-inscription (web/mobile) : lien de confirmation envoyé par Supabase
--     Auth, atterrissage sur /auth/confirm (apps/web).
--   • Comptes créés par un admin / co-parent (edge functions) : inchangés,
--     admin.createUser(email_confirm: true) + e-mail « définir mon mot de passe ».
-- Les comptes déjà confirmés ne sont pas touchés. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE v_first_name TEXT; v_last_name TEXT; v_role TEXT;
BEGIN
  v_first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), '');
  v_last_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), '');
  -- Autorité : app_metadata (non modifiable par l'utilisateur), jamais user_metadata.
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_app_meta_data->>'role'), ''), 'PARENT');
  IF v_role NOT IN ('PARENT', 'COACH', 'CHILD') THEN v_role := 'PARENT'; END IF;
  INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active, registration_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_first_name, v_last_name, v_role::user_role, true, 'approved', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
    first_name = CASE WHEN profiles.first_name = '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name = CASE WHEN profiles.last_name = '' THEN EXCLUDED.last_name ELSE profiles.last_name END,
    updated_at = NOW();
  RETURN NEW;
END;
$function$;

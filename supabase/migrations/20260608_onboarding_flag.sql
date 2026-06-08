-- ============================================================
-- Migration : Étape 11 — Onboarding flag sur la table profiles
-- Date      : 2026-06-08
-- ============================================================

-- Ajout de la colonne onboarding_completed si elle n'existe pas déjà
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Index pour accélérer les requêtes de guard (lecture fréquente)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
  ON public.profiles (id, onboarding_completed)
  WHERE onboarding_completed = FALSE;

-- Commentaire de documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'Vrai si l\'utilisateur a complété le wizard de première connexion. '
  'Mis à true par useOnboarding.markOnboardingDone().';

-- RLS : les utilisateurs peuvent uniquement mettre à jour leur propre ligne
-- (les politiques existantes sur profiles couvrent déjà le SELECT et UPDATE via id = auth.uid())
-- Pas de nouvelle politique requise — la politique UPDATE existante suffit.

-- Migration: Content Library
-- Table pour stocker les ressources publiées par l'admin

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('nutrition', 'entrainement', 'mental', 'recuperation', 'parents', 'technique')),
  type TEXT NOT NULL CHECK (type IN ('article', 'video', 'conseil')),
  cover_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  read_time_minutes INTEGER NOT NULL DEFAULT 3,
  target_roles TEXT[] NOT NULL DEFAULT '{both}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_content_library_published ON content_library(published);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_pinned ON content_library(pinned, created_at DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_content_library_updated_at ON content_library;
CREATE TRIGGER update_content_library_updated_at
  BEFORE UPDATE ON content_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les items publiés
CREATE POLICY IF NOT EXISTS "Published content is readable by authenticated users"
  ON content_library FOR SELECT
  USING (auth.role() = 'authenticated' AND (published = true OR author_id = auth.uid()));

-- Écriture réservée aux admins
CREATE POLICY IF NOT EXISTS "Only admins can write content"
  ON content_library FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour incrémenter les vues atomiquement
CREATE OR REPLACE FUNCTION increment_content_views(content_id UUID)
RETURNS VOID AS $$
  UPDATE content_library SET views = views + 1 WHERE id = content_id;
$$ LANGUAGE SQL SECURITY DEFINER;

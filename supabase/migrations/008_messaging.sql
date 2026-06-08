-- ============================================================
-- ÉTAPE 8 — Messagerie Realtime
-- ============================================================

-- Table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (coach_id, parent_id)
);

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id ON conversations(parent_id);

-- Trigger updated_at sur conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies conversations
CREATE POLICY "conversations: coach ou parent concerné" ON conversations
  FOR ALL USING (
    auth.uid() = coach_id OR auth.uid() = parent_id
  );

CREATE POLICY "conversations: admin full access" ON conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies messages
CREATE POLICY "messages: participants de la conversation" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.coach_id = auth.uid() OR c.parent_id = auth.uid())
    )
  );

CREATE POLICY "messages: admin full access" ON messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

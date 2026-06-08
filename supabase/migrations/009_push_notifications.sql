-- ============================================================
-- ÉTAPE 9 — Notifications Push
-- ============================================================

-- Colonnes push token sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"messages": true, "badges": true, "sessions": true}'::jsonb;

-- Table notification_logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'badge', 'session', 'manual')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  expo_ticket_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);

-- RLS notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs: own records" ON notification_logs
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "notification_logs: admin full access" ON notification_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger: notif sur nouveau message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation conversations%ROWTYPE;
  v_sender profiles%ROWTYPE;
  v_recipient_id UUID;
BEGIN
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
  SELECT * INTO v_sender FROM profiles WHERE id = NEW.sender_id;

  -- Destinataire = l'autre participant
  IF NEW.sender_id = v_conversation.coach_id THEN
    v_recipient_id := v_conversation.parent_id;
  ELSE
    v_recipient_id := v_conversation.coach_id;
  END IF;

  INSERT INTO notification_logs (recipient_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'message',
    'Nouveau message de ' || COALESCE(v_sender.full_name, 'quelqu''un'),
    LEFT(NEW.content, 100),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Trigger: notif sur badge attribué
CREATE OR REPLACE FUNCTION notify_badge_awarded()
RETURNS TRIGGER AS $$
DECLARE
  v_badge badges%ROWTYPE;
  v_child children%ROWTYPE;
  v_parent_id UUID;
BEGIN
  SELECT * INTO v_badge FROM badges WHERE id = NEW.badge_id;
  SELECT * INTO v_child FROM children WHERE id = NEW.child_id;
  v_parent_id := v_child.parent_id;

  INSERT INTO notification_logs (recipient_id, type, title, body, data)
  VALUES (
    v_parent_id,
    'badge',
    '🏅 Nouveau badge pour ' || COALESCE(v_child.first_name, 'votre enfant'),
    COALESCE(v_child.first_name, 'Votre enfant') || ' a obtenu le badge « ' || COALESCE(v_badge.name, '') || ' »',
    jsonb_build_object('badge_id', NEW.badge_id, 'child_id', NEW.child_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_badge_notify
  AFTER INSERT ON child_badges
  FOR EACH ROW EXECUTE FUNCTION notify_badge_awarded();

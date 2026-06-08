-- ============================================================
-- Étape 9 — Notifications Push
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications"
  ON push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger: nouveau message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email)
    INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  SELECT CASE
    WHEN coach_id = NEW.sender_id THEN parent_id
    ELSE coach_id
  END INTO v_recipient_id
  FROM conversations WHERE id = NEW.conversation_id;

  INSERT INTO push_notification_logs(user_id, title, body, data)
  VALUES (
    v_recipient_id,
    'Nouveau message 💬',
    v_sender_name || ' vous a envoyé un message',
    jsonb_build_object('type','message','conversation_id', NEW.conversation_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Trigger: badge attribué
CREATE OR REPLACE FUNCTION notify_badge_awarded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_badge_name TEXT;
  v_child_name TEXT;
  v_parent_id UUID;
BEGIN
  SELECT name INTO v_badge_name FROM badges WHERE id = NEW.badge_id;
  SELECT first_name, parent_id INTO v_child_name, v_parent_id
    FROM children WHERE id = NEW.child_id;

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO push_notification_logs(user_id, title, body, data)
    VALUES (
      v_parent_id,
      'Nouveau badge 🏆',
      v_child_name || ' a gagné le badge "' || v_badge_name || '"',
      jsonb_build_object('type','badge','child_id', NEW.child_id, 'badge_id', NEW.badge_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge ON child_badges;
CREATE TRIGGER trg_notify_badge
  AFTER INSERT ON child_badges
  FOR EACH ROW EXECUTE FUNCTION notify_badge_awarded();

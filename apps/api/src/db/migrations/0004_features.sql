-- User enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token varchar(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expiry timestamptz;

-- Protocol auto-analyze interval
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS auto_analyze_interval_hours integer NOT NULL DEFAULT 0;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  body text NOT NULL,
  link varchar(500),
  read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_read_idx ON notifications(read);

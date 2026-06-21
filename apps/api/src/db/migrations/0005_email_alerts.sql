ALTER TABLE users ADD COLUMN IF NOT EXISTS email_alerts_enabled boolean NOT NULL DEFAULT true;

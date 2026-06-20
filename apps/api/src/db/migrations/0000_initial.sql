-- FortiChain — Initial Schema Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  encrypted_mnemonic TEXT NOT NULL,
  wallet_salt VARCHAR(64) NOT NULL,
  gen_balance_cache DECIMAL(36,18) DEFAULT 0,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_idx ON users(wallet_address);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(128) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  label VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id);

-- Protocols
CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  contract_address VARCHAR(42),
  category VARCHAR(50) NOT NULL,
  website_url VARCHAR(255),
  monitoring_active BOOLEAN DEFAULT true,
  webhook_url VARCHAR(500),
  alert_email VARCHAR(255),
  risk_score INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS protocols_user_idx ON protocols(user_id);

-- Threat Events
CREATE TABLE IF NOT EXISTS threat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  signal_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  raw_payload JSONB NOT NULL,
  severity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS threat_events_protocol_idx ON threat_events(protocol_id);
CREATE INDEX IF NOT EXISTS threat_events_status_idx ON threat_events(status);
CREATE INDEX IF NOT EXISTS threat_events_created_idx ON threat_events(created_at);

-- AI Judgments
CREATE TABLE IF NOT EXISTS ai_judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_event_id UUID REFERENCES threat_events(id),
  protocol_id UUID REFERENCES protocols(id),
  contract_call_tx VARCHAR(100),
  risk_score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  validator_explanations JSONB,
  recommended_action TEXT,
  consensus_reached BOOLEAN DEFAULT false,
  gen_cost DECIMAL(36,18) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS judgments_threat_idx ON ai_judgments(threat_event_id);
CREATE INDEX IF NOT EXISTS judgments_protocol_idx ON ai_judgments(protocol_id);
CREATE INDEX IF NOT EXISTS judgments_level_idx ON ai_judgments(level);

-- Alerts Sent
CREATE TABLE IF NOT EXISTS alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judgment_id UUID REFERENCES ai_judgments(id),
  protocol_id UUID REFERENCES protocols(id),
  channel VARCHAR(20) NOT NULL,
  destination VARCHAR(500) NOT NULL,
  payload JSONB,
  delivered BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS alerts_judgment_idx ON alerts_sent(judgment_id);

-- Signal Ingestions
CREATE TABLE IF NOT EXISTS signal_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES protocols(id),
  source VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  ingested_at TIMESTAMP DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS signals_processed_idx ON signal_ingestions(processed);
CREATE INDEX IF NOT EXISTS signals_source_idx ON signal_ingestions(source);

-- GEN Transactions
CREATE TABLE IF NOT EXISTS gen_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_hash VARCHAR(100),
  amount DECIMAL(36,18) NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS gen_tx_user_idx ON gen_transactions(user_id);

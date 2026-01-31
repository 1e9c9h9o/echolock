-- EchoLock Database Schema
-- PostgreSQL 14+
--
-- Security Features:
-- - UUIDs for non-enumerable IDs
-- - Timestamps for audit trail
-- - Indexes for performance
-- - Foreign key constraints for data integrity

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  display_name VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- Switches table
CREATE TABLE switches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- User-facing info
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'ARMED', -- ARMED, PAUSED, TRIGGERED, RELEASED, CANCELLED

  -- Timing
  check_in_hours INTEGER NOT NULL CHECK (check_in_hours > 0),
  last_check_in TIMESTAMP DEFAULT NOW(),
  check_in_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,

  -- Message storage (encrypted)
  encrypted_message_ciphertext TEXT NOT NULL,
  encrypted_message_iv VARCHAR(255) NOT NULL,
  encrypted_message_auth_tag VARCHAR(255) NOT NULL,

  -- Nostr metadata
  nostr_public_key VARCHAR(64) NOT NULL,
  nostr_private_key_encrypted TEXT NOT NULL, -- Encrypted with service key
  relay_urls JSONB NOT NULL, -- Array of relay URLs
  fragment_metadata JSONB, -- Metadata about fragment distribution

  -- Crypto metadata (for reconstruction)
  fragment_encryption_salt VARCHAR(255) NOT NULL,
  auth_key_encrypted TEXT NOT NULL, -- Encrypted HMAC auth key

  -- Client-side encryption flag (Phase 1: User-Controlled Keys)
  -- true: Keys were generated client-side, server cannot decrypt
  -- false/null: Legacy switch with server-side encryption
  client_side_encryption BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  triggered_at TIMESTAMP,
  released_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_switches_user_id ON switches(user_id);
CREATE INDEX idx_switches_status ON switches(status);
CREATE INDEX idx_switches_expires_at ON switches(expires_at);
CREATE INDEX idx_switches_client_side_encryption ON switches(client_side_encryption);

-- Check-ins table (audit trail)
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_check_ins_switch_id ON check_ins(switch_id);
CREATE INDEX idx_check_ins_timestamp ON check_ins(timestamp DESC);

-- Recipients table (email addresses for message delivery)
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipients_switch_id ON recipients(switch_id);

-- Release log (audit trail for message releases)
CREATE TABLE release_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- SENT, FAILED, BOUNCED
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_release_log_switch_id ON release_log(switch_id);
CREATE INDEX idx_release_log_timestamp ON release_log(timestamp DESC);

-- API keys (for future API access)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Audit log (security events)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, CREATE_SWITCH, CHECK_IN, etc.
  event_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Relay health tracking
CREATE TABLE relay_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relay_url VARCHAR(255) UNIQUE NOT NULL,
  last_check TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'UNKNOWN', -- ONLINE, OFFLINE, DEGRADED, UNKNOWN
  latency_ms INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_relay_health_status ON relay_health(status);
CREATE INDEX idx_relay_health_last_check ON relay_health(last_check DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_switches_updated_at BEFORE UPDATE ON switches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relay_health_updated_at BEFORE UPDATE ON relay_health
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication credentials';
COMMENT ON TABLE switches IS 'Dead man switches with encrypted messages';
COMMENT ON TABLE check_ins IS 'Audit trail of user check-ins';
COMMENT ON TABLE recipients IS 'Email recipients for message delivery';
COMMENT ON TABLE release_log IS 'Audit trail of message releases';
COMMENT ON TABLE audit_log IS 'Security audit log for all important events';
COMMENT ON TABLE relay_health IS 'Health monitoring for Nostr relays';

COMMENT ON COLUMN switches.encrypted_message_ciphertext IS 'AES-256-GCM encrypted message';
COMMENT ON COLUMN switches.nostr_private_key_encrypted IS 'Nostr private key encrypted with service master key';
COMMENT ON COLUMN switches.auth_key_encrypted IS 'HMAC auth key for Shamir shares, encrypted with service key';

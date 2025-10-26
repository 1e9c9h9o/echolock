-- Migration 003: Add Security Tables
-- Adds sessions table for session management and 2FA table for two-factor authentication

-- Sessions table for active session tracking
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token info
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  access_token_jti VARCHAR(255), -- JWT ID for access token

  -- Session metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_name VARCHAR(255), -- e.g., "Chrome on Windows", "Safari on iPhone"
  location VARCHAR(255), -- e.g., "San Francisco, CA"

  -- Status
  is_current BOOLEAN DEFAULT FALSE, -- Mark the current session
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked ON sessions(revoked);

COMMENT ON TABLE sessions IS 'Active user sessions for session management and revocation';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'Hashed refresh token for security';
COMMENT ON COLUMN sessions.is_current IS 'Indicates if this is the current active session';

-- Two-Factor Authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 2FA settings
  enabled BOOLEAN DEFAULT FALSE,
  method VARCHAR(50) DEFAULT 'TOTP', -- TOTP (authenticator app), SMS, EMAIL

  -- TOTP settings
  totp_secret VARCHAR(255), -- Base32 encoded secret
  totp_verified BOOLEAN DEFAULT FALSE,

  -- Backup codes
  backup_codes JSONB, -- Array of hashed backup codes
  backup_codes_generated_at TIMESTAMP,
  backup_codes_used_count INTEGER DEFAULT 0,

  -- Recovery
  recovery_email VARCHAR(255),

  -- Timestamps
  enabled_at TIMESTAMP,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX idx_two_factor_auth_enabled ON two_factor_auth(enabled);

COMMENT ON TABLE two_factor_auth IS 'Two-factor authentication settings for users';
COMMENT ON COLUMN two_factor_auth.totp_secret IS 'TOTP secret key for authenticator apps';
COMMENT ON COLUMN two_factor_auth.backup_codes IS 'Hashed one-time use backup codes';

-- Trigger for 2FA updated_at
CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session last_active
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_last_active BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_session_last_active();

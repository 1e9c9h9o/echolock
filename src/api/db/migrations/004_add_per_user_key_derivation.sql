-- Migration: Add per-user key derivation support
-- This enables key isolation per user - compromise of one user's data doesn't affect others
--
-- Key Hierarchy (new):
--   SERVICE_MASTER_KEY (env var)
--     └─> HKDF(userId) → UserMasterKey (unique per user)
--         └─> encrypts: nostr_private_key, auth_key, etc.
--
-- Key versioning enables future rotation without data loss

-- Add key version column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER DEFAULT 1;

-- Add key version to switches table to track which key version was used
ALTER TABLE switches
ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER DEFAULT 1;

-- Create key version metadata table for rotation support
CREATE TABLE IF NOT EXISTS key_versions (
  version INTEGER PRIMARY KEY,
  algorithm VARCHAR(100) NOT NULL DEFAULT 'HKDF-SHA256',
  created_at TIMESTAMP DEFAULT NOW(),
  deprecated_at TIMESTAMP,
  notes TEXT
);

-- Insert initial version
INSERT INTO key_versions (version, algorithm, notes)
VALUES (1, 'HKDF-SHA256', 'Initial per-user key derivation implementation')
ON CONFLICT (version) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN users.encryption_key_version IS 'Current encryption key version for this user';
COMMENT ON COLUMN switches.encryption_key_version IS 'Key version used when encrypting this switch data';
COMMENT ON TABLE key_versions IS 'Tracks encryption key algorithm versions for rotation support';

-- Index for efficient version-based queries during migration
CREATE INDEX IF NOT EXISTS idx_switches_key_version ON switches(encryption_key_version);

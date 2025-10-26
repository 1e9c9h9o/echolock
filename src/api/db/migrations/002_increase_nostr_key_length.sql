-- Migration: Increase nostr_public_key column length
-- Nostr public keys in hex format are 64 chars, but with prefixes or encoding can be longer
-- Also increase other crypto-related VARCHAR columns for safety

ALTER TABLE switches
  ALTER COLUMN nostr_public_key TYPE VARCHAR(255);

-- Also ensure other crypto columns are adequate
ALTER TABLE switches
  ALTER COLUMN encrypted_message_iv TYPE VARCHAR(255);

ALTER TABLE switches
  ALTER COLUMN encrypted_message_auth_tag TYPE VARCHAR(255);

ALTER TABLE switches
  ALTER COLUMN fragment_encryption_salt TYPE VARCHAR(255);

COMMENT ON COLUMN switches.nostr_public_key IS 'Nostr public key (hex encoded, up to 255 chars for flexibility)';

/**
 * Migration: Add recovery password encryption columns
 *
 * Adds columns to store password-encrypted message for simple recipient recovery.
 * This allows recipients to decrypt messages with just a password,
 * without needing Nostr keys.
 *
 * @see CLAUDE.md - Security Tiers (Basic: Password Protection)
 */

export async function up(client) {
  console.log('Adding recovery password encryption columns to switches table...');

  // Add columns for password-encrypted recovery
  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS recovery_encrypted_ciphertext TEXT,
    ADD COLUMN IF NOT EXISTS recovery_encrypted_iv TEXT,
    ADD COLUMN IF NOT EXISTS recovery_encrypted_auth_tag TEXT,
    ADD COLUMN IF NOT EXISTS recovery_encrypted_salt TEXT
  `);

  console.log('Recovery password encryption columns added successfully');
}

export async function down(client) {
  console.log('Removing recovery password encryption columns...');

  await client.query(`
    ALTER TABLE switches
    DROP COLUMN IF EXISTS recovery_encrypted_ciphertext,
    DROP COLUMN IF EXISTS recovery_encrypted_iv,
    DROP COLUMN IF EXISTS recovery_encrypted_auth_tag,
    DROP COLUMN IF EXISTS recovery_encrypted_salt
  `);

  console.log('Recovery password encryption columns removed');
}

/**
 * Migration: Add vacation mode and quick check-in tokens
 *
 * Features added:
 * 1. vacation_mode_until column on switches - enables temporary check-in extension
 * 2. checkin_tokens table - stores one-time check-in links for quick access
 */

export async function up(client) {
  console.log('Running migration: 006_add_vacation_mode_and_checkin_tokens');

  // Add vacation_mode_until column to switches
  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS vacation_mode_until TIMESTAMP WITH TIME ZONE
  `);

  // Create checkin_tokens table for magic links
  await client.query(`
    CREATE TABLE IF NOT EXISTS checkin_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(switch_id)
    )
  `);

  // Index for token lookups
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_checkin_tokens_token
    ON checkin_tokens (token)
    WHERE used = FALSE
  `);

  // Index for cleanup
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_checkin_tokens_expires
    ON checkin_tokens (expires_at)
  `);

  console.log('Migration 006 complete: Added vacation mode and check-in tokens');
}

export async function down(client) {
  console.log('Rolling back migration: 006_add_vacation_mode_and_checkin_tokens');

  await client.query(`DROP TABLE IF EXISTS checkin_tokens`);

  await client.query(`
    ALTER TABLE switches
    DROP COLUMN IF EXISTS vacation_mode_until
  `);

  console.log('Rollback 006 complete');
}

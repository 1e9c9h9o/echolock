/**
 * Migration: Add client_side_encryption column
 *
 * This migration adds support for Phase 1 of the decentralization roadmap:
 * User-Controlled Keys
 *
 * With this flag:
 * - true: Keys were generated client-side, server cannot decrypt
 * - false/null: Legacy switch with server-side encryption
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

export async function up(client) {
  console.log('Running migration: 005_add_client_side_encryption');

  // Add client_side_encryption column
  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS client_side_encryption BOOLEAN DEFAULT FALSE
  `);

  // Add index for filtering by encryption type
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_switches_client_side_encryption
    ON switches (client_side_encryption)
  `);

  console.log('Migration 005 complete: Added client_side_encryption column');
}

export async function down(client) {
  console.log('Rolling back migration: 005_add_client_side_encryption');

  await client.query(`
    DROP INDEX IF EXISTS idx_switches_client_side_encryption
  `);

  await client.query(`
    ALTER TABLE switches
    DROP COLUMN IF EXISTS client_side_encryption
  `);

  console.log('Rollback 005 complete');
}

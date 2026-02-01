/**
 * Migration: Add Shamir threshold columns to switches table
 *
 * Enables flexible M-of-N Shamir secret sharing configurations.
 * Previously hardcoded as 3-of-5, now user-configurable.
 *
 * Columns added:
 * 1. shamir_total_shares - Total number of shares (N)
 * 2. shamir_threshold - Required shares to reconstruct (M)
 *
 * Constraints:
 * - M >= 2 (minimum security requirement)
 * - N >= M (can't require more shares than exist)
 * - N <= 15 (practical limit for guardian management)
 * - M >= N/2 (majority required for security)
 *
 * @see CLAUDE.md - Shamir Secret Sharing configuration
 */

export async function up(client) {
  console.log('Running migration: 010_add_shamir_threshold_columns');

  // Add threshold columns to switches table
  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS shamir_total_shares INTEGER DEFAULT 5
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS shamir_threshold INTEGER DEFAULT 3
  `);

  console.log('Added shamir threshold columns to switches table');

  // Add threshold columns to cascade_messages table for per-message thresholds
  await client.query(`
    ALTER TABLE cascade_messages
    ADD COLUMN IF NOT EXISTS shamir_total_shares INTEGER DEFAULT 5
  `);

  await client.query(`
    ALTER TABLE cascade_messages
    ADD COLUMN IF NOT EXISTS shamir_threshold INTEGER DEFAULT 3
  `);

  console.log('Added shamir threshold columns to cascade_messages table');

  // Add check constraint for valid threshold values on switches
  // Using a function to check the constraint since we need multiple conditions
  await client.query(`
    ALTER TABLE switches
    ADD CONSTRAINT chk_shamir_threshold
    CHECK (
      shamir_threshold >= 2 AND
      shamir_total_shares >= shamir_threshold AND
      shamir_total_shares <= 15 AND
      shamir_threshold * 2 >= shamir_total_shares
    )
  `);

  console.log('Added shamir threshold constraint to switches');

  // Add similar constraint to cascade_messages
  await client.query(`
    ALTER TABLE cascade_messages
    ADD CONSTRAINT chk_cascade_shamir_threshold
    CHECK (
      shamir_threshold >= 2 AND
      shamir_total_shares >= shamir_threshold AND
      shamir_total_shares <= 15 AND
      shamir_threshold * 2 >= shamir_total_shares
    )
  `);

  console.log('Added shamir threshold constraint to cascade_messages');

  // Create index for querying switches by threshold configuration
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_switches_shamir_config
    ON switches (shamir_total_shares, shamir_threshold)
  `);

  console.log('Created shamir configuration index');

  console.log('Migration 010 complete: Added Shamir threshold columns');
}

export async function down(client) {
  console.log('Rolling back migration: 010_add_shamir_threshold_columns');

  // Drop constraints first
  await client.query(`
    ALTER TABLE switches
    DROP CONSTRAINT IF EXISTS chk_shamir_threshold
  `);

  await client.query(`
    ALTER TABLE cascade_messages
    DROP CONSTRAINT IF EXISTS chk_cascade_shamir_threshold
  `);

  // Drop index
  await client.query(`DROP INDEX IF EXISTS idx_switches_shamir_config`);

  // Drop columns from switches
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS shamir_total_shares`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS shamir_threshold`);

  // Drop columns from cascade_messages
  await client.query(`ALTER TABLE cascade_messages DROP COLUMN IF EXISTS shamir_total_shares`);
  await client.query(`ALTER TABLE cascade_messages DROP COLUMN IF EXISTS shamir_threshold`);

  console.log('Rollback 010 complete');
}

/**
 * Migration: Add Bitcoin commitment columns to switches table
 *
 * Enables Bitcoin timelock commitments for on-chain proof of timer setup.
 *
 * Features added:
 * 1. bitcoin_address - P2WSH address for funding
 * 2. bitcoin_txid - Transaction ID when funded
 * 3. bitcoin_status - none, pending, confirmed, spent
 * 4. bitcoin_amount - Satoshis committed
 * 5. bitcoin_locktime - Block height or timestamp for timelock
 * 6. bitcoin_script - Serialized timelock script
 * 7. bitcoin_public_key - Public key for verification
 * 8. bitcoin_confirmed_at - When funding was confirmed
 * 9. bitcoin_encrypted_private_key - Encrypted private key for spending
 *
 * @see CLAUDE.md - Phase 4: Bitcoin Commitments
 */

export async function up(client) {
  console.log('Running migration: 008_add_bitcoin_commitment');

  // Add Bitcoin commitment columns to switches table
  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_enabled BOOLEAN DEFAULT FALSE
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_status VARCHAR(20) DEFAULT 'none'
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_address VARCHAR(100)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_txid VARCHAR(64)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_amount INTEGER
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_locktime BIGINT
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_script TEXT
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_public_key VARCHAR(66)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_encrypted_private_key TEXT
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_private_key_iv VARCHAR(64)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_private_key_auth_tag VARCHAR(64)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_private_key_salt VARCHAR(64)
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_network VARCHAR(10) DEFAULT 'testnet'
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_confirmed_at TIMESTAMP WITH TIME ZONE
  `);

  await client.query(`
    ALTER TABLE switches
    ADD COLUMN IF NOT EXISTS bitcoin_block_height INTEGER
  `);

  console.log('Added Bitcoin columns to switches table');

  // Create indexes for Bitcoin queries
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_switches_bitcoin_status
    ON switches (bitcoin_status)
    WHERE bitcoin_status IS NOT NULL AND bitcoin_status != 'none'
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_switches_bitcoin_address
    ON switches (bitcoin_address)
    WHERE bitcoin_address IS NOT NULL
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_switches_bitcoin_pending
    ON switches (user_id, bitcoin_status)
    WHERE bitcoin_status = 'pending'
  `);

  console.log('Created Bitcoin indexes');

  // Add check constraint for valid bitcoin_status values
  await client.query(`
    ALTER TABLE switches
    ADD CONSTRAINT chk_bitcoin_status
    CHECK (bitcoin_status IN ('none', 'pending', 'confirmed', 'spent', 'expired'))
  `);

  console.log('Added Bitcoin status constraint');

  console.log('Migration 008 complete: Added Bitcoin commitment columns');
}

export async function down(client) {
  console.log('Rolling back migration: 008_add_bitcoin_commitment');

  // Drop constraint first
  await client.query(`
    ALTER TABLE switches
    DROP CONSTRAINT IF EXISTS chk_bitcoin_status
  `);

  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_switches_bitcoin_status`);
  await client.query(`DROP INDEX IF EXISTS idx_switches_bitcoin_address`);
  await client.query(`DROP INDEX IF EXISTS idx_switches_bitcoin_pending`);

  // Drop columns
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_enabled`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_status`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_address`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_txid`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_amount`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_locktime`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_script`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_public_key`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_encrypted_private_key`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_private_key_iv`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_private_key_auth_tag`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_private_key_salt`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_network`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_confirmed_at`);
  await client.query(`ALTER TABLE switches DROP COLUMN IF EXISTS bitcoin_block_height`);

  console.log('Rollback 008 complete');
}

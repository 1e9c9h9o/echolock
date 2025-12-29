'use strict';

/**
 * Data Migration: Convert from SERVICE_MASTER_KEY to Per-User Key Derivation
 *
 * This migration re-encrypts all sensitive switch data using user-specific
 * derived keys instead of the global SERVICE_MASTER_KEY.
 *
 * SECURITY BENEFITS:
 * - Key isolation: compromise of one user's data doesn't affect others
 * - Defense in depth: attacker needs both DB access AND SERVICE_MASTER_KEY
 * - Key versioning: enables future key rotation without data loss
 *
 * MIGRATION PROCESS:
 * 1. For each switch with encryption_key_version = NULL or 0:
 *    a. Decrypt nostr_private_key with SERVICE_MASTER_KEY (old method)
 *    b. Re-encrypt with user-specific derived key (new method)
 *    c. Update encryption_key_version to 1
 * 2. Transaction-safe: all-or-nothing per switch
 *
 * ROLLBACK:
 * This migration is reversible by running with --rollback flag
 * Rollback re-encrypts data with SERVICE_MASTER_KEY (version 0)
 *
 * USAGE:
 *   node 004_migrate_to_per_user_keys.js          # Run migration
 *   node 004_migrate_to_per_user_keys.js --dry-run # Preview changes
 *   node 004_migrate_to_per_user_keys.js --rollback # Revert to old encryption
 */

import { query, transaction, pool } from '../connection.js';
import {
  encryptWithServiceKey,
  decryptWithServiceKey,
  encryptForUser,
  decryptForUser
} from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

const TARGET_KEY_VERSION = 1;

/**
 * Parse the composite encrypted field format: "ciphertext,iv,authTag"
 */
function parseEncryptedField(compositeValue) {
  if (!compositeValue || compositeValue === ',,' || compositeValue === '') {
    return null;
  }

  const parts = compositeValue.split(',');
  if (parts.length !== 3) {
    return null;
  }

  const [ciphertext, iv, authTag] = parts;
  if (!ciphertext || !iv || !authTag) {
    return null;
  }

  return { ciphertext, iv, authTag };
}

/**
 * Format encrypted components back to composite field
 */
function formatEncryptedField(encrypted) {
  return `${encrypted.ciphertext},${encrypted.iv},${encrypted.authTag}`;
}

/**
 * Migrate a single switch to per-user encryption
 */
async function migrateSwitch(client, sw, dryRun = false) {
  const { id: switchId, user_id: userId, nostr_private_key_encrypted } = sw;

  // Parse the composite encrypted field
  const encryptedData = parseEncryptedField(nostr_private_key_encrypted);

  if (!encryptedData) {
    logger.info(`Switch ${switchId}: No encrypted data to migrate, skipping`);
    return { status: 'skipped', reason: 'no_data' };
  }

  try {
    // Step 1: Decrypt with old SERVICE_MASTER_KEY method
    const decrypted = decryptWithServiceKey(
      encryptedData.ciphertext,
      encryptedData.iv,
      encryptedData.authTag
    );

    if (dryRun) {
      logger.info(`[DRY RUN] Switch ${switchId}: Would re-encrypt for user ${userId}`);
      return { status: 'would_migrate', switchId, userId };
    }

    // Step 2: Re-encrypt with per-user key
    const reEncrypted = encryptForUser(decrypted, userId, TARGET_KEY_VERSION);

    // Step 3: Update database
    const newCompositeValue = formatEncryptedField(reEncrypted);

    await client.query(
      `UPDATE switches
       SET nostr_private_key_encrypted = $1,
           encryption_key_version = $2
       WHERE id = $3`,
      [newCompositeValue, TARGET_KEY_VERSION, switchId]
    );

    logger.info(`Switch ${switchId}: Migrated to per-user key (version ${TARGET_KEY_VERSION})`);
    return { status: 'migrated', switchId, userId };

  } catch (error) {
    logger.error(`Switch ${switchId}: Migration failed - ${error.message}`);
    return { status: 'failed', switchId, error: error.message };
  }
}

/**
 * Rollback a single switch to SERVICE_MASTER_KEY encryption
 */
async function rollbackSwitch(client, sw, dryRun = false) {
  const { id: switchId, user_id: userId, nostr_private_key_encrypted, encryption_key_version } = sw;

  if (!encryption_key_version || encryption_key_version === 0) {
    logger.info(`Switch ${switchId}: Already using SERVICE_MASTER_KEY, skipping`);
    return { status: 'skipped', reason: 'already_v0' };
  }

  const encryptedData = parseEncryptedField(nostr_private_key_encrypted);

  if (!encryptedData) {
    logger.info(`Switch ${switchId}: No encrypted data, skipping`);
    return { status: 'skipped', reason: 'no_data' };
  }

  try {
    // Step 1: Decrypt with per-user key
    const decrypted = decryptForUser(
      encryptedData.ciphertext,
      encryptedData.iv,
      encryptedData.authTag,
      userId,
      encryption_key_version
    );

    if (dryRun) {
      logger.info(`[DRY RUN] Switch ${switchId}: Would rollback to SERVICE_MASTER_KEY`);
      return { status: 'would_rollback', switchId };
    }

    // Step 2: Re-encrypt with SERVICE_MASTER_KEY
    const reEncrypted = encryptWithServiceKey(decrypted);

    // Step 3: Update database (version 0 = legacy SERVICE_MASTER_KEY)
    const newCompositeValue = formatEncryptedField(reEncrypted);

    await client.query(
      `UPDATE switches
       SET nostr_private_key_encrypted = $1,
           encryption_key_version = 0
       WHERE id = $3`,
      [newCompositeValue, 0, switchId]
    );

    logger.info(`Switch ${switchId}: Rolled back to SERVICE_MASTER_KEY`);
    return { status: 'rolled_back', switchId };

  } catch (error) {
    logger.error(`Switch ${switchId}: Rollback failed - ${error.message}`);
    return { status: 'failed', switchId, error: error.message };
  }
}

/**
 * Run the migration
 */
async function runMigration(options = {}) {
  const { dryRun = false, rollback = false } = options;

  console.log('='.repeat(60));
  console.log(rollback
    ? 'ROLLBACK: Converting to SERVICE_MASTER_KEY encryption'
    : 'MIGRATION: Converting to per-user key derivation');
  console.log(dryRun ? '>>> DRY RUN MODE - No changes will be made <<<' : '');
  console.log('='.repeat(60));

  try {
    // Find switches that need migration
    const whereClause = rollback
      ? 'WHERE encryption_key_version IS NOT NULL AND encryption_key_version > 0'
      : 'WHERE encryption_key_version IS NULL OR encryption_key_version = 0';

    const result = await query(
      `SELECT id, user_id, nostr_private_key_encrypted, encryption_key_version
       FROM switches
       ${whereClause}
       ORDER BY created_at`
    );

    const switches = result.rows;
    console.log(`Found ${switches.length} switches to ${rollback ? 'rollback' : 'migrate'}`);

    if (switches.length === 0) {
      console.log('Nothing to do!');
      return { success: true, processed: 0 };
    }

    const stats = {
      total: switches.length,
      migrated: 0,
      skipped: 0,
      failed: 0
    };

    // Process each switch in its own transaction for isolation
    for (const sw of switches) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const result = rollback
          ? await rollbackSwitch(client, sw, dryRun)
          : await migrateSwitch(client, sw, dryRun);

        if (result.status === 'migrated' || result.status === 'rolled_back' ||
            result.status === 'would_migrate' || result.status === 'would_rollback') {
          stats.migrated++;
        } else if (result.status === 'skipped') {
          stats.skipped++;
        } else if (result.status === 'failed') {
          stats.failed++;
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Transaction failed for switch ${sw.id}: ${error.message}`);
        stats.failed++;
      } finally {
        client.release();
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log(`  Total:    ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log(`  Failed:   ${stats.failed}`);
    console.log('='.repeat(60));

    return { success: stats.failed === 0, stats };

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  }
}

// CLI entry point
if (process.argv[1].includes('004_migrate_to_per_user_keys')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');

  runMigration({ dryRun, rollback })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

export { runMigration, migrateSwitch, rollbackSwitch };

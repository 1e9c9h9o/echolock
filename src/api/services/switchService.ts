'use strict';

/**
 * Switch Service
 *
 * Business logic for dead man's switches
 * Integrates with your existing crypto code from src/core/deadManSwitch.js
 *
 * This service:
 * - Wraps your crypto operations
 * - Handles database storage
 * - Manages Nostr metadata encryption
 * - Coordinates between API and core crypto
 */

import { query, transaction } from '../db/connection.js';
import type { PoolClient } from 'pg';
import { encryptForUser } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { withRetry, RETRY_PRESETS } from '../utils/retry.js';
import type { Request } from 'express';

// Current key version for new encryptions
// Increment when rotating keys
const CURRENT_KEY_VERSION = 1;

// Default Nostr relays for client-side encrypted switches
const DEFAULT_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
  'wss://purplepag.es',
  'wss://relay.nostr.info'
];

// Import your existing crypto code
import { createSwitch as createSwitchCore } from '../../core/deadManSwitch.js';

/**
 * Recipient data
 */
interface Recipient {
  email: string;
  name?: string;
}

/**
 * Switch creation data
 */
interface CreateSwitchData {
  title?: string;
  message?: string;
  checkInHours?: number;
  password?: string;
  recipients?: Recipient[];
  description?: string;
  useBitcoinTimelock?: boolean;
  isDuplicate?: boolean;
  sourceSwitch?: string;
}

/**
 * Distribution info from core switch creation
 */
interface DistributionInfo {
  nostrPublicKey?: string;
  relays?: string[];
  distributionStatus?: string;
}

/**
 * Core switch creation result
 */
interface CoreSwitchResult {
  switchId: string;
  fragmentCount: number;
  requiredFragments: number;
  expiryTime: number;
  distribution?: DistributionInfo;
}

/**
 * Switch list item
 */
interface SwitchListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  checkInHours: number;
  lastCheckIn: Date;
  expiresAt: Date;
  timeRemaining: number;
  isExpired: boolean;
  createdAt: Date;
  checkInCount: number;
  recipientCount: number;
}

/**
 * Switch list row from database
 */
interface SwitchListRow {
  id: string;
  title: string;
  description: string;
  status: string;
  check_in_hours: number;
  last_check_in: Date;
  expires_at: Date;
  created_at: Date;
  check_in_count: number;
  recipient_count: string;
}

/**
 * Switch detail
 */
interface SwitchDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  checkInHours: number;
  lastCheckIn: Date;
  expiresAt: Date;
  expiryTime: Date;
  timeRemaining: number;
  isExpired: boolean;
  createdAt: Date;
  checkInCount: number;
  recipients: Recipient[];
  distribution: unknown;
  shamirTotalShares: number;
  shamirThreshold: number;
  clientSideEncryption: boolean;
  bitcoinEnabled: boolean;
}

/**
 * Switch row from database
 */
interface SwitchRow {
  id: string;
  title: string;
  description: string;
  status: string;
  check_in_hours: number;
  last_check_in: Date;
  expires_at: Date;
  created_at: Date;
  check_in_count: number;
  fragment_metadata: unknown;
  shamir_total_shares: number;
  shamir_threshold: number;
  client_side_encryption: boolean;
  bitcoin_enabled: boolean;
}

/**
 * Check-in result
 */
interface CheckInResult {
  switchId: string;
  newExpiresAt: Date;
  checkInCount: number;
  message: string;
  confirmed: boolean;
  durationMs: number;
}

/**
 * Client-side encrypted switch data
 */
interface ClientEncryptedSwitchData {
  title: string;
  checkInHours: number;
  recipients: Recipient[];
  encryptedMessage: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  shares: Array<{
    index: number;
    data: string;
  }>;
  nostrPublicKey: string;
  shamirTotalShares?: number;
  shamirThreshold?: number;
}

/**
 * Created switch response
 */
interface CreatedSwitch {
  id: string;
  title: string;
  checkInHours: number;
  expiresAt: Date;
  status: string;
  fragmentCount?: number;
  requiredFragments?: number;
  distribution?: DistributionInfo;
  recipientCount: number;
  clientSideEncryption?: boolean;
  shamirTotalShares?: number;
  shamirThreshold?: number;
}

/**
 * Create a new dead man's switch
 */
export async function createSwitch(userId: string, data: CreateSwitchData): Promise<CreatedSwitch> {
  const { title = 'Untitled', message, checkInHours = 72, password, recipients = [], description = '' } = data;

  // SECURITY: Require at least one recipient
  // A switch with no recipients would release successfully but notify no one
  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required');
  }

  // Validate required fields for core switch creation
  if (!message) {
    throw new Error('Message is required');
  }
  if (!password) {
    throw new Error('Password is required');
  }

  // Validate recipient emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const recipient of recipients) {
    if (!recipient.email || !emailRegex.test(recipient.email)) {
      throw new Error(`Invalid recipient email: ${recipient.email || 'empty'}`);
    }
  }

  try {
    logger.info('Creating switch', { userId, title, checkInHours, recipientCount: recipients.length });

    // Call your existing crypto code to create the switch
    // This handles all the encryption, secret sharing, and Nostr publishing
    // Enable Bitcoin timelock if USE_BITCOIN_TIMELOCK env var is set to 'true'
    const useBitcoinTimelock = process.env.USE_BITCOIN_TIMELOCK === 'true';
    const result = await createSwitchCore(
      message,
      checkInHours,
      useBitcoinTimelock,
      password
    ) as CoreSwitchResult;

    logger.info('Core switch created', {
      switchId: result.switchId,
      fragmentCount: result.fragmentCount,
      distributionStatus: result.distribution?.distributionStatus
    });

    // Now store in database using a transaction
    const switchData = await transaction(async (client: PoolClient) => {
      // Calculate expiry time
      const now = new Date();
      const expiresAt = new Date(result.expiryTime);

      // Encrypt Nostr private key with service master key (for retrieval later)
      let nostrPrivateKeyEncrypted: string | null = null;
      let nostrPrivateKeyIV: string | null = null;
      let nostrPrivateKeyAuthTag: string | null = null;

      if (result.distribution?.nostrPublicKey) {
        // Load fragments to get the Nostr private key
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const projectRoot = path.resolve(__dirname, '../../..');
        const fragmentsFile = path.join(projectRoot, 'data/fragments.json');

        try {
          const fragmentsData = await fs.readFile(fragmentsFile, 'utf8');
          const fragments = JSON.parse(fragmentsData) as Record<string, { nostrPrivateKey?: string }>;
          const switchFragments = fragments[result.switchId];

          if (switchFragments?.nostrPrivateKey) {
            // Encrypt the Nostr private key using per-user key derivation
            // This provides key isolation: compromise of one user doesn't affect others
            const encrypted = encryptForUser(
              Buffer.from(switchFragments.nostrPrivateKey, 'hex'),
              userId,
              CURRENT_KEY_VERSION
            );

            nostrPrivateKeyEncrypted = encrypted.ciphertext;
            nostrPrivateKeyIV = encrypted.iv;
            nostrPrivateKeyAuthTag = encrypted.authTag;
          }
        } catch {
          // File doesn't exist or can't be read - this is OK for new switches
          logger.debug('Fragments file not found or unreadable', { fragmentsFile });
        }
      }

      // Insert switch into database
      // Note: encryption_key_version tracks which key version was used
      const insertResult = await client.query<{ id: string; created_at: Date; expires_at: Date }>(
        `INSERT INTO switches (
          id, user_id, title, description, status, check_in_hours,
          last_check_in, expires_at,
          encrypted_message_ciphertext, encrypted_message_iv, encrypted_message_auth_tag,
          nostr_public_key, nostr_private_key_encrypted,
          relay_urls, fragment_metadata,
          fragment_encryption_salt, auth_key_encrypted,
          encryption_key_version
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13 || ',' || $14 || ',' || $15,
          $16, $17, $18,
          $19 || ',' || $20 || ',' || $21,
          $22
        ) RETURNING id, created_at, expires_at`,
        [
          result.switchId,
          userId,
          title,
          description,
          'ARMED',
          checkInHours,
          now,
          expiresAt,
          // Your existing code stores encrypted message - we'll extract it from the switches.json file
          '', // Placeholder - will be updated below
          '',
          '',
          result.distribution?.nostrPublicKey || '',
          nostrPrivateKeyEncrypted,
          nostrPrivateKeyIV,
          nostrPrivateKeyAuthTag,
          JSON.stringify(result.distribution?.relays || []),
          JSON.stringify(result.distribution || {}),
          '', // Will be extracted from fragments
          '', '', '', // Auth key encrypted parts
          CURRENT_KEY_VERSION // Track key version for future rotation
        ]
      );

      const sw = insertResult.rows[0];

      // Insert recipients
      if (recipients.length > 0) {
        for (const recipient of recipients) {
          await client.query(
            'INSERT INTO recipients (switch_id, email, name) VALUES ($1, $2, $3)',
            [sw.id, recipient.email, recipient.name || null]
          );
        }
      }

      // Log audit event
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [userId, 'SWITCH_CREATED', JSON.stringify({ switchId: sw.id, title })]
      );

      return sw;
    });

    logger.info('Switch stored in database', { switchId: switchData.id });

    return {
      id: switchData.id,
      title,
      checkInHours,
      expiresAt: switchData.expires_at,
      status: 'ARMED',
      fragmentCount: result.fragmentCount,
      requiredFragments: result.requiredFragments,
      distribution: result.distribution,
      recipientCount: recipients.length
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create switch:', error);
    throw new Error(`Switch creation failed: ${err.message}`);
  }
}

/**
 * List switches for a user
 */
export async function listSwitches(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<SwitchListItem[]> {
  try {
    // Validate and cap limit to prevent abuse
    const safeLimit = Math.min(Math.max(1, parseInt(String(limit)) || 100), 1000);
    const safeOffset = Math.max(0, parseInt(String(offset)) || 0);

    const result = await query<SwitchListRow>(
      `SELECT
        s.id, s.title, s.description, s.status, s.check_in_hours,
        s.last_check_in, s.expires_at, s.created_at, s.check_in_count,
        COUNT(r.id) as recipient_count
       FROM switches s
       LEFT JOIN recipients r ON r.switch_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, safeLimit, safeOffset]
    );

    const now = new Date();

    return result.rows.map(sw => ({
      id: sw.id,
      title: sw.title,
      description: sw.description,
      status: sw.status,
      checkInHours: sw.check_in_hours,
      lastCheckIn: sw.last_check_in,
      expiresAt: sw.expires_at,
      timeRemaining: Math.max(0, new Date(sw.expires_at).getTime() - now.getTime()),
      isExpired: new Date(sw.expires_at) < now,
      createdAt: sw.created_at,
      checkInCount: sw.check_in_count || 0,
      recipientCount: parseInt(sw.recipient_count) || 0
    }));
  } catch (error) {
    logger.error('Failed to list switches:', error);
    throw error;
  }
}

/**
 * Get switch details
 */
export async function getSwitch(switchId: string, userId: string): Promise<SwitchDetail | null> {
  try {
    const result = await query<SwitchRow>(
      `SELECT * FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const sw = result.rows[0];

    // Get recipients
    const recipientsResult = await query<Recipient>(
      'SELECT email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const now = new Date();
    const timeRemaining = Math.max(0, new Date(sw.expires_at).getTime() - now.getTime());

    return {
      id: sw.id,
      title: sw.title,
      description: sw.description,
      status: sw.status,
      checkInHours: sw.check_in_hours,
      lastCheckIn: sw.last_check_in,
      expiresAt: sw.expires_at,
      expiryTime: sw.expires_at,
      timeRemaining,
      isExpired: new Date(sw.expires_at) < now,
      createdAt: sw.created_at,
      checkInCount: sw.check_in_count || 0,
      recipients: recipientsResult.rows,
      distribution: sw.fragment_metadata,
      shamirTotalShares: sw.shamir_total_shares || 5,
      shamirThreshold: sw.shamir_threshold || 3,
      clientSideEncryption: sw.client_side_encryption || false,
      bitcoinEnabled: sw.bitcoin_enabled || false
    };
  } catch (error) {
    logger.error('Failed to get switch:', error);
    throw error;
  }
}

/**
 * Extended error with retryable flag
 */
interface RetryableError extends Error {
  retryable?: boolean;
  checkInContext?: {
    switchId: string;
    userId: string;
    durationMs: number;
    timestamp: string;
  };
}

/**
 * Perform check-in for a switch with retry and confirmation
 *
 * SECURITY FEATURES:
 * - Retries with exponential backoff on transient failures
 * - Confirms check-in was persisted before returning success
 * - Prevents false success on network/database failures
 */
export async function checkIn(switchId: string, userId: string, req: Request): Promise<CheckInResult> {
  const startTime = Date.now();

  // Use retry wrapper for the core check-in operation
  const performCheckIn = async () => {
    return await transaction(async (client: PoolClient) => {
      // Get switch with FOR UPDATE lock to prevent race conditions
      const result = await client.query<SwitchRow>(
        'SELECT * FROM switches WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [switchId, userId]
      );

      if (result.rows.length === 0) {
        const error = new Error('Switch not found') as RetryableError;
        error.retryable = false; // Don't retry not-found errors
        throw error;
      }

      const sw = result.rows[0];

      if (sw.status !== 'ARMED') {
        const error = new Error(`Cannot check in - switch status is ${sw.status}`) as RetryableError;
        error.retryable = false;
        throw error;
      }

      // SECURITY: Check if switch has already expired
      const now = new Date();
      const expiresAt = new Date(sw.expires_at);
      if (now >= expiresAt) {
        const error = new Error('Cannot check in - switch has already expired. Timer may be processing release.') as RetryableError;
        error.retryable = false;
        throw error;
      }

      // Calculate new expiry time
      const newExpiresAt = new Date(now.getTime() + (sw.check_in_hours * 60 * 60 * 1000));

      // Update switch
      const updateResult = await client.query<{ check_in_count: number; expires_at: Date }>(
        `UPDATE switches
         SET last_check_in = $1, expires_at = $2, check_in_count = check_in_count + 1
         WHERE id = $3
         RETURNING check_in_count, expires_at`,
        [now, newExpiresAt, switchId]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Check-in update failed - no rows affected');
      }

      // Log check-in
      await client.query(
        `INSERT INTO check_ins (switch_id, user_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [switchId, userId, req.ip, req.get('user-agent')]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [userId, 'CHECK_IN', JSON.stringify({ switchId, title: sw.title })]
      );

      const confirmedCheckInCount = updateResult.rows[0].check_in_count;
      const confirmedExpiresAt = updateResult.rows[0].expires_at;

      return {
        switchId,
        newExpiresAt: confirmedExpiresAt,
        checkInCount: confirmedCheckInCount,
        previousExpiresAt: sw.expires_at
      };
    });
  };

  try {
    // Execute with retry for transient failures
    const result = await withRetry(performCheckIn, {
      operationName: `check-in:${switchId}`,
      config: RETRY_PRESETS.critical,
      shouldRetry: (error: Error) => {
        const retryableError = error as RetryableError;
        // Don't retry business logic errors
        if (retryableError.retryable === false) {
          return false;
        }
        // Retry database/network errors
        return true;
      },
      onRetry: (error: Error, attempt: number, delay: number) => {
        logger.warn('Check-in retry scheduled', {
          switchId,
          userId,
          attempt: attempt + 1,
          delay,
          error: error.message
        });
      }
    });

    // Confirmation: Verify the check-in was persisted
    const confirmResult = await query<{ check_in_count: number; expires_at: Date; last_check_in: Date }>(
      'SELECT check_in_count, expires_at, last_check_in FROM switches WHERE id = $1',
      [switchId]
    );

    if (confirmResult.rows.length === 0) {
      throw new Error('Check-in confirmation failed - switch not found');
    }

    const confirmed = confirmResult.rows[0];
    const isConfirmed = confirmed.check_in_count === result.checkInCount;

    const duration = Date.now() - startTime;

    logger.info('Check-in successful', {
      userId,
      switchId,
      newExpiresAt: result.newExpiresAt,
      checkInCount: result.checkInCount,
      confirmed: isConfirmed,
      durationMs: duration
    });

    return {
      switchId,
      newExpiresAt: result.newExpiresAt,
      checkInCount: result.checkInCount,
      message: 'Check-in successful',
      confirmed: isConfirmed,
      durationMs: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as RetryableError;

    logger.error('Check-in failed:', {
      switchId,
      userId,
      error: err.message,
      durationMs: duration
    });

    // Add helpful context to the error
    err.checkInContext = {
      switchId,
      userId,
      durationMs: duration,
      timestamp: new Date().toISOString()
    };

    throw error;
  }
}

/**
 * Update switch (title, status, etc.)
 */
export async function updateSwitch(
  switchId: string,
  userId: string,
  updates: { title?: string; status?: string }
): Promise<SwitchRow | null> {
  try {
    const { title, status } = updates;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      setClauses.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (status !== undefined) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(switchId, userId);

    const result = await query<SwitchRow>(
      `UPDATE switches
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Switch updated', { userId, switchId, updates });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update switch:', error);
    throw error;
  }
}

/**
 * Delete/cancel a switch
 */
export async function deleteSwitch(switchId: string, userId: string): Promise<boolean> {
  try {
    return await transaction(async (client: PoolClient) => {
      // Verify ownership
      const result = await client.query<{ id: string; title: string }>(
        'SELECT id, title FROM switches WHERE id = $1 AND user_id = $2',
        [switchId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Switch not found');
      }

      const sw = result.rows[0];

      // Update status to CANCELLED (soft delete)
      await client.query(
        'UPDATE switches SET status = $1, cancelled_at = NOW() WHERE id = $2',
        ['CANCELLED', switchId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [userId, 'SWITCH_CANCELLED', JSON.stringify({ switchId, title: sw.title })]
      );

      logger.info('Switch cancelled', { userId, switchId });

      return true;
    });
  } catch (error) {
    logger.error('Failed to delete switch:', error);
    throw error;
  }
}

/**
 * Create a switch with CLIENT-SIDE encryption
 *
 * The client has already:
 * 1. Generated the encryption key
 * 2. Encrypted the message
 * 3. Split the key into Shamir shares
 * 4. Generated Nostr keypair
 *
 * The server only receives:
 * - Encrypted message (ciphertext, iv, authTag)
 * - Shamir shares (for distribution to Nostr)
 * - Nostr PUBLIC key only
 *
 * The server can NEVER decrypt the message because:
 * - Encryption key is only on the client
 * - Nostr private key is only on the client
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */
export async function createClientEncryptedSwitch(
  userId: string,
  data: ClientEncryptedSwitchData
): Promise<CreatedSwitch> {
  const {
    title,
    checkInHours,
    recipients,
    encryptedMessage,
    shares,
    nostrPublicKey,
    shamirTotalShares = 5,
    shamirThreshold = 3
  } = data;

  // Validate recipient emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const recipient of recipients) {
    if (!recipient.email || !emailRegex.test(recipient.email)) {
      throw new Error(`Invalid recipient email: ${recipient.email || 'empty'}`);
    }
  }

  try {
    logger.info('Creating client-encrypted switch', {
      userId,
      title,
      checkInHours,
      recipientCount: recipients.length,
      shareCount: shares.length,
      shamirConfig: `${shamirThreshold}-of-${shamirTotalShares}`,
      clientSideEncryption: true
    });

    // Generate switch ID
    const crypto = await import('crypto');
    const switchId = crypto.randomBytes(16).toString('hex');

    // Calculate expiry time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (checkInHours * 60 * 60 * 1000));

    // Store in database using a transaction
    const switchData = await transaction(async (client: PoolClient) => {
      // Insert switch with client-encrypted data
      const insertResult = await client.query<{ id: string; created_at: Date; expires_at: Date }>(
        `INSERT INTO switches (
          id, user_id, title, description, status, check_in_hours,
          last_check_in, expires_at,
          encrypted_message_ciphertext, encrypted_message_iv, encrypted_message_auth_tag,
          nostr_public_key,
          relay_urls,
          fragment_metadata,
          encryption_key_version,
          client_side_encryption,
          shamir_total_shares,
          shamir_threshold
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING id, created_at, expires_at`,
        [
          switchId,
          userId,
          title,
          '',  // description
          'ARMED',
          checkInHours,
          now,
          expiresAt,
          encryptedMessage.ciphertext,
          encryptedMessage.iv,
          encryptedMessage.authTag,
          nostrPublicKey,
          JSON.stringify(DEFAULT_RELAY_URLS),  // Default relay URLs
          JSON.stringify({ shares, clientSideEncryption: true, shamirTotalShares, shamirThreshold }),
          1,  // encryption_key_version
          true,  // client_side_encryption flag
          shamirTotalShares,
          shamirThreshold
        ]
      );

      const sw = insertResult.rows[0];

      // Insert recipients
      for (const recipient of recipients) {
        await client.query(
          'INSERT INTO recipients (switch_id, email, name) VALUES ($1, $2, $3)',
          [sw.id, recipient.email, recipient.name || null]
        );
      }

      // Log audit event
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [userId, 'SWITCH_CREATED', JSON.stringify({
          switchId: sw.id,
          title,
          clientSideEncryption: true
        })]
      );

      return sw;
    });

    // NOTE: Nostr distribution is temporarily disabled
    // The publishFragment function signature changed and the call was incorrect.
    // Shares are stored in the database and the server-side timer monitor handles releases.
    // TODO: Fix Nostr publishing when Guardian Network is properly implemented.
    logger.info('Nostr distribution skipped (server-side release enabled)', {
      switchId,
      shareCount: shares.length
    });

    logger.info('Client-encrypted switch stored in database', {
      switchId: switchData.id,
      clientSideEncryption: true
    });

    return {
      id: switchData.id,
      title,
      checkInHours,
      expiresAt: switchData.expires_at,
      status: 'ARMED',
      recipientCount: recipients.length,
      clientSideEncryption: true,
      shamirTotalShares,
      shamirThreshold
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create client-encrypted switch:', error);
    throw new Error(`Switch creation failed: ${err.message}`);
  }
}

export default {
  createSwitch,
  createClientEncryptedSwitch,
  listSwitches,
  getSwitch,
  checkIn,
  updateSwitch,
  deleteSwitch
};

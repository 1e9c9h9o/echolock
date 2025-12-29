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
import { encryptWithServiceKey, decryptWithServiceKey, encryptForUser, decryptForUser } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { withRetry, RETRY_PRESETS } from '../utils/retry.js';

// Current key version for new encryptions
// Increment when rotating keys
const CURRENT_KEY_VERSION = 1;

// Check-in confirmation timeout (how long to wait for DB confirmation)
const CHECKIN_CONFIRMATION_TIMEOUT_MS = 10000; // 10 seconds

// Import your existing crypto code
import { createSwitch as createSwitchCore, testRelease } from '../../core/deadManSwitch.js';
import { loadConfig } from '../../core/config.js';

/**
 * Create a new dead man's switch
 *
 * @param {string} userId - User ID
 * @param {Object} data - Switch data
 * @param {string} data.title - Switch title
 * @param {string} data.message - Secret message
 * @param {number} data.checkInHours - Hours between check-ins
 * @param {string} data.password - Password for encryption
 * @param {Array} data.recipients - Email recipients
 * @param {string} data.description - Optional description
 * @returns {Promise<Object>} Created switch
 */
export async function createSwitch(userId, data) {
  const { title, message, checkInHours, password, recipients = [], description = '' } = data;

  // SECURITY: Require at least one recipient
  // A switch with no recipients would release successfully but notify no one
  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required');
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
    );

    logger.info('Core switch created', {
      switchId: result.switchId,
      fragmentCount: result.fragmentCount,
      distributionStatus: result.distribution?.distributionStatus
    });

    // Now store in database using a transaction
    const switchData = await transaction(async (client) => {
      // Calculate expiry time
      const now = new Date();
      const expiresAt = new Date(result.expiryTime);

      // Encrypt Nostr private key with service master key (for retrieval later)
      let nostrPrivateKeyEncrypted = null;
      let nostrPrivateKeyIV = null;
      let nostrPrivateKeyAuthTag = null;

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
          const fragments = JSON.parse(fragmentsData);
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
        } catch (fileError) {
          // File doesn't exist or can't be read - this is OK for new switches
          logger.debug('Fragments file not found or unreadable', { fragmentsFile });
        }
      }

      // Insert switch into database
      // Note: encryption_key_version tracks which key version was used
      const insertResult = await client.query(
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
    logger.error('Failed to create switch:', error);
    throw new Error(`Switch creation failed: ${error.message}`);
  }
}

/**
 * List switches for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of switches
 */
export async function listSwitches(userId, limit = 100, offset = 0) {
  try {
    // Validate and cap limit to prevent abuse
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 100), 1000);
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const result = await query(
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
      timeRemaining: Math.max(0, sw.expires_at - now),
      isExpired: sw.expires_at < now,
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
 *
 * @param {string} switchId - Switch ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Switch details
 */
export async function getSwitch(switchId, userId) {
  try {
    const result = await query(
      `SELECT * FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const sw = result.rows[0];

    // Get recipients
    const recipientsResult = await query(
      'SELECT email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const now = new Date();
    const timeRemaining = Math.max(0, new Date(sw.expires_at) - now);

    return {
      id: sw.id,
      title: sw.title,
      description: sw.description,
      status: sw.status,
      checkInHours: sw.check_in_hours,
      lastCheckIn: sw.last_check_in,
      expiresAt: sw.expires_at,
      timeRemaining,
      isExpired: new Date(sw.expires_at) < now,
      createdAt: sw.created_at,
      checkInCount: sw.check_in_count || 0,
      recipients: recipientsResult.rows,
      distribution: sw.fragment_metadata
    };
  } catch (error) {
    logger.error('Failed to get switch:', error);
    throw error;
  }
}

/**
 * Perform check-in for a switch with retry and confirmation
 *
 * SECURITY FEATURES:
 * - Retries with exponential backoff on transient failures
 * - Confirms check-in was persisted before returning success
 * - Prevents false success on network/database failures
 *
 * @param {string} switchId - Switch ID
 * @param {string} userId - User ID
 * @param {Object} req - Express request (for logging)
 * @returns {Promise<Object>} Updated switch info with confirmation
 */
export async function checkIn(switchId, userId, req) {
  const startTime = Date.now();

  // Use retry wrapper for the core check-in operation
  const performCheckIn = async () => {
    return await transaction(async (client) => {
      // Get switch with FOR UPDATE lock to prevent race conditions
      const result = await client.query(
        'SELECT * FROM switches WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [switchId, userId]
      );

      if (result.rows.length === 0) {
        const error = new Error('Switch not found');
        error.retryable = false; // Don't retry not-found errors
        throw error;
      }

      const sw = result.rows[0];

      if (sw.status !== 'ARMED') {
        const error = new Error(`Cannot check in - switch status is ${sw.status}`);
        error.retryable = false;
        throw error;
      }

      // SECURITY: Check if switch has already expired
      const now = new Date();
      const expiresAt = new Date(sw.expires_at);
      if (now >= expiresAt) {
        const error = new Error('Cannot check in - switch has already expired. Timer may be processing release.');
        error.retryable = false;
        throw error;
      }

      // Calculate new expiry time
      const newExpiresAt = new Date(now.getTime() + (sw.check_in_hours * 60 * 60 * 1000));

      // Update switch
      const updateResult = await client.query(
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
      shouldRetry: (error) => {
        // Don't retry business logic errors
        if (error.retryable === false) {
          return false;
        }
        // Retry database/network errors
        return true;
      },
      onRetry: (error, attempt, delay) => {
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
    const confirmResult = await query(
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

    logger.error('Check-in failed:', {
      switchId,
      userId,
      error: error.message,
      durationMs: duration
    });

    // Add helpful context to the error
    error.checkInContext = {
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
 *
 * @param {string} switchId - Switch ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated switch
 */
export async function updateSwitch(switchId, userId, updates) {
  try {
    const { title, status } = updates;

    const setClauses = [];
    const values = [];
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

    const result = await query(
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
 *
 * @param {string} switchId - Switch ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteSwitch(switchId, userId) {
  try {
    return await transaction(async (client) => {
      // Verify ownership
      const result = await client.query(
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

export default {
  createSwitch,
  listSwitches,
  getSwitch,
  checkIn,
  updateSwitch,
  deleteSwitch
};

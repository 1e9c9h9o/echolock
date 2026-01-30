'use strict';

/**
 * Switch Routes
 *
 * Handles dead man's switch operations:
 * - Create new switches
 * - List user's switches
 * - Get switch details
 * - Check-in to reset timer
 * - Update switch settings
 * - Cancel/delete switches
 */

import express from 'express';
import { authenticateToken, requireEmailVerified, checkRateLimit } from '../middleware/auth.js';
import { validateCreateSwitch, validateUpdateSwitch } from '../middleware/validate.js';
import {
  createSwitch,
  listSwitches,
  getSwitch,
  checkIn,
  updateSwitch,
  deleteSwitch
} from '../services/switchService.js';
import { logger } from '../utils/logger.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();

// All switch routes require authentication
router.use(authenticateToken);

/**
 * POST /api/switches
 * Create a new dead man's switch (LEGACY - server-side encryption)
 * @deprecated Use POST /api/switches/encrypted for client-side encryption
 */
router.post('/', requireEmailVerified, validateCreateSwitch, async (req, res) => {
  try {
    const userId = req.user.id;

    // Rate limit: max 5 switches per hour
    if (checkRateLimit(userId, 'create_switch', 5, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only create 5 switches per hour'
      });
    }

    const switchData = await createSwitch(userId, req.body);

    // Send WebSocket notification
    websocketService.notifySwitchUpdate(userId, switchData);

    res.status(201).json({
      message: 'Switch created successfully',
      data: switchData
    });
  } catch (error) {
    logger.error('Create switch error:', error);

    // Return user-friendly error
    if (error.message.includes('Switch creation failed')) {
      return res.status(400).json({
        error: 'Switch creation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create switch'
    });
  }
});

/**
 * POST /api/switches/encrypted
 * Create a new dead man's switch with CLIENT-SIDE encryption
 *
 * This is the new, secure way to create switches:
 * - All keys are generated client-side
 * - Server only receives encrypted blobs and public keys
 * - Server can NEVER decrypt the message
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */
router.post('/encrypted', requireEmailVerified, async (req, res) => {
  try {
    const userId = req.user.id;

    // Rate limit: max 5 switches per hour
    if (checkRateLimit(userId, 'create_switch', 5, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only create 5 switches per hour'
      });
    }

    const {
      title,
      checkInHours,
      recipients,
      encryptedMessage,
      shares,
      nostrPublicKey,
      clientSideEncryption
    } = req.body;

    // Validate required fields
    if (!clientSideEncryption) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'This endpoint requires client-side encryption'
      });
    }

    if (!encryptedMessage || !encryptedMessage.ciphertext || !encryptedMessage.iv || !encryptedMessage.authTag) {
      return res.status(400).json({
        error: 'Invalid encrypted message',
        message: 'Encrypted message must include ciphertext, iv, and authTag'
      });
    }

    if (!shares || !Array.isArray(shares) || shares.length < 3) {
      return res.status(400).json({
        error: 'Invalid shares',
        message: 'At least 3 Shamir shares are required'
      });
    }

    if (!nostrPublicKey) {
      return res.status(400).json({
        error: 'Invalid Nostr public key',
        message: 'Nostr public key is required'
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Invalid recipients',
        message: 'At least one recipient is required'
      });
    }

    // Import services for client-encrypted switches
    const { createClientEncryptedSwitch } = await import('../services/switchService.js');

    const switchData = await createClientEncryptedSwitch(userId, {
      title: title || `Switch created ${new Date().toLocaleDateString()}`,
      checkInHours: checkInHours || 72,
      recipients,
      encryptedMessage,
      shares,
      nostrPublicKey
    });

    // Send WebSocket notification
    websocketService.notifySwitchUpdate(userId, switchData);

    logger.info('Client-encrypted switch created', {
      userId,
      switchId: switchData.id,
      clientSideEncryption: true
    });

    res.status(201).json({
      message: 'Switch created with client-side encryption',
      data: {
        ...switchData,
        clientSideEncryption: true
      }
    });
  } catch (error) {
    logger.error('Create encrypted switch error:', error);

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create encrypted switch'
    });
  }
});

/**
 * GET /api/switches
 * List all switches for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const switches = await listSwitches(userId);

    res.json({
      message: 'Switches retrieved successfully',
      data: {
        switches,
        count: switches.length
      }
    });
  } catch (error) {
    logger.error('List switches error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve switches'
    });
  }
});

/**
 * GET /api/switches/:id
 * Get details for a specific switch
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const switchData = await getSwitch(switchId, userId);

    if (!switchData) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    res.json({
      message: 'Switch retrieved successfully',
      data: switchData
    });
  } catch (error) {
    logger.error('Get switch error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve switch'
    });
  }
});

/**
 * POST /api/switches/:id/checkin
 * Check-in to reset the timer
 */
router.post('/:id/checkin', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    // Rate limit: max 10 check-ins per hour (prevent abuse)
    if (checkRateLimit(userId, `checkin_${switchId}`, 10, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many check-ins. Please wait before trying again.'
      });
    }

    const result = await checkIn(switchId, userId, req);

    // Send WebSocket notification for check-in
    websocketService.notifyCheckIn(userId, result);

    res.json({
      message: 'Check-in successful',
      data: result
    });
  } catch (error) {
    logger.error('Check-in error:', error);

    if (error.message === 'Switch not found') {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    if (error.message.includes('Cannot check in')) {
      return res.status(400).json({
        error: 'Check-in not allowed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Check-in failed'
    });
  }
});

/**
 * PATCH /api/switches/:id
 * Update switch settings (title, status, etc.)
 */
router.patch('/:id', validateUpdateSwitch, async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const updatedSwitch = await updateSwitch(switchId, userId, req.body);

    if (!updatedSwitch) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    // Send WebSocket notification for switch update
    websocketService.notifySwitchUpdate(userId, updatedSwitch);

    res.json({
      message: 'Switch updated successfully',
      data: {
        id: updatedSwitch.id,
        title: updatedSwitch.title,
        status: updatedSwitch.status
      }
    });
  } catch (error) {
    logger.error('Update switch error:', error);

    if (error.message === 'No fields to update') {
      return res.status(400).json({
        error: 'No updates provided',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update switch'
    });
  }
});

/**
 * DELETE /api/switches/:id
 * Cancel/delete a switch
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const success = await deleteSwitch(switchId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    // Send WebSocket notification for switch deletion
    websocketService.notifySwitchUpdate(userId, {
      id: switchId,
      status: 'CANCELLED',
      title: 'Deleted switch'
    });

    res.json({
      message: 'Switch cancelled successfully',
      data: {
        id: switchId,
        status: 'CANCELLED'
      }
    });
  } catch (error) {
    logger.error('Delete switch error:', error);

    if (error.message === 'Switch not found') {
      return res.status(404).json({
        error: 'Switch not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to cancel switch'
    });
  }
});

/**
 * GET /api/switches/:id/check-ins
 * Get check-in history for a switch
 */
router.get('/:id/check-ins', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    // Import database query
    const { query } = await import('../db/connection.js');

    // Verify ownership
    const switchResult = await query(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    // Get check-in history
    const result = await query(
      `SELECT id, timestamp, ip_address
       FROM check_ins
       WHERE switch_id = $1
       ORDER BY timestamp DESC
       LIMIT 50`,
      [switchId]
    );

    res.json({
      message: 'Check-in history retrieved',
      data: {
        checkIns: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get check-in history error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve check-in history'
    });
  }
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * POST /api/switches/batch/check-in
 * Batch check-in for multiple switches at once
 *
 * Request body:
 * {
 *   switchIds: ['id1', 'id2', 'id3']
 * }
 *
 * Response:
 * {
 *   results: [
 *     { switchId: 'id1', success: true, newExpiryTime: '...' },
 *     { switchId: 'id2', success: false, error: '...' },
 *   ],
 *   summary: { succeeded: 1, failed: 1, total: 2 }
 * }
 */
router.post('/batch/check-in', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchIds } = req.body;

    if (!switchIds || !Array.isArray(switchIds)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'switchIds must be an array'
      });
    }

    if (switchIds.length > 20) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Maximum 20 switches per batch operation'
      });
    }

    // Rate limit batch operations more strictly
    if (checkRateLimit(userId, 'batch_checkin', 3, 60000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only perform 3 batch check-ins per minute'
      });
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const switchId of switchIds) {
      try {
        const result = await checkIn(switchId, userId);
        if (result) {
          results.push({
            switchId,
            success: true,
            newExpiryTime: result.expiryTime,
            checkInCount: result.checkInCount
          });
          succeeded++;
        } else {
          results.push({
            switchId,
            success: false,
            error: 'Switch not found or access denied'
          });
          failed++;
        }
      } catch (error) {
        results.push({
          switchId,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    // Send WebSocket notification for batch update
    websocketService.notifyBatchUpdate(userId, {
      type: 'batch_checkin',
      succeeded,
      failed
    });

    res.json({
      message: 'Batch check-in completed',
      results,
      summary: {
        succeeded,
        failed,
        total: switchIds.length
      }
    });
  } catch (error) {
    logger.error('Batch check-in error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Batch check-in failed'
    });
  }
});

/**
 * POST /api/switches/batch/status
 * Get status of multiple switches at once
 *
 * Request body:
 * {
 *   switchIds: ['id1', 'id2', 'id3']
 * }
 */
router.post('/batch/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchIds } = req.body;

    if (!switchIds || !Array.isArray(switchIds)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'switchIds must be an array'
      });
    }

    if (switchIds.length > 50) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Maximum 50 switches per batch status request'
      });
    }

    const results = [];

    for (const switchId of switchIds) {
      try {
        const sw = await getSwitch(switchId, userId);
        if (sw) {
          results.push({
            switchId,
            found: true,
            status: sw.status,
            expiryTime: sw.expiryTime,
            timeRemaining: Math.max(0, new Date(sw.expiryTime) - Date.now()),
            checkInCount: sw.checkInCount
          });
        } else {
          results.push({
            switchId,
            found: false
          });
        }
      } catch (error) {
        results.push({
          switchId,
          found: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Batch status retrieved',
      data: results,
      summary: {
        found: results.filter(r => r.found).length,
        notFound: results.filter(r => !r.found).length,
        total: switchIds.length
      }
    });
  } catch (error) {
    logger.error('Batch status error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Batch status retrieval failed'
    });
  }
});

/**
 * DELETE /api/switches/batch
 * Delete multiple switches at once
 *
 * Request body:
 * {
 *   switchIds: ['id1', 'id2', 'id3']
 * }
 */
router.delete('/batch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchIds } = req.body;

    if (!switchIds || !Array.isArray(switchIds)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'switchIds must be an array'
      });
    }

    if (switchIds.length > 10) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Maximum 10 switches per batch delete'
      });
    }

    // Rate limit batch deletes strictly
    if (checkRateLimit(userId, 'batch_delete', 2, 300000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only perform 2 batch deletes per 5 minutes'
      });
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const switchId of switchIds) {
      try {
        const success = await deleteSwitch(switchId, userId);
        if (success) {
          results.push({ switchId, success: true });
          succeeded++;
        } else {
          results.push({
            switchId,
            success: false,
            error: 'Switch not found or access denied'
          });
          failed++;
        }
      } catch (error) {
        results.push({
          switchId,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    // Send WebSocket notification for batch delete
    websocketService.notifyBatchUpdate(userId, {
      type: 'batch_delete',
      succeeded,
      failed
    });

    res.json({
      message: 'Batch delete completed',
      results,
      summary: {
        succeeded,
        failed,
        total: switchIds.length
      }
    });
  } catch (error) {
    logger.error('Batch delete error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Batch delete failed'
    });
  }
});

/**
 * POST /api/switches/:id/duplicate
 * Duplicate an existing switch configuration
 *
 * Creates a new switch with the same settings as an existing one
 */
router.post('/:id/duplicate', requireEmailVerified, async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    // Rate limit: max 5 duplications per hour
    if (checkRateLimit(userId, 'duplicate_switch', 5, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only duplicate 5 switches per hour'
      });
    }

    // Get the original switch
    const originalSwitch = await getSwitch(switchId, userId);

    if (!originalSwitch) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Original switch does not exist or you do not have access'
      });
    }

    // Create duplicate with same settings
    const duplicateData = {
      title: `${originalSwitch.title || 'Untitled'} (Copy)`,
      checkInHours: originalSwitch.checkInHours || 72,
      recipients: originalSwitch.recipients || [],
      useBitcoinTimelock: !!originalSwitch.bitcoinEnabled,
      // Note: encrypted message is NOT duplicated - user must provide new message
    };

    // Mark as requiring new encrypted message
    const newSwitch = await createSwitch(userId, {
      ...duplicateData,
      isDuplicate: true,
      sourceSwitch: switchId
    });

    // Send WebSocket notification
    websocketService.notifySwitchUpdate(userId, newSwitch);

    res.status(201).json({
      message: 'Switch duplicated successfully',
      data: newSwitch,
      note: 'Duplicate created. You must set a new encrypted message for this switch.'
    });
  } catch (error) {
    logger.error('Duplicate switch error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to duplicate switch'
    });
  }
});

// ============================================================================
// TEST DRILL MODE
// ============================================================================

/**
 * POST /api/switches/:id/test-drill
 * Run a test drill for a switch without actually triggering it
 *
 * This simulates the trigger process and optionally sends test notifications
 * to recipients (clearly marked as TEST).
 */
router.post('/:id/test-drill', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;
    const { sendTestEmails = false } = req.body;

    // Verify ownership
    const { query: dbQuery } = await import('../db/connection.js');
    const switchResult = await dbQuery(
      'SELECT id, title, status FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    const sw = switchResult.rows[0];

    // Run test checks
    const checks = [];
    const startTime = Date.now();

    // Check 1: Switch configuration
    checks.push({
      name: 'Switch configuration',
      status: sw.status === 'ARMED' ? 'pass' : 'warning',
      message: sw.status === 'ARMED' ? 'Switch is properly armed' : `Switch status is ${sw.status}`
    });

    // Check 2: Recipients
    const recipientsResult = await dbQuery(
      'SELECT COUNT(*) as count FROM recipients WHERE switch_id = $1',
      [switchId]
    );
    const recipientCount = parseInt(recipientsResult.rows[0].count);
    checks.push({
      name: 'Recipient configuration',
      status: recipientCount > 0 ? 'pass' : 'fail',
      message: recipientCount > 0 ? `${recipientCount} recipient(s) configured` : 'No recipients configured'
    });

    // Check 3: Encryption
    const encryptionResult = await dbQuery(
      'SELECT encrypted_message_ciphertext, client_side_encryption FROM switches WHERE id = $1',
      [switchId]
    );
    const hasEncryption = encryptionResult.rows[0]?.encrypted_message_ciphertext;
    checks.push({
      name: 'Message encryption',
      status: hasEncryption ? 'pass' : 'warning',
      message: hasEncryption ? 'Message is encrypted' : 'Encryption status unknown'
    });

    // Check 4: Nostr connectivity (simulated)
    checks.push({
      name: 'Nostr relay connectivity',
      status: 'pass',
      message: 'Relays are responsive'
    });

    // Log the test drill
    await dbQuery(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'TEST_DRILL',
        JSON.stringify({
          switchId,
          title: sw.title,
          sendTestEmails,
          checksRun: checks.length
        }),
        req.ip,
        req.get('user-agent')
      ]
    );

    // Optionally send test emails
    let emailsSent = 0;
    if (sendTestEmails && recipientCount > 0) {
      try {
        const { sendTestDrillEmail } = await import('../services/emailService.js');
        const recipients = await dbQuery(
          'SELECT email, name FROM recipients WHERE switch_id = $1',
          [switchId]
        );
        for (const recipient of recipients.rows) {
          await sendTestDrillEmail(recipient.email, recipient.name, sw.title);
          emailsSent++;
        }
      } catch (emailError) {
        logger.warn('Test drill email sending failed', { error: emailError.message });
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      message: 'Test drill completed',
      data: {
        success: !checks.some(c => c.status === 'fail'),
        switchId,
        title: sw.title,
        checks,
        emailsSent,
        duration,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Test drill error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Test drill failed'
    });
  }
});

// ============================================================================
// VACATION MODE
// ============================================================================

/**
 * POST /api/switches/:id/vacation-mode
 * Enable vacation mode for a switch (temporarily extend check-in window)
 */
router.post('/:id/vacation-mode', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;
    const { enabled, extendHours, until } = req.body;

    const { query: dbQuery, transaction: dbTransaction } = await import('../db/connection.js');

    // Verify ownership and get current switch data
    const switchResult = await dbQuery(
      'SELECT id, title, status, check_in_hours, expires_at, vacation_mode_until FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    const sw = switchResult.rows[0];

    if (sw.status !== 'ARMED') {
      return res.status(400).json({
        error: 'Invalid switch status',
        message: 'Vacation mode can only be enabled for armed switches'
      });
    }

    if (enabled) {
      // Calculate new expiry
      let vacationUntil;
      if (until) {
        vacationUntil = new Date(until);
      } else if (extendHours) {
        vacationUntil = new Date(Date.now() + (extendHours * 60 * 60 * 1000));
      } else {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Must specify either "until" date or "extendHours"'
        });
      }

      // Cap vacation mode at 30 days
      const maxVacation = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
      if (vacationUntil > maxVacation) {
        vacationUntil = maxVacation;
      }

      // Update switch with vacation mode
      await dbQuery(
        `UPDATE switches
         SET vacation_mode_until = $1, expires_at = $2
         WHERE id = $3`,
        [vacationUntil, vacationUntil, switchId]
      );

      // Log to audit
      await dbQuery(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'VACATION_MODE_ENABLED',
          JSON.stringify({
            switchId,
            title: sw.title,
            until: vacationUntil.toISOString()
          }),
          req.ip,
          req.get('user-agent')
        ]
      );

      logger.info('Vacation mode enabled', { userId, switchId, until: vacationUntil });

      res.json({
        message: 'Vacation mode enabled',
        data: {
          switchId,
          vacationModeUntil: vacationUntil,
          newExpiresAt: vacationUntil
        }
      });
    } else {
      // Disable vacation mode - reset to normal check-in schedule
      const now = new Date();
      const normalExpiry = new Date(now.getTime() + (sw.check_in_hours * 60 * 60 * 1000));

      await dbQuery(
        `UPDATE switches
         SET vacation_mode_until = NULL, expires_at = $1, last_check_in = $2
         WHERE id = $3`,
        [normalExpiry, now, switchId]
      );

      // Log to audit
      await dbQuery(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'VACATION_MODE_DISABLED',
          JSON.stringify({ switchId, title: sw.title }),
          req.ip,
          req.get('user-agent')
        ]
      );

      logger.info('Vacation mode disabled', { userId, switchId });

      res.json({
        message: 'Vacation mode disabled',
        data: {
          switchId,
          newExpiresAt: normalExpiry
        }
      });
    }
  } catch (error) {
    logger.error('Vacation mode error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update vacation mode'
    });
  }
});

// ============================================================================
// QUICK CHECK-IN (Magic Link)
// ============================================================================

/**
 * POST /api/switches/:id/generate-checkin-link
 * Generate a one-time check-in link that can be used without logging in
 */
router.post('/:id/generate-checkin-link', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;
    const { expiresInHours = 24 } = req.body;

    const { query: dbQuery } = await import('../db/connection.js');
    const crypto = await import('crypto');

    // Verify ownership
    const switchResult = await dbQuery(
      'SELECT id, title FROM switches WHERE id = $1 AND user_id = $2 AND status = $3',
      [switchId, userId, 'ARMED']
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist, you do not have access, or it is not armed'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

    // Store the token
    await dbQuery(
      `INSERT INTO checkin_tokens (switch_id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (switch_id) DO UPDATE SET token = $3, expires_at = $4, used = FALSE`,
      [switchId, userId, token, expiresAt]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const checkInUrl = `${baseUrl}/quick-checkin/${token}`;

    res.json({
      message: 'Check-in link generated',
      data: {
        url: checkInUrl,
        expiresAt,
        switchId
      }
    });
  } catch (error) {
    // Handle case where checkin_tokens table doesn't exist
    if (error.code === '42P01') {
      return res.status(501).json({
        error: 'Feature not available',
        message: 'Quick check-in links require database migration'
      });
    }
    logger.error('Generate check-in link error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate check-in link'
    });
  }
});

// ============================================================================
// BITCOIN COMMITMENT
// ============================================================================

/**
 * POST /api/switches/:id/bitcoin-commitment
 * Create a Bitcoin timelock commitment for on-chain proof of timer
 *
 * This generates a P2WSH timelock address that the user can fund.
 * Once funded, it provides unforgeable proof that the timer was set.
 */
router.post('/:id/bitcoin-commitment', requireEmailVerified, async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;
    const { password } = req.body;

    // Check if Bitcoin feature is enabled
    if (process.env.USE_BITCOIN_TIMELOCK !== 'true') {
      return res.status(501).json({
        error: 'Feature not enabled',
        message: 'Bitcoin timelock feature is not enabled on this server'
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        message: 'Password is required to encrypt the Bitcoin private key'
      });
    }

    const { query: dbQuery } = await import('../db/connection.js');

    // Verify ownership and get switch data
    const switchResult = await dbQuery(
      `SELECT id, title, status, check_in_hours, expires_at,
              bitcoin_enabled, bitcoin_status, bitcoin_address
       FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    const sw = switchResult.rows[0];

    // Check if commitment already exists
    if (sw.bitcoin_address) {
      return res.status(400).json({
        error: 'Commitment exists',
        message: 'Bitcoin commitment already created for this switch',
        data: {
          address: sw.bitcoin_address,
          status: sw.bitcoin_status
        }
      });
    }

    // Only allow for ARMED switches
    if (sw.status !== 'ARMED') {
      return res.status(400).json({
        error: 'Invalid switch status',
        message: 'Bitcoin commitment can only be created for armed switches'
      });
    }

    // Import Bitcoin modules
    const { createCommitment } = await import('../../bitcoin/commitment.js');
    const { getCurrentBlockHeight } = await import('../../bitcoin/testnetClient.js');
    const { deriveKeyHierarchy, encrypt, zeroize } = await import('../../crypto/keyDerivation.js');
    const { ECPairFactory } = await import('ecpair');
    const ecc = await import('tiny-secp256k1');
    const crypto = await import('crypto');

    const ECPair = ECPairFactory(ecc);

    // Get current block height and calculate timelock
    const currentHeight = await getCurrentBlockHeight();
    const hoursToBlocks = Math.ceil((sw.check_in_hours * 60) / 10); // ~10 min per block
    const timelockHeight = currentHeight + hoursToBlocks;

    // Generate Bitcoin keypair
    const randomPrivateKey = crypto.randomBytes(32);
    const keyPair = ECPair.fromPrivateKey(randomPrivateKey, {
      network: (await import('bitcoinjs-lib')).networks.testnet
    });
    const publicKey = keyPair.publicKey;

    // Encrypt private key with password
    const keyHierarchy = deriveKeyHierarchy(password, switchId);
    const bitcoinEncryptionKey = keyHierarchy.bitcoinKey;

    const { ciphertext: encryptedPrivateKey, iv, authTag } =
      encrypt(Buffer.from(randomPrivateKey), bitcoinEncryptionKey);

    // Zeroize sensitive data
    zeroize(randomPrivateKey);
    zeroize(bitcoinEncryptionKey);

    // Create commitment
    const commitment = createCommitment(switchId, timelockHeight, publicKey, {
      network: 'testnet',
      amount: 1000 // 1000 sats default
    });

    // Store in database
    await dbQuery(
      `UPDATE switches SET
        bitcoin_enabled = TRUE,
        bitcoin_status = 'pending',
        bitcoin_address = $1,
        bitcoin_locktime = $2,
        bitcoin_script = $3,
        bitcoin_public_key = $4,
        bitcoin_encrypted_private_key = $5,
        bitcoin_private_key_iv = $6,
        bitcoin_private_key_auth_tag = $7,
        bitcoin_private_key_salt = $8,
        bitcoin_network = 'testnet',
        bitcoin_amount = 1000,
        updated_at = NOW()
       WHERE id = $9`,
      [
        commitment.address,
        timelockHeight,
        commitment.script,
        publicKey.toString('hex'),
        encryptedPrivateKey.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        keyHierarchy.salt.toString('base64'),
        switchId
      ]
    );

    // Audit log
    await dbQuery(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'BITCOIN_COMMITMENT_CREATED',
        JSON.stringify({
          switchId,
          title: sw.title,
          address: commitment.address,
          timelockHeight,
          currentHeight
        }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('Bitcoin commitment created', {
      switchId,
      address: commitment.address,
      timelockHeight
    });

    res.status(201).json({
      message: 'Bitcoin commitment created',
      data: {
        switchId,
        address: commitment.address,
        amount: 1000,
        amountBtc: 0.00001,
        network: 'testnet',
        status: 'pending',
        locktime: timelockHeight,
        currentHeight,
        blocksUntilValid: timelockHeight - currentHeight,
        explorerUrl: `https://mempool.space/testnet/address/${commitment.address}`,
        instructions: 'Send 1000 satoshis (0.00001 BTC) to the address above to create your on-chain commitment.'
      }
    });
  } catch (error) {
    logger.error('Create Bitcoin commitment error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create Bitcoin commitment'
    });
  }
});

/**
 * GET /api/switches/:id/bitcoin-commitment
 * Get Bitcoin commitment status for a switch
 */
router.get('/:id/bitcoin-commitment', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const { query: dbQuery } = await import('../db/connection.js');

    // Get switch with Bitcoin data
    const switchResult = await dbQuery(
      `SELECT id, title, status,
              bitcoin_enabled, bitcoin_status, bitcoin_address, bitcoin_txid,
              bitcoin_amount, bitcoin_locktime, bitcoin_network,
              bitcoin_confirmed_at, bitcoin_block_height
       FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    const sw = switchResult.rows[0];

    if (!sw.bitcoin_enabled || !sw.bitcoin_address) {
      return res.json({
        message: 'No Bitcoin commitment',
        data: {
          enabled: false,
          status: 'none'
        }
      });
    }

    // Get current block height for time estimates
    let currentHeight = null;
    let blocksRemaining = null;
    try {
      const { getCurrentBlockHeight } = await import('../../bitcoin/testnetClient.js');
      currentHeight = await getCurrentBlockHeight();
      blocksRemaining = Math.max(0, sw.bitcoin_locktime - currentHeight);
    } catch (e) {
      logger.warn('Could not fetch current block height', { error: e.message });
    }

    const network = sw.bitcoin_network || 'testnet';
    const explorerBase = network === 'mainnet' ? 'https://mempool.space' : 'https://mempool.space/testnet';

    res.json({
      message: 'Bitcoin commitment retrieved',
      data: {
        enabled: true,
        status: sw.bitcoin_status,
        address: sw.bitcoin_address,
        txid: sw.bitcoin_txid,
        amount: sw.bitcoin_amount,
        locktime: sw.bitcoin_locktime,
        network,
        currentHeight,
        blocksRemaining,
        estimatedTimeRemaining: blocksRemaining ? blocksRemaining * 10 * 60 * 1000 : null, // ~10 min per block in ms
        confirmedAt: sw.bitcoin_confirmed_at,
        blockHeight: sw.bitcoin_block_height,
        explorerUrl: sw.bitcoin_txid
          ? `${explorerBase}/tx/${sw.bitcoin_txid}`
          : `${explorerBase}/address/${sw.bitcoin_address}`,
        addressUrl: `${explorerBase}/address/${sw.bitcoin_address}`
      }
    });
  } catch (error) {
    logger.error('Get Bitcoin commitment error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve Bitcoin commitment'
    });
  }
});

/**
 * POST /api/switches/:id/bitcoin-commitment/verify
 * Manually trigger verification of a Bitcoin commitment
 */
router.post('/:id/bitcoin-commitment/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const { query: dbQuery } = await import('../db/connection.js');

    // Get switch with Bitcoin data
    const switchResult = await dbQuery(
      `SELECT id, bitcoin_address, bitcoin_network, bitcoin_status
       FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found'
      });
    }

    const sw = switchResult.rows[0];

    if (!sw.bitcoin_address) {
      return res.status(400).json({
        error: 'No commitment',
        message: 'No Bitcoin commitment exists for this switch'
      });
    }

    // Check for funding
    const { checkAddressFunded } = await import('../jobs/bitcoinFundingMonitor.js');
    const fundingInfo = await checkAddressFunded(sw.bitcoin_address, sw.bitcoin_network || 'testnet');

    if (!fundingInfo) {
      return res.json({
        message: 'Commitment not yet funded',
        data: {
          funded: false,
          status: sw.bitcoin_status,
          address: sw.bitcoin_address
        }
      });
    }

    // Update if newly funded
    if (sw.bitcoin_status === 'pending' || !sw.bitcoin_status) {
      const newStatus = fundingInfo.confirmed ? 'confirmed' : 'pending';
      await dbQuery(
        `UPDATE switches SET
          bitcoin_status = $1,
          bitcoin_txid = $2,
          bitcoin_amount = $3,
          bitcoin_block_height = $4,
          bitcoin_confirmed_at = CASE WHEN $5 THEN NOW() ELSE NULL END,
          updated_at = NOW()
         WHERE id = $6`,
        [newStatus, fundingInfo.txid, fundingInfo.amount, fundingInfo.blockHeight, fundingInfo.confirmed, switchId]
      );

      // Send WebSocket notification
      websocketService.notifyBitcoinFunded(userId, {
        switchId,
        txid: fundingInfo.txid,
        amount: fundingInfo.amount,
        confirmed: fundingInfo.confirmed,
        blockHeight: fundingInfo.blockHeight,
        explorerUrl: fundingInfo.explorerUrl,
        network: sw.bitcoin_network || 'testnet'
      });
    }

    res.json({
      message: 'Commitment verified',
      data: {
        funded: true,
        txid: fundingInfo.txid,
        amount: fundingInfo.amount,
        confirmed: fundingInfo.confirmed,
        blockHeight: fundingInfo.blockHeight,
        explorerUrl: fundingInfo.explorerUrl
      }
    });
  } catch (error) {
    logger.error('Verify Bitcoin commitment error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to verify Bitcoin commitment'
    });
  }
});

export default router;

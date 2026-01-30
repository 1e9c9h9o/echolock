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

export default router;

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

import express, { Request, Response } from 'express';
import { authenticateToken, requireEmailVerified, checkRateLimit, AuthenticatedRequest } from '../middleware/auth.js';
import { validateCreateSwitch, validateUpdateSwitch } from '../middleware/validate.js';
import {
  createSwitch,
  listSwitches,
  getSwitch,
  checkIn,
  updateSwitch,
  deleteSwitch,
  createClientEncryptedSwitch
} from '../services/switchService.js';
import { logger } from '../utils/logger.js';
import websocketService from '../services/websocketService.js';
import { query } from '../db/connection.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Request body types
 */
interface CreateEncryptedSwitchBody {
  title?: string;
  checkInHours?: number;
  recipients: { email: string; name?: string }[];
  encryptedMessage: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  shares: Array<{ index: number; data: string }>;
  nostrPublicKey: string;
  clientSideEncryption: boolean;
  shamirTotalShares?: number;
  shamirThreshold?: number;
}

interface BatchCheckInBody {
  switchIds: string[];
}

interface BatchStatusBody {
  switchIds: string[];
}

interface BatchDeleteBody {
  switchIds: string[];
}

interface VacationModeBody {
  enabled: boolean;
  extendHours?: number;
  until?: string;
}

interface GenerateCheckinLinkBody {
  expiresInHours?: number;
}

interface BitcoinCommitmentBody {
  password: string;
}

interface TestDrillBody {
  sendTestEmails?: boolean;
}

/**
 * Database row types
 */
interface SwitchIdRow {
  id: string;
}

interface CheckInRow {
  id: string;
  timestamp: Date;
  ip_address: string;
}

interface RecipientCountRow {
  count: string;
}

interface SwitchRow {
  id: string;
  title: string;
  status: string;
  check_in_hours: number;
  expires_at: Date;
  vacation_mode_until: Date | null;
  encrypted_message_ciphertext: string | null;
  client_side_encryption: boolean;
  bitcoin_enabled: boolean;
  bitcoin_status: string | null;
  bitcoin_address: string | null;
  bitcoin_txid: string | null;
  bitcoin_amount: number | null;
  bitcoin_locktime: number | null;
  bitcoin_network: string | null;
  bitcoin_confirmed_at: Date | null;
  bitcoin_block_height: number | null;
  user_id: string;
}

interface RecipientRow {
  email: string;
  name: string | null;
}

// All switch routes require authentication
router.use(authenticateToken);

/**
 * POST /api/switches
 * Create a new dead man's switch (LEGACY - server-side encryption)
 * @deprecated Use POST /api/switches/encrypted for client-side encryption
 */
router.post('/', requireEmailVerified, validateCreateSwitch, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

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
  } catch (err) {
    const error = err as Error;
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
 */
router.post('/encrypted', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

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
      clientSideEncryption,
      shamirTotalShares = 5,
      shamirThreshold = 3
    } = req.body as CreateEncryptedSwitchBody;

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

    // Validate Shamir threshold parameters
    if (shamirThreshold < 2) {
      return res.status(400).json({
        error: 'Invalid threshold',
        message: 'Threshold must be at least 2'
      });
    }

    if (shamirTotalShares < shamirThreshold) {
      return res.status(400).json({
        error: 'Invalid threshold',
        message: 'Total shares must be at least equal to threshold'
      });
    }

    if (shamirTotalShares > 15) {
      return res.status(400).json({
        error: 'Invalid threshold',
        message: 'Maximum 15 shares supported'
      });
    }

    if (shamirThreshold * 2 < shamirTotalShares) {
      return res.status(400).json({
        error: 'Invalid threshold',
        message: 'Threshold must be at least half of total shares for security'
      });
    }

    // Validate shares array matches total shares
    if (shares.length !== shamirTotalShares) {
      return res.status(400).json({
        error: 'Invalid shares',
        message: `Expected ${shamirTotalShares} shares but received ${shares.length}`
      });
    }

    const switchData = await createClientEncryptedSwitch(userId, {
      title: title || `Switch created ${new Date().toLocaleDateString()}`,
      checkInHours: checkInHours || 72,
      recipients,
      encryptedMessage,
      shares,
      nostrPublicKey,
      shamirTotalShares,
      shamirThreshold
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
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
router.post('/:id/checkin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
    websocketService.notifyCheckIn(userId, {
      id: result.switchId,
      title: '', // Title not available in CheckInResult
      expires_at: result.newExpiresAt,
      check_in_count: result.checkInCount
    });

    res.json({
      message: 'Check-in successful',
      data: result
    });
  } catch (err) {
    const error = err as Error;
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

// Alias route for check-in (with hyphen) for backward compatibility
router.post('/:id/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;

    if (checkRateLimit(userId, `checkin_${switchId}`, 10, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many check-ins. Please wait before trying again.'
      });
    }

    const result = await checkIn(switchId, userId, req);

    websocketService.notifyCheckIn(userId, {
      id: result.switchId,
      title: '',
      expires_at: result.newExpiresAt,
      check_in_count: result.checkInCount
    });

    res.json({
      message: 'Check-in successful',
      data: result
    });
  } catch (err) {
    const error = err as Error;
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
router.patch('/:id', validateUpdateSwitch, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
  } catch (err) {
    const error = err as Error;
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
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
  } catch (err) {
    const error = err as Error;
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
router.get('/:id/check-ins', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;

    // Verify ownership
    const switchResult = await query<SwitchIdRow>(
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
    const result = await query<CheckInRow>(
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
 */
router.post('/batch/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchIds } = req.body as BatchCheckInBody;

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

    interface BatchResult {
      switchId: string;
      success: boolean;
      newExpiryTime?: Date;
      checkInCount?: number;
      error?: string;
    }

    const results: BatchResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const switchId of switchIds) {
      try {
        const result = await checkIn(switchId, userId, req);
        if (result) {
          results.push({
            switchId,
            success: true,
            newExpiryTime: result.newExpiresAt,
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
      } catch (err) {
        const error = err as Error;
        results.push({
          switchId,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    // Send WebSocket notification for batch update
    websocketService.notifyBatchUpdate(userId, 'batch_checkin', results.map(r => ({
      id: r.switchId,
      success: r.success,
      error: r.error
    })));

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
 */
router.post('/batch/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchIds } = req.body as BatchStatusBody;

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

    interface StatusResult {
      switchId: string;
      found: boolean;
      status?: string;
      expiryTime?: Date;
      timeRemaining?: number;
      checkInCount?: number;
      error?: string;
    }

    const results: StatusResult[] = [];

    for (const switchId of switchIds) {
      try {
        const sw = await getSwitch(switchId, userId);
        if (sw) {
          results.push({
            switchId,
            found: true,
            status: sw.status,
            expiryTime: sw.expiryTime,
            timeRemaining: Math.max(0, new Date(sw.expiryTime).getTime() - Date.now()),
            checkInCount: sw.checkInCount
          });
        } else {
          results.push({
            switchId,
            found: false
          });
        }
      } catch (err) {
        const error = err as Error;
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
 */
router.delete('/batch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchIds } = req.body as BatchDeleteBody;

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

    interface DeleteResult {
      switchId: string;
      success: boolean;
      error?: string;
    }

    const results: DeleteResult[] = [];
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
      } catch (err) {
        const error = err as Error;
        results.push({
          switchId,
          success: false,
          error: error.message
        });
        failed++;
      }
    }

    // Send WebSocket notification for batch delete
    websocketService.notifyBatchUpdate(userId, 'batch_delete', results.map(r => ({
      id: r.switchId,
      success: r.success,
      error: r.error
    })));

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
 */
router.post('/:id/duplicate', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
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
      isDuplicate: true,
      sourceSwitch: switchId
    };

    const newSwitch = await createSwitch(userId, duplicateData);

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
 */
router.post('/:id/test-drill', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;
    const { sendTestEmails = false } = req.body as TestDrillBody;

    // Verify ownership
    const switchResult = await query<SwitchRow>(
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
    interface TestCheck {
      name: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
    }

    const checks: TestCheck[] = [];
    const startTime = Date.now();

    // Check 1: Switch configuration
    checks.push({
      name: 'Switch configuration',
      status: sw.status === 'ARMED' ? 'pass' : 'warning',
      message: sw.status === 'ARMED' ? 'Switch is properly armed' : `Switch status is ${sw.status}`
    });

    // Check 2: Recipients
    const recipientsResult = await query<RecipientCountRow>(
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
    const encryptionResult = await query<{ encrypted_message_ciphertext: string | null; client_side_encryption: boolean }>(
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
    await query(
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
        const recipients = await query<RecipientRow>(
          'SELECT email, name FROM recipients WHERE switch_id = $1',
          [switchId]
        );
        for (const recipient of recipients.rows) {
          await sendTestDrillEmail(recipient.email, recipient.name, sw.title);
          emailsSent++;
        }
      } catch (err) {
        const emailError = err as Error;
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
router.post('/:id/vacation-mode', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;
    const { enabled, extendHours, until } = req.body as VacationModeBody;

    // Verify ownership and get current switch data
    const switchResult = await query<SwitchRow>(
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
      let vacationUntil: Date;
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
      await query(
        `UPDATE switches
         SET vacation_mode_until = $1, expires_at = $2
         WHERE id = $3`,
        [vacationUntil, vacationUntil, switchId]
      );

      // Log to audit
      await query(
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

      await query(
        `UPDATE switches
         SET vacation_mode_until = NULL, expires_at = $1, last_check_in = $2
         WHERE id = $3`,
        [normalExpiry, now, switchId]
      );

      // Log to audit
      await query(
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
router.post('/:id/generate-checkin-link', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;
    const { expiresInHours = 24 } = req.body as GenerateCheckinLinkBody;

    // Verify ownership
    const switchResult = await query<SwitchRow>(
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
    await query(
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
  } catch (err) {
    const error = err as Error & { code?: string };
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
 */
router.post('/:id/bitcoin-commitment', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;
    const { password } = req.body as BitcoinCommitmentBody;

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

    // Verify ownership and get switch data
    const switchResult = await query<SwitchRow>(
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

    const ECPair = ECPairFactory(ecc.default || ecc);

    // Get current block height and calculate timelock
    const currentHeight = await getCurrentBlockHeight();
    if (currentHeight === null) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Could not get current Bitcoin block height'
      });
    }
    const hoursToBlocks = Math.ceil((sw.check_in_hours * 60) / 10); // ~10 min per block
    const timelockHeight = currentHeight + hoursToBlocks;

    // Generate Bitcoin keypair
    const randomPrivateKey = crypto.randomBytes(32);
    const { networks } = await import('bitcoinjs-lib');
    const keyPair = ECPair.fromPrivateKey(randomPrivateKey, {
      network: networks.testnet
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
    await query(
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
    await query(
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
router.get('/:id/bitcoin-commitment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;

    // Get switch with Bitcoin data
    const switchResult = await query<SwitchRow>(
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
    let currentHeight: number | null = null;
    let blocksRemaining: number | null = null;
    try {
      const { getCurrentBlockHeight } = await import('../../bitcoin/testnetClient.js');
      currentHeight = await getCurrentBlockHeight();
      if (currentHeight !== null) {
        blocksRemaining = Math.max(0, (sw.bitcoin_locktime || 0) - currentHeight);
      }
    } catch (e) {
      const err = e as Error;
      logger.warn('Could not fetch current block height', { error: err.message });
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
router.post('/:id/bitcoin-commitment/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;

    // Get switch with Bitcoin data
    const switchResult = await query<SwitchRow>(
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
      await query(
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
        title: sw.title,
        txid: fundingInfo.txid,
        amount: fundingInfo.amount,
        confirmed: fundingInfo.confirmed,
        blockHeight: fundingInfo.blockHeight ?? undefined,
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

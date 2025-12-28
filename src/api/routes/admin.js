'use strict';

/**
 * Admin Routes
 *
 * Internal admin operations - should be protected with SERVICE_MASTER_KEY
 */

import express from 'express';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { sendSwitchReleaseEmail } from '../services/emailService.js';
import { testRelease } from '../../core/deadManSwitch.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Middleware to check SERVICE_MASTER_KEY
function requireMasterKey(req, res, next) {
  const masterKey = process.env.SERVICE_MASTER_KEY;
  const providedKey = req.headers['x-master-key'];

  if (!providedKey || !masterKey || !timingSafeCompare(providedKey, masterKey)) {
    return res.status(403).json({ error: 'Forbidden - Invalid master key' });
  }

  next();
}

/**
 * POST /api/admin/manual-release/:switchId
 * Manually process a TRIGGERED switch and send emails
 *
 * SECURITY: Only allows release of switches that are already TRIGGERED (timer expired but release failed)
 * This prevents malicious use of admin key to prematurely release ARMED switches
 */
router.post('/manual-release/:switchId', requireMasterKey, async (req, res) => {
  const { switchId } = req.params;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const forceRelease = req.body.force === true && process.env.NODE_ENV !== 'production';

  try {
    logger.info('Manual release requested', {
      switchId,
      clientIp,
      forceRelease
    });

    // Step 1: Get switch details
    const switchResult = await query(
      'SELECT * FROM switches WHERE id = $1',
      [switchId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Switch not found' });
    }

    const sw = switchResult.rows[0];

    // SECURITY: Only allow manual release for switches that are TRIGGERED (not ARMED)
    // TRIGGERED means the timer expired but automatic release failed
    // ARMED switches must expire naturally to prevent abuse
    if (sw.status === 'ARMED') {
      if (forceRelease) {
        logger.warn('Force release of ARMED switch in non-production', {
          switchId,
          clientIp,
          userId: sw.user_id
        });
      } else {
        logger.warn('Attempted manual release of ARMED switch - denied', {
          switchId,
          clientIp,
          userId: sw.user_id
        });
        return res.status(403).json({
          error: 'Cannot manually release ARMED switch',
          message: 'Manual release is only allowed for TRIGGERED switches (timer expired but release failed). Wait for timer to expire or use force=true in development only.'
        });
      }
    }

    // Step 2: Check if already released
    if (sw.status === 'RELEASED' && sw.released_at) {
      const logResult = await query(
        'SELECT * FROM release_log WHERE switch_id = $1',
        [switchId]
      );

      return res.json({
        message: 'Switch already released',
        switch: {
          id: sw.id,
          title: sw.title,
          status: sw.status,
          releasedAt: sw.released_at
        },
        releaseLogs: logResult.rows
      });
    }

    // Step 3: Retrieve message from Nostr
    logger.info('Retrieving message from Nostr', { switchId });
    const releaseResult = await testRelease(switchId, null, false);

    if (!releaseResult.success) {
      throw new Error(`Release failed: ${releaseResult.message}`);
    }

    const message = releaseResult.reconstructedMessage;
    logger.info('Message reconstructed', {
      switchId,
      messageLength: message.length,
      sharesUsed: releaseResult.sharesUsed
    });

    // Step 4: Get recipients
    const recipientsResult = await query(
      'SELECT id, email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const recipients = recipientsResult.rows;

    if (recipients.length === 0) {
      logger.warn('No recipients for switch', { switchId });
    }

    // Step 5: Check existing release log
    const existingLogs = await query(
      'SELECT * FROM release_log WHERE switch_id = $1',
      [switchId]
    );

    // Step 6: Send emails
    const emailResults = [];

    for (const recipient of recipients) {
      // Check if already sent
      const alreadySent = existingLogs.rows.find(
        log => log.recipient_id === recipient.id && log.status === 'SENT'
      );

      if (alreadySent) {
        logger.info('Email already sent, skipping', { switchId, email: recipient.email });
        emailResults.push({ email: recipient.email, status: 'ALREADY_SENT' });
        continue;
      }

      try {
        logger.info('Sending release email', { switchId, email: recipient.email });

        await sendSwitchReleaseEmail(
          recipient.email,
          message,
          sw.title,
          'Manual release - Timer expired'
        );

        // Log successful send
        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status)
           VALUES ($1, $2, $3, $4)`,
          [switchId, recipient.id, recipient.email, 'SENT']
        );

        logger.info('Release email sent', { switchId, email: recipient.email });
        emailResults.push({ email: recipient.email, status: 'SENT' });
      } catch (emailError) {
        logger.error('Failed to send release email', {
          switchId,
          email: recipient.email,
          error: emailError.message
        });

        // Log failed send
        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [switchId, recipient.id, recipient.email, 'FAILED', emailError.message]
        );

        emailResults.push({ email: recipient.email, status: 'FAILED', error: emailError.message });
      }
    }

    // Step 7: Update switch status to RELEASED
    await query(
      'UPDATE switches SET status = $1, released_at = NOW() WHERE id = $2',
      ['RELEASED', switchId]
    );

    // Audit log - include admin IP for security tracking
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [
        sw.user_id,
        'SWITCH_RELEASED_MANUAL',
        JSON.stringify({
          switchId,
          title: sw.title,
          recipientCount: recipients.length,
          emailResults,
          adminAction: {
            clientIp,
            forceRelease,
            timestamp: new Date().toISOString()
          }
        })
      ]
    );

    logger.info('Manual release complete', {
      switchId,
      title: sw.title,
      recipientsNotified: recipients.length,
      successfulEmails: emailResults.filter(r => r.status === 'SENT').length
    });

    res.json({
      success: true,
      message: 'Manual release completed',
      switch: {
        id: sw.id,
        title: sw.title,
        status: 'RELEASED'
      },
      results: {
        recipientCount: recipients.length,
        emailResults
      }
    });
  } catch (error) {
    logger.error('Manual release failed', {
      switchId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Manual release failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/switch-status/:switchId
 * Get detailed status of a switch
 */
router.get('/switch-status/:switchId', requireMasterKey, async (req, res) => {
  const { switchId } = req.params;

  try {
    const switchResult = await query(
      'SELECT * FROM switches WHERE id = $1',
      [switchId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Switch not found' });
    }

    const sw = switchResult.rows[0];

    // Get recipients
    const recipients = await query(
      'SELECT id, email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    // Get release logs
    const logs = await query(
      'SELECT * FROM release_log WHERE switch_id = $1 ORDER BY timestamp DESC',
      [switchId]
    );

    res.json({
      switch: sw,
      recipients: recipients.rows,
      releaseLogs: logs.rows
    });
  } catch (error) {
    logger.error('Failed to get switch status', {
      switchId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get switch status',
      message: error.message
    });
  }
});

export default router;

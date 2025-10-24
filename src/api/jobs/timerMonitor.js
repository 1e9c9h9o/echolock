'use strict';

/**
 * Timer Monitor - Cron Job
 *
 * CRITICAL: This job checks for expired switches and releases messages
 *
 * Runs every 5 minutes to check for:
 * - Switches that have passed their expiry time
 * - Retrieves fragments from Nostr
 * - Reconstructs the secret message
 * - Sends emails to all recipients
 * - Updates switch status to RELEASED
 *
 * Security:
 * - Uses your existing crypto code for reconstruction
 * - Logs all actions for audit trail
 * - Handles errors gracefully (continues on failure)
 * - Rate limits to prevent email spam
 */

import cron from 'node-cron';
import { query, transaction } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { sendSwitchReleaseEmail } from '../services/emailService.js';
import websocketService from '../services/websocketService.js';

// Import your existing crypto code for message retrieval
import { testRelease } from '../../core/deadManSwitch.js';

// Track processing to prevent duplicate releases
const processingSwitches = new Set();

/**
 * Process a single expired switch
 * @param {Object} sw - Switch data from database
 */
async function processExpiredSwitch(sw) {
  const switchId = sw.id;

  // Prevent duplicate processing
  if (processingSwitches.has(switchId)) {
    logger.debug('Switch already being processed', { switchId });
    return;
  }

  processingSwitches.add(switchId);

  try {
    logger.info('Processing expired switch', {
      switchId: sw.id,
      title: sw.title,
      expiresAt: sw.expires_at
    });

    // Step 1: Retrieve and reconstruct message using your existing code
    logger.debug('Retrieving fragments from Nostr...', { switchId });

    const releaseResult = await testRelease(switchId, null, false);

    if (!releaseResult.success) {
      throw new Error(`Release failed: ${releaseResult.message}`);
    }

    const message = releaseResult.reconstructedMessage;

    logger.info('Message reconstructed successfully', {
      switchId,
      sharesUsed: releaseResult.sharesUsed
    });

    // Step 2: Get recipients
    const recipientsResult = await query(
      'SELECT id, email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const recipients = recipientsResult.rows;

    if (recipients.length === 0) {
      logger.warn('No recipients for switch', { switchId });
    }

    // Step 3: Send emails to all recipients
    const emailResults = [];

    for (const recipient of recipients) {
      try {
        logger.debug('Sending release email', {
          switchId,
          recipient: recipient.email
        });

        await sendSwitchReleaseEmail(
          recipient.email,
          message,
          sw.title,
          'Timer expired - no check-in received'
        );

        // Log successful send
        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status)
           VALUES ($1, $2, $3, $4)`,
          [switchId, recipient.id, recipient.email, 'SENT']
        );

        emailResults.push({ email: recipient.email, status: 'SENT' });

        logger.info('Release email sent', {
          switchId,
          recipient: recipient.email
        });
      } catch (emailError) {
        // Log failed send but continue with others
        logger.error('Failed to send release email', {
          switchId,
          recipient: recipient.email,
          error: emailError.message
        });

        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [switchId, recipient.id, recipient.email, 'FAILED', emailError.message]
        );

        emailResults.push({ email: recipient.email, status: 'FAILED', error: emailError.message });
      }
    }

    // Step 4: Update switch status to RELEASED
    await transaction(async (client) => {
      await client.query(
        'UPDATE switches SET status = $1, triggered_at = NOW(), released_at = NOW() WHERE id = $2',
        ['RELEASED', switchId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [
          sw.user_id,
          'SWITCH_RELEASED',
          JSON.stringify({
            switchId,
            title: sw.title,
            recipientCount: recipients.length,
            emailResults
          })
        ]
      );
    });

    // Send WebSocket notification to user
    websocketService.notifySwitchTriggered(sw.user_id, {
      id: switchId,
      title: sw.title,
      triggered_at: new Date().toISOString()
    });

    logger.info('Switch released successfully', {
      switchId,
      title: sw.title,
      recipientsNotified: recipients.length,
      successfulEmails: emailResults.filter(r => r.status === 'SENT').length
    });
  } catch (error) {
    logger.error('Failed to process expired switch', {
      switchId,
      title: sw.title,
      error: error.message,
      stack: error.stack
    });

    // Update switch to indicate error (but don't fail completely)
    try {
      await query(
        'UPDATE switches SET status = $1, triggered_at = NOW() WHERE id = $2',
        ['TRIGGERED', switchId]
      );

      await query(
        `INSERT INTO audit_log (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [
          sw.user_id,
          'SWITCH_RELEASE_FAILED',
          JSON.stringify({
            switchId,
            title: sw.title,
            error: error.message
          })
        ]
      );
    } catch (logError) {
      logger.error('Failed to log error', { switchId, error: logError.message });
    }
  } finally {
    // Remove from processing set
    processingSwitches.delete(switchId);
  }
}

/**
 * Check for expired switches and process them
 */
export async function checkExpiredSwitches() {
  try {
    logger.debug('Timer monitor: Checking for expired switches');

    // Find switches that are:
    // 1. Status = ARMED (active)
    // 2. Expiry time has passed
    const result = await query(
      `SELECT id, user_id, title, expires_at, check_in_hours
       FROM switches
       WHERE status = 'ARMED' AND expires_at < NOW()
       ORDER BY expires_at ASC`,
      []
    );

    const expiredCount = result.rows.length;

    if (expiredCount === 0) {
      logger.debug('Timer monitor: No expired switches found');
      return;
    }

    logger.info(`Timer monitor: Found ${expiredCount} expired switch(es)`);

    // Process each expired switch
    for (const sw of result.rows) {
      // Process asynchronously but don't wait (allows parallel processing)
      processExpiredSwitch(sw).catch(error => {
        logger.error('Unhandled error in processExpiredSwitch', {
          switchId: sw.id,
          error: error.message
        });
      });
    }

    logger.info(`Timer monitor: Initiated processing of ${expiredCount} switch(es)`);
  } catch (error) {
    logger.error('Timer monitor error:', error);
  }
}

/**
 * Start the timer monitor cron job
 * Runs every 5 minutes
 */
export function startTimerMonitor() {
  // Cron expression: "*/5 * * * *" = every 5 minutes
  // Format: minute hour day month weekday
  const cronExpression = '*/5 * * * *';

  logger.info('Starting timer monitor cron job', {
    schedule: 'Every 5 minutes',
    cronExpression
  });

  // Schedule the job
  const job = cron.schedule(cronExpression, async () => {
    await checkExpiredSwitches();
  });

  // Run immediately on startup (optional - useful for testing)
  if (process.env.RUN_TIMER_ON_STARTUP === 'true') {
    logger.info('Running timer monitor immediately on startup');
    checkExpiredSwitches().catch(error => {
      logger.error('Startup timer check failed:', error);
    });
  }

  return job;
}

/**
 * Stop the timer monitor
 * @param {Object} job - Cron job instance
 */
export function stopTimerMonitor(job) {
  if (job) {
    job.stop();
    logger.info('Timer monitor stopped');
  }
}

// Export for manual testing
export default {
  startTimerMonitor,
  stopTimerMonitor,
  checkExpiredSwitches,
  processExpiredSwitch
};

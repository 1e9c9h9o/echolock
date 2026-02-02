'use strict';

/**
 * Timer Monitor - DEPRECATED
 *
 * =============================================================================
 * THIS MODULE IS DEPRECATED AND NO LONGER USED
 * =============================================================================
 *
 * The server-side timer monitor has been replaced by the Guardian Network,
 * which provides fully decentralized switch expiration detection and message
 * release via the Nostr protocol.
 *
 * WHY DEPRECATED:
 * - Centralized dependency: Required EchoLock server to release messages
 * - Single point of failure: Server downtime = messages not released
 * - Against project goals: See CLAUDE.md "The North Star" principles
 *
 * REPLACEMENT:
 * - Guardian daemons watch for heartbeats on Nostr independently
 * - When heartbeats stop, guardians publish their Shamir shares to Nostr
 * - Recipients reconstruct messages using the browser-based recovery tool
 * - No server involvement required
 *
 * This file is kept for reference only. It is not imported or executed.
 * See: guardian-daemon/index.js for the decentralized replacement.
 *
 * =============================================================================
 *
 * ORIGINAL DESCRIPTION (historical reference):
 * Runs every 5 minutes to check for:
 * - Switches that have passed their expiry time
 * - Retrieves fragments from Nostr
 * - Reconstructs the secret message
 * - Sends emails to all recipients
 * - Updates switch status to RELEASED
 */

import cron, { ScheduledTask } from 'node-cron';
import { query, transaction } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { sendSwitchReleaseEmail } from '../services/emailService.js';
import websocketService from '../services/websocketService.js';

// Import database-compatible message retrieval service
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageRetrievalFn = (switchData: any) => Promise<{ success: boolean; message?: string; error?: string; sharesUsed?: number }>;
let retrieveAndReconstructMessage: MessageRetrievalFn;
import('../services/messageRetrievalService.js').then(mod => {
  retrieveAndReconstructMessage = mod.retrieveAndReconstructMessage;
}).catch(() => {
  // Module may not exist - this is deprecated code
  retrieveAndReconstructMessage = async () => ({ success: false, error: 'Module not available' });
});
import { PoolClient } from 'pg';

// Track processing to prevent duplicate releases
const processingSwitches = new Set<string>();

/**
 * Database row types
 */
interface SwitchRow {
  id: string;
  user_id: string;
  title: string;
  expires_at: Date;
  check_in_hours: number;
  status?: string;
  nostr_public_key?: string;
  fragment_metadata?: unknown;
}

interface RecipientRow {
  id: string;
  email: string;
  name: string | null;
}

interface EmailResult {
  email: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

/**
 * Process a single expired switch
 */
async function processExpiredSwitch(sw: SwitchRow): Promise<void> {
  const switchId = sw.id;

  // Prevent duplicate processing (in-memory guard for single instance)
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

    // Step 1: Get full switch data with row lock to prevent race conditions
    // Use FOR UPDATE to lock the row - prevents concurrent check-ins from modifying
    const switchResult = await query<SwitchRow>(
      `SELECT * FROM switches WHERE id = $1 AND status = 'ARMED' FOR UPDATE`,
      [switchId]
    );

    if (switchResult.rows.length === 0) {
      // Switch was modified (check-in, deleted, or already triggered)
      logger.info('Switch no longer ARMED, skipping', { switchId });
      return;
    }

    const fullSwitchData = switchResult.rows[0];

    // Double-check expiration (another process might have reset it)
    if (new Date(fullSwitchData.expires_at) > new Date()) {
      logger.info('Switch timer was reset, skipping', { switchId });
      return;
    }

    // Step 2: Retrieve and reconstruct message from Nostr
    logger.debug('Retrieving fragments from Nostr...', { switchId });

    const releaseResult = await retrieveAndReconstructMessage(fullSwitchData);

    if (!releaseResult.success || !releaseResult.message) {
      throw new Error(`Message retrieval failed: ${releaseResult.error}`);
    }

    const message = releaseResult.message;

    logger.info('Message reconstructed successfully', {
      switchId,
      sharesUsed: releaseResult.sharesUsed,
      messageLength: message.length
    });

    // Step 2: Get recipients
    const recipientsResult = await query<RecipientRow>(
      'SELECT id, email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const recipients = recipientsResult.rows;

    // Verify switch still exists (user may have been deleted during processing)
    // This is a safety check for the race condition window between message retrieval and email sending
    const verifySwitch = await query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM switches WHERE id = $1',
      [switchId]
    );

    if (verifySwitch.rows.length === 0) {
      logger.warn('Switch was deleted during processing, aborting release', { switchId });
      return;
    }

    if (recipients.length === 0) {
      logger.warn('No recipients for switch - release will complete but no emails sent', { switchId });
    }

    // Step 3: Send emails to all recipients
    const emailResults: EmailResult[] = [];

    for (const recipient of recipients) {
      try {
        logger.debug('Sending release email', {
          switchId,
          recipient: recipient.email
        });

        await sendSwitchReleaseEmail(
          recipient.email,
          message!,
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
      } catch (err) {
        const emailError = err as Error;
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

    // Step 4: Update switch status to RELEASED (only if still ARMED)
    await transaction(async (client: PoolClient) => {
      const updateResult = await client.query<{ id: string }>(
        `UPDATE switches SET status = $1, triggered_at = NOW(), released_at = NOW()
         WHERE id = $2 AND status = 'ARMED'
         RETURNING id`,
        ['RELEASED', switchId]
      );

      if (updateResult.rows.length === 0) {
        logger.warn('Switch status changed during processing, release may be duplicate', { switchId });
      }

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
      triggered_at: new Date()
    });

    logger.info('Switch released successfully', {
      switchId,
      title: sw.title,
      recipientsNotified: recipients.length,
      successfulEmails: emailResults.filter(r => r.status === 'SENT').length
    });

    // Log to console for Railway visibility
    console.log('✅ Switch released successfully:', {
      switchId,
      title: sw.title,
      emailsSent: emailResults.filter(r => r.status === 'SENT').length,
      recipients: recipients.map(r => r.email)
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to process expired switch', {
      switchId,
      title: sw?.title || 'unknown',
      error: error.message,
      stack: error.stack
    });

    // Log to console for Railway visibility
    console.error('❌ Switch processing failed:', {
      switchId,
      error: error.message
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
    } catch (logErr) {
      const logError = logErr as Error;
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
export async function checkExpiredSwitches(): Promise<void> {
  try {
    logger.debug('Timer monitor: Checking for expired switches');

    // Find switches that are:
    // 1. Status = ARMED (active)
    // 2. Expiry time has passed
    const result = await query<SwitchRow>(
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

    // Process each expired switch with proper awaiting
    // Use Promise.allSettled to process in parallel but wait for all to complete
    const results = await Promise.allSettled(
      result.rows.map(sw => processExpiredSwitch(sw))
    );

    // Log any failures
    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      logger.error(`Timer monitor: ${failures.length} switch(es) failed to process`, {
        errors: failures.map(f => f.reason?.message || 'Unknown error')
      });
    }

    logger.info(`Timer monitor: Completed processing of ${expiredCount} switch(es)`, {
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: failures.length
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Timer monitor error:', error);
  }
}

/**
 * Start the timer monitor cron job
 * Runs every 5 minutes
 */
export function startTimerMonitor(): ScheduledTask {
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
 */
export function stopTimerMonitor(job: ScheduledTask | null): void {
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

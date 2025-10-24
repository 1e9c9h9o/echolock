'use strict';

/**
 * Reminder Monitor - Cron Job
 *
 * Sends check-in reminders before switches expire
 *
 * Runs every hour to check for switches approaching expiration:
 * - 24 hours before expiry
 * - 6 hours before expiry
 * - 1 hour before expiry
 *
 * Sends both:
 * - Email notifications
 * - WebSocket notifications (for real-time alerts)
 *
 * Tracking:
 * - Uses a table to track which reminders have been sent
 * - Prevents duplicate reminders
 */

import cron from 'node-cron';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { sendCheckInReminder } from '../services/emailService.js';
import websocketService from '../services/websocketService.js';

// Reminder thresholds (in hours)
const REMINDER_THRESHOLDS = [24, 6, 1];

/**
 * Check for switches needing reminders and send them
 */
export async function checkReminders() {
  try {
    logger.debug('Reminder monitor: Checking for switches needing reminders');

    // For each threshold, find switches that need reminders
    for (const thresholdHours of REMINDER_THRESHOLDS) {
      await processRemindersForThreshold(thresholdHours);
    }

    logger.debug('Reminder monitor: Check completed');
  } catch (error) {
    logger.error('Reminder monitor error:', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Process reminders for a specific threshold
 * @param {number} thresholdHours - Hours before expiry to send reminder
 */
async function processRemindersForThreshold(thresholdHours) {
  try {
    // Calculate time window for this threshold
    // We want switches that will expire in approximately thresholdHours
    // Use a 30-minute window to account for the hourly check interval
    const upperBound = thresholdHours * 60 + 30; // minutes
    const lowerBound = thresholdHours * 60 - 30; // minutes

    // Find switches that:
    // 1. Are ARMED (active)
    // 2. Will expire within the threshold window
    // 3. Haven't already received this reminder
    const result = await query(
      `SELECT
        s.id,
        s.user_id,
        s.title,
        s.expires_at,
        u.email,
        EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 60 as minutes_remaining
       FROM switches s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'ARMED'
         AND s.expires_at > NOW()
         AND s.expires_at <= NOW() + INTERVAL '1 minute' * $1
         AND s.expires_at >= NOW() + INTERVAL '1 minute' * $2
         AND NOT EXISTS (
           SELECT 1 FROM switch_reminders sr
           WHERE sr.switch_id = s.id
             AND sr.threshold_hours = $3
         )
       ORDER BY s.expires_at ASC`,
      [upperBound, lowerBound, thresholdHours]
    );

    const switches = result.rows;

    if (switches.length === 0) {
      logger.debug(`No switches need ${thresholdHours}-hour reminder`);
      return;
    }

    logger.info(`Found ${switches.length} switch(es) needing ${thresholdHours}-hour reminder`);

    // Send reminders for each switch
    for (const sw of switches) {
      await sendReminder(sw, thresholdHours);
    }
  } catch (error) {
    logger.error(`Error processing ${thresholdHours}-hour reminders:`, {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Send reminder for a specific switch
 * @param {Object} sw - Switch data
 * @param {number} thresholdHours - Hours before expiry
 */
async function sendReminder(sw, thresholdHours) {
  const switchId = sw.id;
  const userId = sw.user_id;
  const email = sw.email;
  const title = sw.title;

  try {
    logger.info('Sending reminder', {
      switchId,
      title,
      thresholdHours,
      expiresAt: sw.expires_at
    });

    // Send email reminder
    await sendCheckInReminder(email, title, thresholdHours);

    // Send WebSocket notification
    websocketService.notifyExpiryWarning(userId, {
      id: switchId,
      title,
      expires_at: sw.expires_at
    }, thresholdHours);

    // Record that reminder was sent
    await query(
      `INSERT INTO switch_reminders (switch_id, threshold_hours, sent_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (switch_id, threshold_hours) DO NOTHING`,
      [switchId, thresholdHours]
    );

    // Create audit log entry
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [
        userId,
        'REMINDER_SENT',
        JSON.stringify({
          switchId,
          title,
          thresholdHours,
          email
        })
      ]
    );

    logger.info('Reminder sent successfully', {
      switchId,
      title,
      thresholdHours,
      email
    });
  } catch (error) {
    logger.error('Failed to send reminder', {
      switchId,
      title,
      thresholdHours,
      error: error.message
    });
  }
}

/**
 * Start the reminder monitor cron job
 * Runs every hour
 */
export function startReminderMonitor() {
  // Cron expression: "0 * * * *" = every hour at minute 0
  // Format: minute hour day month weekday
  const cronExpression = '0 * * * *';

  logger.info('Starting reminder monitor cron job', {
    schedule: 'Every hour',
    cronExpression,
    thresholds: REMINDER_THRESHOLDS
  });

  // Schedule the job
  const job = cron.schedule(cronExpression, async () => {
    await checkReminders();
  });

  // Run immediately on startup (optional - useful for testing)
  if (process.env.RUN_REMINDERS_ON_STARTUP === 'true') {
    logger.info('Running reminder monitor immediately on startup');
    checkReminders().catch(error => {
      logger.error('Startup reminder check failed:', error);
    });
  }

  return job;
}

/**
 * Stop the reminder monitor
 * @param {Object} job - Cron job instance
 */
export function stopReminderMonitor(job) {
  if (job) {
    job.stop();
    logger.info('Reminder monitor stopped');
  }
}

// Export for manual testing
export default {
  startReminderMonitor,
  stopReminderMonitor,
  checkReminders
};

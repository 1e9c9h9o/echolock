'use strict';

/**
 * Guardian Health Monitor Cron Job
 *
 * Runs every 15 minutes to:
 * 1. Query Nostr relays for guardian heartbeats
 * 2. Record health snapshots to guardian_health_history
 * 3. Send proactive alerts when guardians approach critical status
 *
 * @see CLAUDE.md - Guardian Network health monitoring
 */

import cron from 'node-cron';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

// Health status thresholds (in hours)
const HEALTH_THRESHOLDS = {
  healthy: 24,      // Last heartbeat within 24 hours
  warning: 72,      // Last heartbeat within 72 hours
  critical: 168     // Last heartbeat within 7 days
};

// Default relay list for querying guardian heartbeats
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.nostr.wine'
];

/**
 * Calculate guardian health status based on last heartbeat
 */
function calculateHealthStatus(lastHeartbeatTime) {
  if (!lastHeartbeatTime) {
    return 'unknown';
  }

  const now = Date.now();
  const lastHeartbeat = new Date(lastHeartbeatTime).getTime();
  const hoursAgo = (now - lastHeartbeat) / (1000 * 60 * 60);

  if (hoursAgo <= HEALTH_THRESHOLDS.healthy) {
    return 'healthy';
  } else if (hoursAgo <= HEALTH_THRESHOLDS.warning) {
    return 'warning';
  } else if (hoursAgo <= HEALTH_THRESHOLDS.critical) {
    return 'critical';
  }
  return 'critical';
}

/**
 * Query Nostr relays for guardian heartbeat events
 * Returns the most recent heartbeat for each guardian
 */
async function queryGuardianHeartbeats(guardianNpubs, relayUrls = DEFAULT_RELAYS) {
  const heartbeats = new Map();

  try {
    // Dynamic import for nostr-tools
    const { SimplePool } = await import('nostr-tools');
    const pool = new SimplePool();

    // Query for guardian heartbeat events (kind 30084)
    const filter = {
      kinds: [30084],
      authors: guardianNpubs,
      limit: guardianNpubs.length * 5 // Get multiple events per guardian
    };

    const events = await pool.querySync(relayUrls, filter);

    // Process events and find latest for each guardian
    for (const event of events) {
      const existingHeartbeat = heartbeats.get(event.pubkey);
      if (!existingHeartbeat || event.created_at > existingHeartbeat.created_at) {
        heartbeats.set(event.pubkey, {
          npub: event.pubkey,
          lastHeartbeat: new Date(event.created_at * 1000),
          relayCount: 1, // Will be updated below
          content: event.content
        });
      }
    }

    // Count relays where each guardian was seen
    for (const [npub, data] of heartbeats) {
      const seenOnRelays = events.filter(e => e.pubkey === npub);
      // Count unique relays (approximation)
      data.relayCount = Math.min(seenOnRelays.length, relayUrls.length);
    }

    pool.close(relayUrls);
  } catch (error) {
    logger.warn('Failed to query guardian heartbeats from Nostr', {
      error: error.message,
      guardianCount: guardianNpubs.length
    });
  }

  return heartbeats;
}

/**
 * Send alert for guardian status change
 */
async function sendGuardianAlert(userId, switchId, guardian, alertType) {
  try {
    // Check if alert already sent recently
    const recentAlertResult = await query(
      `SELECT id FROM guardian_alerts_sent
       WHERE switch_id = $1 AND guardian_npub = $2 AND alert_type = $3
         AND sent_at > NOW() - INTERVAL '24 hours'`,
      [switchId, guardian.npub, alertType]
    );

    if (recentAlertResult.rows.length > 0) {
      logger.debug('Alert already sent recently', { switchId, guardianNpub: guardian.npub, alertType });
      return;
    }

    // Get user's alert settings
    const settingsResult = await query(
      `SELECT alert_on_warning, alert_on_critical, email_alerts, webhook_url
       FROM guardian_alert_settings
       WHERE user_id = $1`,
      [userId]
    );

    const settings = settingsResult.rows[0] || {
      alert_on_warning: true,
      alert_on_critical: true,
      email_alerts: true,
      webhook_url: null
    };

    // Check if this alert type is enabled
    if (alertType === 'warning' && !settings.alert_on_warning) return;
    if (alertType === 'critical' && !settings.alert_on_critical) return;

    // Record the alert
    await query(
      `INSERT INTO guardian_alerts_sent (switch_id, guardian_npub, alert_type)
       VALUES ($1, $2, $3)`,
      [switchId, guardian.npub, alertType]
    );

    // Send email alert if enabled
    if (settings.email_alerts) {
      try {
        const { sendGuardianHealthAlert } = await import('../services/emailService.js');

        // Get user email
        const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
          await sendGuardianHealthAlert(
            userResult.rows[0].email,
            guardian.name || guardian.npub.substring(0, 16) + '...',
            alertType,
            switchId
          );
        }
      } catch (emailError) {
        logger.warn('Failed to send guardian health alert email', { error: emailError.message });
      }
    }

    // Send webhook if configured
    if (settings.webhook_url) {
      try {
        await fetch(settings.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'guardian_health_alert',
            alertType,
            switchId,
            guardian: {
              npub: guardian.npub,
              name: guardian.name
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        logger.warn('Failed to send guardian health webhook', { error: webhookError.message });
      }
    }

    logger.info('Guardian alert sent', { userId, switchId, guardianNpub: guardian.npub, alertType });
  } catch (error) {
    logger.error('Failed to send guardian alert', { error: error.message });
  }
}

/**
 * Main health check function
 * Runs for all active switches with guardians
 */
async function runHealthCheck() {
  const startTime = Date.now();
  logger.info('Guardian health monitor starting');

  try {
    // Get all active switches with guardians
    const switchesResult = await query(
      `SELECT s.id, s.user_id, s.fragment_metadata, s.shamir_threshold
       FROM switches s
       WHERE s.status = 'ARMED'
         AND s.fragment_metadata IS NOT NULL
         AND s.fragment_metadata::text LIKE '%guardians%'`
    );

    if (switchesResult.rows.length === 0) {
      logger.info('No active switches with guardians found');
      return;
    }

    logger.info(`Processing ${switchesResult.rows.length} switches`);

    // Collect all unique guardian npubs
    const allGuardianNpubs = new Set();
    const switchGuardianMap = new Map();

    for (const sw of switchesResult.rows) {
      const metadata = sw.fragment_metadata || {};
      const guardians = metadata.guardians || [];

      switchGuardianMap.set(sw.id, {
        userId: sw.user_id,
        threshold: sw.shamir_threshold || 3,
        guardians
      });

      for (const guardian of guardians) {
        if (guardian.npub) {
          allGuardianNpubs.add(guardian.npub);
        }
      }
    }

    // Query Nostr for all guardian heartbeats in one batch
    const heartbeats = await queryGuardianHeartbeats(Array.from(allGuardianNpubs));

    // Process each switch
    let healthRecordsInserted = 0;
    let alertsSent = 0;

    for (const [switchId, switchData] of switchGuardianMap) {
      for (const guardian of switchData.guardians) {
        if (!guardian.npub) continue;

        const heartbeat = heartbeats.get(guardian.npub);
        const lastHeartbeatTime = heartbeat?.lastHeartbeat || null;
        const status = calculateHealthStatus(lastHeartbeatTime);
        const relayCount = heartbeat?.relayCount || 0;

        // Insert health record
        await query(
          `INSERT INTO guardian_health_history
           (switch_id, guardian_npub, status, last_heartbeat, relay_count)
           VALUES ($1, $2, $3, $4, $5)`,
          [switchId, guardian.npub, status, lastHeartbeatTime, relayCount]
        );
        healthRecordsInserted++;

        // Check if we need to send alerts
        if (status === 'warning' || status === 'critical') {
          await sendGuardianAlert(switchData.userId, switchId, guardian, status);
          alertsSent++;
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Guardian health monitor completed', {
      switchesProcessed: switchesResult.rows.length,
      guardiansChecked: allGuardianNpubs.size,
      healthRecordsInserted,
      alertsSent,
      durationMs: duration
    });

  } catch (error) {
    logger.error('Guardian health monitor failed', { error: error.message });
  }
}

/**
 * Clean up old health records (keep 30 days)
 */
async function cleanupOldRecords() {
  try {
    const result = await query(
      `DELETE FROM guardian_health_history
       WHERE recorded_at < NOW() - INTERVAL '30 days'`
    );

    if (result.rowCount > 0) {
      logger.info(`Cleaned up ${result.rowCount} old guardian health records`);
    }
  } catch (error) {
    logger.error('Failed to clean up old health records', { error: error.message });
  }
}

/**
 * Start the guardian health monitor cron job
 */
export function startGuardianHealthMonitor() {
  // Run health check every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runHealthCheck();
  });

  // Run cleanup once per day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    await cleanupOldRecords();
  });

  logger.info('Guardian health monitor scheduled (every 15 minutes)');

  // Run initial check after 30 seconds
  setTimeout(() => {
    runHealthCheck().catch(err => {
      logger.error('Initial guardian health check failed', { error: err.message });
    });
  }, 30000);
}

// Export for testing
export {
  runHealthCheck,
  calculateHealthStatus,
  queryGuardianHeartbeats,
  cleanupOldRecords,
  HEALTH_THRESHOLDS
};

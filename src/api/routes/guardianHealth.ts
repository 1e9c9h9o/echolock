'use strict';

/**
 * Guardian Health Routes
 *
 * Provides guardian health monitoring and management:
 * - Get current guardian health status
 * - Get historical health timeline
 * - Manage alert settings
 * - Handle guardian replacement workflow
 */

import express, { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Database row types
 */
interface SwitchRow {
  id: string;
  fragment_metadata: FragmentMetadata | null;
  shamir_threshold: number | null;
  shamir_total_shares: number | null;
}

interface FragmentMetadata {
  guardians?: Guardian[];
  [key: string]: unknown;
}

interface Guardian {
  id?: string;
  npub: string;
  name?: string;
  type?: string;
  acknowledged?: boolean;
  status?: string;
  replacedFrom?: string;
  replacedAt?: string;
}

interface GuardianWithHealth extends Guardian {
  health: HealthData;
}

interface HealthHistoryRow {
  guardian_npub: string;
  status: string;
  last_heartbeat: Date | null;
  relay_count: number;
  recorded_at: Date;
}

interface HealthData {
  status: string;
  lastHeartbeat: Date | null;
  relayCount: number;
  recordedAt: Date | null;
}

interface AlertSettingsRow {
  alert_on_warning: boolean;
  alert_on_critical: boolean;
  alert_hours_before_critical: number;
  email_alerts: boolean;
  webhook_url: string | null;
  updated_at: Date;
}

interface GuardianAlertRow {
  id: string;
  guardian_npub: string;
  alert_type: string;
  sent_at: Date;
  acknowledged_at: Date | null;
}

/**
 * Request body types
 */
interface AlertSettingsBody {
  alertOnWarning?: boolean;
  alertOnCritical?: boolean;
  alertHoursBeforeCritical?: number;
  emailAlerts?: boolean;
  webhookUrl?: string | null;
}

interface ReplaceGuardianBody {
  newGuardian: {
    npub: string;
    name?: string;
    type?: string;
  };
}

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/switches/:switchId/guardians/health
 * Get current health status for all guardians of a switch
 */
router.get('/:switchId/guardians/health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;

    // Verify ownership and get switch data
    const switchResult = await query<SwitchRow>(
      `SELECT id, fragment_metadata, shamir_threshold, shamir_total_shares
       FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = switchResult.rows[0];
    const fragmentMetadata = sw.fragment_metadata || {};
    const guardians = fragmentMetadata.guardians || [];
    const threshold = sw.shamir_threshold || 3;
    const totalShares = sw.shamir_total_shares || 5;

    // Get latest health snapshot for each guardian
    const healthResult = await query<HealthHistoryRow>(
      `SELECT DISTINCT ON (guardian_npub)
        guardian_npub,
        status,
        last_heartbeat,
        relay_count,
        recorded_at
       FROM guardian_health_history
       WHERE switch_id = $1
       ORDER BY guardian_npub, recorded_at DESC`,
      [switchId]
    );

    const healthMap = new Map<string, HealthData>();
    for (const row of healthResult.rows) {
      healthMap.set(row.guardian_npub, {
        status: row.status,
        lastHeartbeat: row.last_heartbeat,
        relayCount: row.relay_count,
        recordedAt: row.recorded_at
      });
    }

    // Combine guardian info with health data
    const guardiansWithHealth: GuardianWithHealth[] = guardians.map(guardian => {
      const health = healthMap.get(guardian.npub) || {
        status: 'unknown',
        lastHeartbeat: null,
        relayCount: 0,
        recordedAt: null
      };

      return {
        ...guardian,
        health
      };
    });

    // Calculate summary
    const summary = {
      healthy: guardiansWithHealth.filter(g => g.health.status === 'healthy').length,
      warning: guardiansWithHealth.filter(g => g.health.status === 'warning').length,
      critical: guardiansWithHealth.filter(g => g.health.status === 'critical').length,
      unknown: guardiansWithHealth.filter(g => g.health.status === 'unknown').length
    };

    // Determine recovery readiness
    const availableGuardians = summary.healthy + summary.warning;
    const recoveryReady = availableGuardians >= threshold;

    res.json({
      message: 'Guardian health retrieved',
      data: {
        switchId,
        thresholdConfig: {
          threshold,
          totalShares,
          description: `${threshold}-of-${totalShares}`
        },
        guardians: guardiansWithHealth,
        summary,
        recoveryReady,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get guardian health error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve guardian health'
    });
  }
});

/**
 * GET /api/switches/:switchId/guardians/history
 * Get historical health timeline for guardians
 */
router.get('/:switchId/guardians/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;
    const { hours = '168', guardianNpub } = req.query;

    // Verify ownership
    const switchResult = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Build query based on whether we're filtering by guardian
    const hoursNum = parseInt(hours as string) || 168;
    let historyQuery = `
      SELECT guardian_npub, status, last_heartbeat, relay_count, recorded_at
      FROM guardian_health_history
      WHERE switch_id = $1
        AND recorded_at > NOW() - INTERVAL '${hoursNum} hours'
    `;
    const params: (string | undefined)[] = [switchId];

    if (guardianNpub) {
      historyQuery += ` AND guardian_npub = $2`;
      params.push(guardianNpub as string);
    }

    historyQuery += ` ORDER BY recorded_at DESC LIMIT 1000`;

    const historyResult = await query<HealthHistoryRow>(historyQuery, params);

    // Group by guardian
    const historyByGuardian: Record<string, HealthData[]> = {};
    for (const row of historyResult.rows) {
      if (!historyByGuardian[row.guardian_npub]) {
        historyByGuardian[row.guardian_npub] = [];
      }
      historyByGuardian[row.guardian_npub].push({
        status: row.status,
        lastHeartbeat: row.last_heartbeat,
        relayCount: row.relay_count,
        recordedAt: row.recorded_at
      });
    }

    res.json({
      message: 'Guardian history retrieved',
      data: {
        switchId,
        hoursRequested: hoursNum,
        history: historyByGuardian,
        recordCount: historyResult.rows.length
      }
    });
  } catch (error) {
    logger.error('Get guardian history error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve guardian history'
    });
  }
});

/**
 * GET /api/guardian-alert-settings
 * Get user's guardian alert preferences
 */
router.get('/alert-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<AlertSettingsRow>(
      `SELECT
        alert_on_warning,
        alert_on_critical,
        alert_hours_before_critical,
        email_alerts,
        webhook_url,
        updated_at
       FROM guardian_alert_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no settings exist
      return res.json({
        message: 'Alert settings retrieved (defaults)',
        data: {
          alertOnWarning: true,
          alertOnCritical: true,
          alertHoursBeforeCritical: 24,
          emailAlerts: true,
          webhookUrl: null,
          isDefault: true
        }
      });
    }

    const settings = result.rows[0];
    res.json({
      message: 'Alert settings retrieved',
      data: {
        alertOnWarning: settings.alert_on_warning,
        alertOnCritical: settings.alert_on_critical,
        alertHoursBeforeCritical: settings.alert_hours_before_critical,
        emailAlerts: settings.email_alerts,
        webhookUrl: settings.webhook_url,
        updatedAt: settings.updated_at,
        isDefault: false
      }
    });
  } catch (error) {
    logger.error('Get alert settings error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve alert settings'
    });
  }
});

/**
 * PUT /api/guardian-alert-settings
 * Update user's guardian alert preferences
 */
router.put('/alert-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      alertOnWarning = true,
      alertOnCritical = true,
      alertHoursBeforeCritical = 24,
      emailAlerts = true,
      webhookUrl = null
    } = req.body as AlertSettingsBody;

    // Validate alertHoursBeforeCritical
    const validHours = Math.min(Math.max(1, parseInt(String(alertHoursBeforeCritical)) || 24), 168);

    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid webhook URL',
        message: 'Webhook URL must use HTTPS'
      });
    }

    // Upsert settings
    const result = await query<AlertSettingsRow>(
      `INSERT INTO guardian_alert_settings (
        user_id, alert_on_warning, alert_on_critical,
        alert_hours_before_critical, email_alerts, webhook_url, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         alert_on_warning = $2,
         alert_on_critical = $3,
         alert_hours_before_critical = $4,
         email_alerts = $5,
         webhook_url = $6,
         updated_at = NOW()
       RETURNING *`,
      [userId, alertOnWarning, alertOnCritical, validHours, emailAlerts, webhookUrl]
    );

    const settings = result.rows[0];
    logger.info('Alert settings updated', { userId });

    res.json({
      message: 'Alert settings updated',
      data: {
        alertOnWarning: settings.alert_on_warning,
        alertOnCritical: settings.alert_on_critical,
        alertHoursBeforeCritical: settings.alert_hours_before_critical,
        emailAlerts: settings.email_alerts,
        webhookUrl: settings.webhook_url,
        updatedAt: settings.updated_at
      }
    });
  } catch (error) {
    logger.error('Update alert settings error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update alert settings'
    });
  }
});

/**
 * POST /api/switches/:switchId/guardians/:guardianId/replace
 * Initiate guardian replacement workflow
 */
router.post('/:switchId/guardians/:guardianId/replace', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId, guardianId } = req.params;
    const { newGuardian } = req.body as ReplaceGuardianBody;

    if (!newGuardian || !newGuardian.npub) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'New guardian npub is required'
      });
    }

    // Verify ownership and get switch data
    const switchResult = await query<SwitchRow>(
      `SELECT id, fragment_metadata, shamir_threshold, shamir_total_shares
       FROM switches WHERE id = $1 AND user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = switchResult.rows[0];
    const fragmentMetadata = sw.fragment_metadata || {};
    const guardians = fragmentMetadata.guardians || [];

    // Find the guardian to replace
    const guardianIndex = guardians.findIndex(g => g.id === guardianId);
    if (guardianIndex === -1) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Guardian not found'
      });
    }

    const oldGuardian = guardians[guardianIndex];

    // Update guardian in metadata
    guardians[guardianIndex] = {
      ...oldGuardian,
      npub: newGuardian.npub,
      name: newGuardian.name || oldGuardian.name,
      type: newGuardian.type || oldGuardian.type,
      status: 'pending',
      replacedFrom: oldGuardian.npub,
      replacedAt: new Date().toISOString()
    };

    // Update fragment_metadata
    await query(
      `UPDATE switches
       SET fragment_metadata = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ ...fragmentMetadata, guardians }), switchId]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [
        userId,
        'GUARDIAN_REPLACED',
        JSON.stringify({
          switchId,
          guardianId,
          oldNpub: oldGuardian.npub,
          newNpub: newGuardian.npub
        })
      ]
    );

    logger.info('Guardian replacement initiated', {
      userId,
      switchId,
      guardianId,
      oldNpub: oldGuardian.npub.substring(0, 16) + '...',
      newNpub: newGuardian.npub.substring(0, 16) + '...'
    });

    res.json({
      message: 'Guardian replacement initiated',
      data: {
        switchId,
        guardianId,
        oldGuardian: {
          npub: oldGuardian.npub,
          name: oldGuardian.name
        },
        newGuardian: {
          npub: newGuardian.npub,
          name: newGuardian.name,
          status: 'pending'
        },
        instructions: 'The new guardian must acknowledge and the share must be re-encrypted client-side.'
      }
    });
  } catch (error) {
    logger.error('Replace guardian error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to replace guardian'
    });
  }
});

/**
 * GET /api/switches/:switchId/guardians/alerts
 * Get sent alerts for a switch's guardians
 */
router.get('/:switchId/guardians/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;

    // Verify ownership
    const switchResult = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Get alerts
    const alertsResult = await query<GuardianAlertRow>(
      `SELECT id, guardian_npub, alert_type, sent_at, acknowledged_at
       FROM guardian_alerts_sent
       WHERE switch_id = $1
       ORDER BY sent_at DESC
       LIMIT 50`,
      [switchId]
    );

    const unacknowledgedCount = alertsResult.rows.filter(a => !a.acknowledged_at).length;

    res.json({
      message: 'Guardian alerts retrieved',
      data: {
        switchId,
        alerts: alertsResult.rows.map(a => ({
          id: a.id,
          guardianNpub: a.guardian_npub,
          alertType: a.alert_type,
          sentAt: a.sent_at,
          acknowledgedAt: a.acknowledged_at
        })),
        unacknowledgedCount,
        totalCount: alertsResult.rows.length
      }
    });
  } catch (error) {
    logger.error('Get guardian alerts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve guardian alerts'
    });
  }
});

/**
 * POST /api/switches/:switchId/guardians/alerts/:alertId/acknowledge
 * Acknowledge a guardian alert
 */
router.post('/:switchId/guardians/alerts/:alertId/acknowledge', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId, alertId } = req.params;

    // Verify ownership
    const switchResult = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Update alert
    const result = await query<GuardianAlertRow>(
      `UPDATE guardian_alerts_sent
       SET acknowledged_at = NOW()
       WHERE id = $1 AND switch_id = $2 AND acknowledged_at IS NULL
       RETURNING id, guardian_npub, alert_type, acknowledged_at`,
      [alertId, switchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Alert not found or already acknowledged'
      });
    }

    logger.info('Guardian alert acknowledged', { userId, switchId, alertId });

    res.json({
      message: 'Alert acknowledged',
      data: {
        alertId: result.rows[0].id,
        guardianNpub: result.rows[0].guardian_npub,
        alertType: result.rows[0].alert_type,
        acknowledgedAt: result.rows[0].acknowledged_at
      }
    });
  } catch (error) {
    logger.error('Acknowledge alert error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to acknowledge alert'
    });
  }
});

export default router;

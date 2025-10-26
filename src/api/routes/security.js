'use strict';

/**
 * Security Routes
 *
 * Handles security-related endpoints:
 * - Session management (list, revoke)
 * - Audit log retrieval
 * - 2FA status and management
 * - Emergency controls (pause all switches)
 */

import express from 'express';
import { query, transaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All security routes require authentication
router.use(authenticateToken);

/**
 * GET /api/security/sessions
 * Get all active sessions for the current user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
        id,
        ip_address,
        user_agent,
        device_name,
        location,
        is_current,
        created_at,
        last_active,
        expires_at,
        revoked
       FROM sessions
       WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
       ORDER BY last_active DESC`,
      [userId]
    );

    res.json({
      message: 'Sessions retrieved successfully',
      data: {
        sessions: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve sessions'
    });
  }
});

/**
 * POST /api/security/sessions/:id/revoke
 * Revoke a specific session
 */
router.post('/sessions/:id/revoke', async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;

    // Verify session belongs to user
    const checkResult = await query(
      'SELECT id, is_current FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session does not exist or you do not have access'
      });
    }

    // Don't allow revoking current session
    if (checkResult.rows[0].is_current) {
      return res.status(400).json({
        error: 'Cannot revoke current session',
        message: 'Use logout to end your current session'
      });
    }

    // Revoke session
    await query(
      `UPDATE sessions
       SET revoked = TRUE, revoked_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    // Log to audit log
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'SESSION_REVOKED',
        JSON.stringify({ sessionId }),
        req.ip,
        req.get('user-agent')
      ]
    );

    res.json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to revoke session'
    });
  }
});

/**
 * POST /api/security/sessions/revoke-all
 * Revoke all sessions except the current one
 */
router.post('/sessions/revoke-all', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `UPDATE sessions
       SET revoked = TRUE, revoked_at = NOW()
       WHERE user_id = $1 AND is_current = FALSE AND revoked = FALSE
       RETURNING id`,
      [userId]
    );

    // Log to audit log
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'SESSIONS_REVOKED_ALL',
        JSON.stringify({ count: result.rowCount }),
        req.ip,
        req.get('user-agent')
      ]
    );

    res.json({
      message: 'All other sessions revoked successfully',
      data: {
        revokedCount: result.rowCount
      }
    });
  } catch (error) {
    logger.error('Revoke all sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to revoke sessions'
    });
  }
});

/**
 * GET /api/security/audit-log
 * Get recent security events for the current user
 */
router.get('/audit-log', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await query(
      `SELECT
        id,
        event_type,
        event_data,
        ip_address,
        user_agent,
        timestamp
       FROM audit_log
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM audit_log WHERE user_id = $1',
      [userId]
    );

    res.json({
      message: 'Audit log retrieved successfully',
      data: {
        events: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Get audit log error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve audit log'
    });
  }
});

/**
 * GET /api/security/2fa/status
 * Get 2FA status for the current user
 */
router.get('/2fa/status', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
        enabled,
        method,
        totp_verified,
        backup_codes_generated_at,
        backup_codes_used_count,
        recovery_email,
        enabled_at,
        last_used
       FROM two_factor_auth
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // No 2FA set up yet
      return res.json({
        message: '2FA status retrieved',
        data: {
          enabled: false,
          method: null,
          backupCodesRemaining: 0
        }
      });
    }

    const twoFactor = result.rows[0];

    // Calculate backup codes remaining
    let backupCodesRemaining = 0;
    if (twoFactor.backup_codes_generated_at) {
      backupCodesRemaining = 10 - (twoFactor.backup_codes_used_count || 0);
    }

    res.json({
      message: '2FA status retrieved',
      data: {
        enabled: twoFactor.enabled,
        method: twoFactor.method,
        verified: twoFactor.totp_verified,
        backupCodesRemaining,
        recoveryEmail: twoFactor.recovery_email,
        enabledAt: twoFactor.enabled_at,
        lastUsed: twoFactor.last_used
      }
    });
  } catch (error) {
    logger.error('Get 2FA status error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve 2FA status'
    });
  }
});

/**
 * POST /api/security/emergency/pause-all
 * Pause all active switches (emergency control)
 */
router.post('/emergency/pause-all', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Pause all active switches
      const updateResult = await client.query(
        `UPDATE switches
         SET status = 'PAUSED', updated_at = NOW()
         WHERE user_id = $1 AND status = 'ARMED'
         RETURNING id, title`,
        [userId]
      );

      // Log to audit log
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'EMERGENCY_PAUSE_ALL',
          JSON.stringify({
            count: updateResult.rowCount,
            switches: updateResult.rows.map(s => ({ id: s.id, title: s.title }))
          }),
          req.ip,
          req.get('user-agent')
        ]
      );

      return updateResult;
    });

    logger.warn('Emergency pause all switches', {
      userId,
      count: result.rowCount,
      ip: req.ip
    });

    res.json({
      message: 'All switches paused successfully',
      data: {
        pausedCount: result.rowCount,
        switches: result.rows
      }
    });
  } catch (error) {
    logger.error('Emergency pause all error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to pause switches'
    });
  }
});

/**
 * GET /api/security/stats
 * Get security statistics for the dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get various security stats in parallel
    const [activeSessions, recentEvents, twoFactorStatus] = await Promise.all([
      query(
        `SELECT COUNT(*) as count
         FROM sessions
         WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) as count
         FROM audit_log
         WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'`,
        [userId]
      ),
      query(
        `SELECT enabled FROM two_factor_auth WHERE user_id = $1`,
        [userId]
      )
    ]);

    res.json({
      message: 'Security stats retrieved',
      data: {
        activeSessions: parseInt(activeSessions.rows[0].count),
        recentEvents24h: parseInt(recentEvents.rows[0].count),
        twoFactorEnabled: twoFactorStatus.rows[0]?.enabled || false
      }
    });
  } catch (error) {
    logger.error('Get security stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve security stats'
    });
  }
});

export default router;

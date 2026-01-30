'use strict';

/**
 * Quick Check-In Routes
 *
 * Handles magic link check-ins that don't require authentication.
 * Tokens are single-use and time-limited for security.
 */

import express from 'express';
import { query, transaction } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/quick-checkin/:token/validate
 * Validate a check-in token without using it
 */
router.get('/:token/validate', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await query(
      `SELECT ct.*, s.title as switch_title, s.status as switch_status
       FROM checkin_tokens ct
       JOIN switches s ON s.id = ct.switch_id
       WHERE ct.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Invalid token',
        message: 'This check-in link is invalid'
      });
    }

    const tokenData = result.rows[0];

    // Check if already used
    if (tokenData.used) {
      return res.status(400).json({
        error: 'Token already used',
        message: 'This check-in link has already been used'
      });
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Token expired',
        message: 'This check-in link has expired'
      });
    }

    // Check switch status
    if (tokenData.switch_status !== 'ARMED') {
      return res.status(400).json({
        error: 'Switch not active',
        message: 'This switch is not currently active'
      });
    }

    res.json({
      message: 'Token valid',
      data: {
        switchTitle: tokenData.switch_title,
        expiresAt: tokenData.expires_at
      }
    });
  } catch (error) {
    // Handle case where table doesn't exist
    if (error.code === '42P01') {
      return res.status(501).json({
        error: 'Feature not available',
        message: 'Quick check-in requires database migration'
      });
    }
    logger.error('Validate quick check-in error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to validate check-in link'
    });
  }
});

/**
 * POST /api/quick-checkin/:token
 * Perform a check-in using a magic link token
 */
router.post('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await transaction(async (client) => {
      // Get and lock the token
      const tokenResult = await client.query(
        `SELECT ct.*, s.title as switch_title, s.check_in_hours, s.status as switch_status
         FROM checkin_tokens ct
         JOIN switches s ON s.id = ct.switch_id
         WHERE ct.token = $1
         FOR UPDATE`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        throw { status: 404, error: 'Invalid token', message: 'This check-in link is invalid' };
      }

      const tokenData = tokenResult.rows[0];

      // Check if already used
      if (tokenData.used) {
        throw { status: 400, error: 'Token already used', message: 'This check-in link has already been used' };
      }

      // Check if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        throw { status: 400, error: 'Token expired', message: 'This check-in link has expired' };
      }

      // Check switch status
      if (tokenData.switch_status !== 'ARMED') {
        throw { status: 400, error: 'Switch not active', message: 'This switch is not currently active' };
      }

      // Mark token as used
      await client.query(
        `UPDATE checkin_tokens
         SET used = TRUE, used_at = NOW()
         WHERE token = $1`,
        [token]
      );

      // Perform the check-in
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + (tokenData.check_in_hours * 60 * 60 * 1000));

      const updateResult = await client.query(
        `UPDATE switches
         SET last_check_in = $1, expires_at = $2, check_in_count = check_in_count + 1
         WHERE id = $3
         RETURNING check_in_count, expires_at`,
        [now, newExpiresAt, tokenData.switch_id]
      );

      // Log check-in
      await client.query(
        `INSERT INTO check_ins (switch_id, user_id, ip_address, user_agent, method)
         VALUES ($1, $2, $3, $4, $5)`,
        [tokenData.switch_id, tokenData.user_id, req.ip, req.get('user-agent'), 'magic_link']
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tokenData.user_id,
          'QUICK_CHECK_IN',
          JSON.stringify({
            switchId: tokenData.switch_id,
            title: tokenData.switch_title,
            method: 'magic_link'
          }),
          req.ip,
          req.get('user-agent')
        ]
      );

      return {
        switchId: tokenData.switch_id,
        switchTitle: tokenData.switch_title,
        newExpiresAt: updateResult.rows[0].expires_at,
        checkInCount: updateResult.rows[0].check_in_count
      };
    });

    logger.info('Quick check-in successful', {
      switchId: result.switchId,
      ip: req.ip
    });

    res.json({
      message: 'Check-in successful',
      data: result
    });
  } catch (error) {
    // Handle custom errors from transaction
    if (error.status) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message
      });
    }

    // Handle case where table doesn't exist
    if (error.code === '42P01') {
      return res.status(501).json({
        error: 'Feature not available',
        message: 'Quick check-in requires database migration'
      });
    }

    logger.error('Quick check-in error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Check-in failed'
    });
  }
});

export default router;

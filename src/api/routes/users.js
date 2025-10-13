'use strict';

/**
 * User Routes
 *
 * Handles user profile operations:
 * - Get current user profile
 * - Update profile/password
 * - Delete account
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query, transaction } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { isValidPassword } from '../middleware/validate.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const userResult = await query(
      'SELECT id, email, email_verified, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = userResult.rows[0];

    // Get switch count
    const switchResult = await query(
      'SELECT COUNT(*) as count FROM switches WHERE user_id = $1 AND status != $2',
      [userId, 'CANCELLED']
    );

    const switchCount = parseInt(switchResult.rows[0].count) || 0;

    res.json({
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          switchCount
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * PATCH /api/users/me
 * Update user profile or password
 */
router.patch('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Currently only support password change
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Current password and new password are required'
      });
    }

    // Validate new password
    const passwordCheck = isValidPassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: passwordCheck.message
      });
    }

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'PASSWORD_CHANGED', req.ip, req.get('user-agent')]
    );

    logger.info('Password changed', { userId });

    res.json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * DELETE /api/users/me
 * Delete user account and all associated data
 */
router.delete('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        message: 'Please provide your password to confirm account deletion'
      });
    }

    // Get user
    const result = await query(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Password is incorrect'
      });
    }

    // Delete user (cascade will delete all related data)
    await transaction(async (client) => {
      // Audit log before deletion
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'ACCOUNT_DELETED', JSON.stringify({ email: user.email }), req.ip, req.get('user-agent')]
      );

      // Delete user (foreign key cascade will delete switches, check-ins, recipients, etc.)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    logger.info('Account deleted', { userId, email: user.email });

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete account'
    });
  }
});

export default router;

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

import express, { Response } from 'express';
import { query, transaction } from '../db/connection.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import {
  generateSecret,
  generateQRCodeUri,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  formatBackupCodesForDisplay,
} from '../utils/totp.js';
import { encryptWithServiceKey, decryptWithServiceKey } from '../utils/crypto.js';
import { PoolClient } from 'pg';

const router = express.Router();

/**
 * Database row types
 */
interface SessionRow {
  id: string;
  ip_address: string;
  user_agent: string;
  device_name: string | null;
  location: string | null;
  is_current: boolean;
  created_at: Date;
  last_active: Date;
  expires_at: Date;
  revoked: boolean;
}

interface AuditLogRow {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: Date;
}

interface TwoFactorRow {
  enabled: boolean;
  method: string | null;
  totp_secret: string | null;
  totp_verified: boolean;
  backup_codes: BackupCode[] | string | null;
  backup_codes_generated_at: Date | null;
  backup_codes_used_count: number;
  recovery_email: string | null;
  enabled_at: Date | null;
  last_used: Date | null;
}

interface BackupCode {
  hash: string;
  used: boolean;
}

interface SwitchRow {
  id: string;
  title: string;
}

interface CountRow {
  count: string;
}

/**
 * Request body types
 */
interface TwoFactorCodeBody {
  code: string;
}

// All security routes require authentication
router.use(authenticateToken);

/**
 * GET /api/security/sessions
 * Get all active sessions for the current user
 */
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<SessionRow>(
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

    if (result.rows.length === 0) {
      return res.json({
        message: 'Session tracking not yet enabled',
        data: {
          sessions: [],
          count: 0,
          note: 'Session management will be available in a future update'
        }
      });
    }

    res.json({
      message: 'Sessions retrieved successfully',
      data: {
        sessions: result.rows,
        count: result.rows.length
      }
    });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === '42P01') {
      return res.json({
        message: 'Session tracking not yet enabled',
        data: {
          sessions: [],
          count: 0,
          note: 'Run database migrations to enable session management'
        }
      });
    }
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
router.post('/sessions/:id/revoke', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const checkResult = await query<{ id: string; is_current: boolean }>(
      'SELECT id, is_current FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session does not exist or you do not have access'
      });
    }

    if (checkResult.rows[0].is_current) {
      return res.status(400).json({
        error: 'Cannot revoke current session',
        message: 'Use logout to end your current session'
      });
    }

    await query(
      `UPDATE sessions
       SET revoked = TRUE, revoked_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

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
router.post('/sessions/revoke-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<{ id: string }>(
      `UPDATE sessions
       SET revoked = TRUE, revoked_at = NOW()
       WHERE user_id = $1 AND is_current = FALSE AND revoked = FALSE
       RETURNING id`,
      [userId]
    );

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
router.get('/audit-log', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query<AuditLogRow>(
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

    const countResult = await query<CountRow>(
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
router.get('/2fa/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<TwoFactorRow>(
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
 * POST /api/security/2fa/setup
 * Initialize 2FA setup - generate secret and QR code URI
 */
router.post('/2fa/setup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const existingResult = await query<TwoFactorRow>(
      'SELECT enabled, totp_verified FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    if (existingResult.rows.length > 0 && existingResult.rows[0].enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: 'Disable existing 2FA before setting up again'
      });
    }

    const secret = generateSecret();
    const qrCodeUri = generateQRCodeUri(secret, userEmail);

    const encryptedSecret = encryptWithServiceKey(secret);

    await query(
      `INSERT INTO two_factor_auth (user_id, totp_secret, totp_verified, method, created_at, updated_at)
       VALUES ($1, $2, FALSE, 'TOTP', NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET totp_secret = $2, totp_verified = FALSE, updated_at = NOW()`,
      [userId, encryptedSecret]
    );

    logger.info('2FA setup initiated', { userId });

    res.json({
      message: '2FA setup initiated',
      data: {
        secret,
        qrCodeUri,
        manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret,
      }
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to initiate 2FA setup'
    });
  }
});

/**
 * POST /api/security/2fa/verify-setup
 * Verify TOTP code during setup (before enabling)
 */
router.post('/2fa/verify-setup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body as TwoFactorCodeBody;

    if (!code) {
      return res.status(400).json({
        error: 'Code required',
        message: 'Please enter your 6-digit code'
      });
    }

    const result = await query<TwoFactorRow>(
      'SELECT totp_secret, totp_verified, enabled FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].totp_secret) {
      return res.status(400).json({
        error: 'Setup not initiated',
        message: 'Please start 2FA setup first'
      });
    }

    const twoFactor = result.rows[0];

    const secret = decryptWithServiceKey(twoFactor.totp_secret!).toString();

    const isValid = verifyTOTP(secret, code);

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect. Please try again.'
      });
    }

    await query(
      'UPDATE two_factor_auth SET totp_verified = TRUE, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    logger.info('2FA setup verified', { userId });

    res.json({
      message: 'Code verified successfully',
      data: { verified: true }
    });
  } catch (error) {
    logger.error('2FA verify-setup error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to verify code'
    });
  }
});

/**
 * POST /api/security/2fa/enable
 * Enable 2FA after successful verification
 */
router.post('/2fa/enable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body as TwoFactorCodeBody;

    const result = await query<TwoFactorRow>(
      'SELECT totp_secret, totp_verified, enabled FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Setup not initiated',
        message: 'Please start 2FA setup first'
      });
    }

    const twoFactor = result.rows[0];

    if (twoFactor.enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: 'Two-factor authentication is already enabled'
      });
    }

    if (!twoFactor.totp_verified) {
      return res.status(400).json({
        error: 'Setup not verified',
        message: 'Please verify your authenticator app first'
      });
    }

    const secret = decryptWithServiceKey(twoFactor.totp_secret!).toString();
    if (!verifyTOTP(secret, code)) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    const plaintextCodes = generateBackupCodes();
    const hashedCodes = hashBackupCodes(plaintextCodes);

    await query(
      `UPDATE two_factor_auth
       SET enabled = TRUE, enabled_at = NOW(),
           backup_codes = $2, backup_codes_generated_at = NOW(),
           backup_codes_used_count = 0, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, JSON.stringify(hashedCodes)]
    );

    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        '2FA_ENABLED',
        JSON.stringify({ method: 'TOTP' }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('2FA enabled', { userId });

    res.json({
      message: '2FA enabled successfully',
      data: {
        enabled: true,
        backupCodes: formatBackupCodesForDisplay(plaintextCodes),
        backupCodesCount: plaintextCodes.length
      }
    });
  } catch (error) {
    logger.error('2FA enable error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to enable 2FA'
    });
  }
});

/**
 * POST /api/security/2fa/disable
 * Disable 2FA (requires current TOTP or backup code)
 */
router.post('/2fa/disable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body as TwoFactorCodeBody;

    if (!code) {
      return res.status(400).json({
        error: 'Code required',
        message: 'Please enter your authentication code or backup code'
      });
    }

    const result = await query<TwoFactorRow>(
      'SELECT totp_secret, enabled, backup_codes FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].enabled) {
      return res.status(400).json({
        error: '2FA not enabled',
        message: 'Two-factor authentication is not enabled'
      });
    }

    const twoFactor = result.rows[0];

    const secret = decryptWithServiceKey(twoFactor.totp_secret!).toString();
    let isValid = verifyTOTP(secret, code);

    let usedBackupCode = false;
    if (!isValid && twoFactor.backup_codes) {
      const backupCodes: BackupCode[] = typeof twoFactor.backup_codes === 'string'
        ? JSON.parse(twoFactor.backup_codes)
        : twoFactor.backup_codes;

      const backupResult = verifyBackupCode(code, backupCodes);
      if (backupResult.valid) {
        isValid = true;
        usedBackupCode = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    await query(
      `UPDATE two_factor_auth
       SET enabled = FALSE, totp_secret = NULL, totp_verified = FALSE,
           backup_codes = NULL, backup_codes_generated_at = NULL,
           backup_codes_used_count = 0, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        '2FA_DISABLED',
        JSON.stringify({ usedBackupCode }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('2FA disabled', { userId, usedBackupCode });

    res.json({
      message: '2FA disabled successfully',
      data: { disabled: true }
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to disable 2FA'
    });
  }
});

/**
 * POST /api/security/2fa/backup-codes/regenerate
 * Regenerate backup codes (requires current TOTP)
 */
router.post('/2fa/backup-codes/regenerate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body as TwoFactorCodeBody;

    if (!code) {
      return res.status(400).json({
        error: 'Code required',
        message: 'Please enter your 6-digit code from your authenticator app'
      });
    }

    const result = await query<TwoFactorRow>(
      'SELECT totp_secret, enabled FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].enabled) {
      return res.status(400).json({
        error: '2FA not enabled',
        message: 'Two-factor authentication must be enabled first'
      });
    }

    const secret = decryptWithServiceKey(result.rows[0].totp_secret!).toString();
    if (!verifyTOTP(secret, code)) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    const plaintextCodes = generateBackupCodes();
    const hashedCodes = hashBackupCodes(plaintextCodes);

    await query(
      `UPDATE two_factor_auth
       SET backup_codes = $2, backup_codes_generated_at = NOW(),
           backup_codes_used_count = 0, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, JSON.stringify(hashedCodes)]
    );

    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        '2FA_BACKUP_CODES_REGENERATED',
        JSON.stringify({ count: plaintextCodes.length }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('2FA backup codes regenerated', { userId });

    res.json({
      message: 'Backup codes regenerated successfully',
      data: {
        backupCodes: formatBackupCodesForDisplay(plaintextCodes),
        backupCodesCount: plaintextCodes.length
      }
    });
  } catch (error) {
    logger.error('2FA backup codes regenerate error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to regenerate backup codes'
    });
  }
});

/**
 * POST /api/security/emergency/pause-all
 * Pause all active switches (emergency control)
 */
router.post('/emergency/pause-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await transaction(async (client: PoolClient) => {
      const updateResult = await client.query<SwitchRow>(
        `UPDATE switches
         SET status = 'PAUSED', updated_at = NOW()
         WHERE user_id = $1 AND status = 'ARMED'
         RETURNING id, title`,
        [userId]
      );

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
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let activeSessions = 0;
    let recentEvents = 0;
    let twoFactorEnabled = false;

    try {
      const sessionsResult = await query<CountRow>(
        `SELECT COUNT(*) as count
         FROM sessions
         WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
        [userId]
      );
      activeSessions = parseInt(sessionsResult.rows[0].count);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== '42P01') throw error;
    }

    try {
      const eventsResult = await query<CountRow>(
        `SELECT COUNT(*) as count
         FROM audit_log
         WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '24 hours'`,
        [userId]
      );
      recentEvents = parseInt(eventsResult.rows[0].count);
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== '42P01') throw error;
    }

    try {
      const twoFactorResult = await query<{ enabled: boolean }>(
        `SELECT enabled FROM two_factor_auth WHERE user_id = $1`,
        [userId]
      );
      twoFactorEnabled = twoFactorResult.rows[0]?.enabled || false;
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code !== '42P01') throw error;
    }

    res.json({
      message: 'Security stats retrieved',
      data: {
        activeSessions,
        recentEvents24h: recentEvents,
        twoFactorEnabled
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

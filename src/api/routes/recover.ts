/**
 * Public Recovery Routes
 *
 * Handles password-based message recovery for recipients.
 * No authentication required - security is based on:
 * 1. Knowledge of the switch ID
 * 2. Knowledge of the recovery password
 *
 * @see CLAUDE.md - Security Tiers (Basic: Password Protection)
 */

import express, { Request, Response } from 'express';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Database row types
 */
interface SwitchRecoveryInfoRow {
  id: string;
  title: string | null;
  status: string;
  triggered_at: Date | null;
  has_password_recovery: boolean;
}

interface SwitchRecoveryDataRow {
  id: string;
  title: string | null;
  status: string;
  recovery_encrypted_ciphertext: string | null;
  recovery_encrypted_iv: string | null;
  recovery_encrypted_auth_tag: string | null;
  recovery_encrypted_salt: string | null;
}

/**
 * GET /api/recover/:switchId
 * Get recovery info for a switch (check if password recovery is available)
 */
router.get('/:switchId', async (req: Request, res: Response) => {
  try {
    const { switchId } = req.params;

    if (!switchId || switchId.length < 16) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid switch ID'
      });
    }

    // Check if switch exists and has recovery encryption
    const result = await query<SwitchRecoveryInfoRow>(
      `SELECT
        id,
        title,
        status,
        triggered_at,
        recovery_encrypted_ciphertext IS NOT NULL as has_password_recovery
      FROM switches
      WHERE id = $1`,
      [switchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = result.rows[0];

    // Only allow recovery for released switches
    if (sw.status !== 'RELEASED' && sw.status !== 'TRIGGERED') {
      return res.status(403).json({
        error: 'Not available',
        message: 'This switch has not been triggered yet'
      });
    }

    res.json({
      message: 'Recovery info retrieved',
      data: {
        switchId: sw.id,
        title: sw.title,
        triggeredAt: sw.triggered_at,
        hasPasswordRecovery: sw.has_password_recovery,
        recoveryMethods: sw.has_password_recovery
          ? ['password', 'nostr']
          : ['nostr']
      }
    });
  } catch (error) {
    logger.error('Get recovery info error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get recovery info'
    });
  }
});

/**
 * POST /api/recover/:switchId
 * Attempt password-based recovery
 *
 * Request body: { password: string }
 * Returns encrypted message data that can be decrypted client-side
 */
router.post('/:switchId', async (req: Request, res: Response) => {
  try {
    const { switchId } = req.params;
    const { password } = req.body;

    if (!switchId || switchId.length < 16) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid switch ID'
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Password is required'
      });
    }

    // Get switch with recovery encryption data
    const result = await query<SwitchRecoveryDataRow>(
      `SELECT
        id,
        title,
        status,
        recovery_encrypted_ciphertext,
        recovery_encrypted_iv,
        recovery_encrypted_auth_tag,
        recovery_encrypted_salt
      FROM switches
      WHERE id = $1`,
      [switchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = result.rows[0];

    // Only allow recovery for released switches
    if (sw.status !== 'RELEASED' && sw.status !== 'TRIGGERED') {
      return res.status(403).json({
        error: 'Not available',
        message: 'This switch has not been triggered yet'
      });
    }

    // Check if password recovery is available
    if (!sw.recovery_encrypted_ciphertext) {
      return res.status(400).json({
        error: 'Not available',
        message: 'Password recovery is not enabled for this switch. Use Nostr key recovery instead.'
      });
    }

    // Return encrypted data for client-side decryption
    // The client will use the password to derive the key and decrypt
    res.json({
      message: 'Recovery data retrieved',
      data: {
        switchId: sw.id,
        title: sw.title,
        recoveryEncrypted: {
          ciphertext: sw.recovery_encrypted_ciphertext,
          iv: sw.recovery_encrypted_iv,
          authTag: sw.recovery_encrypted_auth_tag,
          salt: sw.recovery_encrypted_salt
        }
      }
    });
  } catch (error) {
    logger.error('Password recovery error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Recovery failed'
    });
  }
});

export default router;

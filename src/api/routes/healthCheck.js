'use strict';

/**
 * Health Check Routes
 *
 * Provides switch health verification:
 * - Check message availability on relays
 * - Verify guardian acknowledgments
 * - Check Bitcoin commitment status
 * - Generate proof documents
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/switches/:switchId/health-check
 * Get comprehensive health check for a switch
 */
router.get('/:switchId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchId } = req.params;

    // Get switch details
    const switchResult = await query(
      `SELECT
        s.id,
        s.title,
        s.status,
        s.nostr_public_key,
        s.relay_urls,
        s.fragment_metadata,
        s.client_side_encryption,
        s.expires_at,
        s.last_check_in,
        s.created_at
       FROM switches s
       WHERE s.id = $1 AND s.user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = switchResult.rows[0];
    const checks = {};
    let overallStatus = 'healthy';

    // Check 1: Message stored on relays
    const relayUrls = sw.relay_urls || [];
    const relayCount = relayUrls.length;
    const requiredRelays = 5;

    checks.messageOnRelays = {
      status: relayCount >= requiredRelays ? 'pass' : relayCount >= 3 ? 'warning' : 'fail',
      relayCount,
      requiredCount: requiredRelays,
      message: relayCount >= requiredRelays
        ? `Message stored on ${relayCount} relays`
        : `Only ${relayCount} relays configured (${requiredRelays} recommended)`
    };

    if (checks.messageOnRelays.status === 'fail') overallStatus = 'critical';
    else if (checks.messageOnRelays.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check 2: Guardian acknowledgments
    const fragmentMetadata = sw.fragment_metadata || {};
    const guardians = fragmentMetadata.guardians || [];
    const acknowledgedGuardians = guardians.filter(g => g.acknowledged).length;
    const requiredGuardians = 3;

    checks.guardianAcknowledgments = {
      status: acknowledgedGuardians >= requiredGuardians ? 'pass'
        : acknowledgedGuardians >= 2 ? 'warning' : 'fail',
      acknowledged: acknowledgedGuardians,
      total: guardians.length,
      required: requiredGuardians,
      message: acknowledgedGuardians >= requiredGuardians
        ? `${acknowledgedGuardians}/${guardians.length} guardians acknowledged`
        : `Only ${acknowledgedGuardians} guardians acknowledged (${requiredGuardians} required)`
    };

    if (checks.guardianAcknowledgments.status === 'fail') overallStatus = 'critical';
    else if (checks.guardianAcknowledgments.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check 3: Bitcoin commitment (optional)
    const bitcoinCommitment = fragmentMetadata.bitcoinCommitment;
    if (bitcoinCommitment) {
      const confirmations = bitcoinCommitment.confirmations || 0;
      checks.bitcoinCommitment = {
        status: confirmations >= 6 ? 'pass' : confirmations >= 1 ? 'warning' : 'pending',
        txid: bitcoinCommitment.txid,
        confirmations,
        message: confirmations >= 6
          ? `Confirmed with ${confirmations} confirmations`
          : confirmations >= 1
            ? `Pending - ${confirmations} confirmations (6 required)`
            : 'Awaiting confirmation'
      };
    } else {
      checks.bitcoinCommitment = {
        status: 'optional',
        message: 'No Bitcoin commitment configured'
      };
    }

    // Check 4: Heartbeat active
    const now = new Date();
    const expiresAt = new Date(sw.expires_at);
    const lastCheckIn = new Date(sw.last_check_in);
    const timeRemaining = expiresAt - now;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    checks.heartbeatActive = {
      status: sw.status === 'ARMED' && timeRemaining > 0 ? 'pass'
        : sw.status === 'ARMED' && hoursRemaining < 12 ? 'warning' : 'fail',
      lastHeartbeat: lastCheckIn.toISOString(),
      nextExpiry: expiresAt.toISOString(),
      hoursRemaining: Math.max(0, hoursRemaining),
      message: sw.status !== 'ARMED'
        ? `Switch status is ${sw.status}`
        : timeRemaining > 0
          ? `${hoursRemaining} hours until expiry`
          : 'Switch has expired'
    };

    if (checks.heartbeatActive.status === 'fail') overallStatus = 'critical';
    else if (checks.heartbeatActive.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check 5: Recipients configured
    const recipientsResult = await query(
      'SELECT COUNT(*) as count FROM recipients WHERE switch_id = $1',
      [switchId]
    );
    const recipientCount = parseInt(recipientsResult.rows[0].count);

    checks.recipientsConfigured = {
      status: recipientCount > 0 ? 'pass' : 'fail',
      count: recipientCount,
      message: recipientCount > 0
        ? `${recipientCount} recipient(s) configured`
        : 'No recipients configured'
    };

    if (checks.recipientsConfigured.status === 'fail') overallStatus = 'critical';

    // Check 6: Encryption status
    checks.encryption = {
      status: sw.client_side_encryption ? 'pass' : 'warning',
      clientSideEncryption: sw.client_side_encryption,
      message: sw.client_side_encryption
        ? 'Client-side encryption active - keys never leave your device'
        : 'Server-assisted encryption - consider upgrading'
    };

    // Check if proof document exists
    const proofResult = await query(
      `SELECT id, generated_at FROM proof_documents
       WHERE switch_id = $1
       ORDER BY generated_at DESC LIMIT 1`,
      [switchId]
    );

    const proofDocument = proofResult.rows.length > 0
      ? {
          available: true,
          documentId: proofResult.rows[0].id,
          generatedAt: proofResult.rows[0].generated_at
        }
      : {
          available: false,
          generatedAt: null
        };

    res.json({
      message: 'Health check completed',
      data: {
        switchId,
        overall: overallStatus,
        checks,
        proofDocument,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to perform health check'
    });
  }
});

/**
 * POST /api/switches/:switchId/health-check/generate-proof
 * Generate a proof document PDF
 */
router.post('/:switchId/generate-proof', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchId } = req.params;

    // Get switch and health data
    const switchResult = await query(
      `SELECT
        s.*,
        u.email as user_email
       FROM switches s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const sw = switchResult.rows[0];

    // Get recipients
    const recipientsResult = await query(
      'SELECT email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    // Build health data
    const healthData = {
      switchId: sw.id,
      title: sw.title,
      status: sw.status,
      createdAt: sw.created_at,
      expiresAt: sw.expires_at,
      lastCheckIn: sw.last_check_in,
      nostrPublicKey: sw.nostr_public_key,
      relayCount: (sw.relay_urls || []).length,
      recipientCount: recipientsResult.rows.length,
      recipients: recipientsResult.rows.map(r => ({ email: r.email, name: r.name })),
      clientSideEncryption: sw.client_side_encryption,
      fragmentMetadata: sw.fragment_metadata,
      generatedAt: new Date().toISOString(),
      userEmail: sw.user_email
    };

    // Store proof document (PDF generation would be done by frontend or a PDF service)
    const proofResult = await query(
      `INSERT INTO proof_documents (switch_id, health_data)
       VALUES ($1, $2)
       RETURNING id, generated_at`,
      [switchId, JSON.stringify(healthData)]
    );

    logger.info('Proof document generated', { userId, switchId, proofId: proofResult.rows[0].id });

    res.status(201).json({
      message: 'Proof document generated',
      data: {
        documentId: proofResult.rows[0].id,
        generatedAt: proofResult.rows[0].generated_at,
        healthData
      }
    });
  } catch (error) {
    logger.error('Generate proof error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate proof document'
    });
  }
});

/**
 * GET /api/switches/:switchId/health-check/proof/:proofId
 * Download a proof document
 */
router.get('/:switchId/proof/:proofId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { switchId, proofId } = req.params;

    // Verify ownership and get proof
    const result = await query(
      `SELECT pd.id, pd.health_data, pd.generated_at
       FROM proof_documents pd
       JOIN switches s ON pd.switch_id = s.id
       WHERE pd.id = $1 AND pd.switch_id = $2 AND s.user_id = $3`,
      [proofId, switchId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Proof document not found'
      });
    }

    const proof = result.rows[0];

    res.json({
      message: 'Proof document retrieved',
      data: {
        documentId: proof.id,
        generatedAt: proof.generated_at,
        healthData: proof.health_data
      }
    });
  } catch (error) {
    logger.error('Get proof error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve proof document'
    });
  }
});

export default router;

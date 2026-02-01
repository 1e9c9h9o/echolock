/**
 * Public Messages Routes
 *
 * Handles public message viewing for recipients:
 * - View released message by token (no auth required)
 */

import express from 'express';
import { query } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/messages/:token
 * View a released message by token (public endpoint)
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 16) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invalid or missing token'
      });
    }

    // Look up the release token
    const result = await query(
      `SELECT
        id,
        switch_id,
        recipient_email,
        message_content,
        sender_name,
        sender_email,
        switch_title,
        released_at,
        expires_at,
        viewed_at,
        view_count
      FROM release_tokens
      WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'This message is no longer available or the link is invalid.'
      });
    }

    const releaseToken = result.rows[0];

    // Check if expired
    if (releaseToken.expires_at && new Date(releaseToken.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'Expired',
        message: 'This message link has expired.'
      });
    }

    // Update view tracking
    const isFirstView = !releaseToken.viewed_at;
    await query(
      `UPDATE release_tokens
       SET viewed_at = COALESCE(viewed_at, NOW()),
           view_count = view_count + 1
       WHERE id = $1`,
      [releaseToken.id]
    );

    // Log the view
    logger.info('Message viewed', {
      tokenId: releaseToken.id,
      switchId: releaseToken.switch_id,
      isFirstView,
      recipientEmail: releaseToken.recipient_email
    });

    // Return the message data
    res.json({
      message: 'Message retrieved',
      data: {
        title: releaseToken.switch_title || 'Message from EchoLock',
        content: releaseToken.message_content,
        sender: {
          name: releaseToken.sender_name,
          email: releaseToken.sender_email
        },
        releasedAt: releaseToken.released_at,
        isFirstView
      }
    });

  } catch (error) {
    logger.error('Error retrieving message:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve message'
    });
  }
});

export default router;

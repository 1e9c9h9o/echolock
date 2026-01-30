'use strict';

/**
 * Tracking Routes (Public - No Auth Required)
 *
 * Handles read receipt tracking via pixel images
 */

import express from 'express';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 1x1 transparent PNG (base64)
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * GET /api/track/:token
 * Track email open via invisible pixel
 * No authentication required - called from email clients
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Update recipient read_at timestamp
    const result = await query(
      `UPDATE recipients
       SET read_at = COALESCE(read_at, NOW())
       WHERE tracking_token = $1
       RETURNING id, switch_id`,
      [token]
    );

    if (result.rows.length > 0) {
      logger.info('Email read tracked', {
        recipientId: result.rows[0].id,
        switchId: result.rows[0].switch_id
      });
    }

    // Always return the pixel, even if token not found (don't reveal info)
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': TRANSPARENT_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(TRANSPARENT_PIXEL);
  } catch (error) {
    logger.error('Tracking pixel error:', error);
    // Still return pixel on error
    res.set('Content-Type', 'image/png');
    res.send(TRANSPARENT_PIXEL);
  }
});

export default router;

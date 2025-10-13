'use strict';

/**
 * Switch Routes
 *
 * Handles dead man's switch operations:
 * - Create new switches
 * - List user's switches
 * - Get switch details
 * - Check-in to reset timer
 * - Update switch settings
 * - Cancel/delete switches
 */

import express from 'express';
import { authenticateToken, requireEmailVerified, checkRateLimit } from '../middleware/auth.js';
import { validateCreateSwitch, validateUpdateSwitch } from '../middleware/validate.js';
import {
  createSwitch,
  listSwitches,
  getSwitch,
  checkIn,
  updateSwitch,
  deleteSwitch
} from '../services/switchService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All switch routes require authentication
router.use(authenticateToken);

/**
 * POST /api/switches
 * Create a new dead man's switch
 */
router.post('/', requireEmailVerified, validateCreateSwitch, async (req, res) => {
  try {
    const userId = req.user.id;

    // Rate limit: max 5 switches per hour
    if (checkRateLimit(userId, 'create_switch', 5, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only create 5 switches per hour'
      });
    }

    const switchData = await createSwitch(userId, req.body);

    res.status(201).json({
      message: 'Switch created successfully',
      data: switchData
    });
  } catch (error) {
    logger.error('Create switch error:', error);

    // Return user-friendly error
    if (error.message.includes('Switch creation failed')) {
      return res.status(400).json({
        error: 'Switch creation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create switch'
    });
  }
});

/**
 * GET /api/switches
 * List all switches for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const switches = await listSwitches(userId);

    res.json({
      message: 'Switches retrieved successfully',
      data: {
        switches,
        count: switches.length
      }
    });
  } catch (error) {
    logger.error('List switches error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve switches'
    });
  }
});

/**
 * GET /api/switches/:id
 * Get details for a specific switch
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const switchData = await getSwitch(switchId, userId);

    if (!switchData) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    res.json({
      message: 'Switch retrieved successfully',
      data: switchData
    });
  } catch (error) {
    logger.error('Get switch error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve switch'
    });
  }
});

/**
 * POST /api/switches/:id/checkin
 * Check-in to reset the timer
 */
router.post('/:id/checkin', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    // Rate limit: max 10 check-ins per hour (prevent abuse)
    if (checkRateLimit(userId, `checkin_${switchId}`, 10, 3600000)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many check-ins. Please wait before trying again.'
      });
    }

    const result = await checkIn(switchId, userId, req);

    res.json({
      message: 'Check-in successful',
      data: result
    });
  } catch (error) {
    logger.error('Check-in error:', error);

    if (error.message === 'Switch not found') {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    if (error.message.includes('Cannot check in')) {
      return res.status(400).json({
        error: 'Check-in not allowed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Check-in failed'
    });
  }
});

/**
 * PATCH /api/switches/:id
 * Update switch settings (title, status, etc.)
 */
router.patch('/:id', validateUpdateSwitch, async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const updatedSwitch = await updateSwitch(switchId, userId, req.body);

    if (!updatedSwitch) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    res.json({
      message: 'Switch updated successfully',
      data: {
        id: updatedSwitch.id,
        title: updatedSwitch.title,
        status: updatedSwitch.status
      }
    });
  } catch (error) {
    logger.error('Update switch error:', error);

    if (error.message === 'No fields to update') {
      return res.status(400).json({
        error: 'No updates provided',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update switch'
    });
  }
});

/**
 * DELETE /api/switches/:id
 * Cancel/delete a switch
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    const success = await deleteSwitch(switchId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    res.json({
      message: 'Switch cancelled successfully',
      data: {
        id: switchId,
        status: 'CANCELLED'
      }
    });
  } catch (error) {
    logger.error('Delete switch error:', error);

    if (error.message === 'Switch not found') {
      return res.status(404).json({
        error: 'Switch not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Server error',
      message: 'Failed to cancel switch'
    });
  }
});

/**
 * GET /api/switches/:id/check-ins
 * Get check-in history for a switch
 */
router.get('/:id/check-ins', async (req, res) => {
  try {
    const userId = req.user.id;
    const switchId = req.params.id;

    // Import database query
    const { query } = await import('../db/connection.js');

    // Verify ownership
    const switchResult = await query(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Switch not found',
        message: 'Switch does not exist or you do not have access'
      });
    }

    // Get check-in history
    const result = await query(
      `SELECT id, timestamp, ip_address
       FROM check_ins
       WHERE switch_id = $1
       ORDER BY timestamp DESC
       LIMIT 50`,
      [switchId]
    );

    res.json({
      message: 'Check-in history retrieved',
      data: {
        checkIns: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get check-in history error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve check-in history'
    });
  }
});

export default router;

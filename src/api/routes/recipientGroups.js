'use strict';

/**
 * Recipient Groups Routes
 *
 * Handles recipient group management:
 * - Create, read, update, delete groups
 * - Add/remove recipients from groups
 * - Bulk operations
 */

import express from 'express';
import { authenticateToken, checkRateLimit } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/recipient-groups
 * List all recipient groups for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
        rg.id,
        rg.name,
        rg.description,
        rg.created_at,
        rg.updated_at,
        COUNT(r.id) as recipient_count
       FROM recipient_groups rg
       LEFT JOIN recipients r ON r.group_id = rg.id
       WHERE rg.user_id = $1
       GROUP BY rg.id
       ORDER BY rg.name ASC`,
      [userId]
    );

    res.json({
      message: 'Recipient groups retrieved',
      data: {
        groups: result.rows.map(row => ({
          ...row,
          recipientCount: parseInt(row.recipient_count) || 0
        })),
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('List recipient groups error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve recipient groups'
    });
  }
});

/**
 * POST /api/recipient-groups
 * Create a new recipient group
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Group name is required'
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Group name must be less than 255 characters'
      });
    }

    // Rate limit: max 20 groups per user
    const countResult = await query(
      'SELECT COUNT(*) as count FROM recipient_groups WHERE user_id = $1',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 20) {
      return res.status(400).json({
        error: 'Limit exceeded',
        message: 'Maximum 20 recipient groups allowed'
      });
    }

    const result = await query(
      `INSERT INTO recipient_groups (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at`,
      [userId, name.trim(), description?.trim() || null]
    );

    const group = result.rows[0];

    logger.info('Recipient group created', { userId, groupId: group.id });

    res.status(201).json({
      message: 'Recipient group created',
      data: {
        ...group,
        recipientCount: 0
      }
    });
  } catch (error) {
    logger.error('Create recipient group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create recipient group'
    });
  }
});

/**
 * GET /api/recipient-groups/:id
 * Get a specific recipient group with its recipients
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    const groupResult = await query(
      `SELECT id, name, description, created_at, updated_at
       FROM recipient_groups
       WHERE id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient group not found'
      });
    }

    const recipientsResult = await query(
      `SELECT r.id, r.email, r.name, r.custom_message, r.read_at, r.created_at,
              s.id as switch_id, s.title as switch_title
       FROM recipients r
       JOIN switches s ON r.switch_id = s.id
       WHERE r.group_id = $1 AND s.user_id = $2
       ORDER BY r.name ASC, r.email ASC`,
      [groupId, userId]
    );

    res.json({
      message: 'Recipient group retrieved',
      data: {
        ...groupResult.rows[0],
        recipients: recipientsResult.rows
      }
    });
  } catch (error) {
    logger.error('Get recipient group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve recipient group'
    });
  }
});

/**
 * PATCH /api/recipient-groups/:id
 * Update a recipient group
 */
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { name, description } = req.body;

    // Verify ownership
    const ownerCheck = await query(
      'SELECT id FROM recipient_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient group not found'
      });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Group name cannot be empty'
        });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    values.push(groupId);

    const result = await query(
      `UPDATE recipient_groups
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, updated_at`,
      values
    );

    res.json({
      message: 'Recipient group updated',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update recipient group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update recipient group'
    });
  }
});

/**
 * DELETE /api/recipient-groups/:id
 * Delete a recipient group (unlinks recipients, doesn't delete them)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;

    // Delete will cascade - recipients get group_id set to NULL due to ON DELETE SET NULL
    const result = await query(
      `DELETE FROM recipient_groups
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient group not found'
      });
    }

    logger.info('Recipient group deleted', { userId, groupId });

    res.json({
      message: 'Recipient group deleted',
      data: { id: groupId }
    });
  } catch (error) {
    logger.error('Delete recipient group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete recipient group'
    });
  }
});

/**
 * POST /api/recipient-groups/:id/recipients
 * Add recipients to a group
 */
router.post('/:id/recipients', async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { recipientIds } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'recipientIds array is required'
      });
    }

    // Verify group ownership
    const groupCheck = await query(
      'SELECT id FROM recipient_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient group not found'
      });
    }

    // Update recipients that belong to user's switches
    const result = await query(
      `UPDATE recipients r
       SET group_id = $1
       FROM switches s
       WHERE r.switch_id = s.id
         AND s.user_id = $2
         AND r.id = ANY($3)
       RETURNING r.id`,
      [groupId, userId, recipientIds]
    );

    res.json({
      message: 'Recipients added to group',
      data: {
        updatedCount: result.rows.length,
        recipientIds: result.rows.map(r => r.id)
      }
    });
  } catch (error) {
    logger.error('Add recipients to group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to add recipients to group'
    });
  }
});

/**
 * DELETE /api/recipient-groups/:id/recipients
 * Remove recipients from a group
 */
router.delete('/:id/recipients', async (req, res) => {
  try {
    const userId = req.user.id;
    const groupId = req.params.id;
    const { recipientIds } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'recipientIds array is required'
      });
    }

    // Verify group ownership
    const groupCheck = await query(
      'SELECT id FROM recipient_groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient group not found'
      });
    }

    // Remove from group (set group_id to NULL)
    const result = await query(
      `UPDATE recipients r
       SET group_id = NULL
       FROM switches s
       WHERE r.switch_id = s.id
         AND s.user_id = $1
         AND r.group_id = $2
         AND r.id = ANY($3)
       RETURNING r.id`,
      [userId, groupId, recipientIds]
    );

    res.json({
      message: 'Recipients removed from group',
      data: {
        updatedCount: result.rows.length,
        recipientIds: result.rows.map(r => r.id)
      }
    });
  } catch (error) {
    logger.error('Remove recipients from group error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to remove recipients from group'
    });
  }
});

/**
 * PATCH /api/recipient-groups/:groupId/recipients/:recipientId
 * Update a recipient's custom message
 */
router.patch('/:groupId/recipients/:recipientId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId, recipientId } = req.params;
    const { customMessage } = req.body;

    // Verify ownership
    const result = await query(
      `UPDATE recipients r
       SET custom_message = $1
       FROM switches s
       WHERE r.switch_id = s.id
         AND s.user_id = $2
         AND r.id = $3
         AND r.group_id = $4
       RETURNING r.id, r.email, r.name, r.custom_message`,
      [customMessage?.trim() || null, userId, recipientId, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Recipient not found in this group'
      });
    }

    res.json({
      message: 'Recipient updated',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update recipient error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update recipient'
    });
  }
});

/**
 * GET /api/recipient-groups/recipients/read-receipts
 * Get read receipt status for all user's recipients
 */
router.get('/recipients/read-receipts', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT r.id, r.email, r.name, r.read_at, r.switch_id, s.title as switch_title
       FROM recipients r
       JOIN switches s ON r.switch_id = s.id
       WHERE s.user_id = $1 AND r.read_at IS NOT NULL
       ORDER BY r.read_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      message: 'Read receipts retrieved',
      data: {
        receipts: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get read receipts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve read receipts'
    });
  }
});

export default router;

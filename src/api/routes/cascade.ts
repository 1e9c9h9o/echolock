'use strict';

/**
 * Cascade Messages Routes
 *
 * Handles time-delayed message releases:
 * - Create cascade messages for a switch
 * - Manage cascade message order and timing
 * - Link to recipient groups
 */

import express, { Response } from 'express';
import { authenticateToken, requireEmailVerified, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Database row types
 */
interface SwitchCheckRow {
  id: string;
  status: string;
}

interface RecipientGroupRow {
  id: string;
}

interface CascadeMessageRow {
  id: string;
  delay_hours: number;
  recipient_group_id: string | null;
  status: string;
  released_at: Date | null;
  created_at: Date;
  sort_order: number;
  recipient_group_name?: string | null;
}

interface CountRow {
  count: string;
}

interface MaxOrderRow {
  next_order: number;
}

/**
 * Request body types
 */
interface CreateCascadeBody {
  delayHours: number;
  recipientGroupId?: string;
  encryptedMessage: {
    ciphertext: string;
    iv: string;
    authTag: string;
    fragmentMetadata?: Record<string, unknown>;
  };
  sortOrder?: number;
}

interface UpdateCascadeBody {
  delayHours?: number;
  recipientGroupId?: string | null;
  sortOrder?: number;
}

interface ReorderBody {
  order: string[];
}

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/switches/:switchId/cascade
 * Get all cascade messages for a switch
 */
router.get('/:switchId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;

    // Verify switch ownership
    const switchCheck = await query<SwitchCheckRow>(
      'SELECT id, status FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    const result = await query<CascadeMessageRow>(
      `SELECT
        cm.id,
        cm.delay_hours,
        cm.recipient_group_id,
        cm.status,
        cm.released_at,
        cm.created_at,
        cm.sort_order,
        rg.name as recipient_group_name
       FROM cascade_messages cm
       LEFT JOIN recipient_groups rg ON cm.recipient_group_id = rg.id
       WHERE cm.switch_id = $1
       ORDER BY cm.sort_order ASC, cm.delay_hours ASC`,
      [switchId]
    );

    res.json({
      message: 'Cascade messages retrieved',
      data: {
        switchId,
        cascadeMessages: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get cascade messages error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve cascade messages'
    });
  }
});

/**
 * POST /api/switches/:switchId/cascade
 * Add a cascade message to a switch
 */
router.post('/:switchId', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;
    const {
      delayHours,
      recipientGroupId,
      encryptedMessage,
      sortOrder
    } = req.body as CreateCascadeBody;

    // Verify switch ownership
    const switchCheck = await query<SwitchCheckRow>(
      'SELECT id, status FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    if (switchCheck.rows[0].status !== 'ARMED') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Cascade messages can only be added to armed switches'
      });
    }

    // Validate delay hours
    if (delayHours === undefined || delayHours < 0 || delayHours > 8760) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'delayHours must be between 0 and 8760 (1 year)'
      });
    }

    // Validate encrypted message
    if (!encryptedMessage || !encryptedMessage.ciphertext || !encryptedMessage.iv || !encryptedMessage.authTag) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'encryptedMessage must include ciphertext, iv, and authTag'
      });
    }

    // Verify recipient group if provided
    if (recipientGroupId) {
      const groupCheck = await query<RecipientGroupRow>(
        'SELECT id FROM recipient_groups WHERE id = $1 AND user_id = $2',
        [recipientGroupId, userId]
      );

      if (groupCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid recipient group'
        });
      }
    }

    // Limit cascade messages per switch
    const countResult = await query<CountRow>(
      'SELECT COUNT(*) as count FROM cascade_messages WHERE switch_id = $1',
      [switchId]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({
        error: 'Limit exceeded',
        message: 'Maximum 10 cascade messages per switch'
      });
    }

    // Get next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxOrderResult = await query<MaxOrderRow>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM cascade_messages WHERE switch_id = $1',
        [switchId]
      );
      finalSortOrder = maxOrderResult.rows[0].next_order;
    }

    const result = await query<CascadeMessageRow>(
      `INSERT INTO cascade_messages (
        switch_id,
        delay_hours,
        recipient_group_id,
        encrypted_message_ciphertext,
        encrypted_message_iv,
        encrypted_message_auth_tag,
        fragment_metadata,
        sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, delay_hours, recipient_group_id, status, sort_order, created_at`,
      [
        switchId,
        delayHours,
        recipientGroupId || null,
        encryptedMessage.ciphertext,
        encryptedMessage.iv,
        encryptedMessage.authTag,
        encryptedMessage.fragmentMetadata ? JSON.stringify(encryptedMessage.fragmentMetadata) : null,
        finalSortOrder
      ]
    );

    logger.info('Cascade message created', {
      userId,
      switchId,
      cascadeId: result.rows[0].id,
      delayHours
    });

    res.status(201).json({
      message: 'Cascade message created',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Create cascade message error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create cascade message'
    });
  }
});

/**
 * PATCH /api/switches/:switchId/cascade/:cascadeId
 * Update a cascade message
 */
router.patch('/:switchId/:cascadeId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId, cascadeId } = req.params;
    const { delayHours, recipientGroupId, sortOrder } = req.body as UpdateCascadeBody;

    // Verify switch ownership
    const switchCheck = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Verify cascade message exists and is pending
    const cascadeCheck = await query<{ id: string; status: string }>(
      'SELECT id, status FROM cascade_messages WHERE id = $1 AND switch_id = $2',
      [cascadeId, switchId]
    );

    if (cascadeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cascade message not found'
      });
    }

    if (cascadeCheck.rows[0].status !== 'PENDING') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Cannot update a released cascade message'
      });
    }

    const updates: string[] = [];
    const values: (number | string | null)[] = [];
    let paramIndex = 1;

    if (delayHours !== undefined) {
      if (delayHours < 0 || delayHours > 8760) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'delayHours must be between 0 and 8760'
        });
      }
      updates.push(`delay_hours = $${paramIndex++}`);
      values.push(delayHours);
    }

    if (recipientGroupId !== undefined) {
      if (recipientGroupId !== null) {
        const groupCheck = await query<RecipientGroupRow>(
          'SELECT id FROM recipient_groups WHERE id = $1 AND user_id = $2',
          [recipientGroupId, userId]
        );

        if (groupCheck.rows.length === 0) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid recipient group'
          });
        }
      }
      updates.push(`recipient_group_id = $${paramIndex++}`);
      values.push(recipientGroupId);
    }

    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    values.push(cascadeId);

    const result = await query<CascadeMessageRow>(
      `UPDATE cascade_messages
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, delay_hours, recipient_group_id, sort_order, status`,
      values
    );

    res.json({
      message: 'Cascade message updated',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update cascade message error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update cascade message'
    });
  }
});

/**
 * DELETE /api/switches/:switchId/cascade/:cascadeId
 * Delete a cascade message
 */
router.delete('/:switchId/:cascadeId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId, cascadeId } = req.params;

    // Verify switch ownership
    const switchCheck = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Delete cascade message
    const result = await query<{ id: string }>(
      `DELETE FROM cascade_messages
       WHERE id = $1 AND switch_id = $2 AND status = 'PENDING'
       RETURNING id`,
      [cascadeId, switchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Cascade message not found or already released'
      });
    }

    logger.info('Cascade message deleted', { userId, switchId, cascadeId });

    res.json({
      message: 'Cascade message deleted',
      data: { id: cascadeId }
    });
  } catch (error) {
    logger.error('Delete cascade message error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete cascade message'
    });
  }
});

/**
 * POST /api/switches/:switchId/cascade/reorder
 * Reorder cascade messages
 */
router.post('/:switchId/reorder', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { switchId } = req.params;
    const { order } = req.body as ReorderBody;

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'order array is required'
      });
    }

    // Verify switch ownership
    const switchCheck = await query<{ id: string }>(
      'SELECT id FROM switches WHERE id = $1 AND user_id = $2',
      [switchId, userId]
    );

    if (switchCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Switch not found'
      });
    }

    // Update sort orders
    for (let i = 0; i < order.length; i++) {
      await query(
        `UPDATE cascade_messages
         SET sort_order = $1
         WHERE id = $2 AND switch_id = $3 AND status = 'PENDING'`,
        [i, order[i], switchId]
      );
    }

    res.json({
      message: 'Cascade messages reordered',
      data: { order }
    });
  } catch (error) {
    logger.error('Reorder cascade messages error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to reorder cascade messages'
    });
  }
});

export default router;

'use strict';

/**
 * Emergency Contacts Routes
 *
 * Manages emergency contacts who receive alerts before switch triggers:
 * - Create, read, update, delete contacts
 * - Configure alert thresholds
 * - Send test alerts
 * - Track alert acknowledgments
 */

import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Database row types
 */
interface EmergencyContactRow {
  id: string;
  name: string;
  email: string;
  alert_threshold_hours: number;
  escalation_order: number;
  is_active: boolean;
  last_notified_at: Date | null;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface MaxOrderRow {
  next_order: number;
}

interface AlertRow {
  id: string;
  switch_id: string;
  alert_type: string;
  status: string;
  sent_at: Date | null;
  acknowledged_at: Date | null;
  created_at: Date;
  contact_name: string;
  contact_email: string;
  switch_title: string;
}

/**
 * Request body types
 */
interface CreateContactBody {
  name: string;
  email: string;
  alertThresholdHours?: number;
  escalationOrder?: number;
}

interface UpdateContactBody {
  name?: string;
  email?: string;
  alertThresholdHours?: number;
  escalationOrder?: number;
  isActive?: boolean;
}

interface ReorderBody {
  order: string[];
}

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/emergency-contacts
 * List all emergency contacts for the user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<EmergencyContactRow>(
      `SELECT
        id,
        name,
        email,
        alert_threshold_hours,
        escalation_order,
        is_active,
        last_notified_at,
        created_at
       FROM emergency_contacts
       WHERE user_id = $1
       ORDER BY escalation_order ASC, created_at ASC`,
      [userId]
    );

    res.json({
      message: 'Emergency contacts retrieved',
      data: {
        contacts: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('List emergency contacts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve emergency contacts'
    });
  }
});

/**
 * POST /api/emergency-contacts
 * Create a new emergency contact
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, email, alertThresholdHours, escalationOrder } = req.body as CreateContactBody;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name is required'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Valid email is required'
      });
    }

    // Limit contacts per user
    const countResult = await query<CountRow>(
      'SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = $1',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({
        error: 'Limit exceeded',
        message: 'Maximum 10 emergency contacts allowed'
      });
    }

    // Get next escalation order if not provided
    let finalOrder = escalationOrder;
    if (finalOrder === undefined) {
      const maxOrderResult = await query<MaxOrderRow>(
        'SELECT COALESCE(MAX(escalation_order), -1) + 1 as next_order FROM emergency_contacts WHERE user_id = $1',
        [userId]
      );
      finalOrder = maxOrderResult.rows[0].next_order;
    }

    const result = await query<EmergencyContactRow>(
      `INSERT INTO emergency_contacts (user_id, name, email, alert_threshold_hours, escalation_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, alert_threshold_hours, escalation_order, is_active, created_at`,
      [
        userId,
        name.trim(),
        email.trim().toLowerCase(),
        alertThresholdHours || 12,
        finalOrder
      ]
    );

    logger.info('Emergency contact created', { userId, contactId: result.rows[0].id });

    res.status(201).json({
      message: 'Emergency contact created',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Create emergency contact error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create emergency contact'
    });
  }
});

/**
 * PATCH /api/emergency-contacts/:id
 * Update an emergency contact
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;
    const { name, email, alertThresholdHours, escalationOrder, isActive } = req.body as UpdateContactBody;

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Name cannot be empty'
        });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (email !== undefined) {
      if (!email.includes('@')) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Valid email is required'
        });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email.trim().toLowerCase());
    }

    if (alertThresholdHours !== undefined) {
      if (alertThresholdHours < 1 || alertThresholdHours > 168) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Alert threshold must be between 1 and 168 hours'
        });
      }
      updates.push(`alert_threshold_hours = $${paramIndex++}`);
      values.push(alertThresholdHours);
    }

    if (escalationOrder !== undefined) {
      updates.push(`escalation_order = $${paramIndex++}`);
      values.push(escalationOrder);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    values.push(contactId, userId);

    const result = await query<EmergencyContactRow>(
      `UPDATE emergency_contacts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, name, email, alert_threshold_hours, escalation_order, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emergency contact not found'
      });
    }

    res.json({
      message: 'Emergency contact updated',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Update emergency contact error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update emergency contact'
    });
  }
});

/**
 * DELETE /api/emergency-contacts/:id
 * Delete an emergency contact
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;

    const result = await query<{ id: string }>(
      `DELETE FROM emergency_contacts
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [contactId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emergency contact not found'
      });
    }

    logger.info('Emergency contact deleted', { userId, contactId });

    res.json({
      message: 'Emergency contact deleted',
      data: { id: contactId }
    });
  } catch (error) {
    logger.error('Delete emergency contact error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete emergency contact'
    });
  }
});

/**
 * POST /api/emergency-contacts/:id/test
 * Send a test alert to an emergency contact
 */
router.post('/:id/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;

    // Get contact
    const contactResult = await query<EmergencyContactRow>(
      'SELECT id, name, email FROM emergency_contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Emergency contact not found'
      });
    }

    const contact = contactResult.rows[0];

    // Send test email (using existing email service)
    try {
      const { sendEmergencyTestEmail } = await import('../services/emailService.js');
      await sendEmergencyTestEmail(contact.email, contact.name);

      logger.info('Test alert sent', { userId, contactId, email: contact.email });

      res.json({
        message: 'Test alert sent',
        data: {
          contactId,
          email: contact.email,
          sentAt: new Date().toISOString()
        }
      });
    } catch (err) {
      const emailError = err as Error;
      logger.error('Test alert email failed:', emailError);
      res.status(500).json({
        error: 'Email error',
        message: 'Failed to send test alert email'
      });
    }
  } catch (error) {
    logger.error('Test alert error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to send test alert'
    });
  }
});

/**
 * POST /api/emergency-contacts/reorder
 * Reorder emergency contacts escalation chain
 */
router.post('/reorder', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { order } = req.body as ReorderBody;

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'order array is required'
      });
    }

    // Update escalation orders
    for (let i = 0; i < order.length; i++) {
      await query(
        `UPDATE emergency_contacts
         SET escalation_order = $1
         WHERE id = $2 AND user_id = $3`,
        [i, order[i], userId]
      );
    }

    res.json({
      message: 'Emergency contacts reordered',
      data: { order }
    });
  } catch (error) {
    logger.error('Reorder emergency contacts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to reorder emergency contacts'
    });
  }
});

/**
 * GET /api/emergency-contacts/alerts
 * Get alert history for the user
 */
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<AlertRow>(
      `SELECT
        ea.id,
        ea.switch_id,
        ea.alert_type,
        ea.status,
        ea.sent_at,
        ea.acknowledged_at,
        ea.created_at,
        ec.name as contact_name,
        ec.email as contact_email,
        s.title as switch_title
       FROM emergency_alerts ea
       JOIN emergency_contacts ec ON ea.contact_id = ec.id
       JOIN switches s ON ea.switch_id = s.id
       WHERE ec.user_id = $1
       ORDER BY ea.created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      message: 'Alert history retrieved',
      data: {
        alerts: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve alert history'
    });
  }
});

export default router;

// Public route for acknowledging alerts (no auth required)
export const acknowledgeAlertRouter = express.Router();

/**
 * GET /api/acknowledge-alert/:token
 * Acknowledge an emergency alert via email link
 */
acknowledgeAlertRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const result = await query<{ id: string; switch_id: string }>(
      `UPDATE emergency_alerts
       SET status = 'ACKNOWLEDGED', acknowledged_at = NOW()
       WHERE ack_token = $1 AND status != 'ACKNOWLEDGED'
       RETURNING id, switch_id`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Alert not found or already acknowledged'
      });
    }

    logger.info('Alert acknowledged', { alertId: result.rows[0].id });

    res.json({
      message: 'Alert acknowledged',
      data: {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Acknowledge alert error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to acknowledge alert'
    });
  }
});

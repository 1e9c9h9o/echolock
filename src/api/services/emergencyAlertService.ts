'use strict';

/**
 * Emergency Alert Service
 *
 * Handles pre-trigger emergency contact notifications:
 * - Monitors switches approaching expiry
 * - Sends escalating email alerts
 * - Tracks acknowledgments
 */

import crypto from 'crypto';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Alert type definition
 */
export interface AlertType {
  name: 'WARNING' | 'URGENT' | 'FINAL';
  label: string;
}

/**
 * Alert types with timing
 */
export const ALERT_TYPES: Record<string, AlertType> = {
  WARNING: { name: 'WARNING', label: 'Warning' },
  URGENT: { name: 'URGENT', label: 'Urgent' },
  FINAL: { name: 'FINAL', label: 'Final Warning' }
} as const;

/**
 * Emergency alert check row from database
 */
interface EmergencyAlertRow {
  switch_id: string;
  switch_title: string;
  expires_at: Date;
  user_id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  alert_threshold_hours: number;
  escalation_order: number;
}

/**
 * Alert acknowledgment result
 */
interface AlertAcknowledgment {
  id: string;
  switch_id: string;
  contact_id: string;
}

/**
 * Pending alert row from database
 */
interface PendingAlert {
  id: string;
  switch_id: string;
  contact_id: string;
  alert_type: string;
  status: string;
  ack_token: string;
  created_at: Date;
  sent_at: Date | null;
  acknowledged_at: Date | null;
  contact_name: string;
  contact_email: string;
}

/**
 * Check result
 */
interface CheckResult {
  processed: number;
  sent: number;
}

/**
 * Check all switches for emergency contact alerts needed
 */
export async function checkEmergencyAlerts(): Promise<CheckResult> {
  try {
    logger.info('Checking for emergency alerts...');

    // Get all armed switches with emergency contacts
    const result = await query<EmergencyAlertRow>(`
      SELECT DISTINCT
        s.id as switch_id,
        s.title as switch_title,
        s.expires_at,
        s.user_id,
        ec.id as contact_id,
        ec.name as contact_name,
        ec.email as contact_email,
        ec.alert_threshold_hours,
        ec.escalation_order
      FROM switches s
      JOIN emergency_contacts ec ON ec.user_id = s.user_id
      WHERE s.status = 'ARMED'
        AND ec.is_active = TRUE
      ORDER BY s.id, ec.escalation_order
    `);

    if (result.rows.length === 0) {
      logger.debug('No emergency alerts to process');
      return { processed: 0, sent: 0 };
    }

    const now = new Date();
    let sent = 0;

    for (const row of result.rows) {
      const expiresAt = new Date(row.expires_at);
      const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if alert is needed based on threshold
      if (hoursRemaining <= row.alert_threshold_hours && hoursRemaining > 0) {
        // Determine alert type
        let alertType: AlertType;
        if (hoursRemaining <= 2) {
          alertType = ALERT_TYPES.FINAL;
        } else if (hoursRemaining <= 6) {
          alertType = ALERT_TYPES.URGENT;
        } else {
          alertType = ALERT_TYPES.WARNING;
        }

        // Check if we've already sent this type of alert
        const existingAlert = await query(`
          SELECT id FROM emergency_alerts
          WHERE switch_id = $1
            AND contact_id = $2
            AND alert_type = $3
            AND status IN ('SENT', 'ACKNOWLEDGED')
        `, [row.switch_id, row.contact_id, alertType.name]);

        if (existingAlert.rows.length === 0) {
          // Send the alert
          const alertSent = await sendEmergencyAlert(
            row.switch_id,
            row.switch_title,
            row.contact_id,
            row.contact_name,
            row.contact_email,
            alertType,
            hoursRemaining
          );

          if (alertSent) {
            sent++;
          }
        }
      }
    }

    logger.info(`Emergency alert check complete: ${sent} alerts sent`);
    return { processed: result.rows.length, sent };
  } catch (error) {
    logger.error('Emergency alert check error:', error);
    throw error;
  }
}

/**
 * Send an emergency alert email
 */
async function sendEmergencyAlert(
  switchId: string,
  switchTitle: string,
  contactId: string,
  contactName: string,
  contactEmail: string,
  alertType: AlertType,
  hoursRemaining: number
): Promise<boolean> {
  try {
    // Generate acknowledgment token
    const ackToken = crypto.randomBytes(32).toString('hex');

    // Create alert record
    const alertResult = await query<{ id: string }>(`
      INSERT INTO emergency_alerts (switch_id, contact_id, alert_type, status, ack_token)
      VALUES ($1, $2, $3, 'PENDING', $4)
      RETURNING id
    `, [switchId, contactId, alertType.name, ackToken]);

    const alertId = alertResult.rows[0].id;

    // Send email
    try {
      const { sendEmergencyAlertEmail } = await import('./emailService.js');
      await sendEmergencyAlertEmail(
        contactEmail,
        contactName,
        switchTitle,
        alertType,
        hoursRemaining,
        ackToken
      );

      // Update alert status to SENT
      await query(`
        UPDATE emergency_alerts
        SET status = 'SENT', sent_at = NOW()
        WHERE id = $1
      `, [alertId]);

      logger.info('Emergency alert sent', {
        alertId,
        switchId,
        contactEmail,
        alertType: alertType.name,
        hoursRemaining: Math.round(hoursRemaining)
      });

      return true;
    } catch (emailError) {
      // Update alert status to FAILED
      await query(`
        UPDATE emergency_alerts
        SET status = 'FAILED'
        WHERE id = $1
      `, [alertId]);

      logger.error('Failed to send emergency alert email:', emailError);
      return false;
    }
  } catch (error) {
    logger.error('Send emergency alert error:', error);
    return false;
  }
}

/**
 * Mark alert as acknowledged
 */
export async function acknowledgeAlert(ackToken: string): Promise<AlertAcknowledgment | null> {
  try {
    const result = await query<AlertAcknowledgment>(`
      UPDATE emergency_alerts
      SET status = 'ACKNOWLEDGED', acknowledged_at = NOW()
      WHERE ack_token = $1 AND status != 'ACKNOWLEDGED'
      RETURNING id, switch_id, contact_id
    `, [ackToken]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Alert acknowledged', {
      alertId: result.rows[0].id,
      switchId: result.rows[0].switch_id
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Acknowledge alert error:', error);
    throw error;
  }
}

/**
 * Get pending alerts for a switch
 */
export async function getPendingAlerts(switchId: string): Promise<PendingAlert[]> {
  try {
    const result = await query<PendingAlert>(`
      SELECT ea.*, ec.name as contact_name, ec.email as contact_email
      FROM emergency_alerts ea
      JOIN emergency_contacts ec ON ea.contact_id = ec.id
      WHERE ea.switch_id = $1 AND ea.status = 'PENDING'
      ORDER BY ea.created_at DESC
    `, [switchId]);

    return result.rows;
  } catch (error) {
    logger.error('Get pending alerts error:', error);
    throw error;
  }
}

export default {
  checkEmergencyAlerts,
  acknowledgeAlert,
  getPendingAlerts,
  ALERT_TYPES
};

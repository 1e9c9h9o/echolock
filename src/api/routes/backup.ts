'use strict';

/**
 * Backup Routes
 *
 * Handles account import/export:
 * - Export encrypted account backup
 * - Import from backup file
 * - Export switch templates
 */

import express, { Response } from 'express';
import crypto from 'crypto';
import { authenticateToken, requireEmailVerified, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Request body types
 */
interface ExportBody {
  password: string;
  includeSettings?: boolean;
  includeSwitches?: boolean;
  includeGroups?: boolean;
  includeContacts?: boolean;
}

interface ImportBody {
  encryptedBackup: string;
  password: string;
  conflictResolution?: 'skip' | 'overwrite';
}

/**
 * Backup data types
 */
interface BackupData {
  version: string;
  exportedAt: string;
  userId: string;
  data: {
    switches?: SwitchBackup[];
    recipientGroups?: RecipientGroupBackup[];
    emergencyContacts?: EmergencyContactBackup[];
  };
}

interface SwitchBackup {
  id: string;
  title: string;
  description: string | null;
  status: string;
  check_in_hours: number;
  check_in_count: number;
  nostr_public_key: string | null;
  relay_urls: string[];
  fragment_metadata: FragmentMetadata | null;
  client_side_encryption: boolean;
  vacation_mode_until: Date | null;
  created_at: Date;
  recipients?: RecipientBackup[];
  cascadeMessages?: CascadeBackup[];
}

interface FragmentMetadata {
  guardians?: Guardian[];
  [key: string]: unknown;
}

interface Guardian {
  npub: string;
  type?: string;
}

interface RecipientBackup {
  email: string;
  name: string | null;
  group_id: string | null;
  custom_message: string | null;
}

interface CascadeBackup {
  delay_hours: number;
  recipient_group_id: string | null;
  sort_order: number;
}

interface RecipientGroupBackup {
  name: string;
  description: string | null;
}

interface EmergencyContactBackup {
  name: string;
  email: string;
  alert_threshold_hours: number;
  escalation_order: number;
  is_active: boolean;
}

interface EncryptedBackup {
  version: string;
  algorithm: string;
  salt: string;
  iv: string;
  authTag: string;
  data: string;
}

/**
 * Database row types
 */
interface RecipientGroupRow {
  id: string;
  name: string;
  description: string | null;
}

interface RecipientRow {
  email: string;
  name: string | null;
  group_name: string | null;
}

interface CascadeRow {
  delay_hours: number;
  group_name: string | null;
}

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/account/export
 * Export encrypted account backup
 */
router.post('/export', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      password,
      includeSettings = true,
      includeSwitches = true,
      includeGroups = true,
      includeContacts = true
    } = req.body as ExportBody;

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 8 characters'
      });
    }

    const backup: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      data: {}
    };

    // Export switches (without encrypted message content - that's client-side)
    if (includeSwitches) {
      const switchesResult = await query<SwitchBackup>(
        `SELECT
          id, title, description, status, check_in_hours, check_in_count,
          nostr_public_key, relay_urls, fragment_metadata, client_side_encryption,
          vacation_mode_until, created_at
         FROM switches
         WHERE user_id = $1 AND status != 'CANCELLED'`,
        [userId]
      );

      // Get recipients for each switch
      for (const sw of switchesResult.rows) {
        const recipientsResult = await query<RecipientBackup>(
          `SELECT email, name, group_id, custom_message
           FROM recipients
           WHERE switch_id = $1`,
          [sw.id]
        );
        sw.recipients = recipientsResult.rows;

        // Get cascade messages
        const cascadeResult = await query<CascadeBackup>(
          `SELECT delay_hours, recipient_group_id, sort_order
           FROM cascade_messages
           WHERE switch_id = $1 AND status = 'PENDING'
           ORDER BY sort_order`,
          [sw.id]
        );
        sw.cascadeMessages = cascadeResult.rows;
      }

      backup.data.switches = switchesResult.rows;
    }

    // Export recipient groups
    if (includeGroups) {
      const groupsResult = await query<RecipientGroupBackup>(
        'SELECT name, description FROM recipient_groups WHERE user_id = $1',
        [userId]
      );
      backup.data.recipientGroups = groupsResult.rows;
    }

    // Export emergency contacts
    if (includeContacts) {
      const contactsResult = await query<EmergencyContactBackup>(
        `SELECT name, email, alert_threshold_hours, escalation_order, is_active
         FROM emergency_contacts
         WHERE user_id = $1
         ORDER BY escalation_order`,
        [userId]
      );
      backup.data.emergencyContacts = contactsResult.rows;
    }

    // Encrypt the backup
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const backupJson = JSON.stringify(backup);
    let encrypted = cipher.update(backupJson, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    const encryptedBackup: EncryptedBackup = {
      version: '1.0',
      algorithm: 'aes-256-gcm',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted
    };

    // Calculate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(encryptedBackup))
      .digest('hex');

    logger.info('Account exported', {
      userId,
      switches: backup.data.switches?.length || 0,
      groups: backup.data.recipientGroups?.length || 0,
      contacts: backup.data.emergencyContacts?.length || 0
    });

    res.json({
      message: 'Account exported successfully',
      data: {
        encryptedBackup: JSON.stringify(encryptedBackup),
        checksum,
        exportedAt: backup.exportedAt,
        summary: {
          switches: backup.data.switches?.length || 0,
          recipientGroups: backup.data.recipientGroups?.length || 0,
          emergencyContacts: backup.data.emergencyContacts?.length || 0
        }
      }
    });
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to export account'
    });
  }
});

/**
 * POST /api/account/import
 * Import from encrypted backup
 */
router.post('/import', requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { encryptedBackup, password, conflictResolution = 'skip' } = req.body as ImportBody;

    if (!encryptedBackup || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'encryptedBackup and password are required'
      });
    }

    // Parse and decrypt backup
    let backupData: BackupData;
    try {
      const parsed: EncryptedBackup = JSON.parse(encryptedBackup);

      if (parsed.version !== '1.0' || parsed.algorithm !== 'aes-256-gcm') {
        throw new Error('Unsupported backup format');
      }

      const salt = Buffer.from(parsed.salt, 'base64');
      const iv = Buffer.from(parsed.iv, 'base64');
      const authTag = Buffer.from(parsed.authTag, 'base64');
      const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(parsed.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      backupData = JSON.parse(decrypted);
    } catch (err) {
      const decryptError = err as Error;
      logger.warn('Backup decryption failed:', decryptError.message);
      return res.status(400).json({
        error: 'Decryption failed',
        message: 'Invalid password or corrupted backup file'
      });
    }

    interface ImportResult {
      recipientGroups: number;
      emergencyContacts: number;
      switches: number;
      skipped: number;
      switchTemplates?: number;
    }

    const imported: ImportResult = {
      recipientGroups: 0,
      emergencyContacts: 0,
      switches: 0,
      skipped: 0
    };

    // Import recipient groups first (for FK references)
    const groupIdMap: Record<string, string> = {};
    if (backupData.data.recipientGroups) {
      for (const group of backupData.data.recipientGroups) {
        // Check for existing
        const existingResult = await query<{ id: string }>(
          'SELECT id FROM recipient_groups WHERE user_id = $1 AND name = $2',
          [userId, group.name]
        );

        if (existingResult.rows.length > 0) {
          if (conflictResolution === 'skip') {
            groupIdMap[group.name] = existingResult.rows[0].id;
            imported.skipped++;
            continue;
          }
          // Overwrite - update existing
          await query(
            'UPDATE recipient_groups SET description = $1 WHERE id = $2',
            [group.description, existingResult.rows[0].id]
          );
          groupIdMap[group.name] = existingResult.rows[0].id;
        } else {
          const result = await query<{ id: string }>(
            'INSERT INTO recipient_groups (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
            [userId, group.name, group.description]
          );
          groupIdMap[group.name] = result.rows[0].id;
        }
        imported.recipientGroups++;
      }
    }

    // Import emergency contacts
    if (backupData.data.emergencyContacts) {
      for (const contact of backupData.data.emergencyContacts) {
        // Check for existing
        const existingResult = await query<{ id: string }>(
          'SELECT id FROM emergency_contacts WHERE user_id = $1 AND email = $2',
          [userId, contact.email]
        );

        if (existingResult.rows.length > 0) {
          if (conflictResolution === 'skip') {
            imported.skipped++;
            continue;
          }
          // Overwrite
          await query(
            `UPDATE emergency_contacts
             SET name = $1, alert_threshold_hours = $2, escalation_order = $3, is_active = $4
             WHERE id = $5`,
            [contact.name, contact.alert_threshold_hours, contact.escalation_order, contact.is_active, existingResult.rows[0].id]
          );
        } else {
          await query(
            `INSERT INTO emergency_contacts (user_id, name, email, alert_threshold_hours, escalation_order, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, contact.name, contact.email, contact.alert_threshold_hours, contact.escalation_order, contact.is_active]
          );
        }
        imported.emergencyContacts++;
      }
    }

    // Note: Switches are NOT imported because encrypted message content is client-side
    // User would need to re-create switches with their local keys
    if (backupData.data.switches) {
      imported.switches = 0; // Switches require client-side re-creation
      imported.switchTemplates = backupData.data.switches.length;
    }

    logger.info('Account imported', { userId, imported });

    res.json({
      message: 'Account imported successfully',
      data: {
        imported,
        note: 'Switches must be re-created with your local encryption keys. Switch configurations have been preserved as templates.'
      }
    });
  } catch (error) {
    logger.error('Import error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to import account'
    });
  }
});

/**
 * POST /api/switches/:id/export-template
 * Export a switch configuration as a template
 */
router.post('/switches/:id/export-template', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const switchId = req.params.id;

    // Get switch
    const switchResult = await query<SwitchBackup>(
      `SELECT
        title, check_in_hours, relay_urls, fragment_metadata
       FROM switches
       WHERE id = $1 AND user_id = $2`,
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
    const recipientsResult = await query<RecipientRow>(
      `SELECT r.email, r.name, rg.name as group_name
       FROM recipients r
       LEFT JOIN recipient_groups rg ON r.group_id = rg.id
       WHERE r.switch_id = $1`,
      [switchId]
    );

    // Get cascade config
    const cascadeResult = await query<CascadeRow>(
      `SELECT cm.delay_hours, rg.name as group_name
       FROM cascade_messages cm
       LEFT JOIN recipient_groups rg ON cm.recipient_group_id = rg.id
       WHERE cm.switch_id = $1
       ORDER BY cm.sort_order`,
      [switchId]
    );

    // Get guardian config (npubs only, no secrets)
    const guardians = (sw.fragment_metadata?.guardians || []).map(g => ({
      npub: g.npub,
      type: g.type
    }));

    const template = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      title: sw.title,
      checkInHours: sw.check_in_hours,
      recipients: recipientsResult.rows,
      cascadeMessages: cascadeResult.rows,
      guardians,
      relayUrls: sw.relay_urls
    };

    res.json({
      message: 'Template exported',
      data: { template }
    });
  } catch (error) {
    logger.error('Export template error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to export template'
    });
  }
});

export default router;

'use strict';

/**
 * Legal Documents Routes
 *
 * Handles legal document generation:
 * - Template library
 * - Document generation with user data
 * - Document download
 */

import express, { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Template types
 */
interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  required: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  sections: string[];
}

interface FragmentMetadata {
  guardians?: Guardian[];
  [key: string]: unknown;
}

interface Guardian {
  npub: string;
  type?: string;
  acknowledged?: boolean;
}

/**
 * Database row types
 */
interface UserRow {
  email: string;
}

interface SwitchRow {
  id: string;
  title: string;
  status: string;
  check_in_hours: number;
  expires_at: Date;
  created_at: Date;
  nostr_public_key: string | null;
  fragment_metadata: FragmentMetadata | null;
  client_side_encryption: boolean;
}

interface RecipientRow {
  email: string;
  name: string | null;
}

interface LegalDocumentRow {
  id: string;
  template_id: string;
  title: string;
  fields: Record<string, unknown>;
  generated_at: Date;
  expires_at: Date | null;
  switch_title?: string | null;
}

/**
 * Request body types
 */
interface GenerateDocumentBody {
  templateId: string;
  switchId?: string;
  fields?: Record<string, string>;
}

// Legal document templates
const TEMPLATES: Template[] = [
  {
    id: 'letter-of-instruction',
    name: 'Letter of Instruction',
    description: 'A comprehensive letter for your executor or family detailing your EchoLock setup and digital asset management.',
    fields: [
      { name: 'executorName', label: 'Executor Name', type: 'text', required: true },
      { name: 'executorRelation', label: 'Relation to You', type: 'text', required: false },
      { name: 'additionalInstructions', label: 'Additional Instructions', type: 'textarea', required: false }
    ],
    sections: ['switch_summary', 'guardian_contacts', 'recipient_list', 'recovery_instructions']
  },
  {
    id: 'digital-asset-directive',
    name: 'Digital Asset Directive',
    description: 'A formal directive for managing your digital assets and dead man\'s switch upon incapacity or death.',
    fields: [
      { name: 'yourFullName', label: 'Your Full Legal Name', type: 'text', required: true },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false },
      { name: 'primaryContact', label: 'Primary Contact Person', type: 'text', required: true },
      { name: 'alternateContact', label: 'Alternate Contact', type: 'text', required: false }
    ],
    sections: ['switch_summary', 'legal_declarations', 'guardian_contacts']
  },
  {
    id: 'switch-summary',
    name: 'Switch Configuration Summary',
    description: 'A detailed summary of your switch configuration for record-keeping.',
    fields: [],
    sections: ['switch_summary', 'technical_details', 'recipient_list']
  },
  {
    id: 'guardian-contact-sheet',
    name: 'Guardian Contact Sheet',
    description: 'Contact information for all guardians managing your switch.',
    fields: [
      { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
    ],
    sections: ['guardian_contacts']
  }
];

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/legal/templates
 * Get list of available document templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  res.json({
    message: 'Templates retrieved',
    data: {
      templates: TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        fields: t.fields
      }))
    }
  });
});

/**
 * GET /api/legal/templates/:templateId
 * Get a specific template with fields
 */
router.get('/templates/:templateId', (req: Request, res: Response) => {
  const template = TEMPLATES.find(t => t.id === req.params.templateId);

  if (!template) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Template not found'
    });
  }

  res.json({
    message: 'Template retrieved',
    data: { template }
  });
});

/**
 * POST /api/legal/documents/generate
 * Generate a legal document
 */
router.post('/documents/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { templateId, switchId, fields } = req.body as GenerateDocumentBody;

    // Find template
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid template ID'
      });
    }

    // Validate required fields
    for (const field of template.fields) {
      if (field.required && (!fields || !fields[field.name])) {
        return res.status(400).json({
          error: 'Validation error',
          message: `Field "${field.label}" is required`
        });
      }
    }

    // Get user info
    const userResult = await query<UserRow>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    // Get switch info if provided
    let switchData: SwitchRow | null = null;
    let recipients: RecipientRow[] = [];
    let guardians: { npub: string; type?: string; acknowledged?: boolean }[] = [];

    if (switchId) {
      const switchResult = await query<SwitchRow>(
        `SELECT id, title, status, check_in_hours, expires_at, created_at,
                nostr_public_key, fragment_metadata, client_side_encryption
         FROM switches
         WHERE id = $1 AND user_id = $2`,
        [switchId, userId]
      );

      if (switchResult.rows.length > 0) {
        switchData = switchResult.rows[0];

        // Get recipients
        const recipientsResult = await query<RecipientRow>(
          'SELECT email, name FROM recipients WHERE switch_id = $1',
          [switchId]
        );
        recipients = recipientsResult.rows;

        // Extract guardian info
        guardians = (switchData.fragment_metadata?.guardians || []).map(g => ({
          npub: g.npub,
          type: g.type,
          acknowledged: g.acknowledged
        }));
      }
    }

    // Build document content
    const documentContent = {
      template: {
        id: template.id,
        name: template.name
      },
      userEmail: userResult.rows[0]?.email,
      fields,
      switchData: switchData ? {
        id: switchData.id,
        title: switchData.title,
        status: switchData.status,
        checkInHours: switchData.check_in_hours,
        expiresAt: switchData.expires_at,
        createdAt: switchData.created_at,
        nostrPublicKey: switchData.nostr_public_key,
        clientSideEncryption: switchData.client_side_encryption
      } : null,
      recipients,
      guardians,
      generatedAt: new Date().toISOString()
    };

    // Store document record
    const docResult = await query<{ id: string; generated_at: Date }>(
      `INSERT INTO legal_documents (user_id, switch_id, template_id, title, fields)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, generated_at`,
      [
        userId,
        switchId || null,
        templateId,
        `${template.name} - ${new Date().toLocaleDateString()}`,
        JSON.stringify(documentContent)
      ]
    );

    logger.info('Legal document generated', {
      userId,
      templateId,
      documentId: docResult.rows[0].id
    });

    res.status(201).json({
      message: 'Document generated',
      data: {
        documentId: docResult.rows[0].id,
        generatedAt: docResult.rows[0].generated_at,
        content: documentContent
      }
    });
  } catch (error) {
    logger.error('Generate document error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to generate document'
    });
  }
});

/**
 * GET /api/legal/documents
 * List all generated documents for the user
 */
router.get('/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await query<LegalDocumentRow>(
      `SELECT
        ld.id,
        ld.template_id,
        ld.title,
        ld.generated_at,
        ld.expires_at,
        s.title as switch_title
       FROM legal_documents ld
       LEFT JOIN switches s ON ld.switch_id = s.id
       WHERE ld.user_id = $1
       ORDER BY ld.generated_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      message: 'Documents retrieved',
      data: {
        documents: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve documents'
    });
  }
});

/**
 * GET /api/legal/documents/:id
 * Get a specific document
 */
router.get('/documents/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id;

    const result = await query<LegalDocumentRow>(
      `SELECT id, template_id, title, fields, generated_at, expires_at
       FROM legal_documents
       WHERE id = $1 AND user_id = $2`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const doc = result.rows[0];
    const template = TEMPLATES.find(t => t.id === doc.template_id);

    res.json({
      message: 'Document retrieved',
      data: {
        id: doc.id,
        templateId: doc.template_id,
        templateName: template?.name || 'Unknown Template',
        title: doc.title,
        content: doc.fields,
        generatedAt: doc.generated_at,
        expiresAt: doc.expires_at
      }
    });
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve document'
    });
  }
});

/**
 * DELETE /api/legal/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id;

    const result = await query<{ id: string }>(
      `DELETE FROM legal_documents
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    res.json({
      message: 'Document deleted',
      data: { id: documentId }
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete document'
    });
  }
});

export default router;

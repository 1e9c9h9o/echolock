'use strict';

/**
 * User Routes
 *
 * Handles user profile operations:
 * - Get current user profile
 * - Update profile/password
 * - Upload avatar
 * - Delete account
 */

import express, { Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { query, transaction } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { isValidPassword } from '../middleware/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

const router = express.Router();

/**
 * Database row types
 */
interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  password_hash: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: Date;
  last_login: Date | null;
}

interface SwitchCountRow {
  count: string;
}

/**
 * Request body types
 */
interface UpdateProfileBody {
  displayName?: string;
  bio?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface DeleteAccountBody {
  password: string;
}

// All user routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user data
    const userResult = await query<UserRow>(
      'SELECT id, email, email_verified, display_name, bio, avatar_url, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = userResult.rows[0];

    // Get switch count
    const switchResult = await query<SwitchCountRow>(
      'SELECT COUNT(*) as count FROM switches WHERE user_id = $1 AND status != $2',
      [userId, 'CANCELLED']
    );

    const switchCount = parseInt(switchResult.rows[0].count) || 0;

    res.json({
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          displayName: user.display_name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          switchCount
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * PATCH /api/users/me
 * Update user profile (display name, bio) or password
 */
router.patch('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { displayName, bio, currentPassword, newPassword } = req.body as UpdateProfileBody;

    // Handle password change if requested
    if (currentPassword && newPassword) {
      // Validate new password
      const passwordCheck = isValidPassword(newPassword);
      if (!passwordCheck.valid) {
        return res.status(400).json({
          error: 'Invalid password',
          message: passwordCheck.message
        });
      }

      // Get current password hash
      const result = await query<UserRow>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        });
      }

      const user = result.rows[0];

      // Verify current password
      const passwordValid = await verifyPassword(currentPassword, user.password_hash);

      if (!passwordValid) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Audit log
      await query(
        `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'PASSWORD_CHANGED', req.ip, req.get('user-agent')]
      );

      logger.info('Password changed', { userId });

      return res.json({
        message: 'Password updated successfully'
      });
    }

    // Handle profile update (displayName, bio)
    if (displayName !== undefined || bio !== undefined) {
      // Validate display name length
      if (displayName && displayName.length > 50) {
        return res.status(400).json({
          error: 'Invalid name',
          message: 'Name must be 50 characters or less'
        });
      }

      // Validate about length
      if (bio && bio.length > 140) {
        return res.status(400).json({
          error: 'Invalid about',
          message: 'About must be 140 characters or less'
        });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: (string | null)[] = [];
      let paramCount = 1;

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramCount++}`);
        values.push(displayName || null);
      }
      if (bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        values.push(bio || null);
      }

      values.push(userId);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      // Audit log
      await query(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'PROFILE_UPDATED', JSON.stringify({ displayName, bio }), req.ip, req.get('user-agent')]
      );

      logger.info('Profile updated', { userId });

      return res.json({
        message: 'Profile updated successfully'
      });
    }

    return res.status(400).json({
      error: 'Missing fields',
      message: 'No fields provided to update'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * POST /api/users/me/avatar
 * Upload user avatar
 */
router.post('/me/avatar', upload.single('avatar'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an image to upload'
      });
    }

    // Process image with sharp - resize and convert to webp
    const filename = `${userId}-${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Generate URL path for the avatar
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Delete old avatar if exists
    const oldResult = await query<{ avatar_url: string | null }>(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (oldResult.rows[0]?.avatar_url) {
      const oldFilename = oldResult.rows[0].avatar_url.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Update user's avatar URL
    await query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, userId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'AVATAR_UPDATED', req.ip, req.get('user-agent')]
    );

    logger.info('Avatar uploaded', { userId, filename });

    res.json({
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  } catch (error) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to upload avatar'
    });
  }
});

/**
 * DELETE /api/users/me/avatar
 * Remove user avatar
 */
router.delete('/me/avatar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get current avatar
    const result = await query<{ avatar_url: string | null }>(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows[0]?.avatar_url) {
      // Delete file
      const filename = result.rows[0].avatar_url.split('/').pop();
      if (filename) {
        const filepath = path.join(uploadsDir, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    // Clear avatar URL
    await query(
      'UPDATE users SET avatar_url = NULL WHERE id = $1',
      [userId]
    );

    logger.info('Avatar removed', { userId });

    res.json({
      message: 'Avatar removed successfully'
    });
  } catch (error) {
    logger.error('Avatar removal error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to remove avatar'
    });
  }
});

/**
 * DELETE /api/users/me
 * Delete user account and all associated data
 */
router.delete('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body as DeleteAccountBody;

    if (!password) {
      return res.status(400).json({
        error: 'Password required',
        message: 'Please provide your password to confirm account deletion'
      });
    }

    // Get user
    const result = await query<UserRow>(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Password is incorrect'
      });
    }

    // Delete user (cascade will delete all related data)
    await transaction(async (client) => {
      // Audit log before deletion
      await client.query(
        `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'ACCOUNT_DELETED', JSON.stringify({ email: user.email }), req.ip, req.get('user-agent')]
      );

      // Delete user (foreign key cascade will delete switches, check-ins, recipients, etc.)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    logger.info('Account deleted', { userId, email: user.email });

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete account'
    });
  }
});

export default router;

'use strict';

/**
 * Input Validation Middleware
 *
 * Validates and sanitizes user input before processing
 * Prevents:
 * - Invalid data types
 * - Missing required fields
 * - Malicious input
 * - Business logic violations
 *
 * Uses a simple validation approach - can be enhanced with Joi or Zod
 */

import type { Request, Response, NextFunction } from 'express';

// Password validation result
export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

// Recipient type
export interface Recipient {
  email: string;
  name?: string;
}

// Create switch request body
export interface CreateSwitchBody {
  title: string;
  message: string;
  checkInHours: number | string;
  password: string;
  recipients?: Recipient[];
}

// Update switch request body
export interface UpdateSwitchBody {
  title?: string;
  status?: 'ARMED' | 'PAUSED' | 'CANCELLED';
}

/**
 * Validate email format
 * Uses a more robust regex that checks for:
 * - Valid local part (allows dots, plus, hyphens, underscores)
 * - Valid domain with at least one dot
 * - TLD of 2-10 characters
 */
export function isValidEmail(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;

  // Max email length per RFC 5321
  if (email.length > 254) return false;

  // More robust email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(email)) return false;

  // Additional checks
  const [localPart, domain] = email.split('@');

  // Local part max 64 characters
  if (localPart.length > 64) return false;

  // Domain must have valid TLD (2-10 chars)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || tld.length > 10) return false;

  return true;
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password: string): PasswordValidationResult {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
}

/**
 * Sanitize string input
 */
export function sanitizeString(str: unknown, maxLength: number = 255): string {
  if (typeof str !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = str.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate signup request
 */
export function validateSignup(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body as { email?: string; password?: string };

  // Check required fields
  if (!email || !password) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
    return;
  }

  // Validate email
  if (!isValidEmail(email)) {
    res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
    return;
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
    return;
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate login request
 */
export function validateLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
    return;
  }

  // Sanitize
  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate email only
 */
export function validateEmail(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({
      error: 'Email required',
      message: 'Please provide an email address'
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
    return;
  }

  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate password only (for reset)
 */
export function validatePassword(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { newPassword } = req.body as { newPassword?: string };

  if (!newPassword) {
    res.status(400).json({
      error: 'Password required',
      message: 'Please provide a new password'
    });
    return;
  }

  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
    return;
  }

  next();
}

/**
 * Validate create switch request
 */
export function validateCreateSwitch(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { title, message, checkInHours, password, recipients } = req.body as CreateSwitchBody;

  // Required fields
  if (!title || !message || !checkInHours || !password) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'Title, message, checkInHours, and password are required'
    });
    return;
  }

  // Validate title
  if (typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({
      error: 'Invalid title',
      message: 'Title must be a non-empty string'
    });
    return;
  }

  if (title.length > 255) {
    res.status(400).json({
      error: 'Invalid title',
      message: 'Title must be less than 255 characters'
    });
    return;
  }

  // Validate message
  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({
      error: 'Invalid message',
      message: 'Message must be a non-empty string'
    });
    return;
  }

  if (message.length > 50000) {
    res.status(400).json({
      error: 'Invalid message',
      message: 'Message must be less than 50,000 characters'
    });
    return;
  }

  // Validate checkInHours
  const hours = parseInt(String(checkInHours));
  if (isNaN(hours) || hours < 1 || hours > 8760) { // 1 hour to 1 year
    res.status(400).json({
      error: 'Invalid check-in interval',
      message: 'Check-in interval must be between 1 hour and 365 days'
    });
    return;
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
    return;
  }

  // Validate recipients (optional)
  if (recipients) {
    if (!Array.isArray(recipients)) {
      res.status(400).json({
        error: 'Invalid recipients',
        message: 'Recipients must be an array'
      });
      return;
    }

    if (recipients.length > 10) {
      res.status(400).json({
        error: 'Too many recipients',
        message: 'Maximum 10 recipients allowed'
      });
      return;
    }

    for (const recipient of recipients) {
      if (!recipient.email || !isValidEmail(recipient.email)) {
        res.status(400).json({
          error: 'Invalid recipient email',
          message: 'All recipients must have valid email addresses'
        });
        return;
      }
    }
  }

  // Sanitize
  req.body.title = sanitizeString(title, 255);
  req.body.checkInHours = hours;

  next();
}

/**
 * Validate update switch request
 */
export function validateUpdateSwitch(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { title, status } = req.body as UpdateSwitchBody;

  if (!title && !status) {
    res.status(400).json({
      error: 'Nothing to update',
      message: 'Provide at least one field to update'
    });
    return;
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid title',
        message: 'Title must be a non-empty string'
      });
      return;
    }

    if (title.length > 255) {
      res.status(400).json({
        error: 'Invalid title',
        message: 'Title must be less than 255 characters'
      });
      return;
    }

    req.body.title = sanitizeString(title, 255);
  }

  if (status !== undefined) {
    const validStatuses = ['ARMED', 'PAUSED', 'CANCELLED'] as const;
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }
  }

  next();
}

export default {
  validateSignup,
  validateLogin,
  validateEmail,
  validatePassword,
  validateCreateSwitch,
  validateUpdateSwitch,
  isValidEmail,
  isValidPassword,
  sanitizeString
};

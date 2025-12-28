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

import { logger } from '../utils/logger.js';

/**
 * Validate email format
 * Uses a more robust regex that checks for:
 * - Valid local part (allows dots, plus, hyphens, underscores)
 * - Valid domain with at least one dot
 * - TLD of 2-10 characters
 */
export function isValidEmail(email) {
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
  if (tld.length < 2 || tld.length > 10) return false;

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
export function isValidPassword(password) {
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
export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') {
    return '';
  }

  // Trim whitespace
  str = str.trim();

  // Limit length
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * Validate signup request
 */
export function validateSignup(req, res, next) {
  const { email, password } = req.body;

  // Check required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
  }

  // Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate login request
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
  }

  // Sanitize
  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate email only
 */
export function validateEmail(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email required',
      message: 'Please provide an email address'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    });
  }

  req.body.email = sanitizeString(email, 255);

  next();
}

/**
 * Validate password only (for reset)
 */
export function validatePassword(req, res, next) {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      error: 'Password required',
      message: 'Please provide a new password'
    });
  }

  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
  }

  next();
}

/**
 * Validate create switch request
 */
export function validateCreateSwitch(req, res, next) {
  const { title, message, checkInHours, password, recipients } = req.body;

  // Required fields
  if (!title || !message || !checkInHours || !password) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Title, message, checkInHours, and password are required'
    });
  }

  // Validate title
  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid title',
      message: 'Title must be a non-empty string'
    });
  }

  if (title.length > 255) {
    return res.status(400).json({
      error: 'Invalid title',
      message: 'Title must be less than 255 characters'
    });
  }

  // Validate message
  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid message',
      message: 'Message must be a non-empty string'
    });
  }

  if (message.length > 50000) {
    return res.status(400).json({
      error: 'Invalid message',
      message: 'Message must be less than 50,000 characters'
    });
  }

  // Validate checkInHours
  const hours = parseInt(checkInHours);
  if (isNaN(hours) || hours < 1 || hours > 8760) { // 1 hour to 1 year
    return res.status(400).json({
      error: 'Invalid check-in interval',
      message: 'Check-in interval must be between 1 hour and 365 days'
    });
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({
      error: 'Invalid password',
      message: passwordCheck.message
    });
  }

  // Validate recipients (optional)
  if (recipients) {
    if (!Array.isArray(recipients)) {
      return res.status(400).json({
        error: 'Invalid recipients',
        message: 'Recipients must be an array'
      });
    }

    if (recipients.length > 10) {
      return res.status(400).json({
        error: 'Too many recipients',
        message: 'Maximum 10 recipients allowed'
      });
    }

    for (const recipient of recipients) {
      if (!recipient.email || !isValidEmail(recipient.email)) {
        return res.status(400).json({
          error: 'Invalid recipient email',
          message: 'All recipients must have valid email addresses'
        });
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
export function validateUpdateSwitch(req, res, next) {
  const { title, status } = req.body;

  if (!title && !status) {
    return res.status(400).json({
      error: 'Nothing to update',
      message: 'Provide at least one field to update'
    });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid title',
        message: 'Title must be a non-empty string'
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        error: 'Invalid title',
        message: 'Title must be less than 255 characters'
      });
    }

    req.body.title = sanitizeString(title, 255);
  }

  if (status !== undefined) {
    const validStatuses = ['ARMED', 'PAUSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
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

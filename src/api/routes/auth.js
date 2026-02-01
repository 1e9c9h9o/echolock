'use strict';

/**
 * Authentication Routes
 *
 * Handles:
 * - User signup with email verification
 * - Login with JWT tokens
 * - Token refresh
 * - Email verification
 * - Password reset flow
 *
 * Security:
 * - Rate limited (5 attempts per 15 min)
 * - Password strength requirements
 * - Email verification required
 * - Secure token generation
 */

import express from 'express';
import { query, transaction } from '../db/connection.js';
import { hashPassword, verifyPassword, generateToken, decryptWithServiceKey } from '../utils/crypto.js';
import {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  verifyToken
} from '../middleware/auth.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { validateSignup, validateLogin, validateEmail, validatePassword } from '../middleware/validate.js';
import { isTestAccount, generateChallengeToken, verifyChallengeToken } from '../utils/authHelpers.js';
import { verifyTOTP, verifyBackupCode } from '../utils/totp.js';

const router = express.Router();

// Cookie configuration helper
const getCookieConfig = (maxAge) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., '.echolock.xyz' for subdomain sharing

  const config = {
    httpOnly: true,
    secure: true, // Required for sameSite: 'none', works on localhost in modern browsers
    sameSite: 'none', // Required for cross-origin cookie sending
    maxAge,
    path: '/'
  };

  // Add domain for subdomain cookie sharing in production
  if (cookieDomain) {
    config.domain = cookieDomain;
  }

  return config;
};

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateToken();

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, verification_token)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash, verificationToken]
    );

    const user = result.rows[0];

    // Send verification email
    let emailSent = false;
    let emailError = null;
    try {
      await sendVerificationEmail(email, verificationToken);
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      logger.error('Failed to send verification email:', err);
      // Continue with signup but inform the user
    }

    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'SIGNUP',
        JSON.stringify({ email: user.email }),
        req.ip,
        req.get('user-agent')
      ]
    );

    logger.info('User signed up', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Account created successfully',
      data: {
        userId: user.id,
        email: user.email,
        emailVerificationRequired: true,
        emailSent,
        ...(emailError && { emailError: 'Verification email could not be sent. Please request a new one.' })
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      error: 'Signup failed',
      message: 'An error occurred during signup'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', {
        email,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', {
        userId: user.id,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user has 2FA enabled (skip for test accounts in non-production)
    if (!isTestAccount(email)) {
      const twoFactorResult = await query(
        'SELECT enabled FROM two_factor_auth WHERE user_id = $1',
        [user.id]
      );

      if (twoFactorResult.rows.length > 0 && twoFactorResult.rows[0].enabled) {
        // 2FA is required - return challenge token instead of completing login
        const challengeToken = generateChallengeToken(user.id, user.email);

        logger.info('2FA challenge issued', { userId: user.id, email: user.email });

        return res.json({
          message: '2FA required',
          data: {
            requiresTwoFactor: true,
            challengeToken,
            user: {
              id: user.id,
              email: user.email
            }
          }
        });
      }
    }

    // No 2FA required - complete login
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'LOGIN', req.ip, req.get('user-agent')]
    );

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Set httpOnly cookies for tokens
    res.cookie('accessToken', accessToken, getCookieConfig(15 * 60 * 1000)); // 15 minutes
    res.cookie('refreshToken', refreshToken, getCookieConfig(7 * 24 * 60 * 60 * 1000)); // 7 days

    res.json({
      message: 'Login successful',
      data: {
        // Also return tokens in body for backwards compatibility with mobile/API clients
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Complete login after 2FA verification
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { challengeToken, code } = req.body;

    if (!challengeToken || !code) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Challenge token and verification code are required'
      });
    }

    // Verify challenge token
    const tokenResult = verifyChallengeToken(challengeToken);
    if (!tokenResult.valid) {
      logSecurityEvent('2FA_CHALLENGE_INVALID', {
        error: tokenResult.error,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'Invalid challenge',
        message: tokenResult.error || 'Challenge token is invalid or expired'
      });
    }

    const userId = tokenResult.userId;

    // Get user and 2FA info
    const result = await query(
      `SELECT u.id, u.email, u.email_verified,
              t.totp_secret, t.backup_codes, t.backup_codes_used_count
       FROM users u
       JOIN two_factor_auth t ON t.user_id = u.id
       WHERE u.id = $1 AND t.enabled = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid request',
        message: '2FA is not enabled for this account'
      });
    }

    const user = result.rows[0];

    // Decrypt TOTP secret
    const secret = decryptWithServiceKey(user.totp_secret);

    // Try TOTP first
    let isValid = verifyTOTP(secret, code);
    let usedBackupCode = false;
    let backupCodeIndex = -1;

    // If TOTP failed, try backup code
    if (!isValid && user.backup_codes) {
      const backupCodes = typeof user.backup_codes === 'string'
        ? JSON.parse(user.backup_codes)
        : user.backup_codes;

      const backupResult = verifyBackupCode(code, backupCodes);
      if (backupResult.valid) {
        isValid = true;
        usedBackupCode = true;
        backupCodeIndex = backupResult.index;
      }
    }

    if (!isValid) {
      logSecurityEvent('2FA_VERIFICATION_FAILED', {
        userId,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'Invalid code',
        message: 'The verification code is incorrect'
      });
    }

    // If backup code was used, mark it as used
    if (usedBackupCode && backupCodeIndex >= 0) {
      const backupCodes = typeof user.backup_codes === 'string'
        ? JSON.parse(user.backup_codes)
        : user.backup_codes;

      backupCodes[backupCodeIndex].used = true;

      await query(
        `UPDATE two_factor_auth
         SET backup_codes = $2, backup_codes_used_count = backup_codes_used_count + 1,
             last_used = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId, JSON.stringify(backupCodes)]
      );
    } else {
      // Update last used timestamp
      await query(
        'UPDATE two_factor_auth SET last_used = NOW(), updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }

    // Generate tokens - login complete
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );

    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'LOGIN_2FA', JSON.stringify({ usedBackupCode }), req.ip, req.get('user-agent')]
    );

    logger.info('User logged in with 2FA', { userId, email: user.email, usedBackupCode });

    // Set httpOnly cookies for tokens
    res.cookie('accessToken', accessToken, getCookieConfig(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieConfig(7 * 24 * 60 * 60 * 1000));

    res.json({
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified
        },
        usedBackupCode
      }
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({
      error: '2FA verification failed',
      message: 'An error occurred during verification'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie first, then fall back to body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Expected refresh token'
      });
    }

    // Fetch user
    const result = await query(
      'SELECT id, email, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Invalid refresh token'
      });
    }

    const user = result.rows[0];

    // Generate new access token
    const accessToken = generateAccessToken(user);

    // Token rotation: generate new refresh token for enhanced security
    const newRefreshToken = generateRefreshToken(user);

    // Set httpOnly cookies for both tokens
    res.cookie('accessToken', accessToken, getCookieConfig(15 * 60 * 1000)); // 15 minutes
    res.cookie('refreshToken', newRefreshToken, getCookieConfig(7 * 24 * 60 * 60 * 1000)); // 7 days

    // Log token rotation for security auditing
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'TOKEN_REFRESHED', req.ip, req.get('user-agent')]
    );

    res.json({
      message: 'Token refreshed',
      data: {
        accessToken, // For backwards compatibility
        refreshToken: newRefreshToken // For backwards compatibility
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing token'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Please provide a verification token'
      });
    }

    // Find user with this token
    const result = await query(
      'SELECT id, email FROM users WHERE verification_token = $1 AND email_verified = FALSE',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Verification token is invalid or already used'
      });
    }

    const user = result.rows[0];

    // Mark email as verified
    await query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1',
      [user.id]
    );

    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'EMAIL_VERIFIED', req.ip, req.get('user-agent')]
    );

    logger.info('Email verified', { userId: user.id, email: user.email });

    res.json({
      message: 'Email verified successfully',
      data: {
        email: user.email,
        verified: true
      }
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during verification'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */
router.post('/resend-verification', validateEmail, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user (always return success to prevent email enumeration)
    const result = await query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Only resend if not already verified
      if (!user.email_verified) {
        // Generate new verification token
        const verificationToken = generateToken();

        // Update token in database
        await query(
          'UPDATE users SET verification_token = $1 WHERE id = $2',
          [verificationToken, user.id]
        );

        // Send verification email
        let emailResult = null;
        let emailError = null;
        try {
          emailResult = await sendVerificationEmail(email, verificationToken);
          logger.info('Verification email sent', { userId: user.id, result: emailResult });
        } catch (err) {
          emailError = err.message;
          logger.error('Failed to send verification email:', err);
        }

        // Log event
        await query(
          `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
           VALUES ($1, $2, $3, $4)`,
          [user.id, 'VERIFICATION_EMAIL_RESENT', req.ip, req.get('user-agent')]
        );

        logger.info('Verification email resent', { userId: user.id });

        // Return detailed response
        return res.json({
          message: emailError
            ? 'Email service error - please try again later'
            : 'Verification email sent',
          sent: !emailError,
          ...(emailError && process.env.NODE_ENV !== 'production' && { error: emailError })
        });
      } else {
        return res.json({
          message: 'Email is already verified',
          sent: false
        });
      }
    }

    // User not found - still return generic success to prevent enumeration
    res.json({
      message: 'If an unverified account exists with that email, a verification link has been sent',
      sent: true
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred processing your request'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', validateEmail, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user (always return success to prevent email enumeration)
    const result = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Generate reset token
      const resetToken = generateToken();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      await query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [resetToken, expiresAt, user.id]
      );

      // Send reset email
      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        logger.error('Failed to send reset email:', emailError);
      }

      // Log event
      await query(
        `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
         VALUES ($1, $2, $3, $4)`,
        [user.id, 'PASSWORD_RESET_REQUESTED', req.ip, req.get('user-agent')]
      );

      logger.info('Password reset requested', { userId: user.id });
    }

    // Always return success (prevent email enumeration)
    res.json({
      message: 'If an account exists with that email, a password reset link has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred processing your request'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', validatePassword, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Please provide a reset token'
      });
    }

    // Find user with valid token
    const result = await query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Reset token is invalid or expired'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'PASSWORD_RESET_COMPLETED', req.ip, req.get('user-agent')]
    );

    logger.info('Password reset completed', { userId: user.id });

    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred resetting your password'
    });
  }
});

/**
 * GET /api/auth/ws-ticket
 * Get a short-lived ticket for WebSocket authentication
 * This allows WebSocket connections when using httpOnly cookies
 */
router.get('/ws-ticket', authenticateToken, async (req, res) => {
  try {
    // Generate a short-lived ticket (30 seconds)
    const ticket = generateToken(32);
    const expiresAt = Date.now() + 30000; // 30 seconds

    // Store ticket in memory (in production, use Redis)
    if (!global.wsTickets) {
      global.wsTickets = new Map();
    }
    global.wsTickets.set(ticket, {
      userId: req.user.id,
      email: req.user.email,
      expiresAt
    });

    // Clean up expired tickets periodically
    setTimeout(() => {
      global.wsTickets.delete(ticket);
    }, 35000);

    res.json({ ticket });
  } catch (error) {
    logger.error('WebSocket ticket error:', error);
    res.status(500).json({
      error: 'Failed to generate ticket',
      message: 'An error occurred'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (clears httpOnly cookies)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log event
    await query(
      `INSERT INTO audit_log (user_id, event_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'LOGOUT', req.ip, req.get('user-agent')]
    );

    logger.info('User logged out', { userId: req.user.id });

    // Clear httpOnly cookies (must match how they were set)
    const cookieDomain = process.env.COOKIE_DOMAIN;
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    };

    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
    }

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('csrf-token', { ...cookieOptions, httpOnly: false });

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

export default router;

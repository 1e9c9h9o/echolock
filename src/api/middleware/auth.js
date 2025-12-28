'use strict';

/**
 * Authentication Middleware
 *
 * Provides JWT-based authentication for API endpoints
 *
 * Usage:
 * - authenticateToken: Verify JWT token, attach user to req.user
 * - optionalAuth: Same as above but doesn't fail if no token
 * - requireEmailVerified: Require user email to be verified
 *
 * Best Practices:
 * - Short-lived access tokens (15 minutes)
 * - Refresh tokens for long-term sessions
 * - Store tokens in httpOnly cookies (prevents XSS)
 * - Include token expiration and user ID in payload
 */

import jwt from 'jsonwebtoken';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { query } from '../db/connection.js';

import crypto from 'crypto';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes default

// Strict validation in production - fail fast
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  console.error('Please set JWT_SECRET to a secure random string of at least 32 characters');
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Generate a random secret for development (tokens won't persist across restarts)
const DEV_SECRET = crypto.randomBytes(32).toString('hex');
const SECRET = JWT_SECRET || DEV_SECRET;

if (!JWT_SECRET) {
  logger.warn('JWT_SECRET not set - using randomly generated secret');
  logger.warn('Tokens will not persist across server restarts!');
  logger.warn('Set JWT_SECRET environment variable for production use');
}

/**
 * Generate a JWT access token
 *
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'access'
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'echolock-api',
    audience: 'echolock-client'
  });
}

/**
 * Generate a JWT refresh token (long-lived)
 *
 * @param {Object} user - User object with id and email
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'refresh'
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: '7d', // 7 days
    issuer: 'echolock-api',
    audience: 'echolock-client'
  });
}

/**
 * Verify and decode a JWT token
 *
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  return jwt.verify(token, SECRET, {
    issuer: 'echolock-api',
    audience: 'echolock-client'
  });
}

/**
 * Authentication middleware
 * Extracts JWT from Authorization header or httpOnly cookie and verifies it
 * Attaches user object to req.user
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export async function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header first, then fall back to cookie
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If no Authorization header, try httpOnly cookie
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        logSecurityEvent('INVALID_TOKEN', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          error: error.message
        });

        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token verification failed'
        });
      }

      throw error;
    }

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Expected access token'
      });
    }

    // Fetch user from database
    const result = await query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      logSecurityEvent('USER_NOT_FOUND', {
        userId: decoded.userId,
        ip: req.ip
      });

      return res.status(401).json({
        error: 'User not found',
        message: 'Invalid token'
      });
    }

    // Attach user to request
    req.user = result.rows[0];
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // If no Authorization header, try httpOnly cookie
  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.type === 'access') {
      const result = await query(
        'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.token = token;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error.message);
  }

  next();
}

/**
 * Require email verification middleware
 * Must be used after authenticateToken
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated'
    });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Email not verified',
      message: 'Please verify your email address to continue'
    });
  }

  next();
}

/**
 * Rate limiting helper - check if user has exceeded rate limit
 * Simple in-memory implementation - use Redis for production
 *
 * @param {string} userId - User ID
 * @param {string} action - Action type (e.g., 'create_switch')
 * @param {number} limit - Maximum actions allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if rate limit exceeded
 */
const rateLimitStore = new Map();

export function checkRateLimit(userId, action, limit, windowMs) {
  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [now]);
    return false;
  }

  const timestamps = rateLimitStore.get(key);

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    return true; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);

  return false;
}

/**
 * Clean up rate limit store periodically
 * Store interval ID for cleanup on shutdown
 */
let rateLimitCleanupInterval = null;

export function startRateLimitCleanup() {
  if (rateLimitCleanupInterval) return; // Already running

  rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      const validTimestamps = timestamps.filter(ts => now - ts < 3600000);
      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, validTimestamps);
      }
    }
  }, 600000); // Clean up every 10 minutes
}

export function stopRateLimitCleanup() {
  if (rateLimitCleanupInterval) {
    clearInterval(rateLimitCleanupInterval);
    rateLimitCleanupInterval = null;
  }
  rateLimitStore.clear();
}

// Start cleanup on module load
startRateLimitCleanup();

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  requireEmailVerified,
  checkRateLimit,
  startRateLimitCleanup,
  stopRateLimitCleanup
};

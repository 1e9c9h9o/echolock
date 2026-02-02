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

import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { query } from '../db/connection.js';
import crypto from 'crypto';

// JWT payload types
export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

// User type from database
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
}

// Extended request with user (using intersection type to avoid cookies conflict)
export type AuthenticatedRequest = Request & {
  user?: User;
  token?: string;
};

// User input for token generation
export interface UserInput {
  id: string;
  email: string;
}

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
// expiresIn accepts string like '15m', '7d', etc.
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes default

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
 */
export function generateAccessToken(user: UserInput): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    type: 'access'
  };

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'echolock-api',
    audience: 'echolock-client'
  };

  return jwt.sign(payload, SECRET, options);
}

/**
 * Generate a JWT refresh token (long-lived)
 */
export function generateRefreshToken(user: UserInput): string {
  const payload: JwtPayload = {
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
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET, {
    issuer: 'echolock-api',
    audience: 'echolock-client'
  }) as JwtPayload;
}

/**
 * Authentication middleware
 * Extracts JWT from Authorization header or httpOnly cookie and verifies it
 * Attaches user object to req.user
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header first, then fall back to cookie
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If no Authorization header, try httpOnly cookie
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
      return;
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      const jwtError = error as Error & { name: string };
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token'
        });
        return;
      }

      if (jwtError.name === 'JsonWebTokenError') {
        logSecurityEvent('INVALID_TOKEN', {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          error: jwtError.message
        });

        res.status(401).json({
          error: 'Invalid token',
          message: 'Token verification failed'
        });
        return;
      }

      throw error;
    }

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      res.status(401).json({
        error: 'Invalid token type',
        message: 'Expected access token'
      });
      return;
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

      res.status(401).json({
        error: 'User not found',
        message: 'Invalid token'
      });
      return;
    }

    // Attach user to request
    req.user = result.rows[0] as User;
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // If no Authorization header, try httpOnly cookie
  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.type === 'access') {
      const result = await query(
        'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0] as User;
        req.token = token;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    const err = error as Error;
    logger.debug('Optional auth failed:', err.message);
  }

  next();
}

/**
 * Require email verification middleware
 * Must be used after authenticateToken
 */
export function requireEmailVerified(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated'
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({
      error: 'Email not verified',
      message: 'Please verify your email address to continue'
    });
    return;
  }

  next();
}

/**
 * Rate limiting helper - check if user has exceeded rate limit
 * Simple in-memory implementation - use Redis for production
 */
const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [now]);
    return false;
  }

  const timestamps = rateLimitStore.get(key)!;

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
let rateLimitCleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startRateLimitCleanup(): void {
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

export function stopRateLimitCleanup(): void {
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

'use strict';

/**
 * Authentication Helper Utilities
 *
 * Provides helper functions for authentication including:
 * - Test account detection for development/testing
 * - Challenge token generation for 2FA flow
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from './logger.js';

/**
 * Challenge token payload
 */
interface ChallengeTokenPayload {
  userId: string;
  type: string;
  iat: number;
}

/**
 * Challenge token verification result
 */
export interface ChallengeTokenResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Test account email patterns that bypass 2FA
 *
 * These patterns are ONLY active in non-production environments.
 * In production, isTestAccount() always returns false.
 *
 * Patterns:
 * - test+anything@echolock.xyz
 * - dev+anything@echolock.xyz
 * - e2e+anything@echolock.xyz
 * - qa+anything@localhost
 */
const TEST_ACCOUNT_PATTERNS: RegExp[] = [
  /^test\+.*@echolock\.xyz$/i,     // test+anything@echolock.xyz
  /^dev\+.*@echolock\.xyz$/i,      // dev+anything@echolock.xyz
  /^e2e\+.*@echolock\.xyz$/i,      // e2e+anything@echolock.xyz
  /^qa\+.*@localhost$/i,           // qa+anything@localhost (local testing)
];

/**
 * Check if an email is a test account that should bypass 2FA
 */
export function isTestAccount(email: string | null | undefined): boolean {
  // NEVER allow test account bypass in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (!email || typeof email !== 'string') {
    return false;
  }

  const isTest = TEST_ACCOUNT_PATTERNS.some(pattern => pattern.test(email));

  if (isTest) {
    logger.info('[TEST ACCOUNT] 2FA bypass for test account', {
      email,
      environment: process.env.NODE_ENV,
    });
  }

  return isTest;
}

/**
 * Challenge token configuration
 * Used for the intermediate step between password verification and 2FA verification
 */
const CHALLENGE_TOKEN_CONFIG = {
  expiresIn: '5m', // 5 minutes to complete 2FA
  issuer: 'echolock-api',
  audience: 'echolock-2fa-challenge',
};

/**
 * Generate a challenge token for 2FA verification
 *
 * This token is issued after successful password verification
 * and must be presented with the TOTP code to complete login.
 */
export function generateChallengeToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = {
    userId,
    type: '2fa-challenge',
    // Include timestamp to ensure uniqueness
    iat: Math.floor(Date.now() / 1000),
  };

  const options: SignOptions = {
    expiresIn: CHALLENGE_TOKEN_CONFIG.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: CHALLENGE_TOKEN_CONFIG.issuer,
    audience: CHALLENGE_TOKEN_CONFIG.audience,
  };

  const token = jwt.sign(payload, secret, options);

  logger.debug('Generated 2FA challenge token', { userId, email });

  return token;
}

/**
 * Verify a challenge token
 */
export function verifyChallengeToken(token: string | null | undefined): ChallengeTokenResult {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return { valid: false, error: 'JWT_SECRET not configured' };
  }

  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid token format' };
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: CHALLENGE_TOKEN_CONFIG.issuer,
      audience: CHALLENGE_TOKEN_CONFIG.audience,
    }) as ChallengeTokenPayload;

    // Verify this is a challenge token
    if (decoded.type !== '2fa-challenge') {
      return { valid: false, error: 'Invalid token type' };
    }

    return {
      valid: true,
      userId: decoded.userId,
    };
  } catch (err) {
    const error = err as Error & { name: string };
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Challenge token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid challenge token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

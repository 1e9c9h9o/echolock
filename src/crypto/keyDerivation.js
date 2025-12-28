'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
//
// Key derivation functions for password-based keys
// PBKDF2 for password-based keys with high iteration count
//
// CRITICAL: Protects against brute-force attacks on passwords
// Uses cryptographically secure parameters

import crypto from 'crypto';

const ALGORITHM = 'sha256';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32; // 256 bits

// CRITICAL: PBKDF2 iteration count - OWASP 2023 recommendation
// This MUST be used consistently across all password-based key derivation
// Using fewer iterations weakens brute-force resistance
export const PBKDF2_ITERATIONS = 600000;

/**
 * Derive a cryptographic key from a password using PBKDF2
 * @param {string} password - User password
 * @param {Buffer} [salt] - Optional salt (generated if not provided)
 * @returns {Object} { key, salt }
 */
export function deriveKey(password, salt = null) {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  // Generate new salt if not provided
  if (!salt) {
    salt = crypto.randomBytes(SALT_LENGTH);
  }

  const key = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    ALGORITHM
  );

  return { key, salt };
}

/**
 * Verify a password against a derived key
 * @param {string} password - Password to verify
 * @param {Buffer} salt - Salt used in original derivation
 * @param {Buffer} expectedKey - Expected derived key
 * @returns {boolean} True if password is correct
 */
export function verifyPassword(password, salt, expectedKey) {
  const { key } = deriveKey(password, salt);
  const result = crypto.timingSafeEqual(key, expectedKey);
  // Zeroize derived key after comparison
  zeroize(key);
  return result;
}

/**
 * Securely zeroize a buffer to prevent key material from remaining in memory
 * CRITICAL: Call this after using any cryptographic key material
 *
 * @param {Buffer|Uint8Array} buffer - Buffer containing sensitive data
 */
export function zeroize(buffer) {
  if (!buffer) return;

  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  } else if (buffer instanceof Uint8Array) {
    buffer.fill(0);
  } else if (typeof buffer === 'string') {
    // Strings are immutable in JS - cannot be zeroized
    // Log warning in development only
    if (process.env.NODE_ENV !== 'production') {
      console.warn('WARNING: Cannot zeroize string - use Buffer for sensitive data');
    }
  }
}

/**
 * Execute a function with automatic key zeroization
 * Ensures key material is always cleaned up, even if an error occurs
 *
 * @param {Buffer} key - Key to use and then zeroize
 * @param {Function} fn - Function that uses the key
 * @returns {*} Result of the function
 */
export function withSecureKey(key, fn) {
  try {
    return fn(key);
  } finally {
    zeroize(key);
  }
}
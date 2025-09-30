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
const ITERATIONS = 600000; // OWASP recommendation for PBKDF2-SHA256 (2023)
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32; // 256 bits

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
    ITERATIONS,
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
  return crypto.timingSafeEqual(key, expectedKey);
}
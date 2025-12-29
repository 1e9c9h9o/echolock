'use strict';

/**
 * Cryptographic Utilities for API
 *
 * Provides helper functions for:
 * - Password hashing (bcrypt)
 * - Service-level encryption (for storing sensitive data in DB)
 * - Per-user key derivation (key isolation)
 * - Token generation
 *
 * SECURITY NOTES:
 * - Service master key must be securely stored (environment variable)
 * - Never log or expose the master key
 * - Per-user keys provide isolation: compromise of one user doesn't affect others
 * - Key versioning enables rotation without data loss
 *
 * KEY HIERARCHY:
 *   SERVICE_MASTER_KEY (env var - 256-bit)
 *     └─> HKDF(userId, version) → UserMasterKey (unique per user)
 *         └─> encrypts: nostr_private_key, auth_key, etc.
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from './logger.js';
import { PBKDF2_ITERATIONS } from '../../crypto/keyDerivation.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const HKDF_HASH = 'sha256';
const HKDF_KEY_LENGTH = 32;

// Domain separation constants - NEVER change after deployment
const DOMAIN_USER_KEY = 'ECHOLOCK-USER-KEY-v1';
const DOMAIN_SWITCH_DATA = 'ECHOLOCK-SWITCH-DATA-v1';

// Service master key for encrypting sensitive data in database
// CRITICAL: This must be set as environment variable and NEVER committed to git
const SERVICE_MASTER_KEY = process.env.SERVICE_MASTER_KEY;
const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = NODE_ENV === 'production';

// SECURITY: Do not log key-related information in production
// Only log presence/absence for startup diagnostics
if (IS_PRODUCTION && !SERVICE_MASTER_KEY) {
  console.error('FATAL: SERVICE_MASTER_KEY not set in production');
}

if (!SERVICE_MASTER_KEY && IS_PRODUCTION) {
  console.error('FATAL: SERVICE_MASTER_KEY environment variable is required in production');
  console.error('Available environment variables:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));
  throw new Error('SERVICE_MASTER_KEY environment variable is required in production');
}

// Default key for development (DO NOT USE IN PRODUCTION)
const MASTER_KEY = SERVICE_MASTER_KEY
  ? Buffer.from(SERVICE_MASTER_KEY, 'hex')
  : crypto.randomBytes(32);

if (!SERVICE_MASTER_KEY) {
  logger.warn('Using generated master key - data will not persist across restarts!');
  logger.warn('Set SERVICE_MASTER_KEY environment variable for production');
}

// ============================================================================
// HKDF IMPLEMENTATION (RFC 5869)
// ============================================================================

/**
 * HKDF-Extract: Extract a pseudorandom key from input keying material
 * @param {Buffer} salt - Optional salt (if null, uses zero-filled buffer)
 * @param {Buffer} ikm - Input keying material
 * @returns {Buffer} Pseudorandom key (PRK)
 */
function hkdfExtract(salt, ikm) {
  const actualSalt = salt || Buffer.alloc(32, 0);
  return crypto.createHmac(HKDF_HASH, actualSalt)
    .update(ikm)
    .digest();
}

/**
 * HKDF-Expand: Expand PRK to desired length with context info
 * @param {Buffer} prk - Pseudorandom key from HKDF-Extract
 * @param {Buffer|string} info - Context and application-specific info
 * @param {number} length - Desired output length (default: 32)
 * @returns {Buffer} Output keying material
 */
function hkdfExpand(prk, info, length = HKDF_KEY_LENGTH) {
  const infoBuffer = Buffer.isBuffer(info) ? info : Buffer.from(info);
  const hashLen = 32; // SHA-256 output length
  const n = Math.ceil(length / hashLen);

  if (n > 255) {
    throw new Error('HKDF output length too large');
  }

  let okm = Buffer.alloc(0);
  let t = Buffer.alloc(0);

  for (let i = 1; i <= n; i++) {
    const hmac = crypto.createHmac(HKDF_HASH, prk);
    hmac.update(t);
    hmac.update(infoBuffer);
    hmac.update(Buffer.from([i]));
    t = hmac.digest();
    okm = Buffer.concat([okm, t]);
  }

  return okm.slice(0, length);
}

/**
 * Full HKDF: Extract-then-Expand
 * @param {Buffer} ikm - Input keying material
 * @param {Buffer|string} info - Context info
 * @param {Buffer} [salt] - Optional salt
 * @param {number} [length] - Output length (default: 32)
 * @returns {Buffer} Derived key
 */
function hkdf(ikm, info, salt = null, length = HKDF_KEY_LENGTH) {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// ============================================================================
// PER-USER KEY DERIVATION
// ============================================================================

/**
 * Derive a user-specific encryption key from the service master key
 *
 * SECURITY: This provides key isolation per user:
 * - Compromise of one user's derived key doesn't expose SERVICE_MASTER_KEY
 * - Compromise of SERVICE_MASTER_KEY affects all users (still requires DB access)
 * - Each user has a cryptographically independent key
 *
 * @param {string} userId - User UUID (must be valid UUID format)
 * @param {number} [keyVersion=1] - Key version for rotation support
 * @returns {Buffer} 32-byte user-specific encryption key
 */
export function deriveUserKey(userId, keyVersion = 1) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }

  // Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error('userId must be a valid UUID');
  }

  if (typeof keyVersion !== 'number' || keyVersion < 1 || keyVersion > 255) {
    throw new Error('keyVersion must be an integer between 1 and 255');
  }

  // Create context string with version for domain separation
  const context = `${DOMAIN_USER_KEY}:${userId}:v${keyVersion}`;

  return hkdf(MASTER_KEY, context);
}

/**
 * Derive a switch-specific key from user key
 * Provides additional isolation: each switch has its own derived key
 *
 * @param {Buffer} userKey - User-specific key from deriveUserKey
 * @param {string} switchId - Switch UUID
 * @returns {Buffer} 32-byte switch-specific key
 */
export function deriveSwitchKey(userKey, switchId) {
  if (!userKey || userKey.length !== 32) {
    throw new Error('userKey must be a 32-byte Buffer');
  }

  if (!switchId || typeof switchId !== 'string') {
    throw new Error('switchId must be a non-empty string');
  }

  const context = `${DOMAIN_SWITCH_DATA}:${switchId}`;
  return hkdf(userKey, context);
}

/**
 * Encrypt data using a user-specific derived key
 * Use this instead of encryptWithServiceKey for per-user isolation
 *
 * @param {Buffer|string} data - Data to encrypt
 * @param {string} userId - User UUID for key derivation
 * @param {number} [keyVersion=1] - Key version (store this with ciphertext)
 * @returns {Object} { ciphertext, iv, authTag, keyVersion } all as base64 strings
 */
export function encryptForUser(data, userId, keyVersion = 1) {
  // Derive user-specific key
  const userKey = deriveUserKey(userId, keyVersion);

  try {
    // Generate random IV (never reuse!)
    const iv = crypto.randomBytes(12);

    // Create cipher with user-specific key
    const cipher = crypto.createCipheriv('aes-256-gcm', userKey, iv);

    // Convert data to buffer if string
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    // Encrypt
    const ciphertext = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion
    };
  } finally {
    // Zeroize derived key after use
    userKey.fill(0);
  }
}

/**
 * Decrypt data that was encrypted with a user-specific key
 *
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} iv - Base64 encoded IV
 * @param {string} authTag - Base64 encoded auth tag
 * @param {string} userId - User UUID for key derivation
 * @param {number} [keyVersion=1] - Key version used during encryption
 * @returns {Buffer} Decrypted data
 */
export function decryptForUser(ciphertext, iv, authTag, userId, keyVersion = 1) {
  // Derive user-specific key
  const userKey = deriveUserKey(userId, keyVersion);

  try {
    // Create decipher with user-specific key
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      userKey,
      Buffer.from(iv, 'base64')
    );

    // Set authentication tag
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final()
    ]);

    return decrypted;
  } finally {
    // Zeroize derived key after use
    userKey.fill(0);
  }
}

/**
 * Hash a password using bcrypt
 * Bcrypt is slow by design to prevent brute force attacks
 *
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(password) {
  const saltRounds = 12; // Higher = more secure but slower
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a bcrypt hash
 *
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Encrypt data using AES-256-GCM with service master key
 * Used for storing sensitive data in database (Nostr keys, HMAC keys, etc.)
 *
 * @param {Buffer|string} data - Data to encrypt
 * @returns {Object} { ciphertext, iv, authTag } all as base64 strings
 */
export function encryptWithServiceKey(data) {
  // Generate random IV (never reuse!)
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);

  // Convert data to buffer if string
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

  // Encrypt
  const ciphertext = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt data encrypted with service master key
 *
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} iv - Base64 encoded IV
 * @param {string} authTag - Base64 encoded auth tag
 * @returns {Buffer} Decrypted data
 */
export function decryptWithServiceKey(ciphertext, iv, authTag) {
  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    MASTER_KEY,
    Buffer.from(iv, 'base64')
  );

  // Set authentication tag
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final()
  ]);

  return decrypted;
}

/**
 * Generate a secure random token
 * Used for email verification, password reset, etc.
 *
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a cryptographically secure random string
 * Useful for API keys, session IDs, etc.
 *
 * @param {number} length - String length (default: 32)
 * @returns {string} URL-safe base64 string
 */
export function generateSecureString(length = 32) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a token for storage
 * Store hashed version in database, compare with user-provided token
 *
 * @param {string} token - Token to hash
 * @returns {string} SHA-256 hash (hex)
 */
export function hashToken(token) {
  return crypto.createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks when comparing secrets
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if equal
 */
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a master key from a passphrase (for initial setup)
 * DO NOT USE THIS IN PRODUCTION - use proper key management
 *
 * @param {string} passphrase - Passphrase
 * @param {string} salt - Salt (hex)
 * @returns {string} 32-byte key (hex)
 */
export function generateMasterKeyFromPassphrase(passphrase, salt = null) {
  const keySalt = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(passphrase, keySalt, PBKDF2_ITERATIONS, 32, 'sha256');

  return {
    key: key.toString('hex'),
    salt: keySalt.toString('hex')
  };
}

export default {
  hashPassword,
  verifyPassword,
  encryptWithServiceKey,
  decryptWithServiceKey,
  encryptForUser,
  decryptForUser,
  deriveUserKey,
  deriveSwitchKey,
  generateToken,
  generateSecureString,
  hashToken,
  timingSafeEqual,
  generateMasterKeyFromPassphrase
};

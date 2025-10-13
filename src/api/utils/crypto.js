'use strict';

/**
 * Cryptographic Utilities for API
 *
 * Provides helper functions for:
 * - Password hashing (bcrypt)
 * - Service-level encryption (for storing sensitive data in DB)
 * - Token generation
 *
 * SECURITY NOTES:
 * - Service master key must be securely stored (environment variable)
 * - Never log or expose the master key
 * - Rotate master key requires re-encrypting all data
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from './logger.js';

// Service master key for encrypting sensitive data in database
// CRITICAL: This must be set as environment variable and NEVER committed to git
const SERVICE_MASTER_KEY = process.env.SERVICE_MASTER_KEY;
const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = NODE_ENV === 'production';

// Log environment for debugging Railway deployment
if (IS_PRODUCTION) {
  console.log('Environment check:', {
    NODE_ENV,
    HAS_SERVICE_MASTER_KEY: !!SERVICE_MASTER_KEY,
    SERVICE_MASTER_KEY_LENGTH: SERVICE_MASTER_KEY ? SERVICE_MASTER_KEY.length : 0
  });
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
  const key = crypto.pbkdf2Sync(passphrase, keySalt, 100000, 32, 'sha256');

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
  generateToken,
  generateSecureString,
  hashToken,
  timingSafeEqual,
  generateMasterKeyFromPassphrase
};

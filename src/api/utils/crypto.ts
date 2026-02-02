'use strict';

/**
 * Cryptographic Utilities for API
 *
 * Provides helper functions for:
 * - Password hashing (bcrypt)
 * - Service-level encryption (for storing sensitive data in DB)
 * - Per-user key derivation (key isolation)
 * - Token generation
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from './logger.js';

// PBKDF2 iteration count (OWASP 2023 recommendation for SHA-256)
// Matches the value in src/crypto/keyDerivation.js
const PBKDF2_ITERATIONS = 600000;

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface EncryptedDataWithVersion extends EncryptedData {
  keyVersion: number;
}

export interface MasterKeyResult {
  key: string;
  salt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HKDF_HASH = 'sha256';
const HKDF_KEY_LENGTH = 32;

// Domain separation constants - NEVER change after deployment
const DOMAIN_USER_KEY = 'ECHOLOCK-USER-KEY-v1';
const DOMAIN_SWITCH_DATA = 'ECHOLOCK-SWITCH-DATA-v1';

// Service master key for encrypting sensitive data in database
const SERVICE_MASTER_KEY = process.env.SERVICE_MASTER_KEY;
const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = NODE_ENV === 'production';

// SECURITY: Do not log key-related information in production
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
 */
function hkdfExtract(salt: Buffer | null, ikm: Buffer): Buffer {
  const actualSalt = salt || Buffer.alloc(32, 0);
  return crypto.createHmac(HKDF_HASH, actualSalt)
    .update(ikm)
    .digest();
}

/**
 * HKDF-Expand: Expand PRK to desired length with context info
 */
function hkdfExpand(prk: Buffer, info: Buffer | string, length: number = HKDF_KEY_LENGTH): Buffer {
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

  return okm.subarray(0, length);
}

/**
 * Full HKDF: Extract-then-Expand
 */
function hkdf(ikm: Buffer, info: Buffer | string, salt: Buffer | null = null, length: number = HKDF_KEY_LENGTH): Buffer {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// ============================================================================
// PER-USER KEY DERIVATION
// ============================================================================

/**
 * Derive a user-specific encryption key from the service master key
 */
export function deriveUserKey(userId: string, keyVersion: number = 1): Buffer {
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
 */
export function deriveSwitchKey(userKey: Buffer, switchId: string): Buffer {
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
 */
export function encryptForUser(data: Buffer | string, userId: string, keyVersion: number = 1): EncryptedDataWithVersion {
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
 */
export function decryptForUser(
  ciphertext: string,
  iv: string,
  authTag: string,
  userId: string,
  keyVersion: number = 1
): Buffer {
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
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher = more secure but slower
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Encrypt data using AES-256-GCM with service master key
 */
export function encryptWithServiceKey(data: Buffer | string): EncryptedData {
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
 * Can be called with:
 * - A single EncryptedData object or JSON string
 * - Three separate arguments (ciphertext, iv, authTag)
 */
export function decryptWithServiceKey(
  ciphertextOrData: string | EncryptedData,
  iv?: string,
  authTag?: string
): Buffer {
  let ciphertext: string;
  let ivStr: string;
  let authTagStr: string;

  // If only one argument provided, assume it's a combined JSON string or EncryptedData object
  if (iv === undefined || authTag === undefined) {
    let data: EncryptedData;
    if (typeof ciphertextOrData === 'string') {
      try {
        data = JSON.parse(ciphertextOrData) as EncryptedData;
      } catch {
        throw new Error('decryptWithServiceKey: Single argument must be a valid JSON string with ciphertext, iv, and authTag');
      }
    } else {
      data = ciphertextOrData;
    }
    ciphertext = data.ciphertext;
    ivStr = data.iv;
    authTagStr = data.authTag;
  } else {
    ciphertext = ciphertextOrData as string;
    ivStr = iv;
    authTagStr = authTag;
  }

  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    MASTER_KEY,
    Buffer.from(ivStr, 'base64')
  );

  // Set authentication tag
  decipher.setAuthTag(Buffer.from(authTagStr, 'base64'));

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final()
  ]);

  return decrypted;
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureString(length: number = 32): string {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a master key from a passphrase (for initial setup)
 */
export function generateMasterKeyFromPassphrase(passphrase: string, salt: string | null = null): MasterKeyResult {
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

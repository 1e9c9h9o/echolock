'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
//
// Symmetric encryption for message payloads
// AES-256-GCM only - authenticated encryption with associated data (AEAD)
//
// CRITICAL: Uses native Node.js crypto module
// DO NOT implement custom encryption schemes

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Per NIST SP 800-38D Section 8: GCM should not encrypt more than 2^32 blocks
// with the same key. We track encryption count per key to enforce this limit.
const ENCRYPTION_WARN_THRESHOLD = Math.pow(2, 31);  // Warn at 2^31
const ENCRYPTION_MAX_THRESHOLD = Math.pow(2, 32);   // Refuse at 2^32

// Track encryption counts per key (keyed by SHA-256 hash of the key)
const encryptionCounters = new Map();

/**
 * Get the hash of a key for counter lookup
 * @param {Buffer} key - The encryption key
 * @returns {string} Hex hash of the key
 */
function getKeyHash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Get current encryption count for a key
 * @param {Buffer} key - The encryption key
 * @returns {number} Current encryption count
 */
export function getEncryptionCount(key) {
  const keyHash = getKeyHash(key);
  return encryptionCounters.get(keyHash) || 0;
}

/**
 * Reset encryption counter for a key (use when rotating keys)
 * @param {Buffer} key - The encryption key
 */
export function resetEncryptionCounter(key) {
  const keyHash = getKeyHash(key);
  encryptionCounters.delete(keyHash);
}

/**
 * Check if a key has reached its encryption limit
 * @param {Buffer} key - The encryption key
 * @returns {{ safe: boolean, count: number, warning: boolean, message?: string }}
 */
export function checkKeyUsage(key) {
  const count = getEncryptionCount(key);

  if (count >= ENCRYPTION_MAX_THRESHOLD) {
    return {
      safe: false,
      count,
      warning: true,
      message: `Key has reached maximum encryption limit (${ENCRYPTION_MAX_THRESHOLD}). Key rotation required.`
    };
  }

  if (count >= ENCRYPTION_WARN_THRESHOLD) {
    return {
      safe: true,
      count,
      warning: true,
      message: `Key approaching encryption limit: ${count}/${ENCRYPTION_MAX_THRESHOLD}. Consider key rotation.`
    };
  }

  return { safe: true, count, warning: false };
}

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer} plaintext - Data to encrypt
 * @param {Buffer} key - 256-bit encryption key
 * @param {Buffer} [associatedData] - Optional authenticated data (not encrypted)
 * @returns {Object} { ciphertext, iv, authTag, warning? }
 * @throws {Error} If key has reached maximum encryption limit (2^32)
 */
export function encrypt(plaintext, key, associatedData = null) {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  // Check key usage limits per NIST SP 800-38D
  const keyHash = getKeyHash(key);
  const currentCount = encryptionCounters.get(keyHash) || 0;

  // Refuse to encrypt if key has reached maximum limit
  if (currentCount >= ENCRYPTION_MAX_THRESHOLD) {
    throw new Error(
      `Key has exceeded maximum encryption limit (${ENCRYPTION_MAX_THRESHOLD}). ` +
      `Key rotation is required to maintain cryptographic security. ` +
      `See NIST SP 800-38D Section 8.`
    );
  }

  // Generate random IV (must be unique for each encryption)
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  if (associatedData) {
    cipher.setAAD(associatedData);
  }

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Increment encryption counter for this key
  const newCount = currentCount + 1;
  encryptionCounters.set(keyHash, newCount);

  // Build result
  const result = { ciphertext, iv, authTag };

  // Add warning if approaching limit
  if (newCount >= ENCRYPTION_WARN_THRESHOLD) {
    result.warning = `Key approaching encryption limit: ${newCount}/${ENCRYPTION_MAX_THRESHOLD}. Consider key rotation.`;
  }

  return result;
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Buffer} ciphertext - Encrypted data
 * @param {Buffer} key - 256-bit encryption key
 * @param {Buffer} iv - Initialization vector
 * @param {Buffer} authTag - Authentication tag
 * @param {Buffer} [associatedData] - Optional authenticated data
 * @returns {Buffer} Decrypted plaintext
 */
export function decrypt(ciphertext, key, iv, authTag, associatedData = null) {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (256 bits)`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  if (associatedData) {
    decipher.setAAD(associatedData);
  }

  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
  } catch (error) {
    throw new Error('Decryption failed - authentication tag verification failed');
  }
}
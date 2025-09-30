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

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer} plaintext - Data to encrypt
 * @param {Buffer} key - 256-bit encryption key
 * @param {Buffer} [associatedData] - Optional authenticated data (not encrypted)
 * @returns {Object} { ciphertext, iv, authTag }
 */
export function encrypt(plaintext, key, associatedData = null) {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (256 bits)`);
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

  return { ciphertext, iv, authTag };
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
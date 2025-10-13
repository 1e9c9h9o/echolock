'use strict';

// SECURITY BOUNDARY: ATOMIC CRYPTOGRAPHIC STATE STORAGE
//
// This module ensures IV, authTag, salt, and ciphertext are ALWAYS
// stored together as a single atomic unit to prevent desynchronization
//
// CRITICAL: Fragment integrity verification protects against:
// - Corrupted storage
// - Tampering attacks
// - Relay manipulation
// - Accidental data corruption

import crypto from 'crypto';

/**
 * Create an atomic fragment payload bundling ALL cryptographic state
 * @param {Object} encryptedData - { ciphertext, iv, authTag }
 * @param {Object} metadata - { salt, iterations }
 * @returns {Object} Atomic payload with integrity hash
 */
export function createFragmentPayload(encryptedData, metadata) {
  // Validate required fields
  if (!encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error('Missing required encryption fields: ciphertext, iv, or authTag');
  }

  if (!metadata.salt || !metadata.iterations) {
    throw new Error('Missing required metadata fields: salt or iterations');
  }

  // Bundle ALL cryptographic state atomically
  const payload = {
    version: 1,  // Format version for future compatibility
    ciphertext: encryptedData.ciphertext.toString('base64'),
    iv: encryptedData.iv.toString('base64'),
    authTag: encryptedData.authTag.toString('base64'),
    salt: metadata.salt.toString('base64'),
    iterations: metadata.iterations,  // Store PBKDF2 iteration count
    algorithm: 'AES-256-GCM',
    timestamp: Date.now(),
    // Integrity hash of entire payload
    integrity: null  // Will be filled below
  };

  // Compute integrity hash EXCLUDING the integrity field itself
  const payloadForHash = { ...payload };
  delete payloadForHash.integrity;
  payload.integrity = crypto.createHash('sha256')
    .update(JSON.stringify(payloadForHash))
    .digest('hex');

  return payload;
}

/**
 * Verify fragment payload integrity and extract cryptographic state
 * @param {Object} payload - Fragment payload to verify
 * @returns {Object} Extracted cryptographic state
 * @throws {Error} If integrity verification fails or required fields missing
 */
export function verifyFragmentPayload(payload) {
  // Verify integrity hash
  const payloadForHash = { ...payload };
  const expectedIntegrity = payloadForHash.integrity;
  delete payloadForHash.integrity;

  const actualIntegrity = crypto.createHash('sha256')
    .update(JSON.stringify(payloadForHash))
    .digest('hex');

  if (actualIntegrity !== expectedIntegrity) {
    throw new Error('Fragment integrity verification failed - possible corruption or tampering');
  }

  // Verify required fields exist
  const required = ['version', 'ciphertext', 'iv', 'authTag', 'salt', 'iterations', 'algorithm'];
  for (const field of required) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Verify algorithm matches expected
  if (payload.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported algorithm: ${payload.algorithm}, expected AES-256-GCM`);
  }

  // Verify version is supported
  if (payload.version !== 1) {
    throw new Error(`Unsupported payload version: ${payload.version}, expected 1`);
  }

  // Return extracted cryptographic state as Buffers
  return {
    ciphertext: Buffer.from(payload.ciphertext, 'base64'),
    iv: Buffer.from(payload.iv, 'base64'),
    authTag: Buffer.from(payload.authTag, 'base64'),
    salt: Buffer.from(payload.salt, 'base64'),
    iterations: payload.iterations,
    algorithm: payload.algorithm,
    timestamp: payload.timestamp
  };
}

/**
 * Serialize payload for storage
 * @param {Object} payload - Fragment payload
 * @returns {string} JSON string
 */
export function serializePayload(payload) {
  return JSON.stringify(payload);
}

/**
 * Deserialize and verify payload from storage
 * @param {string} payloadString - JSON string
 * @returns {Object} Verified cryptographic state
 */
export function deserializeAndVerify(payloadString) {
  let payload;

  try {
    payload = JSON.parse(payloadString);
  } catch (error) {
    throw new Error(`Failed to parse fragment payload: ${error.message}`);
  }

  // Verify and extract
  return verifyFragmentPayload(payload);
}

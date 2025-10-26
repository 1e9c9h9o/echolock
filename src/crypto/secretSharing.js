'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
//
// Secret Sharing using Shamir's Secret Sharing Scheme
// Wrapper for shamir-secret-sharing library - DO NOT implement custom Shamir
//
// CRITICAL: This module handles secret splitting and reconstruction
// Any bugs here can result in permanent data loss or compromise
//
// Library: shamir-secret-sharing@0.0.4 (published by Privy)
// Audits: Cure53 (https://cure53.de/audit-report_privy-sss-library.pdf)
//         Zellic (https://github.com/Zellic/publications/blob/master/Privy_Shamir_Secret_Sharing_-_Zellic_Audit_Report.pdf)
// Features: Zero dependencies, algorithmic constant-time, zero-share attack mitigation

import crypto from 'crypto';
import { split, combine } from 'shamir-secret-sharing';

/**
 * Derive authentication key from master secret for HMAC verification
 * @param {Buffer} secret - Master secret
 * @returns {Buffer} Authentication key (32 bytes)
 */
export function deriveAuthenticationKey(secret) {
  return crypto.createHash('sha256')
    .update(Buffer.concat([secret, Buffer.from('ECHOLOCK-SSS-AUTH-v1')]))
    .digest();
}

/**
 * Authenticate a share with HMAC before encryption
 * @param {Buffer|Uint8Array} share - Share data
 * @param {number} shareIndex - Share index (0-based)
 * @param {Buffer} authKey - Authentication key
 * @returns {Object} { share, hmac, index }
 */
export function authenticateShare(share, shareIndex, authKey) {
  const shareBuffer = share instanceof Buffer ? share : Buffer.from(share);

  const hmac = crypto.createHmac('sha256', authKey)
    .update(Buffer.concat([
      shareBuffer,
      Buffer.from([shareIndex])  // Include index to prevent reordering attacks
    ]))
    .digest();

  return {
    share: shareBuffer,
    hmac: hmac,
    index: shareIndex
  };
}

/**
 * Verify share authenticity after decryption, before reconstruction
 * @param {Object} authenticatedShare - { share, hmac, index }
 * @param {Buffer} authKey - Authentication key
 * @returns {Buffer} Verified share data
 * @throws {Error} If HMAC verification fails
 */
export function verifyShare(authenticatedShare, authKey) {
  const expectedHmac = crypto.createHmac('sha256', authKey)
    .update(Buffer.concat([
      authenticatedShare.share,
      Buffer.from([authenticatedShare.index])
    ]))
    .digest();

  if (!crypto.timingSafeEqual(expectedHmac, authenticatedShare.hmac)) {
    throw new Error(`Share ${authenticatedShare.index} HMAC verification failed - corrupted or forged`);
  }

  return authenticatedShare.share;
}

/**
 * Split a secret into N shares where K shares are required for reconstruction
 * @param {Buffer|Uint8Array} secret - The secret to split
 * @param {number} totalShares - Total number of shares to create (2-255)
 * @param {number} threshold - Minimum shares needed to reconstruct (2-255)
 * @returns {Promise<Array<Uint8Array>>} Array of share Uint8Arrays
 */
export async function splitSecret(secret, totalShares, threshold) {
  // Convert Buffer or any array-like to Uint8Array properly by copying bytes
  let secretArray;
  if (secret instanceof Uint8Array && !(secret instanceof Buffer)) {
    // Already a pure Uint8Array (not a Buffer subclass)
    secretArray = secret;
  } else if (Buffer.isBuffer(secret)) {
    // Copy Buffer contents into a new Uint8Array
    // This ensures compatibility with the shamir library which expects pure Uint8Array
    secretArray = new Uint8Array(secret);
  } else if (ArrayBuffer.isView(secret)) {
    // Handle other TypedArray views
    secretArray = new Uint8Array(secret.buffer.slice(secret.byteOffset, secret.byteOffset + secret.byteLength));
  } else if (Array.isArray(secret)) {
    // Handle regular array
    secretArray = Uint8Array.from(secret);
  } else {
    throw new TypeError(`secret must be a Buffer, Uint8Array, or Array, got ${typeof secret}`);
  }

  return await split(secretArray, totalShares, threshold);
}

/**
 * Split a secret and authenticate each share with HMAC
 * @param {Buffer|Uint8Array} secret - The secret to split
 * @param {number} totalShares - Total number of shares to create (2-255)
 * @param {number} threshold - Minimum shares needed to reconstruct (2-255)
 * @returns {Promise<Object>} { shares: Array<Object>, authKey: Buffer }
 */
export async function splitAndAuthenticateSecret(secret, totalShares, threshold) {
  // 1. Split the secret using Shamir (splitSecret handles conversion)
  const shares = await splitSecret(secret, totalShares, threshold);

  // 3. Derive authentication key from secret
  const secretBuffer = secret instanceof Buffer ? secret : Buffer.from(secret);
  const authKey = deriveAuthenticationKey(secretBuffer);

  // 4. Authenticate each share
  const authenticatedShares = shares.map((share, index) =>
    authenticateShare(share, index, authKey)
  );

  return {
    shares: authenticatedShares,
    authKey: authKey
  };
}

/**
 * Reconstruct a secret from K or more shares
 * @param {Array<Uint8Array>} shares - Array of share Uint8Arrays
 * @returns {Promise<Uint8Array>} Reconstructed secret
 */
export async function reconstructSecret(shares) {
  return await combine(shares);
}

/**
 * Verify and combine authenticated shares to reconstruct secret
 * @param {Array<Object>} authenticatedShares - Array of { share, hmac, index }
 * @param {Buffer} authKey - Authentication key
 * @returns {Promise<Buffer>} Reconstructed secret
 * @throws {Error} If insufficient shares or verification fails
 */
export async function combineAuthenticatedShares(authenticatedShares, authKey) {
  // CRITICAL: Check threshold FIRST
  if (!Array.isArray(authenticatedShares)) {
    throw new Error('Shares must be an array');
  }

  if (authenticatedShares.length < 3) {
    throw new Error(`Insufficient shares: need at least 3, got ${authenticatedShares.length}`);
  }

  // Verify ALL shares before reconstruction
  const verifiedShares = authenticatedShares.map(authShare => {
    try {
      return verifyShare(authShare, authKey);
    } catch (error) {
      console.error(`Share verification failed:`, error.message);
      throw error;  // Fail fast on corrupted share
    }
  });

  // Convert to Uint8Array for shamir library
  const sharesUint8 = verifiedShares.map(share => new Uint8Array(share));

  // Reconstruct secret
  const reconstructedUint8 = await combine(sharesUint8);
  const reconstructed = Buffer.from(reconstructedUint8);

  return reconstructed;
}
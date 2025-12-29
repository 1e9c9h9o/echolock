'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
//
// Key derivation functions for password-based keys
// PBKDF2 for password-based keys with high iteration count
//
// CRITICAL: Protects against brute-force attacks on passwords
// Uses cryptographically secure parameters

import crypto from 'crypto';

// ============================================================================
// ENTROPY VALIDATION
// ============================================================================

/**
 * Generate cryptographically secure random bytes with validation
 * Validates that the CSPRNG is functioning correctly
 *
 * @param {number} length - Number of bytes to generate
 * @returns {Buffer} Cryptographically secure random bytes
 * @throws {Error} If CSPRNG appears to be malfunctioning
 */
export function secureRandomBytes(length) {
  if (typeof length !== 'number' || length < 1 || length > 65536) {
    throw new Error('Length must be a positive integer <= 65536');
  }

  const bytes = crypto.randomBytes(length);

  // Validate we got the expected length
  if (bytes.length !== length) {
    throw new Error(`CSPRNG returned wrong length: expected ${length}, got ${bytes.length}`);
  }

  // For lengths >= 16 bytes, perform entropy validation
  if (length >= 16) {
    // Check for obvious CSPRNG failure patterns
    const allZero = bytes.every(b => b === 0);
    const allOne = bytes.every(b => b === 255);
    const allSame = bytes.every(b => b === bytes[0]);

    if (allZero || allOne || allSame) {
      throw new Error('CSPRNG produced suspicious output - possible entropy failure');
    }

    // Simple entropy estimation: count unique bytes
    // For 32 random bytes, we expect roughly 25-32 unique values
    // Getting < 8 unique values in 32 bytes is extremely unlikely (p < 2^-50)
    if (length >= 32) {
      const uniqueBytes = new Set(bytes).size;
      const minExpectedUnique = Math.min(8, Math.floor(length / 4));

      if (uniqueBytes < minExpectedUnique) {
        throw new Error(`CSPRNG entropy too low: only ${uniqueBytes} unique bytes in ${length}`);
      }
    }
  }

  return bytes;
}

/**
 * Generate a cryptographically secure random key
 * @param {number} [length=32] - Key length in bytes (default: 256 bits)
 * @returns {Buffer} Random key
 */
export function generateSecureKey(length = 32) {
  return secureRandomBytes(length);
}

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

// ============================================================================
// HIERARCHICAL KEY DERIVATION (HKDF - RFC 5869)
// ============================================================================
//
// Key Hierarchy:
//   Level 0: Master Key (from PBKDF2 - expensive, done once per password)
//   Level 1: Switch Key = HKDF(MasterKey, switchId) - unique per switch
//   Level 2: Purpose Keys = HKDF(SwitchKey, purpose) - encryption, auth, bitcoin
//   Level 3: Fragment Keys = HKDF(EncryptionKey, index) - unique per fragment
//
// Benefits:
// - Context binding: Each switch/fragment has cryptographically unique keys
// - Key separation: Different purposes use different keys
// - Defense in depth: Compromising one switch doesn't reveal others
// - Forward secrecy: Can rotate switch keys without changing master
//
// ============================================================================

const HKDF_HASH = 'sha256';
const HKDF_KEY_LENGTH = 32;

// Domain separation constants - NEVER change these after deployment
const DOMAIN_SWITCH = 'ECHOLOCK-SWITCH-v1';
const DOMAIN_ENCRYPTION = 'ECHOLOCK-ENCRYPTION-v1';
const DOMAIN_AUTH = 'ECHOLOCK-AUTH-v1';
const DOMAIN_BITCOIN = 'ECHOLOCK-BITCOIN-v1';
const DOMAIN_FRAGMENT = 'ECHOLOCK-FRAGMENT-v1';
const DOMAIN_NOSTR = 'ECHOLOCK-NOSTR-v1';

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
export function hkdf(ikm, info, salt = null, length = HKDF_KEY_LENGTH) {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

/**
 * Derive a switch-specific key from master key
 * @param {Buffer} masterKey - Master key from PBKDF2
 * @param {string} switchId - Unique switch identifier
 * @returns {Buffer} Switch-specific key (32 bytes)
 */
export function deriveSwitchKey(masterKey, switchId) {
  if (!masterKey || masterKey.length !== 32) {
    throw new Error('Master key must be 32 bytes');
  }
  if (!switchId || typeof switchId !== 'string') {
    throw new Error('Switch ID must be a non-empty string');
  }

  return hkdf(masterKey, `${DOMAIN_SWITCH}-${switchId}`);
}

/**
 * Derive purpose-specific keys from switch key
 * @param {Buffer} switchKey - Switch-specific key
 * @param {string} purpose - Key purpose ('encryption', 'auth', 'bitcoin', 'nostr')
 * @returns {Buffer} Purpose-specific key (32 bytes)
 */
export function derivePurposeKey(switchKey, purpose) {
  if (!switchKey || switchKey.length !== 32) {
    throw new Error('Switch key must be 32 bytes');
  }

  const domains = {
    encryption: DOMAIN_ENCRYPTION,
    auth: DOMAIN_AUTH,
    bitcoin: DOMAIN_BITCOIN,
    nostr: DOMAIN_NOSTR
  };

  const domain = domains[purpose];
  if (!domain) {
    throw new Error(`Unknown purpose: ${purpose}. Valid: ${Object.keys(domains).join(', ')}`);
  }

  return hkdf(switchKey, domain);
}

/**
 * Derive a fragment-specific encryption key
 * @param {Buffer} encryptionKey - Switch encryption key
 * @param {number} fragmentIndex - Fragment index (0-based)
 * @returns {Buffer} Fragment-specific key (32 bytes)
 */
export function deriveFragmentKey(encryptionKey, fragmentIndex) {
  if (!encryptionKey || encryptionKey.length !== 32) {
    throw new Error('Encryption key must be 32 bytes');
  }
  if (typeof fragmentIndex !== 'number' || fragmentIndex < 0 || fragmentIndex > 255) {
    throw new Error('Fragment index must be 0-255');
  }

  return hkdf(encryptionKey, `${DOMAIN_FRAGMENT}-${fragmentIndex}`);
}

/**
 * Complete hierarchical key derivation from password
 * Derives all keys needed for a switch in one call
 *
 * @param {string} password - User password
 * @param {string} switchId - Switch identifier
 * @param {Buffer} [salt] - Salt for PBKDF2 (generated if not provided)
 * @param {number} [fragmentCount] - Number of fragment keys to derive (default: 5)
 * @returns {Object} Complete key hierarchy
 */
export function deriveKeyHierarchy(password, switchId, salt = null, fragmentCount = 5) {
  // Level 0: Master key from password (expensive PBKDF2)
  const { key: masterKey, salt: derivedSalt } = deriveKey(password, salt);

  // Level 1: Switch-specific key (fast HKDF)
  const switchKey = deriveSwitchKey(masterKey, switchId);

  // Level 2: Purpose-specific keys
  const encryptionKey = derivePurposeKey(switchKey, 'encryption');
  const authKey = derivePurposeKey(switchKey, 'auth');
  const bitcoinKey = derivePurposeKey(switchKey, 'bitcoin');
  const nostrKey = derivePurposeKey(switchKey, 'nostr');

  // Level 3: Fragment-specific keys
  const fragmentKeys = [];
  for (let i = 0; i < fragmentCount; i++) {
    fragmentKeys.push(deriveFragmentKey(encryptionKey, i));
  }

  // Zeroize intermediate keys that shouldn't be exposed
  zeroize(masterKey);
  zeroize(switchKey);

  return {
    salt: derivedSalt,
    encryptionKey,
    authKey,
    bitcoinKey,
    nostrKey,
    fragmentKeys,
    // Metadata for reconstruction
    metadata: {
      switchId,
      fragmentCount,
      version: 1,
      algorithm: 'PBKDF2-HKDF-SHA256',
      iterations: PBKDF2_ITERATIONS
    }
  };
}

/**
 * Reconstruct key hierarchy from password and stored metadata
 * Used during message retrieval/release
 *
 * @param {string} password - User password
 * @param {string} switchId - Switch identifier
 * @param {Buffer} salt - Stored salt from creation
 * @param {number} [fragmentCount] - Number of fragment keys needed
 * @returns {Object} Reconstructed key hierarchy
 */
export function reconstructKeyHierarchy(password, switchId, salt, fragmentCount = 5) {
  if (!salt || !Buffer.isBuffer(salt)) {
    throw new Error('Salt must be a Buffer');
  }

  return deriveKeyHierarchy(password, switchId, salt, fragmentCount);
}
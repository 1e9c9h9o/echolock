'use strict';

/**
 * TOTP (Time-based One-Time Password) Utilities
 *
 * Provides functions for:
 * - Generating TOTP secrets
 * - Creating QR code URIs for authenticator apps
 * - Verifying TOTP codes
 * - Managing backup codes
 *
 * Uses RFC 6238 (TOTP) and RFC 4226 (HOTP) standards
 */

import { TOTP, Secret } from 'otpauth';
import crypto from 'crypto';

// TOTP Configuration
const TOTP_CONFIG = {
  issuer: 'EchoLock',
  algorithm: 'SHA1',
  digits: 6,
  period: 30, // 30 seconds
  window: 1,  // Allow 1 period before/after for clock drift
};

// Backup codes configuration
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;

/**
 * Generate a new TOTP secret
 * @returns {string} Base32-encoded secret
 */
export function generateSecret() {
  // Generate 20 bytes (160 bits) of random data
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generate the otpauth:// URI for QR code display
 * @param {string} secret - Base32-encoded secret
 * @param {string} email - User's email (account label)
 * @returns {string} otpauth:// URI
 */
export function generateQRCodeUri(secret, email) {
  const totp = new TOTP({
    issuer: TOTP_CONFIG.issuer,
    label: email,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: Secret.fromBase32(secret),
  });

  return totp.toString();
}

/**
 * Verify a TOTP code
 * @param {string} secret - Base32-encoded secret
 * @param {string} code - 6-digit code from user
 * @returns {boolean} Whether the code is valid
 */
export function verifyTOTP(secret, code) {
  // Normalize code - remove spaces and ensure string
  const normalizedCode = String(code).replace(/\s/g, '');

  // Validate code format
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const totp = new TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: Secret.fromBase32(secret),
  });

  // validate() returns the delta (time difference) or null if invalid
  // We use a window of 1 to allow for clock drift
  const delta = totp.validate({ token: normalizedCode, window: TOTP_CONFIG.window });

  return delta !== null;
}

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {string[]} Array of backup codes (plaintext - hash before storing!)
 */
export function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  const codes = [];

  for (let i = 0; i < count; i++) {
    // Generate random alphanumeric code (uppercase for readability)
    const bytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
    const code = bytes
      .toString('base64')
      .replace(/[+/=]/g, '') // Remove non-alphanumeric
      .substring(0, BACKUP_CODE_LENGTH)
      .toUpperCase();

    codes.push(code);
  }

  return codes;
}

/**
 * Hash a backup code for secure storage
 * @param {string} code - Plaintext backup code
 * @returns {string} SHA-256 hash (hex)
 */
export function hashBackupCode(code) {
  // Normalize: uppercase and remove spaces/dashes
  const normalized = code.toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Hash multiple backup codes
 * @param {string[]} codes - Array of plaintext codes
 * @returns {Array<{hash: string, used: boolean}>} Array of hashed codes with used flag
 */
export function hashBackupCodes(codes) {
  return codes.map(code => ({
    hash: hashBackupCode(code),
    used: false,
  }));
}

/**
 * Verify a backup code against stored hashes
 * @param {string} code - Plaintext backup code from user
 * @param {Array<{hash: string, used: boolean}>} hashedCodes - Stored hashed codes
 * @returns {{valid: boolean, index: number}} Validation result and index of matching code
 */
export function verifyBackupCode(code, hashedCodes) {
  if (!hashedCodes || !Array.isArray(hashedCodes)) {
    return { valid: false, index: -1 };
  }

  const inputHash = hashBackupCode(code);

  for (let i = 0; i < hashedCodes.length; i++) {
    const stored = hashedCodes[i];

    // Skip used codes
    if (stored.used) {
      continue;
    }

    // Constant-time comparison to prevent timing attacks
    if (crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(stored.hash, 'hex')
    )) {
      return { valid: true, index: i };
    }
  }

  return { valid: false, index: -1 };
}

/**
 * Format backup codes for display (add dashes for readability)
 * @param {string[]} codes - Array of backup codes
 * @returns {string[]} Formatted codes with dashes
 */
export function formatBackupCodesForDisplay(codes) {
  return codes.map(code => {
    // Add dash in middle: ABCD1234 -> ABCD-1234
    if (code.length === 8) {
      return `${code.substring(0, 4)}-${code.substring(4)}`;
    }
    return code;
  });
}

/**
 * Get the current TOTP code (for testing purposes only)
 * @param {string} secret - Base32-encoded secret
 * @returns {string} Current 6-digit TOTP code
 */
export function getCurrentTOTP(secret) {
  const totp = new TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: Secret.fromBase32(secret),
  });

  return totp.generate();
}

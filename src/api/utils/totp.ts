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
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30, // 30 seconds
  window: 1,  // Allow 1 period before/after for clock drift
};

// Backup codes configuration
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;

/**
 * Hashed backup code structure
 */
export interface HashedBackupCode {
  hash: string;
  used: boolean;
}

/**
 * Backup code verification result
 */
export interface BackupCodeVerificationResult {
  valid: boolean;
  index: number;
}

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  // Generate 20 bytes (160 bits) of random data
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generate the otpauth:// URI for QR code display
 */
export function generateQRCodeUri(secret: string, email: string): string {
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
 */
export function verifyTOTP(secret: string, code: string | number): boolean {
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
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];

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
 */
export function hashBackupCode(code: string): string {
  // Normalize: uppercase and remove spaces/dashes
  const normalized = code.toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Hash multiple backup codes
 */
export function hashBackupCodes(codes: string[]): HashedBackupCode[] {
  return codes.map(code => ({
    hash: hashBackupCode(code),
    used: false,
  }));
}

/**
 * Verify a backup code against stored hashes
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: HashedBackupCode[] | null | undefined
): BackupCodeVerificationResult {
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
 */
export function formatBackupCodesForDisplay(codes: string[]): string[] {
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
 */
export function getCurrentTOTP(secret: string): string {
  const totp = new TOTP({
    issuer: TOTP_CONFIG.issuer,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    secret: Secret.fromBase32(secret),
  });

  return totp.generate();
}

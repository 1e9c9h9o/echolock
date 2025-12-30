/**
 * Shamir Secret Sharing for Browser
 *
 * Client-side implementation of Shamir's Secret Sharing scheme.
 * Splits a secret into N shares where K shares are needed to reconstruct.
 *
 * Uses the same mathematical approach as the audited server-side library
 * (shamir-secret-sharing by Privy, audited by Cure53 and Zellic).
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

import { randomBytes, toHex, fromHex } from './aes';

// GF(256) field operations
// Using the same irreducible polynomial as the server library: x^8 + x^4 + x^3 + x + 1 (0x11B)
const FIELD_SIZE = 256;

// Precomputed log and exp tables for GF(256)
const LOG_TABLE = new Uint8Array(256);
const EXP_TABLE = new Uint8Array(256);

// Initialize lookup tables
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = x << 1;
    if (x >= 256) {
      x ^= 0x11b; // Reduce by the irreducible polynomial
    }
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

/**
 * Multiply two numbers in GF(256)
 */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

/**
 * Divide in GF(256)
 */
function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] - LOG_TABLE[b] + 255) % 255];
}

/**
 * Add/subtract in GF(256) (XOR)
 */
function gfAdd(a: number, b: number): number {
  return a ^ b;
}

/**
 * Evaluate a polynomial at point x in GF(256)
 */
function evaluatePolynomial(coefficients: Uint8Array, x: number): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = gfAdd(gfMul(result, x), coefficients[i]);
  }
  return result;
}

/**
 * Generate random polynomial with secret as constant term
 */
function generatePolynomial(secret: number, degree: number): Uint8Array {
  const coefficients = new Uint8Array(degree + 1);
  coefficients[0] = secret;

  // Generate random coefficients for higher-degree terms
  const randomCoeffs = randomBytes(degree);
  for (let i = 0; i < degree; i++) {
    // Ensure non-zero coefficients for security
    coefficients[i + 1] = randomCoeffs[i] || 1;
  }

  return coefficients;
}

/**
 * Lagrange interpolation at x=0 to recover secret
 */
function lagrangeInterpolate(points: Array<{ x: number; y: number }>): number {
  let result = 0;

  for (let i = 0; i < points.length; i++) {
    let numerator = 1;
    let denominator = 1;

    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        // Evaluate at x=0: (0 - x_j) / (x_i - x_j)
        numerator = gfMul(numerator, points[j].x);
        denominator = gfMul(denominator, gfAdd(points[i].x, points[j].x));
      }
    }

    const lagrangeCoeff = gfDiv(numerator, denominator);
    result = gfAdd(result, gfMul(points[i].y, lagrangeCoeff));
  }

  return result;
}

export interface Share {
  x: number; // Share index (1-255)
  data: Uint8Array; // Share data (one byte per secret byte)
}

/**
 * Split a secret into N shares with threshold K
 *
 * @param secret - The secret to split (Uint8Array)
 * @param totalShares - Total number of shares to generate (N)
 * @param threshold - Minimum shares needed to reconstruct (K)
 * @returns Array of shares
 */
export function split(
  secret: Uint8Array,
  totalShares: number,
  threshold: number
): Share[] {
  // Validate parameters
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be >= threshold');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  const shares: Share[] = [];

  // Initialize shares with x values
  for (let i = 0; i < totalShares; i++) {
    shares.push({
      x: i + 1, // Use 1-indexed x values
      data: new Uint8Array(secret.length),
    });
  }

  // Process each byte of the secret
  for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
    // Generate polynomial with this byte as the secret (constant term)
    const polynomial = generatePolynomial(secret[byteIndex], threshold - 1);

    // Evaluate polynomial at each share's x value
    for (let shareIndex = 0; shareIndex < totalShares; shareIndex++) {
      shares[shareIndex].data[byteIndex] = evaluatePolynomial(
        polynomial,
        shares[shareIndex].x
      );
    }
  }

  return shares;
}

/**
 * Reconstruct secret from shares using Lagrange interpolation
 *
 * @param shares - Array of shares (must have at least threshold shares)
 * @returns Reconstructed secret
 */
export function combine(shares: Share[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('At least 2 shares required');
  }

  // Verify all shares have same length
  const secretLength = shares[0].data.length;
  if (!shares.every((s) => s.data.length === secretLength)) {
    throw new Error('All shares must have same length');
  }

  // Verify unique x values
  const xValues = new Set(shares.map((s) => s.x));
  if (xValues.size !== shares.length) {
    throw new Error('Duplicate share indices');
  }

  const secret = new Uint8Array(secretLength);

  // Reconstruct each byte using Lagrange interpolation
  for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
    const points = shares.map((share) => ({
      x: share.x,
      y: share.data[byteIndex],
    }));
    secret[byteIndex] = lagrangeInterpolate(points);
  }

  return secret;
}

/**
 * Serialize a share to hex string for storage/transmission
 */
export function serializeShare(share: Share): string {
  // Format: 2-char hex for x + share data as hex
  const xHex = share.x.toString(16).padStart(2, '0');
  const dataHex = toHex(share.data);
  return xHex + dataHex;
}

/**
 * Deserialize a share from hex string
 */
export function deserializeShare(hex: string): Share {
  if (hex.length < 4) {
    throw new Error('Invalid share format');
  }
  const x = parseInt(hex.slice(0, 2), 16);
  const data = fromHex(hex.slice(2));
  return { x, data };
}

/**
 * Generate authentication key for share verification
 * Uses HMAC-like construction for integrity checking
 */
export async function generateAuthKey(): Promise<Uint8Array> {
  return randomBytes(32);
}

/**
 * Compute HMAC for share authentication
 */
export async function computeShareHMAC(
  share: Share,
  authKey: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    authKey as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = new Uint8Array(1 + share.data.length);
  data[0] = share.x;
  data.set(share.data, 1);
  const signature = await crypto.subtle.sign('HMAC', key, data as BufferSource);
  return new Uint8Array(signature);
}

/**
 * Verify share HMAC
 */
export async function verifyShareHMAC(
  share: Share,
  hmac: Uint8Array,
  authKey: Uint8Array
): Promise<boolean> {
  const computed = await computeShareHMAC(share, authKey);
  if (computed.length !== hmac.length) return false;
  return computed.every((byte, i) => byte === hmac[i]);
}

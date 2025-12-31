/**
 * Nostr Keypair Generation for Browser
 *
 * Generates secp256k1 keypairs for Nostr protocol using audited @noble/curves.
 * Keys are generated client-side and never sent to the server.
 *
 * Security: Uses @noble/curves which is:
 * - Audited by Trail of Bits and Cure53
 * - Constant-time operations (side-channel resistant)
 * - Widely used in the Nostr ecosystem
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { schnorr } from '@noble/curves/secp256k1';
import { randomBytes as nobleRandomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Re-export for compatibility
export { bytesToHex as toHex, hexToBytes as fromHex };

/**
 * Generate cryptographically secure random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return nobleRandomBytes(length);
}

/**
 * Generate a Nostr keypair (secp256k1)
 *
 * Returns both the private key (nsec) and public key (npub) in hex format.
 * The private key should be stored securely in IndexedDB.
 * Only the public key is sent to the server.
 */
export async function generateNostrKeypair(): Promise<{
  privateKey: string; // 32 bytes hex (nsec)
  publicKey: string; // 32 bytes hex (npub, x-only)
}> {
  // Generate private key with proper entropy
  const privateKeyBytes = secp256k1.utils.randomPrivateKey();
  const privateKey = bytesToHex(privateKeyBytes);

  // Derive x-only public key (Schnorr/BIP-340 format for Nostr)
  const publicKeyBytes = schnorr.getPublicKey(privateKeyBytes);
  const publicKey = bytesToHex(publicKeyBytes);

  return { privateKey, publicKey };
}

/**
 * Derive x-only public key from private key
 * Uses BIP-340 Schnorr format as required by Nostr
 */
export function getPublicKey(privateKeyHex: string): string {
  const publicKeyBytes = schnorr.getPublicKey(hexToBytes(privateKeyHex));
  return bytesToHex(publicKeyBytes);
}

/**
 * Sign a message hash with a Nostr private key (BIP-340 Schnorr signature)
 * Used for signing Nostr events
 *
 * @param messageHash - 32-byte hash to sign (event ID)
 * @param privateKeyHex - Private key in hex format
 * @returns 64-byte Schnorr signature in hex format
 */
export async function signSchnorr(
  messageHash: Uint8Array,
  privateKeyHex: string
): Promise<string> {
  const signature = schnorr.sign(messageHash, hexToBytes(privateKeyHex));
  return bytesToHex(signature);
}

/**
 * Verify a BIP-340 Schnorr signature
 *
 * @param signature - 64-byte signature in hex format
 * @param messageHash - 32-byte message hash
 * @param publicKeyHex - x-only public key in hex format
 * @returns true if signature is valid
 */
export async function verifySchnorr(
  signatureHex: string,
  messageHash: Uint8Array,
  publicKeyHex: string
): Promise<boolean> {
  try {
    return schnorr.verify(
      hexToBytes(signatureHex),
      messageHash,
      hexToBytes(publicKeyHex)
    );
  } catch {
    return false;
  }
}

/**
 * Compute ECDH shared secret for NIP-44 encryption
 *
 * @param privateKeyHex - Our private key
 * @param publicKeyHex - Their x-only public key
 * @returns 32-byte shared secret (x-coordinate of shared point)
 */
export function computeSharedSecret(
  privateKeyHex: string,
  publicKeyHex: string
): Uint8Array {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKey = hexToBytes(publicKeyHex);

  // For x-only pubkeys, we need to lift to a full point first
  // secp256k1.ProjectivePoint.fromHex handles both compressed and x-only formats
  const publicPoint = liftX(publicKey);

  // Compute shared point: privateKey * publicPoint
  const sharedPoint = publicPoint.multiply(bytesToBigInt(privateKey));

  // Return x-coordinate as shared secret
  return bigIntToBytes(sharedPoint.x, 32);
}

/**
 * Lift an x-only public key to a full point
 * Per BIP-340, the y-coordinate with even parity is chosen
 */
function liftX(xOnlyPubkey: Uint8Array): typeof secp256k1.ProjectivePoint.BASE {
  // secp256k1 parameters
  const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  const x = bytesToBigInt(xOnlyPubkey);

  // y² = x³ + 7 (mod p)
  const ySquared = (x ** 3n + 7n) % p;

  // Compute y using Tonelli-Shanks (for p ≡ 3 mod 4: y = ySquared^((p+1)/4))
  const y = modPow(ySquared, (p + 1n) / 4n, p);

  // Verify we got a valid square root
  if ((y * y) % p !== ySquared) {
    throw new Error('Invalid x-only public key: no valid y coordinate');
  }

  // Choose even y (BIP-340)
  const yFinal = y % 2n === 0n ? y : p - y;

  // Create the point
  return new secp256k1.ProjectivePoint(x, yFinal, 1n);
}

/**
 * Modular exponentiation
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Convert bytes to BigInt
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert BigInt to bytes
 */
function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const hex = n.toString(16).padStart(length * 2, '0');
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Validate a Nostr private key
 */
export function isValidPrivateKey(privateKey: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(privateKey)) return false;
  try {
    secp256k1.utils.normPrivateKeyToScalar(hexToBytes(privateKey));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Nostr public key (x-only, 32 bytes)
 */
export function isValidPublicKey(publicKey: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(publicKey)) return false;
  try {
    // Try to lift the x coordinate to verify it's on the curve
    liftX(hexToBytes(publicKey));
    return true;
  } catch {
    return false;
  }
}

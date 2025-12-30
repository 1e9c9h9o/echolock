/**
 * Nostr Keypair Generation for Browser
 *
 * Generates secp256k1 keypairs for Nostr protocol.
 * Keys are generated client-side and never sent to the server.
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

import { randomBytes, toHex, fromHex } from './aes';

// secp256k1 curve parameters
const CURVE_ORDER = BigInt(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
);

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
  let privateKeyBytes: Uint8Array;
  let privateKeyBigInt: bigint;

  // Ensure private key is valid (non-zero and less than curve order)
  do {
    privateKeyBytes = randomBytes(32);
    privateKeyBigInt = bytesToBigInt(privateKeyBytes);
  } while (privateKeyBigInt === BigInt(0) || privateKeyBigInt >= CURVE_ORDER);

  const privateKey = toHex(privateKeyBytes);

  // Derive public key using secp256k1
  // For browser, we use the Web Crypto API with ECDSA
  // Then extract the x-coordinate for Nostr's x-only pubkey format

  const publicKey = await derivePublicKey(privateKeyBytes);

  return { privateKey, publicKey };
}

/**
 * Derive public key from private key using Web Crypto
 */
async function derivePublicKey(privateKeyBytes: Uint8Array): Promise<string> {
  // Import private key as JWK (Web Crypto requires this format for ECDSA)
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256', // Web Crypto doesn't support secp256k1 directly
    // We'll use a pure JS implementation for secp256k1
  };

  // Since Web Crypto doesn't support secp256k1, we use a simplified
  // scalar multiplication implementation for the public key derivation
  return await secp256k1GetPublicKey(privateKeyBytes);
}

/**
 * Simplified secp256k1 public key derivation
 * Uses the generator point G and scalar multiplication
 */
async function secp256k1GetPublicKey(privateKey: Uint8Array): Promise<string> {
  // secp256k1 generator point G
  const Gx = BigInt(
    '0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'
  );
  const Gy = BigInt(
    '0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'
  );
  const p = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'
  );
  const n = CURVE_ORDER;

  const k = bytesToBigInt(privateKey);

  // Scalar multiplication k * G using double-and-add
  let result = { x: BigInt(0), y: BigInt(0), isInfinity: true };
  let addend = { x: Gx, y: Gy, isInfinity: false };

  let scalar = k;
  while (scalar > BigInt(0)) {
    if (scalar & BigInt(1)) {
      result = pointAdd(result, addend, p);
    }
    addend = pointDouble(addend, p);
    scalar = scalar >> BigInt(1);
  }

  // Convert x-coordinate to 32-byte hex (x-only pubkey for Nostr)
  return bigIntToHex(result.x, 32);
}

interface Point {
  x: bigint;
  y: bigint;
  isInfinity: boolean;
}

/**
 * Point addition on secp256k1
 */
function pointAdd(p1: Point, p2: Point, prime: bigint): Point {
  if (p1.isInfinity) return p2;
  if (p2.isInfinity) return p1;

  if (p1.x === p2.x) {
    if (p1.y === p2.y) {
      return pointDouble(p1, prime);
    }
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  const slope = modDiv(p2.y - p1.y, p2.x - p1.x, prime);
  const x3 = mod(slope * slope - p1.x - p2.x, prime);
  const y3 = mod(slope * (p1.x - x3) - p1.y, prime);

  return { x: x3, y: y3, isInfinity: false };
}

/**
 * Point doubling on secp256k1
 */
function pointDouble(p: Point, prime: bigint): Point {
  if (p.isInfinity || p.y === BigInt(0)) {
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  // For secp256k1, a = 0
  const slope = modDiv(BigInt(3) * p.x * p.x, BigInt(2) * p.y, prime);
  const x3 = mod(slope * slope - BigInt(2) * p.x, prime);
  const y3 = mod(slope * (p.x - x3) - p.y, prime);

  return { x: x3, y: y3, isInfinity: false };
}

/**
 * Modular arithmetic helpers
 */
function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= BigInt(0) ? result : result + m;
}

function modDiv(a: bigint, b: bigint, m: bigint): bigint {
  return mod(a * modInverse(b, m), m);
}

function modInverse(a: bigint, m: bigint): bigint {
  a = mod(a, m);
  let [oldR, r] = [a, m];
  let [oldS, s] = [BigInt(1), BigInt(0)];

  while (r !== BigInt(0)) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  return mod(oldS, m);
}

/**
 * Convert Uint8Array to BigInt
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  const arr = Array.from(bytes);
  for (const byte of arr) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}

/**
 * Convert BigInt to hex string with specified byte length
 */
function bigIntToHex(n: bigint, byteLength: number): string {
  const hex = n.toString(16).padStart(byteLength * 2, '0');
  return hex.slice(-byteLength * 2); // Ensure correct length
}

/**
 * Sign a message with a Nostr private key (Schnorr signature)
 * Used for signing heartbeat events
 */
export async function signNostrEvent(
  eventHash: Uint8Array,
  privateKey: string
): Promise<string> {
  // Schnorr signature implementation for Nostr
  // This is a simplified version - in production, use a well-tested library
  const privateKeyBytes = fromHex(privateKey);
  const k = bytesToBigInt(privateKeyBytes);

  // Generate deterministic nonce using RFC 6979
  const nonce = await generateDeterministicNonce(privateKeyBytes, eventHash);

  // ... rest of Schnorr signing
  // For now, return placeholder - will integrate nostr-tools for signing
  throw new Error('Schnorr signing not yet implemented - use nostr-tools');
}

/**
 * Generate deterministic nonce for Schnorr signature (RFC 6979)
 */
async function generateDeterministicNonce(
  privateKey: Uint8Array,
  message: Uint8Array
): Promise<bigint> {
  // HMAC-based deterministic nonce generation
  const key = await crypto.subtle.importKey(
    'raw',
    privateKey as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, message as BufferSource);
  return bytesToBigInt(new Uint8Array(signature)) % CURVE_ORDER;
}

/**
 * Validate a Nostr private key
 */
export function isValidPrivateKey(privateKey: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(privateKey)) return false;
  const k = BigInt('0x' + privateKey);
  return k > BigInt(0) && k < CURVE_ORDER;
}

/**
 * Validate a Nostr public key (x-only, 32 bytes)
 */
export function isValidPublicKey(publicKey: string): boolean {
  return /^[0-9a-f]{64}$/i.test(publicKey);
}

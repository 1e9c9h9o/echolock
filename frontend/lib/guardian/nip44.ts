/**
 * NIP-44 Encryption
 *
 * Implements NIP-44 versioned encryption for Nostr.
 * Used to encrypt Shamir shares for guardians and recipients.
 *
 * Security: Uses @noble/ciphers for ChaCha20-Poly1305
 * - Audited by Trail of Bits and Cure53
 * - Constant-time operations (side-channel resistant)
 * - Full NIP-44 v2 compliance
 *
 * @see https://github.com/nostr-protocol/nips/blob/master/44.md
 */

import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

// NIP-44 constants
const VERSION = 2;
const MIN_PLAINTEXT_SIZE = 1;
const MAX_PLAINTEXT_SIZE = 65535;

/**
 * Encrypt a message for a recipient using NIP-44 v2
 *
 * @param plaintext - Message to encrypt
 * @param recipientPubkey - Recipient's secp256k1 public key (hex, x-only)
 * @param senderPrivkey - Sender's secp256k1 private key (hex)
 * @returns Base64-encoded encrypted payload
 */
export async function encrypt(
  plaintext: string,
  recipientPubkey: string,
  senderPrivkey: string
): Promise<string> {
  const plaintextBytes = new TextEncoder().encode(plaintext);

  if (plaintextBytes.length < MIN_PLAINTEXT_SIZE) {
    throw new Error('Plaintext too short');
  }
  if (plaintextBytes.length > MAX_PLAINTEXT_SIZE) {
    throw new Error('Plaintext too long');
  }

  // Calculate shared secret using ECDH
  const sharedSecret = getSharedSecret(senderPrivkey, recipientPubkey);

  // Derive conversation key using HKDF
  const conversationKey = getConversationKey(sharedSecret);

  // Generate random nonce (32 bytes)
  const nonce = randomBytes(32);

  // Derive message keys from conversation key and nonce
  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);

  // Pad plaintext according to NIP-44 spec
  const paddedPlaintext = padPlaintext(plaintextBytes);

  // Encrypt with ChaCha20-Poly1305
  const cipher = chacha20poly1305(chachaKey, chachaNonce);
  const ciphertext = cipher.encrypt(paddedPlaintext);

  // Calculate MAC: HMAC-SHA256(nonce || ciphertext)
  const macData = new Uint8Array(nonce.length + ciphertext.length);
  macData.set(nonce);
  macData.set(ciphertext, nonce.length);
  const mac = hmac(sha256, hmacKey, macData);

  // Assemble payload: version (1) + nonce (32) + ciphertext (var) + mac (32)
  const payload = new Uint8Array(1 + 32 + ciphertext.length + 32);
  payload[0] = VERSION;
  payload.set(nonce, 1);
  payload.set(ciphertext, 33);
  payload.set(mac, 33 + ciphertext.length);

  // Return base64-encoded payload
  return bytesToBase64(payload);
}

/**
 * Decrypt a NIP-44 v2 encrypted message
 *
 * @param payload - Base64-encoded encrypted payload
 * @param senderPubkey - Sender's secp256k1 public key (hex, x-only)
 * @param recipientPrivkey - Recipient's secp256k1 private key (hex)
 * @returns Decrypted plaintext
 */
export async function decrypt(
  payload: string,
  senderPubkey: string,
  recipientPrivkey: string
): Promise<string> {
  // Decode payload
  const payloadBytes = base64ToBytes(payload);

  // Minimum size: 1 (version) + 32 (nonce) + 32 (min padded plaintext) + 16 (poly1305 tag) + 32 (mac)
  if (payloadBytes.length < 113) {
    throw new Error('Payload too short');
  }

  // Parse payload
  const version = payloadBytes[0];
  if (version !== VERSION) {
    throw new Error(`Unsupported NIP-44 version: ${version}`);
  }

  const nonce = payloadBytes.slice(1, 33);
  const mac = payloadBytes.slice(-32);
  const ciphertext = payloadBytes.slice(33, -32);

  // Calculate shared secret (ECDH is commutative)
  const sharedSecret = getSharedSecret(recipientPrivkey, senderPubkey);

  // Derive conversation key
  const conversationKey = getConversationKey(sharedSecret);

  // Derive message keys
  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);

  // Verify MAC first (before decryption)
  const macData = new Uint8Array(nonce.length + ciphertext.length);
  macData.set(nonce);
  macData.set(ciphertext, nonce.length);
  const expectedMac = hmac(sha256, hmacKey, macData);

  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error('Invalid MAC - message may have been tampered with');
  }

  // Decrypt with ChaCha20-Poly1305
  const cipher = chacha20poly1305(chachaKey, chachaNonce);
  const paddedPlaintext = cipher.decrypt(ciphertext);

  // Unpad plaintext
  const plaintext = unpadPlaintext(paddedPlaintext);

  return new TextDecoder().decode(plaintext);
}

/**
 * Calculate ECDH shared secret (x-coordinate of shared point)
 */
function getSharedSecret(privateKeyHex: string, publicKeyHex: string): Uint8Array {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKey = hexToBytes(publicKeyHex);

  // Lift x-only public key to full point
  const publicPoint = liftX(publicKey);

  // Compute shared point: privateKey * publicPoint
  const privateKeyBigInt = bytesToBigInt(privateKey);
  const sharedPoint = publicPoint.multiply(privateKeyBigInt);

  // Return x-coordinate as 32-byte shared secret
  return bigIntToBytes(sharedPoint.x, 32);
}

/**
 * Derive conversation key using HKDF-SHA256
 * Per NIP-44: conversationKey = HKDF(sharedSecret, salt=0x00*32, info="nip44-v2", L=32)
 */
function getConversationKey(sharedSecret: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecret, new Uint8Array(32), new TextEncoder().encode('nip44-v2'), 32);
}

/**
 * Derive message keys from conversation key and nonce
 * Per NIP-44: keys = HKDF(conversationKey, salt=nonce, info="nip44-v2", L=76)
 *   - chachaKey: bytes 0-31
 *   - chachaNonce: bytes 32-43
 *   - hmacKey: bytes 44-75
 */
function getMessageKeys(
  conversationKey: Uint8Array,
  nonce: Uint8Array
): {
  chachaKey: Uint8Array;
  chachaNonce: Uint8Array;
  hmacKey: Uint8Array;
} {
  const keys = hkdf(sha256, conversationKey, nonce, new TextEncoder().encode('nip44-v2'), 76);

  return {
    chachaKey: keys.slice(0, 32),
    chachaNonce: keys.slice(32, 44),
    hmacKey: keys.slice(44, 76),
  };
}

/**
 * Pad plaintext per NIP-44 spec
 *
 * Format: [2-byte length (big-endian)] [plaintext] [zero padding]
 * Total length is the smallest power of 2 >= (plaintext.length + 2), minimum 32
 */
function padPlaintext(plaintext: Uint8Array): Uint8Array {
  const unpaddedLen = plaintext.length;

  // Calculate padded length: smallest power of 2 >= (len + 2), min 32
  let paddedLen = 32;
  while (paddedLen < unpaddedLen + 2) {
    paddedLen *= 2;
  }

  const padded = new Uint8Array(paddedLen);
  // Length prefix (2 bytes, big-endian)
  padded[0] = (unpaddedLen >> 8) & 0xff;
  padded[1] = unpaddedLen & 0xff;
  padded.set(plaintext, 2);
  // Rest is already zeros (padding)

  return padded;
}

/**
 * Unpad plaintext per NIP-44 spec
 */
function unpadPlaintext(padded: Uint8Array): Uint8Array {
  if (padded.length < 2) {
    throw new Error('Padded plaintext too short');
  }

  // Read length prefix (2 bytes, big-endian)
  const len = (padded[0] << 8) | padded[1];

  if (len + 2 > padded.length) {
    throw new Error('Invalid padding: declared length exceeds buffer');
  }
  if (len < MIN_PLAINTEXT_SIZE) {
    throw new Error('Invalid padding: plaintext too short');
  }
  if (len > MAX_PLAINTEXT_SIZE) {
    throw new Error('Invalid padding: plaintext too long');
  }

  // Verify padding is zeros
  for (let i = 2 + len; i < padded.length; i++) {
    if (padded[i] !== 0) {
      throw new Error('Invalid padding: non-zero padding bytes');
    }
  }

  return padded.slice(2, 2 + len);
}

/**
 * Lift x-only public key to full secp256k1 point
 * Per BIP-340, the y-coordinate with even parity is chosen
 */
function liftX(xOnlyPubkey: Uint8Array): typeof secp256k1.Point.BASE {
  const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  const x = bytesToBigInt(xOnlyPubkey);

  // y² = x³ + 7 (mod p)
  const ySquared = mod(x ** 3n + 7n, p);

  // Compute y using Tonelli-Shanks (for p ≡ 3 mod 4: y = ySquared^((p+1)/4))
  const y = modPow(ySquared, (p + 1n) / 4n, p);

  // Verify we got a valid square root
  if (mod(y * y, p) !== ySquared) {
    throw new Error('Invalid x-only public key: no valid y coordinate');
  }

  // Choose even y (BIP-340)
  const yFinal = y % 2n === 0n ? y : p - y;

  return new secp256k1.Point(x, yFinal, 1n);
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Modular arithmetic helpers
 */
function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= 0n ? result : result + m;
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  base = mod(base, m);
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = mod(result * base, m);
    }
    exp = exp / 2n;
    base = mod(base * base, m);
  }
  return result;
}

/**
 * Byte conversion helpers
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const hex = n.toString(16).padStart(length * 2, '0');
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Base64 encoding/decoding (browser-compatible)
 */
function bytesToBase64(bytes: Uint8Array): string {
  // Convert to binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Re-export hex utilities for convenience
 */
export { bytesToHex, hexToBytes };

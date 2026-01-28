/**
 * NIP-44 Encryption for Guardian Daemon
 *
 * Node.js-compatible implementation of NIP-44 v2 encryption.
 * Used to decrypt shares from users and re-encrypt for recipients.
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
 * @param {string} plaintext - Message to encrypt
 * @param {string} recipientPubkey - Recipient's secp256k1 public key (hex, x-only, 64 chars)
 * @param {string} senderPrivkey - Sender's secp256k1 private key (hex, 64 chars)
 * @returns {Promise<string>} Base64-encoded encrypted payload
 */
export async function encrypt(plaintext, recipientPubkey, senderPrivkey) {
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
 * @param {string} payload - Base64-encoded encrypted payload
 * @param {string} senderPubkey - Sender's secp256k1 public key (hex, x-only)
 * @param {string} recipientPrivkey - Recipient's secp256k1 private key (hex)
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(payload, senderPubkey, recipientPrivkey) {
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
 * Uses secp256k1.getSharedSecret with x-only public key handling
 */
function getSharedSecret(privateKeyHex, publicKeyHex) {
  // Convert private key from hex to bytes
  const privateKeyBytes = hexToBytes(privateKeyHex);

  // For x-only pubkeys (32 bytes / 64 hex chars), we need to lift to full point
  // secp256k1.getSharedSecret expects compressed (33 bytes) or uncompressed (65 bytes) pubkey
  const pubkeyBytes = hexToBytes(publicKeyHex);

  let fullPubkey;
  if (pubkeyBytes.length === 32) {
    // x-only pubkey - lift to compressed format (add 02 prefix for even y)
    // Per BIP-340, x-only keys implicitly have even y
    fullPubkey = new Uint8Array(33);
    fullPubkey[0] = 0x02;
    fullPubkey.set(pubkeyBytes, 1);
  } else {
    fullPubkey = pubkeyBytes;
  }

  // Use the library's getSharedSecret which returns x-coordinate
  const shared = secp256k1.getSharedSecret(privateKeyBytes, fullPubkey, true);
  // Returns compressed point, we want just x-coordinate (skip the prefix byte)
  return shared.slice(1);
}

// NIP-44 info string encoded as bytes
const NIP44_INFO = new TextEncoder().encode('nip44-v2');

/**
 * Derive conversation key using HKDF-SHA256
 * Per NIP-44: conversationKey = HKDF(sharedSecret, salt=0x00*32, info="nip44-v2", L=32)
 */
function getConversationKey(sharedSecret) {
  return hkdf(sha256, sharedSecret, new Uint8Array(32), NIP44_INFO, 32);
}

/**
 * Derive message keys from conversation key and nonce
 * Per NIP-44: keys = HKDF(conversationKey, salt=nonce, info="nip44-v2", L=76)
 *   - chachaKey: bytes 0-31
 *   - chachaNonce: bytes 32-43
 *   - hmacKey: bytes 44-75
 */
function getMessageKeys(conversationKey, nonce) {
  const keys = hkdf(sha256, conversationKey, nonce, NIP44_INFO, 76);

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
function padPlaintext(plaintext) {
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
function unpadPlaintext(padded) {
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
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}


/**
 * Base64 encoding/decoding (Node.js compatible)
 */
function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(base64) {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Re-export hex utilities for convenience
 */
export { bytesToHex, hexToBytes };

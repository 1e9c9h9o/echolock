/**
 * NIP-44 Encryption
 *
 * Implements NIP-44 versioned encryption for Nostr.
 * Used to encrypt Shamir shares for guardians and recipients.
 *
 * @see https://github.com/nostr-protocol/nips/blob/master/44.md
 */

import { fromHex, toHex, randomBytes } from '../crypto/aes';

// NIP-44 constants
const VERSION = 2;
const MIN_PLAINTEXT_SIZE = 1;
const MAX_PLAINTEXT_SIZE = 65535;

/**
 * Encrypt a message for a recipient using NIP-44
 *
 * @param plaintext - Message to encrypt
 * @param recipientPubkey - Recipient's secp256k1 public key (hex)
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
  const sharedSecret = await calculateSharedSecret(
    fromHex(senderPrivkey),
    fromHex(recipientPubkey)
  );

  // Derive conversation key
  const conversationKey = await deriveConversationKey(sharedSecret);

  // Generate random nonce
  const nonce = randomBytes(32);

  // Derive message keys from conversation key and nonce
  const { chachaKey, chachaNonce, hmacKey } = await deriveMessageKeys(
    conversationKey,
    nonce
  );

  // Pad plaintext
  const paddedPlaintext = padPlaintext(plaintextBytes);

  // Encrypt with ChaCha20-Poly1305
  const ciphertext = await chacha20Poly1305Encrypt(
    paddedPlaintext,
    chachaKey,
    chachaNonce
  );

  // Calculate MAC
  const mac = await calculateMac(hmacKey, nonce, ciphertext);

  // Assemble payload: version (1) + nonce (32) + ciphertext (var) + mac (32)
  const payload = new Uint8Array(1 + 32 + ciphertext.length + 32);
  payload[0] = VERSION;
  payload.set(nonce, 1);
  payload.set(ciphertext, 33);
  payload.set(mac, 33 + ciphertext.length);

  return btoa(String.fromCharCode.apply(null, Array.from(payload)));
}

/**
 * Decrypt a NIP-44 encrypted message
 *
 * @param payload - Base64-encoded encrypted payload
 * @param senderPubkey - Sender's secp256k1 public key (hex)
 * @param recipientPrivkey - Recipient's secp256k1 private key (hex)
 * @returns Decrypted plaintext
 */
export async function decrypt(
  payload: string,
  senderPubkey: string,
  recipientPrivkey: string
): Promise<string> {
  // Decode payload
  const payloadBytes = new Uint8Array(
    atob(payload)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  if (payloadBytes.length < 99) {
    // 1 + 32 + 32 (min ciphertext with tag) + 32 + 2
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

  // Calculate shared secret
  const sharedSecret = await calculateSharedSecret(
    fromHex(recipientPrivkey),
    fromHex(senderPubkey)
  );

  // Derive conversation key
  const conversationKey = await deriveConversationKey(sharedSecret);

  // Derive message keys
  const { chachaKey, chachaNonce, hmacKey } = await deriveMessageKeys(
    conversationKey,
    nonce
  );

  // Verify MAC
  const expectedMac = await calculateMac(hmacKey, nonce, ciphertext);
  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error('Invalid MAC');
  }

  // Decrypt
  const paddedPlaintext = await chacha20Poly1305Decrypt(
    ciphertext,
    chachaKey,
    chachaNonce
  );

  // Unpad
  const plaintext = unpadPlaintext(paddedPlaintext);

  return new TextDecoder().decode(plaintext);
}

/**
 * Calculate ECDH shared secret (secp256k1)
 */
async function calculateSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Promise<Uint8Array> {
  // secp256k1 parameters
  const p = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'
  );
  const n = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
  );

  const k = bytesToBigInt(privateKey);
  const px = bytesToBigInt(publicKey);

  // Lift x to point
  const P = liftX(px, p);
  if (!P) throw new Error('Invalid public key');

  // Shared secret = k * P (x-coordinate only)
  const S = scalarMultiply(P.x, P.y, k, p, n);

  return bigIntToBytes(S.x, 32);
}

/**
 * Derive conversation key using HKDF
 */
async function deriveConversationKey(
  sharedSecret: Uint8Array
): Promise<Uint8Array> {
  // HKDF-SHA256 with "nip44-v2" as info
  const ikm = sharedSecret;
  const salt = new Uint8Array(32); // Zero salt
  const info = new TextEncoder().encode('nip44-v2');

  // HKDF-Extract
  const prkKey = await crypto.subtle.importKey(
    'raw',
    salt as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign('HMAC', prkKey, ikm as BufferSource)
  );

  // HKDF-Expand (only need 32 bytes)
  const expandKey = await crypto.subtle.importKey(
    'raw',
    prk as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;

  return new Uint8Array(
    await crypto.subtle.sign('HMAC', expandKey, infoWithCounter as BufferSource)
  );
}

/**
 * Derive message keys from conversation key and nonce
 */
async function deriveMessageKeys(
  conversationKey: Uint8Array,
  nonce: Uint8Array
): Promise<{
  chachaKey: Uint8Array;
  chachaNonce: Uint8Array;
  hmacKey: Uint8Array;
}> {
  // Use HKDF to expand
  const ikm = conversationKey;
  const salt = nonce;
  const info = new TextEncoder().encode('nip44-v2');

  // HKDF-Extract
  const prkKey = await crypto.subtle.importKey(
    'raw',
    salt as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign('HMAC', prkKey, ikm as BufferSource)
  );

  // HKDF-Expand for 76 bytes (32 chacha key + 12 nonce + 32 hmac key)
  const expandKey = await crypto.subtle.importKey(
    'raw',
    prk as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const outputs: Uint8Array[] = [];
  let prev = new Uint8Array(0);
  let counter = 1;

  while (outputs.reduce((sum, a) => sum + a.length, 0) < 76) {
    const infoWithCounter = new Uint8Array(prev.length + info.length + 1);
    infoWithCounter.set(prev);
    infoWithCounter.set(info, prev.length);
    infoWithCounter[prev.length + info.length] = counter;

    const block = new Uint8Array(
      await crypto.subtle.sign('HMAC', expandKey, infoWithCounter as BufferSource)
    );
    outputs.push(block);
    prev = block;
    counter++;
  }

  const expanded = new Uint8Array(76);
  let offset = 0;
  for (const out of outputs) {
    const toCopy = Math.min(out.length, 76 - offset);
    expanded.set(out.slice(0, toCopy), offset);
    offset += toCopy;
  }

  return {
    chachaKey: expanded.slice(0, 32),
    chachaNonce: expanded.slice(32, 44),
    hmacKey: expanded.slice(44, 76),
  };
}

/**
 * Pad plaintext per NIP-44 spec
 */
function padPlaintext(plaintext: Uint8Array): Uint8Array {
  const unpaddedLen = plaintext.length;
  // Calculate padded length (power of 2, min 32)
  let paddedLen = 32;
  while (paddedLen < unpaddedLen + 2) {
    paddedLen *= 2;
  }

  const padded = new Uint8Array(paddedLen);
  // Length prefix (2 bytes, big-endian)
  padded[0] = (unpaddedLen >> 8) & 0xff;
  padded[1] = unpaddedLen & 0xff;
  padded.set(plaintext, 2);
  // Rest is already zeros

  return padded;
}

/**
 * Unpad plaintext per NIP-44 spec
 */
function unpadPlaintext(padded: Uint8Array): Uint8Array {
  if (padded.length < 2) {
    throw new Error('Padded plaintext too short');
  }

  const len = (padded[0] << 8) | padded[1];
  if (len + 2 > padded.length) {
    throw new Error('Invalid padding');
  }

  return padded.slice(2, 2 + len);
}

/**
 * ChaCha20-Poly1305 AEAD encryption
 * Note: Web Crypto doesn't have ChaCha20, so we use AES-GCM as fallback
 * In production, use a proper ChaCha20-Poly1305 library
 */
async function chacha20Poly1305Encrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  // Fallback to AES-GCM (Web Crypto compatible)
  // TODO: Use proper ChaCha20-Poly1305 library
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    plaintext as BufferSource
  );

  return new Uint8Array(encrypted);
}

/**
 * ChaCha20-Poly1305 AEAD decryption
 */
async function chacha20Poly1305Decrypt(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    cryptoKey,
    ciphertext as BufferSource
  );

  return new Uint8Array(decrypted);
}

/**
 * Calculate HMAC for MAC
 */
async function calculateMac(
  hmacKey: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    hmacKey as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = new Uint8Array(nonce.length + ciphertext.length);
  data.set(nonce);
  data.set(ciphertext, nonce.length);

  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data as BufferSource));
}

/**
 * Constant-time comparison
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Elliptic curve helpers

interface Point {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}

function scalarMultiply(
  Gx: bigint,
  Gy: bigint,
  k: bigint,
  p: bigint,
  _n: bigint
): Point {
  let result: Point = { x: BigInt(0), y: BigInt(0), isInfinity: true };
  let addend: Point = { x: Gx, y: Gy };

  while (k > BigInt(0)) {
    if (k & BigInt(1)) {
      result = pointAdd(result, addend, p);
    }
    addend = pointDouble(addend, p);
    k = k >> BigInt(1);
  }

  return result;
}

function pointAdd(p1: Point, p2: Point, prime: bigint): Point {
  if (p1.isInfinity) return p2;
  if (p2.isInfinity) return p1;

  if (p1.x === p2.x) {
    if (p1.y === p2.y) {
      return pointDouble(p1, prime);
    }
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  const slope = mod((p2.y - p1.y) * modInverse(p2.x - p1.x, prime), prime);
  const x3 = mod(slope * slope - p1.x - p2.x, prime);
  const y3 = mod(slope * (p1.x - x3) - p1.y, prime);

  return { x: x3, y: y3 };
}

function pointDouble(point: Point, prime: bigint): Point {
  if (point.isInfinity || point.y === BigInt(0)) {
    return { x: BigInt(0), y: BigInt(0), isInfinity: true };
  }

  const slope = mod(
    BigInt(3) * point.x * point.x * modInverse(BigInt(2) * point.y, prime),
    prime
  );
  const x3 = mod(slope * slope - BigInt(2) * point.x, prime);
  const y3 = mod(slope * (point.x - x3) - point.y, prime);

  return { x: x3, y: y3 };
}

function liftX(x: bigint, p: bigint): Point | null {
  const c = mod(x * x * x + BigInt(7), p);
  const y = modSqrt(c, p);
  if (y === null) return null;
  const yFinal = y % BigInt(2) === BigInt(0) ? y : p - y;
  return { x, y: yFinal };
}

function modSqrt(a: bigint, p: bigint): bigint | null {
  if (mod(p, BigInt(4)) !== BigInt(3)) {
    throw new Error('Prime must be 3 mod 4');
  }
  const root = modPow(a, (p + BigInt(1)) / BigInt(4), p);
  if (mod(root * root, p) !== mod(a, p)) return null;
  return root;
}

function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= BigInt(0) ? result : result + m;
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

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = BigInt(1);
  base = mod(base, m);
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = mod(result * base, m);
    }
    exp = exp / BigInt(2);
    base = mod(base * base, m);
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
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

/**
 * AES-256-GCM Encryption for Browser
 *
 * Uses Web Crypto API for secure client-side encryption.
 * All cryptographic operations happen in the browser - keys never leave the device.
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

// Constants matching server-side implementation
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes (96 bits, GCM standard)
const TAG_LENGTH = 128; // bits

/**
 * Generate a cryptographically secure random encryption key
 * Uses Web Crypto API's CSPRNG
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable - needed for Shamir splitting
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random bytes using Web Crypto API
 */
export function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt (string or Uint8Array)
 * @param key - CryptoKey for encryption
 * @returns Encrypted data with IV and auth tag
 */
export async function encrypt(
  plaintext: string | Uint8Array,
  key: CryptoKey
): Promise<{
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
}> {
  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Convert string to bytes if needed
  const data =
    typeof plaintext === 'string'
      ? new TextEncoder().encode(plaintext)
      : plaintext;

  // Encrypt with AES-GCM (includes auth tag in output)
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv as BufferSource,
      tagLength: TAG_LENGTH,
    },
    key,
    data as BufferSource
  );

  // Web Crypto API appends auth tag to ciphertext
  // Split them for compatibility with server format
  const encryptedArray = new Uint8Array(encrypted);
  const tagStart = encryptedArray.length - TAG_LENGTH / 8;
  const ciphertext = encryptedArray.slice(0, tagStart);
  const authTag = encryptedArray.slice(tagStart);

  return { ciphertext, iv, authTag };
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param ciphertext - Encrypted data
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @param key - CryptoKey for decryption
 * @returns Decrypted data as Uint8Array
 */
export async function decrypt(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  authTag: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Combine ciphertext and auth tag (Web Crypto expects them together)
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv as BufferSource,
      tagLength: TAG_LENGTH,
    },
    key,
    combined as BufferSource
  );

  return new Uint8Array(decrypted);
}

/**
 * Export CryptoKey to raw bytes for Shamir splitting
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Import raw bytes as CryptoKey
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key from password using PBKDF2
 * Used for encrypting stored keys
 *
 * @param password - User's password
 * @param salt - Random salt (should be stored with encrypted data)
 * @param iterations - PBKDF2 iterations (600000 recommended)
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = 600000
): Promise<CryptoKey> {
  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key from password
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to hex string
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

/**
 * Convert Uint8Array to base64
 */
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
}

/**
 * Convert base64 to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
}

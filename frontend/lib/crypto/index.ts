/**
 * EchoLock Client-Side Cryptography
 *
 * This module provides all cryptographic operations for EchoLock.
 * ALL keys are generated and stored client-side. The server NEVER
 * has access to private keys or encryption keys.
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 *
 * Architecture:
 * 1. User creates a switch
 * 2. Browser generates: encryption key, Nostr keypair
 * 3. Browser encrypts message with encryption key
 * 4. Browser splits encryption key into 5 Shamir shares
 * 5. Browser stores private keys in IndexedDB (encrypted with user's password)
 * 6. Browser sends to server: encrypted message, shares, PUBLIC keys only
 * 7. Server distributes shares to Nostr relays
 * 8. Server can NEVER decrypt the message (no access to encryption key)
 */

// Re-export AES functions
export {
  generateEncryptionKey,
  encrypt,
  decrypt,
  exportKey,
  importKey,
  deriveKeyFromPassword,
  randomBytes,
  toHex,
  fromHex,
  toBase64,
  fromBase64,
} from './aes';

// Re-export Shamir functions (avoiding duplicate exports)
export {
  split,
  combine,
  splitSimple,
  serializeShare,
  deserializeShare,
  serializeCommitments,
  deserializeCommitments,
  generateAuthKey,
  computeShareHMAC,
  verifyShareHMAC,
  verifyShare as verifyShamirShare,
  verifyShareConsistency,
  type Share,
  type SplitResult,
  type VSSCommitments,
  type VerifiableShare,
} from './shamir';

// Re-export Nostr functions (avoiding duplicate exports)
export {
  generateNostrKeypair,
  getPublicKey,
  signSchnorr,
  verifySchnorr,
  computeSharedSecret,
  isValidPrivateKey,
  isValidPublicKey,
} from './nostr';

import {
  generateEncryptionKey,
  encrypt,
  decrypt,
  exportKey,
  importKey,
  deriveKeyFromPassword,
  randomBytes,
  toHex,
  fromHex,
  toBase64,
  fromBase64,
} from './aes';

import {
  splitSimple as shamirSplit,
  combine as shamirCombine,
  serializeShare,
  deserializeShare,
  generateAuthKey,
  computeShareHMAC,
  type Share,
} from './shamir';

import { generateNostrKeypair, isValidPrivateKey, isValidPublicKey } from './nostr';

/**
 * Shamir threshold configuration
 */
export interface ThresholdConfig {
  totalShares: number; // N - total number of shares
  threshold: number;   // M - shares required to reconstruct
}

/**
 * Default threshold configuration (3-of-5)
 */
export const DEFAULT_THRESHOLD: ThresholdConfig = {
  totalShares: 5,
  threshold: 3,
};

/**
 * Preset threshold configurations
 */
export const THRESHOLD_PRESETS: Record<string, ThresholdConfig & { name: string; description: string; useCases: string[] }> = {
  simple: {
    name: 'Simple (2-of-3)',
    description: 'Basic protection for personal use',
    totalShares: 3,
    threshold: 2,
    useCases: ['Personal notes', 'Low-risk information'],
  },
  balanced: {
    name: 'Balanced (3-of-5)',
    description: 'Recommended for most users',
    totalShares: 5,
    threshold: 3,
    useCases: ['Account passwords', 'Personal documents', 'Family messages'],
  },
  high: {
    name: 'High Security (4-of-7)',
    description: 'Enhanced security with more redundancy',
    totalShares: 7,
    threshold: 4,
    useCases: ['Financial information', 'Business secrets'],
  },
  enterprise: {
    name: 'Enterprise (5-of-9)',
    description: 'Maximum security for critical data',
    totalShares: 9,
    threshold: 5,
    useCases: ['Corporate secrets', 'Legal documents', 'Crypto keys'],
  },
};

/**
 * Validate threshold configuration
 */
export function validateThreshold(config: ThresholdConfig): { valid: boolean; error?: string } {
  const { totalShares, threshold } = config;

  if (threshold < 2) {
    return { valid: false, error: 'Threshold must be at least 2' };
  }
  if (totalShares < threshold) {
    return { valid: false, error: 'Total shares must be at least equal to threshold' };
  }
  if (totalShares > 15) {
    return { valid: false, error: 'Maximum 15 shares supported' };
  }
  if (threshold * 2 < totalShares) {
    return { valid: false, error: 'Threshold must be at least half of total shares for security' };
  }

  return { valid: true };
}

/**
 * Complete switch encryption payload
 * This is what gets stored locally and partially sent to the server
 */
export interface EncryptedSwitch {
  // Unique identifier
  switchId: string;

  // Encrypted message (server receives this)
  encryptedMessage: {
    ciphertext: string; // base64
    iv: string; // base64
    authTag: string; // base64
  };

  // Shamir shares (server receives these for distribution)
  shares: Array<{
    index: number;
    data: string; // hex
    hmac: string; // hex
  }>;

  // Threshold configuration
  thresholdConfig: ThresholdConfig;

  // Authentication key for shares (stored locally only)
  authKey: string; // hex

  // Nostr keypair (private key stored locally, public sent to server)
  nostr: {
    privateKey: string; // hex - LOCAL ONLY
    publicKey: string; // hex - sent to server
  };

  // Password-derived key salt (stored locally for re-deriving key)
  passwordSalt: string; // hex

  // Metadata
  createdAt: string; // ISO timestamp
}

/**
 * Data sent to server (NO private keys or encryption key)
 */
export interface ServerPayload {
  // Switch metadata
  title: string;
  checkInHours: number;
  recipients: Array<{ email: string; name: string }>;

  // Encrypted message
  encryptedMessage: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };

  // Shamir shares for distribution
  shares: Array<{
    index: number;
    data: string;
    hmac: string;
  }>;

  // Shamir threshold configuration
  shamirTotalShares: number;
  shamirThreshold: number;

  // PUBLIC key only
  nostrPublicKey: string;

  // Flag indicating client-side encryption
  clientSideEncryption: true;

  // Password-encrypted message for simple recovery (optional)
  recoveryEncrypted?: {
    ciphertext: string;
    iv: string;
    authTag: string;
    salt: string;
  };

  // Bitcoin commitment option
  bitcoinEnabled?: boolean;
}

/**
 * Create a new encrypted switch
 *
 * This is the main entry point for switch creation.
 * All cryptographic operations happen in the browser.
 *
 * @param message - The secret message to protect
 * @param password - User's password (for encrypting stored keys)
 * @param thresholdConfig - Optional Shamir threshold configuration (defaults to 3-of-5)
 * @returns EncryptedSwitch object with all crypto material
 */
export async function createEncryptedSwitch(
  message: string,
  password: string,
  thresholdConfig: ThresholdConfig = DEFAULT_THRESHOLD
): Promise<EncryptedSwitch> {
  // Validate threshold configuration
  const validation = validateThreshold(thresholdConfig);
  if (!validation.valid) {
    throw new Error(`Invalid threshold configuration: ${validation.error}`);
  }

  const { totalShares, threshold } = thresholdConfig;

  // 1. Generate unique switch ID
  const switchIdBytes = randomBytes(16);
  const switchId = toHex(switchIdBytes);

  // 2. Generate encryption key
  const encryptionKey = await generateEncryptionKey();

  // 3. Encrypt the message
  const { ciphertext, iv, authTag } = await encrypt(message, encryptionKey);

  // 4. Export encryption key for Shamir splitting
  const keyBytes = await exportKey(encryptionKey);

  // 5. Generate authentication key for shares
  const authKeyBytes = await generateAuthKey();

  // 6. Split encryption key into N shares (M required to reconstruct)
  const shares = shamirSplit(keyBytes, totalShares, threshold);

  // 7. Compute HMAC for each share
  const authenticatedShares = await Promise.all(
    shares.map(async (share) => {
      const hmac = await computeShareHMAC(share, authKeyBytes);
      return {
        index: share.x,
        data: toHex(share.data),
        hmac: toHex(hmac),
      };
    })
  );

  // 8. Generate Nostr keypair
  const nostrKeypair = await generateNostrKeypair();

  // 9. Generate salt for password-based key encryption
  const passwordSalt = randomBytes(32);

  // 10. Securely zero the raw encryption key
  keyBytes.fill(0);

  return {
    switchId,
    encryptedMessage: {
      ciphertext: toBase64(ciphertext),
      iv: toBase64(iv),
      authTag: toBase64(authTag),
    },
    shares: authenticatedShares,
    thresholdConfig,
    authKey: toHex(authKeyBytes),
    nostr: {
      privateKey: nostrKeypair.privateKey,
      publicKey: nostrKeypair.publicKey,
    },
    passwordSalt: toHex(passwordSalt),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Encrypt message with a recovery password
 * This creates a simple password-protected version for easy recipient recovery
 */
export async function encryptWithRecoveryPassword(
  message: string,
  recoveryPassword: string
): Promise<{ ciphertext: string; iv: string; authTag: string; salt: string }> {
  // Generate salt for password derivation
  const salt = randomBytes(32);

  // Derive key from password
  const key = await deriveKeyFromPassword(recoveryPassword, salt);

  // Encrypt the message
  const { ciphertext, iv, authTag } = await encrypt(message, key);

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    authTag: toBase64(authTag),
    salt: toHex(salt),
  };
}

/**
 * Decrypt message with recovery password
 */
export async function decryptWithRecoveryPassword(
  encrypted: { ciphertext: string; iv: string; authTag: string; salt: string },
  recoveryPassword: string
): Promise<string> {
  // Derive key from password using same salt
  const salt = fromHex(encrypted.salt);
  const key = await deriveKeyFromPassword(recoveryPassword, salt);

  // Decrypt the message
  const decrypted = await decrypt(
    fromBase64(encrypted.ciphertext),
    fromBase64(encrypted.iv),
    fromBase64(encrypted.authTag),
    key
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Prepare payload for server
 *
 * Extracts only the data that should be sent to the server.
 * Private keys and encryption key NEVER leave the client.
 *
 * @param encryptedSwitch - The encrypted switch data
 * @param title - Switch title
 * @param checkInHours - Check-in interval
 * @param recipients - List of recipients
 * @param recoveryEncrypted - Optional password-encrypted message for simple recovery
 */
export function prepareServerPayload(
  encryptedSwitch: EncryptedSwitch,
  title: string,
  checkInHours: number,
  recipients: Array<{ email: string; name: string }>,
  recoveryEncrypted?: { ciphertext: string; iv: string; authTag: string; salt: string },
  bitcoinEnabled?: boolean
): ServerPayload {
  return {
    title,
    checkInHours,
    recipients,
    encryptedMessage: encryptedSwitch.encryptedMessage,
    shares: encryptedSwitch.shares,
    shamirTotalShares: encryptedSwitch.thresholdConfig.totalShares,
    shamirThreshold: encryptedSwitch.thresholdConfig.threshold,
    nostrPublicKey: encryptedSwitch.nostr.publicKey,
    clientSideEncryption: true,
    recoveryEncrypted,
    bitcoinEnabled,
  };
}

/**
 * Encrypt local key storage with user's password
 *
 * Keys stored in IndexedDB are encrypted with a key derived from
 * the user's password. This provides protection at rest.
 */
export async function encryptForStorage(
  data: string,
  password: string,
  salt: Uint8Array
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const key = await deriveKeyFromPassword(password, salt);
  const { ciphertext, iv, authTag } = await encrypt(data, key);

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    authTag: toBase64(authTag),
  };
}

/**
 * Decrypt local key storage
 */
export async function decryptFromStorage(
  ciphertext: string,
  iv: string,
  authTag: string,
  password: string,
  salt: Uint8Array
): Promise<string> {
  const key = await deriveKeyFromPassword(password, salt);
  const decrypted = await decrypt(
    fromBase64(ciphertext),
    fromBase64(iv),
    fromBase64(authTag),
    key
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Reconstruct message from Shamir shares
 *
 * Used when the switch triggers and message needs to be recovered.
 * This would typically be done by guardians/recipients.
 */
export async function reconstructMessage(
  encryptedMessage: { ciphertext: string; iv: string; authTag: string },
  shares: Array<{ index: number; data: string }>,
  authKey?: string
): Promise<string> {
  // Convert shares to internal format
  const shareObjects: Share[] = shares.map((s) => ({
    x: s.index,
    data: fromHex(s.data),
  }));

  // Reconstruct encryption key
  const keyBytes = shamirCombine(shareObjects);

  // Import as CryptoKey
  const key = await importKey(keyBytes);

  // Decrypt message
  const decrypted = await decrypt(
    fromBase64(encryptedMessage.ciphertext),
    fromBase64(encryptedMessage.iv),
    fromBase64(encryptedMessage.authTag),
    key
  );

  // Zero the key bytes
  keyBytes.fill(0);

  return new TextDecoder().decode(decrypted);
}

/**
 * Verify that a share is authentic using HMAC
 */
export async function verifyShare(
  share: { index: number; data: string; hmac: string },
  authKey: string
): Promise<boolean> {
  const shareObj: Share = {
    x: share.index,
    data: fromHex(share.data),
  };

  const expectedHmac = await computeShareHMAC(shareObj, fromHex(authKey));
  const actualHmac = fromHex(share.hmac);

  if (expectedHmac.length !== actualHmac.length) return false;
  return expectedHmac.every((byte, i) => byte === actualHmac[i]);
}

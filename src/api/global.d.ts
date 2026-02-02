/**
 * Global TypeScript declarations for external modules and augmentations
 */

// External JS modules without type definitions
declare module 'node-cron' {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
  }

  export interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }

  export function schedule(
    expression: string,
    func: () => void | Promise<void>,
    options?: ScheduleOptions
  ): ScheduledTask;

  export function validate(expression: string): boolean;
}

// Bitcoin modules (JS files in src/bitcoin/)
declare module '*/bitcoin/commitment.js' {
  export function generateTimelockAddress(
    publicKey: string,
    lockTime: number,
    network?: string
  ): { address: string; redeemScript: string };

  export interface BitcoinCommitmentData {
    switchId: string;
    locktime: number;
    publicKey: string;
    address: string;
    script: string;
    txid: string | null;
    vout: number | null;
    amount: number;
    createdAt: string;
    confirmedAt: string | null;
    blockHeight: number | null;
    status: string;
    network: string;
  }

  export class BitcoinCommitment implements BitcoinCommitmentData {
    switchId: string;
    locktime: number;
    publicKey: string;
    address: string;
    script: string;
    txid: string | null;
    vout: number | null;
    amount: number;
    createdAt: string;
    confirmedAt: string | null;
    blockHeight: number | null;
    status: string;
    network: string;
    constructor(data: Partial<BitcoinCommitmentData>);
    getExplorerUrl(): string | null;
    getAddressUrl(): string;
    toJSON(): BitcoinCommitmentData;
  }

  export function createCommitment(
    switchId: string,
    locktime: number,
    publicKey: Buffer | string,
    options?: { network?: string; amount?: number }
  ): BitcoinCommitment;
}

declare module '*/bitcoin/testnetClient.js' {
  export function getCurrentBlockHeight(): Promise<number | null>;
  export function getTransaction(txid: string): Promise<unknown>;
}

// Augment tiny-secp256k1 to handle both ESM default and CommonJS exports
declare module 'tiny-secp256k1' {
  const ecc: {
    isPoint: (p: Uint8Array) => boolean;
    isPrivate: (d: Uint8Array) => boolean;
    pointCompress: (p: Uint8Array, compressed?: boolean) => Uint8Array;
    pointFromScalar: (d: Uint8Array, compressed?: boolean) => Uint8Array | null;
    pointMultiply: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean) => Uint8Array | null;
    pointAdd: (pA: Uint8Array, pB: Uint8Array, compressed?: boolean) => Uint8Array | null;
    privateAdd: (d: Uint8Array, tweak: Uint8Array) => Uint8Array | null;
    privateSub: (d: Uint8Array, tweak: Uint8Array) => Uint8Array | null;
    sign: (h: Uint8Array, d: Uint8Array, e?: Uint8Array) => Uint8Array;
    signSchnorr: (h: Uint8Array, d: Uint8Array, e?: Uint8Array) => Uint8Array;
    verify: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array, strict?: boolean) => boolean;
    verifySchnorr: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array) => boolean;
  };
  export = ecc;
  export default ecc;
}

// Internal JS modules without types
declare module '*/crypto/keyDerivation.js' {
  export const PBKDF2_ITERATIONS: number;
  export function deriveKey(password: string, salt: Buffer): Buffer;
  export function zeroize(buffer: Buffer): void;
  export function deriveKeyHierarchy(password: string, salt: Buffer | string): {
    masterKey: Buffer;
    authKey: Buffer;
    encryptionKey: Buffer;
    bitcoinKey: Buffer;
    salt: Buffer;
  };
  export function encrypt(data: Buffer | string, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer; authTag: Buffer };
  export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer;
  const _default: {
    deriveKey: typeof deriveKey;
    zeroize: typeof zeroize;
    deriveKeyHierarchy: typeof deriveKeyHierarchy;
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    PBKDF2_ITERATIONS: number;
  };
  export default _default;
}

declare module '*/crypto/encryption.js' {
  export function generateSymmetricKey(): Buffer;
  export function encrypt(plaintext: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer };
  export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer;
  export function encryptString(plaintext: string, key: Buffer): string;
  export function decryptString(ciphertext: string, key: Buffer): string;
}

declare module '*/crypto/shamir.js' {
  export function split(secret: Buffer, totalShares: number, threshold: number): Buffer[];
  export function combine(shares: Buffer[]): Buffer;
}

// Service modules
declare module '*/services/messageRetrievalService.js' {
  export interface SwitchData {
    id: string;
    nostr_public_key?: string;
    nostr_private_key_encrypted?: string;
    fragment_metadata?: unknown;
    relay_urls?: string[];
    fragment_encryption_salt?: string;
    auth_key_encrypted?: string;
    encrypted_message_salt?: string;
    encrypted_message_iv?: string;
    encrypted_message?: string;
  }

  export interface RetrievalResult {
    success: boolean;
    message?: string;
    error?: string;
    sharesUsed?: number;
    reconstructedMessage?: string;
  }

  export function retrieveAndReconstructMessage(switchData: SwitchData, password?: string): Promise<RetrievalResult>;
}

declare module '*/services/switchService.js' {
  export interface CreateSwitchData {
    message?: string;
    password?: string;
    title?: string;
    checkInHours?: number;
    recipients?: Array<{ email: string; name?: string }>;
    useBitcoinTimelock?: boolean;
    isDuplicate?: boolean;
    sourceSwitch?: string;
  }

  export interface CheckInResult {
    success: boolean;
    expiresAt?: Date;
    expiryTime?: Date;
    checkInCount?: number;
    error?: string;
    id?: string;
    title?: string;
    last_check_in?: Date;
    expires_at?: Date;
    check_in_count?: number;
  }

  export function createSwitch(userId: string, data: CreateSwitchData): Promise<{ id: string }>;
  export function checkInSwitch(switchId: string, userId: string, ipAddress?: string): Promise<CheckInResult>;
  export function releaseSwitch(switchId: string): Promise<{ success: boolean; error?: string }>;
}

declare module '*/services/backupCodeService.js' {
  export interface HashedBackupCode {
    hash: string;
    used: boolean;
  }

  export function generateBackupCodes(count?: number): string[];
  export function hashBackupCodes(codes: string[]): HashedBackupCode[];
  export function hashBackupCode(code: string): string;
  export function verifyBackupCode(code: string, hashes: HashedBackupCode[]): { valid: boolean; index: number };
}

// Core dead man switch module
declare module '*/core/deadManSwitch.js' {
  export interface TestReleaseResult {
    success: boolean;
    message?: string;
    reconstructedMessage?: string;
    bitcoinTx?: unknown;
    sharesUsed?: number;
  }

  export interface CreateSwitchResult {
    switchId: string;
    fragmentCount: number;
    requiredFragments: number;
    expiryTime: number;
    distribution?: {
      nostrPublicKey?: string;
      relays?: string[];
      distributionStatus?: string;
    };
  }

  export function testRelease(
    switchId: string,
    password?: string | null,
    dryRun?: boolean
  ): Promise<TestReleaseResult>;

  export function createSwitch(
    message: string,
    checkInHours: number,
    useBitcoinTimelock: boolean,
    password: string
  ): Promise<CreateSwitchResult>;
}

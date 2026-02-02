/**
 * Type declarations for external JavaScript modules
 * These modules are outside the src/api directory and don't have TypeScript definitions
 */

// Crypto modules
declare module '../../crypto/encryption.js' {
  export function encrypt(plaintext: Buffer, key: Buffer): {
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
  };
  export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer;
}

declare module '../../crypto/secretSharing.js' {
  export interface AuthenticatedShare {
    share: Buffer;
    hmac: Buffer;
    index: number;
  }
  export function createAuthenticatedShares(secret: Buffer, totalShares: number, threshold: number, authKey: Buffer): AuthenticatedShare[];
  export function combineAuthenticatedShares(shares: AuthenticatedShare[], authKey: Buffer): Promise<Buffer>;
}

declare module '../../crypto/keyDerivation.js' {
  export const PBKDF2_ITERATIONS: number;
  export function zeroize(buffer: Buffer): void;
  export function deriveKey(password: string, salt: Buffer): Buffer;
}

// Core modules
declare module '../../core/deadManSwitch.js' {
  export interface Distribution {
    nostrPublicKey?: string;
    relays?: string[];
    distributionStatus?: string;
  }

  export interface SwitchResult {
    switchId: string;
    fragmentCount: number;
    requiredFragments: number;
    expiryTime: number;
    distribution?: Distribution;
  }

  export function createSwitch(
    message: string,
    checkInHours: number,
    useBitcoinTimelock: boolean,
    password: string
  ): Promise<SwitchResult>;

  export function testRelease(switchId: string, password: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

declare module '../../core/config.js' {
  export interface Config {
    [key: string]: unknown;
  }
  export function loadConfig(): Config;
}

// Nostr modules
declare module '../../nostr/multiRelayClient.js' {
  export function publishFragment(
    switchId: string,
    index: number,
    data: string,
    relays: string[]
  ): Promise<void>;

  export function filterHealthyRelays(): Promise<string[]>;

  export function queryRelays(
    pubkey: string,
    relays: string[],
    kinds?: number[]
  ): Promise<unknown[]>;
}

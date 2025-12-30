/**
 * Recovery Types
 *
 * Types for recipient-side message recovery.
 * No server needed - everything from Nostr.
 *
 * @see CLAUDE.md - Phase 5: Full Autonomy
 */

import { NostrEvent } from '../nostr/types';

/**
 * A released share from a guardian
 */
export interface ReleasedShare {
  guardianNpub: string;
  shareIndex: number;
  encryptedShare: string;  // NIP-44 encrypted to recipient
  releaseEvent: NostrEvent;
  decryptedShare?: string; // After recipient decrypts
  timestamp: number;
}

/**
 * Recovery session for a switch
 */
export interface RecoverySession {
  switchId: string;
  userNpub: string;        // Original switch creator
  recipientNpub: string;   // Who is recovering
  shares: ReleasedShare[];
  threshold: number;       // K shares needed
  status: 'collecting' | 'ready' | 'decrypted' | 'failed';
  encryptedMessage?: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  decryptedMessage?: string;
  error?: string;
}

/**
 * Nostr query filter for recovery
 */
export interface RecoveryFilter {
  kinds: number[];
  '#p': string[];          // Recipient pubkey
  since?: number;          // Unix timestamp
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean;
  switchId: string;
  message?: string;
  error?: string;
  sharesUsed: number;
  timestamp: number;
}

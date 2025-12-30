/**
 * Guardian Network Types
 *
 * Defines the protocol for distributed switch monitoring.
 * Guardians hold Shamir shares and release them when heartbeats stop.
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { NOSTR_KINDS } from '../nostr/types';

/**
 * Guardian types by trust model
 */
export type GuardianType =
  | 'personal'      // Friend, family member
  | 'professional'  // Lawyer, executor
  | 'institutional' // EchoLock service
  | 'self-hosted';  // User's own server

/**
 * Guardian status
 */
export type GuardianStatus =
  | 'pending'       // Invitation sent, not accepted
  | 'active'        // Accepted and monitoring
  | 'unresponsive'  // Failed health checks
  | 'released'      // Has published their share
  | 'revoked';      // User removed this guardian

/**
 * Guardian definition
 */
export interface Guardian {
  id: string;                    // Unique identifier
  type: GuardianType;
  name: string;                  // Display name
  npub: string;                  // Nostr public key (hex)
  status: GuardianStatus;
  shareIndex: number;            // Shamir share index (1-5)
  enrolledAt?: string;           // ISO timestamp
  lastAckAt?: string;            // Last acknowledgment
  lastHealthCheck?: string;      // Last successful health check
  metadata?: {
    email?: string;              // For notifications
    relayUrls?: string[];        // Preferred relays
  };
}

/**
 * Guardian enrollment invitation
 */
export interface GuardianInvitation {
  id: string;
  switchId: string;
  guardianNpub: string;
  shareIndex: number;
  encryptedShare: string;        // NIP-44 encrypted share
  thresholdHours: number;
  createdAt: string;
  expiresAt: string;             // Invitation expiry
  recipientNpubs: string[];      // Who to notify on release
}

/**
 * Guardian enrollment event (kind 30079)
 *
 * Published by user to store encrypted share for guardian.
 */
export interface ShareStorageEventData {
  switchId: string;
  shareIndex: number;
  guardianNpub: string;
  encryptedShare: string;        // NIP-44 encrypted to guardian
  thresholdHours: number;
  recipientNpubs: string[];      // For release targeting
}

/**
 * Guardian acknowledgment event (kind 30083)
 *
 * Published by guardian to confirm enrollment.
 */
export interface GuardianAckEventData {
  switchId: string;
  shareIndex: number;
  userNpub: string;
  accepted: boolean;
  monitoringActive: boolean;
  relayUrls: string[];           // Where guardian monitors
}

/**
 * Share release event data (kind 30080)
 *
 * Published by guardian when heartbeat threshold exceeded.
 */
export interface ShareReleaseEventData {
  switchId: string;
  shareIndex: number;
  originalEventId: string;       // Reference to share storage event
  recipientNpubs: string[];
  encryptedSharesForRecipients: {
    [npub: string]: string;      // NIP-44 encrypted share per recipient
  };
  reason: 'heartbeat_timeout' | 'manual_release' | 'user_request';
  releaseTimestamp: number;
}

/**
 * Guardian health check result
 */
export interface GuardianHealthCheck {
  guardianNpub: string;
  timestamp: number;
  online: boolean;
  latencyMs?: number;
  lastHeartbeatSeen?: number;
  relayStatus: {
    [relayUrl: string]: 'connected' | 'disconnected' | 'error';
  };
}

/**
 * Switch monitoring configuration for guardians
 */
export interface MonitoringConfig {
  switchId: string;
  userNpub: string;
  thresholdHours: number;
  checkIntervalMinutes: number;  // How often to check heartbeats
  relayUrls: string[];           // Where to look for heartbeats
  gracePeriodHours: number;      // Extra time before release
  notifyOnRelease: boolean;
}

/**
 * Guardian registration event (kind 30082)
 *
 * Published by guardian to announce availability.
 */
export interface GuardianRegistrationData {
  name: string;
  type: GuardianType;
  publicKey: string;
  contactMethods?: {
    email?: string;
    nostrDm?: boolean;
  };
  capabilities: {
    maxSwitches: number;
    availability: 'high' | 'medium' | 'low';
    supportedRelays: string[];
  };
  terms?: {
    requiresPayment: boolean;
    paymentInfo?: string;
  };
}

/**
 * NIP-44 encryption interface
 */
export interface NIP44Encryption {
  encrypt(plaintext: string, recipientPubkey: string, senderPrivkey: string): Promise<string>;
  decrypt(ciphertext: string, senderPubkey: string, recipientPrivkey: string): Promise<string>;
}

/**
 * Guardian event kinds
 */
export const GUARDIAN_KINDS = {
  SHARE_STORAGE: NOSTR_KINDS.SHARE_STORAGE,
  SHARE_RELEASE: NOSTR_KINDS.SHARE_RELEASE,
  GUARDIAN_REGISTRATION: NOSTR_KINDS.GUARDIAN_REGISTRATION,
  GUARDIAN_ACK: NOSTR_KINDS.GUARDIAN_ACK,
} as const;

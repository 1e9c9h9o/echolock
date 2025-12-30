/**
 * Nostr Event Types for EchoLock
 *
 * Defines the NIP-XX event kinds used by the Guardian Network.
 * These are application-specific events (kind 30000-39999 range).
 *
 * @see CLAUDE.md - Nostr Event Kinds
 */

// Event kinds for EchoLock protocol
export const NOSTR_KINDS = {
  HEARTBEAT: 30078,           // User's alive signal
  SHARE_STORAGE: 30079,       // Encrypted share for guardian
  SHARE_RELEASE: 30080,       // Guardian publishes share
  MESSAGE_STORAGE: 30081,     // Encrypted message storage
  GUARDIAN_REGISTRATION: 30082, // Guardian announces availability
  GUARDIAN_ACK: 30083,        // Guardian acknowledges enrollment
} as const;

/**
 * Base Nostr Event structure (NIP-01)
 */
export interface NostrEvent {
  id: string;           // 32-byte hex SHA256 of serialized event
  pubkey: string;       // 32-byte hex public key
  created_at: number;   // Unix timestamp in seconds
  kind: number;         // Event kind
  tags: string[][];     // Array of tag arrays
  content: string;      // Event content
  sig: string;          // 64-byte hex Schnorr signature
}

/**
 * Unsigned event (before signing)
 */
export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/**
 * Heartbeat Event (kind 30078)
 *
 * Published by user to signal they are alive.
 * Guardians watch for these events.
 */
export interface HeartbeatEvent extends NostrEvent {
  kind: typeof NOSTR_KINDS.HEARTBEAT;
  tags: [
    ['d', string],              // Switch ID (unique per user)
    ['expiry', string],         // Unix timestamp when switch triggers
    ['threshold_hours', string], // Hours of silence before trigger
    ...(['guardian', string])[], // Guardian public keys
  ];
  content: '';                  // Always empty for heartbeats
}

/**
 * Heartbeat data for creating events
 */
export interface HeartbeatData {
  switchId: string;
  thresholdHours: number;
  guardianPubkeys: string[];
}

/**
 * Share Storage Event (kind 30079)
 *
 * Published by user to store encrypted Shamir share for a guardian.
 */
export interface ShareStorageEvent extends NostrEvent {
  kind: typeof NOSTR_KINDS.SHARE_STORAGE;
  tags: [
    ['d', string],              // "{switchId}:{guardianIndex}"
    ['p', string],              // Guardian's pubkey
    ['encrypted_for', string],  // Guardian's pubkey (recipient)
  ];
  content: string;              // NIP-44 encrypted share
}

/**
 * Share Release Event (kind 30080)
 *
 * Published by guardian when user misses heartbeat threshold.
 */
export interface ShareReleaseEvent extends NostrEvent {
  kind: typeof NOSTR_KINDS.SHARE_RELEASE;
  tags: [
    ['d', string],              // "{switchId}:{guardianIndex}"
    ['e', string],              // Original switch event ID
    ...(['p', string])[],       // Recipient pubkeys
  ];
  content: string;              // NIP-44 encrypted share for recipients
}

/**
 * Message Storage Event (kind 30081)
 *
 * Encrypted message stored on Nostr by user.
 */
export interface MessageStorageEvent extends NostrEvent {
  kind: typeof NOSTR_KINDS.MESSAGE_STORAGE;
  tags: [
    ['d', string],              // Switch ID
    ...(['p', string])[],       // Recipient pubkeys (for discovery)
  ];
  content: string;              // AES-256-GCM encrypted message
}

/**
 * Relay configuration
 */
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.nostr.info',
  'wss://nostr-pub.wellorder.net',
] as const;

/**
 * Relay connection status
 */
export type RelayStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RelayInfo {
  url: string;
  status: RelayStatus;
  lastSeen?: number;
}

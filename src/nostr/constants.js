'use strict';

// Nostr relay configuration
//
// Philosophy: Decentralized, community-run, geographically diverse.
// No single entity should control multiple relays in this list.
// Users can override via NOSTR_RELAYS environment variable.
//
// Selection criteria:
// - Community-operated (not corporate)
// - Geographic diversity
// - Proven reliability
// - Open source relay software preferred

export const RELIABLE_RELAYS = [
  // Major community relays
  'wss://relay.damus.io',      // Damus (iOS client) - North America
  'wss://relay.snort.social',  // Snort (web client) - Europe
  'wss://nos.lol',             // Community favorite - Europe
  'wss://relay.nostr.band',    // Search/indexing - Global

  // Paid/premium relays (sustainable model)
  'wss://nostr.wine',          // Paid relay - quality filtering

  // Geographic diversity
  'wss://relay.nostr.bg',      // Bulgaria
  'wss://nostr-pub.wellorder.net', // North America
  'wss://relay.current.fyi',   // Current app relay

  // Additional community relays
  'wss://nostr.mom',           // Community relay
  'wss://purplepag.es',        // NIP-65 relay discovery
];

// Relay selection criteria
export const RELAY_REQUIREMENTS = {
  // Minimum number of relays for any operation
  MIN_RELAY_COUNT: 7,

  // Minimum successful writes required
  MIN_SUCCESS_COUNT: 5,

  // Minimum successful reads required
  MIN_READ_COUNT: 3,

  // Connection timeout (milliseconds)
  CONNECTION_TIMEOUT: 5000,

  // Retry attempts for failed operations
  MAX_RETRIES: 3
};

// Nostr event kinds used by ECHOLOCK
export const EVENT_KINDS = {
  // Custom event kind for encrypted secret fragments
  SECRET_FRAGMENT: 30000,

  // Custom event kind for metadata
  METADATA: 30001,

  // Heartbeat/check-in events (NIP-78 parameterized replaceable)
  HEARTBEAT: 30078
};
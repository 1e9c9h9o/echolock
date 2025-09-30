'use strict';

// Nostr relay configuration
// List of reliable relay URLs for production use
//
// SECURITY: Relays must be geographically distributed
// No single entity should control multiple relays in this list

export const RELIABLE_RELAYS = [
  // NOTE: These are example relays - verify availability before production
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://nostr.mom',
  'wss://relay.current.fyi',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.bg',
  'wss://nostr.orangepill.dev'
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
  METADATA: 30001
};
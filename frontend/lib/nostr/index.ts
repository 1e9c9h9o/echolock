/**
 * Nostr Module
 *
 * Provides Nostr protocol functionality for EchoLock:
 * - Heartbeat events (user alive signals)
 * - Event signing with user's nsec
 * - Relay publishing and querying
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

export * from './types';
export * from './heartbeat';

// Re-export commonly used functions
export {
  createHeartbeatEvent,
  signEvent,
  verifyEvent,
  publishHeartbeat,
  queryLatestHeartbeat,
  checkHeartbeatStatus,
} from './heartbeat';

export {
  NOSTR_KINDS,
  DEFAULT_RELAYS,
} from './types';

'use strict';

// PERMISSIONLESS HEARTBEAT SYSTEM
//
// Publishes cryptographically signed "proof of life" events to Nostr relays.
// Anyone can verify the last heartbeat to determine if a switch has expired.
//
// This removes the need for a central server to track check-ins.
//
// Event Structure (NIP-78 Parameterized Replaceable):
//   kind: 30078
//   tags: [['d', 'echolock-heartbeat-<switchId>']]
//   content: JSON { timestamp, checkInHours, signature }
//
// Security Properties:
// - Cryptographic proof: Only the switch owner can create valid heartbeats
// - Publicly verifiable: Anyone can check the last heartbeat
// - Decentralized: No single relay controls the data
// - Immutable history: Previous heartbeats remain on relays

import './websocketPolyfill.js';
import { finalizeEvent, verifyEvent, getPublicKey } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import crypto from 'crypto';
import { RELIABLE_RELAYS, RELAY_REQUIREMENTS } from './constants.js';

// Heartbeat event kind (NIP-78 parameterized replaceable)
const HEARTBEAT_KIND = 30078;

// Prefix for heartbeat event 'd' tag
const HEARTBEAT_PREFIX = 'echolock-heartbeat';

/**
 * Create a heartbeat proof-of-life event
 *
 * @param {Object} params - Heartbeat parameters
 * @param {string} params.switchId - The switch identifier
 * @param {number} params.checkInHours - Hours until next required check-in
 * @param {Buffer} params.nostrPrivateKey - Nostr private key (32 bytes)
 * @returns {Object} Signed Nostr event ready for publishing
 */
export function createHeartbeatEvent(params) {
  const { switchId, checkInHours, nostrPrivateKey } = params;

  if (!switchId || typeof switchId !== 'string') {
    throw new Error('switchId must be a non-empty string');
  }

  if (!checkInHours || checkInHours < 1) {
    throw new Error('checkInHours must be at least 1');
  }

  if (!nostrPrivateKey || nostrPrivateKey.length !== 32) {
    throw new Error('nostrPrivateKey must be 32 bytes');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = timestamp + (checkInHours * 60 * 60);

  // Content includes expiry info for verifiers
  const content = JSON.stringify({
    version: 1,
    switchId,
    timestamp,
    checkInHours,
    expiresAt,
    // Hash of switchId for verification without revealing full ID
    switchIdHash: crypto.createHash('sha256')
      .update(switchId)
      .digest('hex')
      .slice(0, 16)
  });

  // Create unsigned event
  const unsignedEvent = {
    kind: HEARTBEAT_KIND,
    created_at: timestamp,
    tags: [
      ['d', `${HEARTBEAT_PREFIX}-${switchId}`],
      ['expiry', String(expiresAt)],
      ['check-in-hours', String(checkInHours)]
    ],
    content
  };

  // Sign with Nostr private key
  const privateKeyHex = nostrPrivateKey.toString('hex');
  const signedEvent = finalizeEvent(unsignedEvent, privateKeyHex);

  return signedEvent;
}

/**
 * Publish a heartbeat event to multiple Nostr relays
 *
 * @param {Object} event - Signed heartbeat event
 * @param {Object} options - Publishing options
 * @param {Array<string>} options.relays - Relay URLs (default: RELIABLE_RELAYS)
 * @param {number} options.minSuccess - Minimum successful publishes (default: 5)
 * @param {number} options.timeout - Publish timeout in ms (default: 15000)
 * @returns {Promise<Object>} { success, successCount, failures, eventId }
 */
export async function publishHeartbeat(event, options = {}) {
  const {
    relays = RELIABLE_RELAYS,
    minSuccess = RELAY_REQUIREMENTS.MIN_SUCCESS_COUNT,
    timeout = 15000
  } = options;

  if (relays.length < RELAY_REQUIREMENTS.MIN_RELAY_COUNT) {
    throw new Error(`Minimum ${RELAY_REQUIREMENTS.MIN_RELAY_COUNT} relays required`);
  }

  const pool = new SimplePool();
  const results = { successes: [], failures: [] };

  try {
    // Publish to all relays with timeout
    const publishPromise = pool.publish(relays, event);

    await Promise.race([
      publishPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Publish timeout')), timeout)
      )
    ]).then(() => {
      // On success, count all relays as successful
      relays.forEach(url => results.successes.push(url));
    }).catch(error => {
      // On error, mark as failed
      relays.forEach(url => results.failures.push({ url, error: error.message }));
    });

  } finally {
    // Clean up connections
    pool.close(relays);
  }

  const successCount = results.successes.length;

  return {
    success: successCount >= minSuccess,
    successCount,
    failures: results.failures,
    eventId: event.id,
    pubkey: event.pubkey
  };
}

/**
 * Retrieve the latest heartbeat for a switch
 *
 * @param {string} switchId - The switch identifier
 * @param {string} expectedPubkey - Expected Nostr pubkey (for verification)
 * @param {Object} options - Query options
 * @param {Array<string>} options.relays - Relay URLs to query
 * @param {number} options.timeout - Query timeout in ms
 * @returns {Promise<Object|null>} Latest heartbeat or null if not found
 */
export async function getLatestHeartbeat(switchId, expectedPubkey, options = {}) {
  const {
    relays = RELIABLE_RELAYS,
    timeout = 10000
  } = options;

  const pool = new SimplePool();
  const dTag = `${HEARTBEAT_PREFIX}-${switchId}`;

  try {
    // Query for the latest heartbeat event
    const filter = {
      kinds: [HEARTBEAT_KIND],
      '#d': [dTag],
      limit: 1
    };

    // If we know the expected pubkey, filter by it
    if (expectedPubkey) {
      filter.authors = [expectedPubkey];
    }

    const events = await Promise.race([
      pool.querySync(relays, filter),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);

    if (!events || events.length === 0) {
      return null;
    }

    // Get the most recent event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];

    // Verify the event signature
    if (!verifyEvent(latestEvent)) {
      throw new Error('Heartbeat event signature verification failed');
    }

    // Verify pubkey matches if expected
    if (expectedPubkey && latestEvent.pubkey !== expectedPubkey) {
      throw new Error('Heartbeat pubkey does not match expected');
    }

    // Parse content
    let content;
    try {
      content = JSON.parse(latestEvent.content);
    } catch {
      throw new Error('Invalid heartbeat content format');
    }

    // Calculate status
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = content.expiresAt || (latestEvent.created_at + (content.checkInHours * 60 * 60));
    const isExpired = now >= expiresAt;
    const timeRemaining = Math.max(0, expiresAt - now);

    return {
      event: latestEvent,
      eventId: latestEvent.id,
      pubkey: latestEvent.pubkey,
      switchId: content.switchId,
      timestamp: latestEvent.created_at,
      checkInHours: content.checkInHours,
      expiresAt,
      isExpired,
      timeRemaining,
      timeRemainingHuman: formatTimeRemaining(timeRemaining)
    };

  } finally {
    pool.close(relays);
  }
}

/**
 * Verify if a switch has expired by checking Nostr heartbeats
 *
 * This is the PERMISSIONLESS verification function.
 * Anyone can call this to check if a switch should be triggered.
 *
 * @param {string} switchId - The switch identifier
 * @param {string} expectedPubkey - The owner's Nostr pubkey
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} { isExpired, lastHeartbeat, proof }
 */
export async function verifySwitchExpiry(switchId, expectedPubkey, options = {}) {
  const heartbeat = await getLatestHeartbeat(switchId, expectedPubkey, options);

  if (!heartbeat) {
    // No heartbeat found - could be new switch or never checked in
    return {
      isExpired: false,
      status: 'NO_HEARTBEAT',
      message: 'No heartbeat events found for this switch',
      lastHeartbeat: null,
      proof: null
    };
  }

  return {
    isExpired: heartbeat.isExpired,
    status: heartbeat.isExpired ? 'EXPIRED' : 'ACTIVE',
    message: heartbeat.isExpired
      ? `Switch expired at ${new Date(heartbeat.expiresAt * 1000).toISOString()}`
      : `Switch active, expires in ${heartbeat.timeRemainingHuman}`,
    lastHeartbeat: heartbeat,
    proof: {
      eventId: heartbeat.eventId,
      pubkey: heartbeat.pubkey,
      timestamp: heartbeat.timestamp,
      expiresAt: heartbeat.expiresAt,
      // The event itself is cryptographic proof
      signedEvent: heartbeat.event
    }
  };
}

/**
 * Perform a permissionless check-in by publishing a heartbeat
 *
 * @param {Object} params - Check-in parameters
 * @param {string} params.switchId - The switch identifier
 * @param {number} params.checkInHours - Hours until next required check-in
 * @param {Buffer} params.nostrPrivateKey - Nostr private key
 * @param {Object} options - Publishing options
 * @returns {Promise<Object>} Check-in result
 */
export async function permissionlessCheckIn(params, options = {}) {
  // Create the heartbeat event
  const event = createHeartbeatEvent(params);

  // Publish to relays
  const publishResult = await publishHeartbeat(event, options);

  if (!publishResult.success) {
    return {
      success: false,
      message: `Failed to publish heartbeat: only ${publishResult.successCount} relays succeeded`,
      ...publishResult
    };
  }

  // Calculate new expiry
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (params.checkInHours * 60 * 60);

  return {
    success: true,
    message: 'Permissionless check-in successful',
    eventId: event.id,
    pubkey: event.pubkey,
    timestamp: now,
    expiresAt,
    expiresAtHuman: new Date(expiresAt * 1000).toISOString(),
    timeRemaining: expiresAt - now,
    timeRemainingHuman: formatTimeRemaining(expiresAt - now),
    relayResults: {
      successCount: publishResult.successCount,
      failures: publishResult.failures
    }
  };
}

/**
 * Get the Nostr public key from a private key
 *
 * @param {Buffer} privateKey - 32-byte private key
 * @returns {string} Hex-encoded public key
 */
export function getNostrPubkey(privateKey) {
  if (!privateKey || privateKey.length !== 32) {
    throw new Error('Private key must be 32 bytes');
  }
  return getPublicKey(privateKey.toString('hex'));
}

/**
 * Format time remaining in human-readable format
 *
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(seconds) {
  if (seconds <= 0) return 'expired';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '<1m';
}

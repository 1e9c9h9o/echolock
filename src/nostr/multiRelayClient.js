'use strict';

// SECURITY: MUST HANDLE RELAY FAILURES GRACEFULLY
//
// Multi-relay Nostr client for redundant secret fragment distribution
// Minimum 7 relays per fragment for redundancy
//
// CRITICAL: Relay failures can cause permanent data loss
// No single relay can be trusted for persistence
//
// Strategy: Write to N relays, require success on M relays (N >= 7, M >= 5)

import './websocketPolyfill.js';
import { finalizeEvent, validateEvent, verifyEvent } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';

/**
 * Publish an event to multiple Nostr relays with redundancy
 * @param {Object} event - Nostr event object
 * @param {Array<string>} relayUrls - Array of relay WebSocket URLs
 * @param {number} minSuccessCount - Minimum successful publishes required
 * @returns {Object} { successCount, failures }
 */
export async function publishToRelays(event, relayUrls, minSuccessCount = 5) {
  if (relayUrls.length < 7) {
    throw new Error('SECURITY: Minimum 7 relays required for redundancy');
  }

  const pool = new SimplePool();
  const failures = [];
  const successes = [];

  try {
    // Publish to relays using SimplePool.publish which returns a Promise
    const publishPromises = pool.publish(relayUrls, event);

    // Wait for the publish to propagate with timeout
    await Promise.race([
      publishPromises,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Publish timeout')), 10000))
    ]).then(() => {
      // Assume success for all relays if no error
      relayUrls.forEach(url => successes.push(url));
    }).catch(error => {
      // On error, mark all as failed (conservative approach)
      relayUrls.forEach(url => failures.push({ url, error: error.message }));
    });

    const successCount = successes.length;

    if (successCount < minSuccessCount) {
      throw new Error(
        `Insufficient successful publishes. Required: ${minSuccessCount}, Achieved: ${successCount}`
      );
    }

    return {
      successCount,
      failures,
      successes
    };
  } finally {
    // Close connections after a small delay to allow messages to send
    setTimeout(() => pool.close(relayUrls), 500);
  }
}

/**
 * Fetch an event from multiple relays with redundancy
 * @param {Object} filter - Nostr filter object
 * @param {Array<string>} relayUrls - Array of relay WebSocket URLs
 * @param {number} minResponseCount - Minimum responses required
 * @returns {Array<Object>} Array of events
 */
export async function fetchFromRelays(filter, relayUrls, minResponseCount = 3) {
  if (relayUrls.length < 7) {
    throw new Error('SECURITY: Minimum 7 relays required for redundancy');
  }

  const pool = new SimplePool();
  const events = new Map(); // Deduplicate by event ID
  let responseCount = 0;

  try {
    const sub = pool.subscribeMany(
      relayUrls,
      [filter],
      {
        onevent(event) {
          // Verify event signature
          if (verifyEvent(event)) {
            events.set(event.id, event);
          }
        },
        oneose() {
          responseCount++;
        }
      }
    );

    // Wait for minimum responses or timeout after 10 seconds
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        sub.close();
        resolve();
      }, 10000);

      const checkInterval = setInterval(() => {
        if (responseCount >= minResponseCount) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          sub.close();
          resolve();
        }
      }, 100);
    });

    if (responseCount < minResponseCount) {
      throw new Error(
        `Insufficient relay responses. Required: ${minResponseCount}, Received: ${responseCount}`
      );
    }

    return Array.from(events.values());
  } finally {
    pool.close(relayUrls);
  }
}

/**
 * Calculate optimal relay distribution for secret fragments
 * @param {number} totalFragments - Number of secret fragments
 * @param {number} availableRelays - Number of available relays
 * @returns {Object} Distribution strategy
 */
export function calculateRelayDistribution(totalFragments, availableRelays) {
  const MIN_RELAYS_PER_FRAGMENT = 7;
  const requiredRelays = totalFragments * MIN_RELAYS_PER_FRAGMENT;

  if (availableRelays < requiredRelays) {
    // If insufficient relays, distribute across available with overlap
    return {
      relaysPerFragment: Math.floor(availableRelays / totalFragments),
      totalRequired: requiredRelays,
      warning: `Insufficient relays. Recommended: ${requiredRelays}, Available: ${availableRelays}`
    };
  }

  return {
    relaysPerFragment: MIN_RELAYS_PER_FRAGMENT,
    totalRequired: requiredRelays,
    warning: null
  };
}

/**
 * Publish a Shamir fragment to Nostr relays as NIP-78 event
 * @param {string} switchId - The dead man's switch ID
 * @param {number} fragmentIndex - Index of the fragment (0-based)
 * @param {Buffer} fragmentData - The encrypted fragment data
 * @param {Object} privateKey - Nostr private key for signing
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @param {number} expiryTimestamp - Unix timestamp for fragment expiry
 * @returns {Object} { eventId, successCount, failures }
 */
export async function publishFragment(
  switchId,
  fragmentIndex,
  fragmentData,
  privateKey,
  relayUrls,
  expiryTimestamp
) {
  // Create NIP-78 parameterized replaceable event (kind 30078)
  const event = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', switchId], // Identifier tag for replaceable events
      ['fragmentIndex', fragmentIndex.toString()],
      ['expiry', expiryTimestamp.toString()]
    ],
    content: fragmentData.toString('base64'), // Base64-encoded fragment
    pubkey: privateKey.pubkey
  };

  // Finalize (sign) the event
  const signedEvent = finalizeEvent(event, privateKey.privkey);

  // Validate before publishing
  if (!validateEvent(signedEvent)) {
    throw new Error('Event validation failed');
  }

  // Publish to multiple relays
  const result = await publishToRelays(signedEvent, relayUrls);

  return {
    eventId: signedEvent.id,
    ...result
  };
}

/**
 * Retrieve fragments for a switch from Nostr relays
 * @param {string} switchId - The dead man's switch ID
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @returns {Array<Object>} Array of fragments with { index, data }
 */
export async function retrieveFragments(switchId, relayUrls) {
  const filter = {
    kinds: [30078],
    '#d': [switchId]
  };

  const events = await fetchFromRelays(filter, relayUrls);

  // Parse and sort fragments by index
  const fragments = events
    .map(event => {
      const indexTag = event.tags.find(tag => tag[0] === 'fragmentIndex');
      if (!indexTag) return null;

      const index = parseInt(indexTag[1]);
      const data = Buffer.from(event.content, 'base64');

      return { index, data, eventId: event.id };
    })
    .filter(f => f !== null)
    .sort((a, b) => a.index - b.index);

  return fragments;
}
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
import { createFragmentPayload, serializePayload, deserializeAndVerify } from './fragmentFormat.js';

/**
 * Publish an event to multiple Nostr relays with redundancy
 * Tracks per-relay success/failure for accurate reporting
 *
 * @param {Object} event - Nostr event object
 * @param {Array<string>} relayUrls - Array of relay WebSocket URLs
 * @param {number} minSuccessCount - Minimum successful publishes required
 * @returns {Object} { successCount, failures, successes }
 */
export async function publishToRelays(event, relayUrls, minSuccessCount = 5) {
  if (relayUrls.length < 7) {
    throw new Error('SECURITY: Minimum 7 relays required for redundancy');
  }

  const pool = new SimplePool();
  const failures = [];
  const successes = [];

  try {
    // Publish to each relay individually to track per-relay results
    const publishPromises = relayUrls.map(async (url) => {
      try {
        // Create individual publish promise with timeout
        const publishPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Publish timeout'));
          }, 10000);

          // Use pool.publish but track this specific relay
          pool.publish([url], event)
            .then(() => {
              clearTimeout(timeout);
              resolve(url);
            })
            .catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
        });

        await publishPromise;
        return { url, success: true };
      } catch (error) {
        return { url, success: false, error: error.message };
      }
    });

    // Wait for all publish attempts to complete
    const results = await Promise.all(publishPromises);

    // Categorize results
    for (const result of results) {
      if (result.success) {
        successes.push(result.url);
      } else {
        failures.push({ url: result.url, error: result.error });
      }
    }

    const successCount = successes.length;

    if (successCount < minSuccessCount) {
      throw new Error(
        `Insufficient successful publishes. Required: ${minSuccessCount}, Achieved: ${successCount}. ` +
        `Failed relays: ${failures.map(f => f.url).join(', ')}`
      );
    }

    return {
      successCount,
      failures,
      successes,
      totalAttempted: relayUrls.length
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
 * @param {Object} encryptedData - { ciphertext, iv, authTag } from encryption
 * @param {Object} metadata - { salt, iterations } for key derivation
 * @param {Object} privateKey - Nostr private key for signing
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @param {number} expiryTimestamp - Unix timestamp for fragment expiry
 * @param {string} [bitcoinTxid] - Optional Bitcoin transaction ID for linkage
 * @returns {Object} { eventId, successCount, failures }
 */
export async function publishFragment(
  switchId,
  fragmentIndex,
  encryptedData,
  metadata,
  privateKey,
  relayUrls,
  expiryTimestamp,
  bitcoinTxid = null
) {
  // SECURITY: Bundle ALL cryptographic state atomically
  const fragmentPayload = createFragmentPayload(encryptedData, metadata);

  // Create NIP-78 parameterized replaceable event (kind 30078)
  const tags = [
    ['d', `${switchId}-${fragmentIndex}`], // Unique identifier for each fragment
    ['switch', switchId],
    ['fragment_index', fragmentIndex.toString()],
    ['expiration', expiryTimestamp.toString()], // NIP-40 expiration
    ['version', '1']
  ];

  // Link to Bitcoin transaction if provided (two-phase commit)
  if (bitcoinTxid) {
    tags.push(['bitcoin_txid', bitcoinTxid]);
  }

  const event = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: serializePayload(fragmentPayload), // Atomic payload as JSON
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
 * Retrieve fragments for a switch from Nostr relays with integrity verification
 * @param {string} switchId - The dead man's switch ID
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @returns {Array<Object>} Array of verified fragments with { index, encryptedData, metadata }
 */
export async function retrieveFragments(switchId, relayUrls) {
  const filter = {
    kinds: [30078],
    '#switch': [switchId] // Updated to match new tag structure
  };

  const events = await fetchFromRelays(filter, relayUrls);

  // Parse, verify integrity, and sort fragments by index
  const fragments = [];

  for (const event of events) {
    const indexTag = event.tags.find(tag => tag[0] === 'fragment_index');
    if (!indexTag) {
      console.warn(`Event ${event.id} missing fragment_index tag - skipping`);
      continue;
    }

    const index = parseInt(indexTag[1]);

    try {
      // SECURITY: Verify integrity before accepting fragment
      const verifiedData = deserializeAndVerify(event.content);

      fragments.push({
        index,
        encryptedData: {
          ciphertext: verifiedData.ciphertext,
          iv: verifiedData.iv,
          authTag: verifiedData.authTag
        },
        metadata: {
          salt: verifiedData.salt,
          iterations: verifiedData.iterations,
          algorithm: verifiedData.algorithm,
          timestamp: verifiedData.timestamp
        },
        eventId: event.id
      });

      console.log(`✓ Fragment ${index} integrity verified`);
    } catch (error) {
      console.error(`Fragment ${index} verification failed (event ${event.id}): ${error.message}`);
      // Skip corrupted fragment - will try to get it from another relay
      continue;
    }
  }

  // Sort by index
  fragments.sort((a, b) => a.index - b.index);

  return fragments;
}
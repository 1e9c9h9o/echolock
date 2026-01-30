'use strict';

// Nostr relay health monitoring
// Monitor relay uptime and availability for informed relay selection
//
// CRITICAL: Relay failures can cause data loss
// Regular health checks ensure we use reliable relays

import './websocketPolyfill.js';
import { SimplePool } from 'nostr-tools/pool';

// Exponential backoff state for each relay
const relayBackoffState = new Map();

// Configuration for backoff and recovery
const BACKOFF_CONFIG = {
  baseDelay: 1000,       // 1 second
  maxDelay: 300000,      // 5 minutes max
  maxFailures: 10,       // After 10 failures, mark for recovery attempt
  recoveryInterval: 600000, // Try recovery every 10 minutes
};

// Track last recovery attempt time
let lastRecoveryAttempt = 0;

/**
 * Calculate exponential backoff delay
 * @param {number} attemptCount - Number of failed attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attemptCount, baseDelay = BACKOFF_CONFIG.baseDelay, maxDelay = BACKOFF_CONFIG.maxDelay) {
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if relay should be attempted based on backoff state
 * Includes recovery logic for relays that have been failed for too long
 *
 * @param {string} relayUrl - Relay URL
 * @returns {boolean} True if relay should be attempted
 */
function shouldAttemptRelay(relayUrl) {
  const state = relayBackoffState.get(relayUrl);
  if (!state) return true;

  const now = Date.now();

  // Normal case: check if backoff period has elapsed
  if (now >= state.nextAttemptTime) {
    return true;
  }

  // Recovery case: if relay has been failing for too long, try recovery
  // This prevents relays from being permanently blacklisted
  if (state.failureCount >= BACKOFF_CONFIG.maxFailures) {
    const timeSinceLastRecoveryAttempt = now - (state.lastRecoveryAttempt || 0);
    if (timeSinceLastRecoveryAttempt >= BACKOFF_CONFIG.recoveryInterval) {
      // Mark that we're attempting recovery
      state.lastRecoveryAttempt = now;
      relayBackoffState.set(relayUrl, state);
      console.log(`[RelayHealth] Attempting recovery for relay: ${relayUrl} (failed ${state.failureCount} times)`);
      return true;
    }
  }

  return false;
}

/**
 * Update backoff state after relay attempt
 * @param {string} relayUrl - Relay URL
 * @param {boolean} success - Whether the attempt succeeded
 */
function updateBackoffState(relayUrl, success) {
  if (success) {
    // Reset on success
    relayBackoffState.delete(relayUrl);
    return;
  }

  // Increment failure count on failure
  const state = relayBackoffState.get(relayUrl) || { failureCount: 0 };
  state.failureCount++;
  state.nextAttemptTime = Date.now() + calculateBackoff(state.failureCount);
  relayBackoffState.set(relayUrl, state);
}

/**
 * Check health of a single relay
 * @param {string} relayUrl - WebSocket URL of relay
 * @param {number} timeout - Connection timeout in milliseconds
 * @returns {Object} { url, healthy, latency, error }
 */
export async function checkRelayHealth(relayUrl, timeout = 5000) {
  // Check backoff state
  if (!shouldAttemptRelay(relayUrl)) {
    const state = relayBackoffState.get(relayUrl);
    return {
      url: relayUrl,
      healthy: false,
      latency: null,
      error: 'Relay in backoff state',
      backoff: {
        failureCount: state.failureCount,
        nextAttemptTime: state.nextAttemptTime
      }
    };
  }

  const startTime = Date.now();
  const pool = new SimplePool();

  try {
    // Test subscription with timeout
    const testFilter = { kinds: [1], limit: 1 };
    let receivedResponse = false;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), timeout)
    );

    const testPromise = new Promise((resolve) => {
      const sub = pool.subscribeMany(
        [relayUrl],
        [testFilter],
        {
          onevent() {
            receivedResponse = true;
            sub.close();
            resolve();
          },
          oneose() {
            receivedResponse = true;
            sub.close();
            resolve();
          }
        }
      );

      // Auto-close after 2 seconds
      setTimeout(() => {
        sub.close();
        resolve();
      }, 2000);
    });

    await Promise.race([testPromise, timeoutPromise]);

    const latency = Date.now() - startTime;

    if (!receivedResponse) {
      throw new Error('No response from relay');
    }

    updateBackoffState(relayUrl, true);

    return {
      url: relayUrl,
      healthy: true,
      latency,
      error: null
    };
  } catch (error) {
    updateBackoffState(relayUrl, false);

    return {
      url: relayUrl,
      healthy: false,
      latency: null,
      error: error.message
    };
  } finally {
    pool.close([relayUrl]);
  }
}

/**
 * Check health of multiple relays in parallel
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @returns {Array<Object>} Health status for each relay
 */
export async function checkMultipleRelays(relayUrls) {
  const healthChecks = relayUrls.map(url => checkRelayHealth(url));
  const results = await Promise.allSettled(healthChecks);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        url: relayUrls[index],
        healthy: false,
        latency: null,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Filter relays to only return healthy ones
 * @param {Array<string>} relayUrls - Array of relay URLs
 * @param {number} minHealthyCount - Minimum healthy relays required
 * @returns {Array<string>} Filtered list of healthy relays
 */
export async function filterHealthyRelays(relayUrls, minHealthyCount = 7) {
  const healthResults = await checkMultipleRelays(relayUrls);
  const healthy = healthResults
    .filter(result => result.healthy)
    .map(result => result.url);

  if (healthy.length < minHealthyCount) {
    throw new Error(
      `Insufficient healthy relays. Required: ${minHealthyCount}, Found: ${healthy.length}`
    );
  }

  return healthy;
}

/**
 * Get backoff state for all relays
 * @returns {Map} Map of relay URLs to backoff state
 */
export function getBackoffState() {
  return new Map(relayBackoffState);
}

/**
 * Reset backoff state for a specific relay or all relays
 * @param {string} relayUrl - Optional relay URL to reset
 */
export function resetBackoffState(relayUrl = null) {
  if (relayUrl) {
    relayBackoffState.delete(relayUrl);
  } else {
    relayBackoffState.clear();
  }
}

/**
 * Attempt to recover failed relays
 * This function tries to reconnect to relays that have been in backoff state
 *
 * @param {Array<string>} relayUrls - Optional list of specific relays to recover
 * @returns {Object} { recovered, stillFailed, total }
 */
export async function attemptRelayRecovery(relayUrls = null) {
  const now = Date.now();

  // Don't attempt recovery too frequently
  if (now - lastRecoveryAttempt < BACKOFF_CONFIG.recoveryInterval / 2) {
    return {
      recovered: [],
      stillFailed: [],
      total: 0,
      skipped: true,
      reason: 'Recovery attempted too recently',
    };
  }

  lastRecoveryAttempt = now;

  // Get relays to recover
  const failedRelays = relayUrls
    ? relayUrls.filter((url) => relayBackoffState.has(url))
    : Array.from(relayBackoffState.keys());

  if (failedRelays.length === 0) {
    return {
      recovered: [],
      stillFailed: [],
      total: 0,
      skipped: false,
    };
  }

  console.log(`[RelayHealth] Attempting recovery for ${failedRelays.length} failed relay(s)`);

  const recovered = [];
  const stillFailed = [];

  // Check each failed relay
  for (const relayUrl of failedRelays) {
    // Temporarily clear backoff to allow health check
    const previousState = relayBackoffState.get(relayUrl);
    relayBackoffState.delete(relayUrl);

    const health = await checkRelayHealth(relayUrl);

    if (health.healthy) {
      recovered.push(relayUrl);
      console.log(`[RelayHealth] Recovered relay: ${relayUrl}`);
    } else {
      stillFailed.push(relayUrl);
      // Restore previous state but update recovery attempt time
      if (previousState) {
        previousState.lastRecoveryAttempt = now;
        relayBackoffState.set(relayUrl, previousState);
      }
    }
  }

  return {
    recovered,
    stillFailed,
    total: failedRelays.length,
    skipped: false,
  };
}

/**
 * Get statistics about relay health
 * @returns {Object} Statistics about relay states
 */
export function getRelayHealthStats() {
  const now = Date.now();
  let healthy = 0;
  let inBackoff = 0;
  let criticallyFailed = 0;

  for (const [url, state] of relayBackoffState) {
    if (now >= state.nextAttemptTime) {
      // Backoff expired, will be attempted next time
      inBackoff++;
    } else if (state.failureCount >= BACKOFF_CONFIG.maxFailures) {
      criticallyFailed++;
    } else {
      inBackoff++;
    }
  }

  return {
    healthy,
    inBackoff,
    criticallyFailed,
    total: relayBackoffState.size,
    lastRecoveryAttempt: lastRecoveryAttempt ? new Date(lastRecoveryAttempt).toISOString() : null,
  };
}
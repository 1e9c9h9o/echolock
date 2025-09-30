'use strict';

// Configuration management for ECHOLOCK
// Handles environment variables and default settings
//
// SECURITY: Validates all configuration parameters
// Invalid configurations can compromise security

import { CURRENT_NETWORK, TIMELOCK_CONSTANTS } from '../bitcoin/constants.js';
import { RELIABLE_RELAYS, RELAY_REQUIREMENTS } from '../nostr/constants.js';

/**
 * Load and validate configuration
 * @returns {Object} Validated configuration object
 */
export function loadConfig() {
  const config = {
    // Bitcoin configuration
    bitcoin: {
      network: process.env.BITCOIN_NETWORK || 'testnet',
      networkConfig: CURRENT_NETWORK
    },

    // Nostr configuration
    nostr: {
      relays: process.env.NOSTR_RELAYS
        ? process.env.NOSTR_RELAYS.split(',').map(r => r.trim())
        : RELIABLE_RELAYS,
      minRelayCount: parseInt(process.env.MIN_RELAY_COUNT) || RELAY_REQUIREMENTS.MIN_RELAY_COUNT
    },

    // Timelock configuration
    timelock: {
      checkInHours: parseInt(process.env.CHECK_IN_HOURS) || TIMELOCK_CONSTANTS.DEFAULT_CHECK_IN_HOURS,
      minFutureHours: TIMELOCK_CONSTANTS.MIN_FUTURE_HOURS
    },

    // Debug mode
    debug: process.env.DEBUG === 'true'
  };

  validateConfig(config);
  return config;
}

/**
 * Validate configuration parameters
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  // Validate Bitcoin network
  if (config.bitcoin.network !== 'testnet') {
    throw new Error(
      'SECURITY: Only testnet is allowed until professional security audit is completed'
    );
  }

  // Validate relay count
  if (config.nostr.relays.length < config.nostr.minRelayCount) {
    throw new Error(
      `Insufficient relays configured. Required: ${config.nostr.minRelayCount}, Found: ${config.nostr.relays.length}`
    );
  }

  // Validate check-in interval
  if (config.timelock.checkInHours < config.timelock.minFutureHours) {
    throw new Error(
      `Check-in interval too short. Minimum: ${config.timelock.minFutureHours} hours`
    );
  }

  // Validate relay URLs
  for (const relay of config.nostr.relays) {
    if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
      throw new Error(`Invalid relay URL: ${relay}. Must use ws:// or wss://`);
    }
  }
}

/**
 * Get configuration value by path
 * @param {Object} config - Configuration object
 * @param {string} path - Dot-notation path (e.g., 'bitcoin.network')
 * @returns {*} Configuration value
 */
export function getConfigValue(config, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
}
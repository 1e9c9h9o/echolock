'use strict';

// Bitcoin network constants
// SECURITY: TESTNET ONLY - Production use requires security audit

export const NETWORK = {
  TESTNET: {
    name: 'testnet',
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'tb',
    bip32: {
      public: 0x043587cf,
      private: 0x04358394
    },
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef
  }
};

// SECURITY: This must be 'testnet' until professional audit completed
export const CURRENT_NETWORK = NETWORK.TESTNET;

// Timelock safety margins
export const TIMELOCK_CONSTANTS = {
  // Bitcoin median time past can lag up to 2 hours
  MTP_UNCERTAINTY_HOURS: 2,

  // Minimum time in future for timelock (safety margin)
  MIN_FUTURE_HOURS: 24,

  // Recommended check-in interval
  DEFAULT_CHECK_IN_HOURS: 72
};

// Transaction confirmation targets
export const CONFIRMATION_TARGETS = {
  URGENT: 1,    // ~10 minutes
  NORMAL: 6,    // ~1 hour
  ECONOMY: 144  // ~24 hours
};
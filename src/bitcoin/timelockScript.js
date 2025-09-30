'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - MUST BE MOCK-TESTABLE
//
// Bitcoin timelock script generation using OP_CHECKLOCKTIMEVERIFY
// Implements absolute timelocks for dead man's switch functionality
//
// CRITICAL: Timelock errors can result in premature or delayed secret release
// Bitcoin median time past (MTP) has ~2 hour uncertainty window
//
// Library: bitcoinjs-lib (industry standard)

/**
 * Generate a Bitcoin timelock script using OP_CHECKLOCKTIMEVERIFY
 *
 * Script format:
 * <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
 *
 * @param {number} locktime - Unix timestamp for timelock
 * @param {Buffer} publicKey - Bitcoin public key
 * @returns {Buffer} Bitcoin script
 */
export function createTimelockScript(locktime, publicKey) {
  // TODO: Implement using bitcoinjs-lib
  // SECURITY: Validate locktime is in future
  // SECURITY: Account for Bitcoin MTP (median time past) ~2 hour window
  throw new Error('Not implemented - requires bitcoinjs-lib');
}

/**
 * Estimate when a timelock will actually unlock (accounting for MTP)
 * @param {number} locktime - Desired unlock timestamp
 * @returns {Object} { earliest, expected, latest }
 */
export function estimateUnlockTime(locktime) {
  const MTP_WINDOW = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  return {
    earliest: locktime,
    expected: locktime + (MTP_WINDOW / 2),
    latest: locktime + MTP_WINDOW
  };
}

/**
 * Validate timelock parameters
 * @param {number} locktime - Unix timestamp
 * @throws {Error} If locktime is invalid
 */
export function validateTimelock(locktime) {
  const now = Math.floor(Date.now() / 1000);
  const MIN_FUTURE_TIME = 24 * 60 * 60; // 24 hours minimum

  if (locktime <= now) {
    throw new Error('Timelock must be in the future');
  }

  if (locktime < now + MIN_FUTURE_TIME) {
    throw new Error('Timelock must be at least 24 hours in the future');
  }

  // Bitcoin uses 32-bit timestamps until ~2106
  const MAX_TIMESTAMP = 0x7FFFFFFF;
  if (locktime > MAX_TIMESTAMP) {
    throw new Error('Timelock exceeds Bitcoin timestamp limit (year 2106)');
  }
}
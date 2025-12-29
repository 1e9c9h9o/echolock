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
//
// References:
// - BIP65: OP_CHECKLOCKTIMEVERIFY
// - Bitcoin Developer Guide: Timelocks

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { CURRENT_NETWORK } from './constants.js';

// Initialize ECC library
bitcoin.initEccLib(ecc);

// MTP (Median Time Past) uncertainty window
const MTP_WINDOW_SECONDS = 2 * 60 * 60; // 2 hours

// Bitcoin timestamp threshold (values < 500000000 are block heights)
const LOCKTIME_THRESHOLD = 500000000;

/**
 * Generate a Bitcoin timelock script using OP_CHECKLOCKTIMEVERIFY
 *
 * Script format:
 * <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
 *
 * This script enforces that:
 * 1. The transaction's nLockTime must be >= locktime
 * 2. The transaction's nSequence must be < 0xFFFFFFFF
 * 3. A valid signature from the public key is required
 *
 * @param {number} locktime - Unix timestamp or block height for timelock
 * @param {Buffer} publicKey - Compressed Bitcoin public key (33 bytes)
 * @returns {Buffer} Bitcoin script
 * @throws {Error} If parameters are invalid
 */
export function createTimelockScript(locktime, publicKey) {
  // Validate locktime
  validateTimelock(locktime);

  // Validate public key
  if (!Buffer.isBuffer(publicKey) || publicKey.length !== 33) {
    throw new Error('Public key must be a 33-byte compressed key');
  }

  // Compile the script
  const script = bitcoin.script.compile([
    bitcoin.script.number.encode(locktime),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.opcodes.OP_DROP,
    publicKey,
    bitcoin.opcodes.OP_CHECKSIG
  ]);

  return script;
}

/**
 * Create a P2SH (Pay-to-Script-Hash) address from a timelock script
 *
 * @param {Buffer} script - Timelock script
 * @returns {string} Bitcoin address (testnet or mainnet based on CURRENT_NETWORK)
 */
export function createTimelockAddress(script) {
  const p2sh = bitcoin.payments.p2sh({
    redeem: { output: script, network: CURRENT_NETWORK },
    network: CURRENT_NETWORK
  });

  return p2sh.address;
}

/**
 * Create a P2WSH (Pay-to-Witness-Script-Hash) address for SegWit
 * More efficient and lower fees than P2SH
 *
 * @param {Buffer} script - Timelock script
 * @returns {string} Native SegWit address (bech32)
 */
export function createTimelockAddressSegWit(script) {
  const p2wsh = bitcoin.payments.p2wsh({
    redeem: { output: script, network: CURRENT_NETWORK },
    network: CURRENT_NETWORK
  });

  return p2wsh.address;
}

/**
 * Estimate when a timelock will actually unlock (accounting for MTP)
 *
 * Bitcoin uses Median Time Past (MTP) for timelock validation, which is the
 * median of the last 11 block timestamps. This creates a ~2 hour window of
 * uncertainty.
 *
 * Note: All values returned are in milliseconds for consistency.
 *
 * @param {number} locktime - Desired unlock timestamp (Unix seconds) or block height
 * @returns {Object} { earliest, expected, latest } in milliseconds
 */
export function estimateUnlockTime(locktime) {
  const isBlockHeight = locktime < LOCKTIME_THRESHOLD;

  if (isBlockHeight) {
    // Block height based - return as-is (caller must convert)
    return {
      earliest: locktime,
      expected: locktime,
      latest: locktime + 6, // ~1 hour variance
      isBlockHeight: true,
      note: 'Block heights have ~10 minute variance per block'
    };
  }

  // Timestamp based - return in milliseconds
  const locktimeMs = locktime * 1000;
  const mtpWindowMs = MTP_WINDOW_SECONDS * 1000;

  return {
    earliest: locktimeMs,
    expected: locktimeMs + (mtpWindowMs / 2),
    latest: locktimeMs + mtpWindowMs,
    isBlockHeight: false,
    note: 'Timestamp has ~2 hour MTP uncertainty window'
  };
}

/**
 * Validate timelock parameters
 *
 * @param {number} locktime - Unix timestamp or block height
 * @throws {Error} If locktime is invalid
 */
export function validateTimelock(locktime) {
  if (typeof locktime !== 'number' || !Number.isInteger(locktime)) {
    throw new Error('Locktime must be an integer');
  }

  if (locktime < 0) {
    throw new Error('Locktime cannot be negative');
  }

  const now = Math.floor(Date.now() / 1000);
  const isBlockHeight = locktime < LOCKTIME_THRESHOLD;

  if (!isBlockHeight) {
    // Timestamp based validation
    const MIN_FUTURE_TIME = 24 * 60 * 60; // 24 hours minimum

    if (locktime <= now) {
      throw new Error('Timelock must be in the future');
    }

    if (locktime < now + MIN_FUTURE_TIME) {
      throw new Error('Timelock must be at least 24 hours in the future');
    }
  }

  // Bitcoin uses 32-bit timestamps until ~2106
  const MAX_TIMESTAMP = 0x7FFFFFFF;
  if (locktime > MAX_TIMESTAMP) {
    throw new Error('Locktime exceeds Bitcoin limit (year 2106)');
  }
}

/**
 * Parse timelock from script
 *
 * @param {Buffer} script - Timelock script
 * @returns {Object} { locktime, publicKey } or null if not a valid timelock script
 */
export function parseTimelockScript(script) {
  try {
    const decompiled = bitcoin.script.decompile(script);

    if (!decompiled || decompiled.length !== 5) {
      return null;
    }

    const [locktimeBuffer, cltv, drop, pubkey, checksig] = decompiled;

    if (cltv !== bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY ||
        drop !== bitcoin.opcodes.OP_DROP ||
        checksig !== bitcoin.opcodes.OP_CHECKSIG) {
      return null;
    }

    const locktime = bitcoin.script.number.decode(locktimeBuffer);

    return {
      locktime,
      publicKey: pubkey,
      isBlockHeight: locktime < LOCKTIME_THRESHOLD
    };
  } catch {
    return null;
  }
}

/**
 * Check if a timelock is currently valid (can be spent)
 *
 * @param {number} locktime - Timelock value
 * @param {number} currentBlockHeight - Current Bitcoin block height
 * @returns {Object} { isValid, reason, blocksRemaining?, timeRemaining? }
 */
export function checkTimelockValidity(locktime, currentBlockHeight) {
  const now = Math.floor(Date.now() / 1000);
  const isBlockHeight = locktime < LOCKTIME_THRESHOLD;

  if (isBlockHeight) {
    const isValid = currentBlockHeight >= locktime;
    const blocksRemaining = isValid ? 0 : locktime - currentBlockHeight;

    return {
      isValid,
      type: 'block_height',
      reason: isValid
        ? `Timelock valid: current block ${currentBlockHeight} >= required block ${locktime}`
        : `Timelock not valid: ${blocksRemaining} blocks remaining`,
      blocksRemaining,
      estimatedTimeRemaining: blocksRemaining * 10 * 60 * 1000 // ~10 min per block
    };
  }

  // Timestamp based
  const isValid = now >= locktime;
  const timeRemaining = isValid ? 0 : (locktime - now) * 1000;

  return {
    isValid,
    type: 'timestamp',
    reason: isValid
      ? `Timelock valid: current time >= locktime`
      : `Timelock not valid: ${Math.ceil(timeRemaining / 1000 / 60)} minutes remaining`,
    timeRemaining,
    mtpNote: isValid ? null : 'Add ~2 hours for MTP uncertainty'
  };
}

/**
 * Create complete timelock setup for a dead man's switch
 *
 * @param {number} locktime - When the timelock expires
 * @param {Buffer} publicKey - Public key for spending
 * @param {Object} options - { useSegWit: boolean }
 * @returns {Object} Complete timelock setup
 */
export function createTimelockSetup(locktime, publicKey, options = {}) {
  const { useSegWit = true } = options;

  const script = createTimelockScript(locktime, publicKey);
  const address = useSegWit
    ? createTimelockAddressSegWit(script)
    : createTimelockAddress(script);

  const unlockEstimate = estimateUnlockTime(locktime);

  return {
    script: script.toString('hex'),
    scriptAsm: bitcoin.script.toASM(script),
    address,
    addressType: useSegWit ? 'P2WSH' : 'P2SH',
    locktime,
    isBlockHeight: locktime < LOCKTIME_THRESHOLD,
    unlockEstimate,
    network: CURRENT_NETWORK === bitcoin.networks.testnet ? 'testnet' : 'mainnet',
    publicKeyHex: publicKey.toString('hex')
  };
}

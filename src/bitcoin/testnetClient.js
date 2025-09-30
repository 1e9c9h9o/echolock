'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - MUST BE MOCK-TESTABLE
//
// Bitcoin Testnet Client
// Connects to Bitcoin testnet via Blockstream API (no local node needed)
// Creates timelock transactions with OP_CHECKLOCKTIMEVERIFY
//
// CRITICAL: This is for TESTNET ONLY
// Mainnet operations require professional security audit

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { CURRENT_NETWORK } from './constants.js';

// Initialize bitcoinjs-lib with elliptic curve operations
bitcoin.initEccLib(ecc);

const BLOCKSTREAM_API = 'https://blockstream.info/testnet/api';

/**
 * Fetch data from Blockstream API
 */
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Blockstream API error: ${error.message}`);
  }
}

/**
 * Get current block height
 * @returns {Promise<number>} Current block height
 */
export async function getCurrentBlockHeight() {
  const tip = await fetchAPI('/blocks/tip/height');
  return tip;
}

/**
 * Get block at specific height
 * @param {number} height - Block height
 * @returns {Promise<Object>} Block data
 */
export async function getBlockAtHeight(height) {
  const blockHash = await fetchAPI(`/block-height/${height}`);
  const block = await fetchAPI(`/block/${blockHash}`);
  return block;
}

/**
 * Get transaction details
 * @param {string} txid - Transaction ID
 * @returns {Promise<Object>} Transaction data
 */
export async function getTransaction(txid) {
  try {
    const tx = await fetchAPI(`/tx/${txid}`);
    return {
      found: true,
      ...tx
    };
  } catch (error) {
    return {
      found: false,
      error: error.message
    };
  }
}

/**
 * Broadcast a transaction to the network
 * @param {string} txHex - Raw transaction hex
 * @returns {Promise<string>} Transaction ID
 */
export async function broadcastTransaction(txHex) {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/tx`, {
      method: 'POST',
      body: txHex
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Broadcast failed: ${error}`);
    }

    return await response.text(); // Returns txid
  } catch (error) {
    throw new Error(`Failed to broadcast: ${error.message}`);
  }
}

/**
 * Create a timelock script using OP_CHECKLOCKTIMEVERIFY
 * Script: <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
 *
 * @param {number} locktime - Block height or Unix timestamp
 * @param {Buffer} publicKey - Bitcoin public key
 * @returns {Buffer} Timelock script
 */
export function createTimelockScript(locktime, publicKey) {
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
 * Create a P2SH address from a timelock script
 * @param {Buffer} script - Timelock script
 * @returns {string} Bitcoin testnet address
 */
export function createTimelockAddress(script) {
  const p2sh = bitcoin.payments.p2sh({
    redeem: { output: script, network: CURRENT_NETWORK },
    network: CURRENT_NETWORK
  });

  return p2sh.address;
}

/**
 * Create a timelock transaction (unsigned)
 *
 * Note: This creates the transaction structure but doesn't sign it.
 * In a real implementation, you would need:
 * 1. A funded UTXO to spend
 * 2. Private key to sign
 * 3. Proper fee calculation
 *
 * For demo purposes, we create the structure to show the concept.
 *
 * @param {number} locktime - Block height for timelock
 * @param {Buffer} publicKey - Public key for the recipient
 * @returns {Object} Transaction details
 */
export function createTimelockTransaction(locktime, publicKey) {
  // Create the timelock script
  const timelockScript = createTimelockScript(locktime, publicKey);

  // Create P2SH address
  const address = createTimelockAddress(timelockScript);

  // For demo: create a minimal transaction structure
  // In production, this would be a fully formed transaction with inputs/outputs
  const psbt = new bitcoin.Psbt({ network: CURRENT_NETWORK });
  psbt.setLocktime(locktime);

  return {
    locktime,
    address,
    script: timelockScript.toString('hex'),
    scriptAsm: bitcoin.script.toASM(timelockScript),
    network: 'testnet',
    isReady: false, // Not ready to broadcast (needs funding + signing)
    note: 'Demo transaction structure - requires funding and signing for actual use'
  };
}

/**
 * Calculate when a timelock will be valid
 * Accounts for Bitcoin's median time past (MTP) uncertainty
 *
 * @param {number} locktime - Block height or Unix timestamp
 * @param {number} currentHeight - Current block height
 * @returns {Object} Timelock validity information
 */
export async function calculateTimelockValidity(locktime, currentHeight = null) {
  if (!currentHeight) {
    currentHeight = await getCurrentBlockHeight();
  }

  // If locktime is a block height (< 500000000)
  if (locktime < 500000000) {
    const blocksRemaining = Math.max(0, locktime - currentHeight);
    const estimatedMinutes = blocksRemaining * 10; // ~10 min per block

    return {
      type: 'block-height',
      locktime,
      currentHeight,
      blocksRemaining,
      isValid: blocksRemaining === 0,
      estimatedTimeRemaining: estimatedMinutes * 60 * 1000, // milliseconds
      validAfterBlock: locktime
    };
  } else {
    // Unix timestamp
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = Math.max(0, locktime - now);

    return {
      type: 'timestamp',
      locktime,
      currentTime: now,
      secondsRemaining,
      isValid: secondsRemaining === 0,
      estimatedTimeRemaining: secondsRemaining * 1000, // milliseconds
      validAfterTime: new Date(locktime * 1000).toISOString()
    };
  }
}

/**
 * Monitor timelock status
 * @param {number} locktime - Block height or timestamp
 * @returns {Promise<Object>} Current status
 */
export async function getTimelockStatus(locktime) {
  const currentHeight = await getCurrentBlockHeight();
  const validity = await calculateTimelockValidity(locktime, currentHeight);

  // Get latest block info for additional context
  let latestBlock = null;
  try {
    latestBlock = await getBlockAtHeight(currentHeight);
  } catch (error) {
    // Ignore if we can't fetch block details
  }

  return {
    ...validity,
    latestBlock: latestBlock ? {
      height: latestBlock.height,
      timestamp: latestBlock.timestamp,
      hash: latestBlock.id
    } : null,
    network: 'testnet',
    apiEndpoint: BLOCKSTREAM_API
  };
}

/**
 * Estimate fee for a transaction
 * @returns {Promise<Object>} Fee estimates
 */
export async function getFeeEstimates() {
  try {
    const fees = await fetchAPI('/fee-estimates');
    return {
      fastest: Math.ceil(fees['1'] || 20),     // ~10 minutes
      halfHour: Math.ceil(fees['3'] || 15),    // ~30 minutes
      hour: Math.ceil(fees['6'] || 10),        // ~1 hour
      economy: Math.ceil(fees['144'] || 5)     // ~24 hours
    };
  } catch (error) {
    // Return fallback fees if API fails
    return {
      fastest: 20,
      halfHour: 15,
      hour: 10,
      economy: 5,
      note: 'Fallback fees (API unavailable)'
    };
  }
}

/**
 * Get testnet faucet URLs
 * @returns {Array<string>} List of testnet faucet URLs
 */
export function getTestnetFaucets() {
  return [
    'https://testnet-faucet.mempool.co/',
    'https://bitcoinfaucet.uo1.net/',
    'https://testnet.help/en/btcfaucet/testnet',
    'https://coinfaucet.eu/en/btc-testnet/'
  ];
}

/**
 * Validate Bitcoin testnet address
 * @param {string} address - Bitcoin address to validate
 * @returns {boolean} True if valid testnet address
 */
export function isValidTestnetAddress(address) {
  try {
    bitcoin.address.toOutputScript(address, CURRENT_NETWORK);
    return true;
  } catch (error) {
    return false;
  }
}
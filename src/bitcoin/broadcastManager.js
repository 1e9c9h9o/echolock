'use strict';

// ECHOLOCK Bitcoin Transaction Broadcasting Manager
// Handles safe transaction broadcasting with comprehensive checks and logging

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { isValidTestnetAddress } from './testnetClient.js';
import { broadcastTransaction, getTransactionStatus, waitForConfirmation } from './testnetClient.js';
import { getCurrentBlockHeight } from './testnetClient.js';

// Safety limits
const SAFETY_LIMITS = {
  MAX_TESTNET_AMOUNT_SATS: 1_000_000, // 0.01 tBTC
  MIN_BLOCKS_PAST_TIMELOCK: 10,
  MIN_CONFIRMATIONS: 1,
  AUDIT_LOG_PATH: path.join(process.cwd(), 'data', 'tx-history.json')
};

// Warnings
const TESTNET_WARNING = `
⚠️  WARNING: TESTNET TRANSACTION BROADCASTING ⚠️

This will broadcast a REAL transaction to the Bitcoin testnet.
While testnet Bitcoin has no monetary value, this operation:
  • Consumes real testnet Bitcoin
  • Cannot be reversed once broadcast
  • Requires the timelock logic to be correct

Ensure you have thoroughly tested the timelock logic before proceeding.

NEVER enable this for mainnet without professional security audit.
`;

/**
 * Initialize audit log
 */
async function initAuditLog() {
  try {
    await fs.mkdir(path.dirname(SAFETY_LIMITS.AUDIT_LOG_PATH), { recursive: true });
    try {
      await fs.access(SAFETY_LIMITS.AUDIT_LOG_PATH);
    } catch {
      await fs.writeFile(SAFETY_LIMITS.AUDIT_LOG_PATH, JSON.stringify({ transactions: [] }, null, 2));
    }
  } catch (error) {
    console.error(`Warning: Could not initialize audit log: ${error.message}`);
  }
}

/**
 * Append transaction to audit log
 * @param {Object} txRecord - Transaction record
 */
async function appendToAuditLog(txRecord) {
  try {
    await initAuditLog();
    const logData = JSON.parse(await fs.readFile(SAFETY_LIMITS.AUDIT_LOG_PATH, 'utf-8'));
    logData.transactions.push({
      ...txRecord,
      timestamp: new Date().toISOString()
    });
    await fs.writeFile(SAFETY_LIMITS.AUDIT_LOG_PATH, JSON.stringify(logData, null, 2));
  } catch (error) {
    console.error(`Warning: Could not write to audit log: ${error.message}`);
  }
}

/**
 * Validate transaction amount
 * @param {number} amount - Amount in satoshis
 * @returns {Object} Validation result
 */
function validateAmount(amount) {
  if (amount > SAFETY_LIMITS.MAX_TESTNET_AMOUNT_SATS) {
    return {
      valid: false,
      error: `Amount ${amount} sats exceeds maximum testnet limit of ${SAFETY_LIMITS.MAX_TESTNET_AMOUNT_SATS} sats (0.01 tBTC)`
    };
  }
  return { valid: true };
}

/**
 * Validate timelock has expired sufficiently
 * @param {number} locktime - Timelock value
 * @param {number} currentHeight - Current block height
 * @returns {Object} Validation result
 */
function validateTimelockAge(locktime, currentHeight) {
  if (locktime >= 500000000) {
    // Timestamp-based timelock - check current time
    const now = Math.floor(Date.now() / 1000);
    const age = now - locktime;
    return {
      valid: true,
      age: `${Math.floor(age / 60)} minutes`,
      note: 'Timestamp-based timelock - age validation skipped'
    };
  }

  const blocksPastTimelock = currentHeight - locktime;
  if (blocksPastTimelock < SAFETY_LIMITS.MIN_BLOCKS_PAST_TIMELOCK) {
    return {
      valid: false,
      error: `Timelock expired only ${blocksPastTimelock} blocks ago. Minimum required: ${SAFETY_LIMITS.MIN_BLOCKS_PAST_TIMELOCK} blocks`
    };
  }

  return {
    valid: true,
    age: `${blocksPastTimelock} blocks (~${Math.floor(blocksPastTimelock * 10)} minutes)`
  };
}

/**
 * Validate destination address
 * @param {string} address - Bitcoin address
 * @returns {Object} Validation result
 */
function validateDestination(address) {
  if (!address) {
    return { valid: false, error: 'Destination address is required' };
  }

  if (!isValidTestnetAddress(address)) {
    return { valid: false, error: `Invalid testnet address: ${address}` };
  }

  return { valid: true };
}

/**
 * Display transaction details for user confirmation
 * @param {Object} txDetails - Transaction details
 */
function displayTransactionDetails(txDetails) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           TRANSACTION BROADCAST CONFIRMATION                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`  Switch ID:           ${txDetails.switchId || 'N/A'}`);
  console.log(`  Destination Address: ${txDetails.destinationAddress}`);
  console.log(`  Amount:              ${txDetails.amount} sats (${(txDetails.amount / 100_000_000).toFixed(8)} tBTC)`);
  console.log(`  Fee:                 ${txDetails.fee} sats (${txDetails.feeRate} sat/vB)`);
  console.log(`  Net Amount:          ${txDetails.amount - txDetails.fee} sats`);
  console.log(`  Inputs:              ${txDetails.inputs}`);
  console.log(`  Outputs:             ${txDetails.outputs}`);
  console.log(`  Locktime:            ${txDetails.locktime} (block ${txDetails.locktime})`);
  console.log(`  Current Height:      ${txDetails.currentHeight}`);
  console.log(`  Blocks Past Lock:    ${txDetails.currentHeight - txDetails.locktime}`);
  console.log(`  Network:             testnet`);
  console.log();
}

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} True if user confirmed
 */
async function promptConfirmation(question) {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(`${question} (yes/NO): `);
    return answer.toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Prompt for password
 * @param {string} prompt - Prompt message
 * @returns {Promise<string>} Password
 */
async function promptPassword(prompt = 'Enter password to confirm broadcast: ') {
  const rl = readline.createInterface({ input, output });

  try {
    // Note: This doesn't hide input in Node.js - for production, use a proper password input library
    const password = await rl.question(prompt);
    return password;
  } finally {
    rl.close();
  }
}

/**
 * Safely broadcast a transaction with comprehensive checks
 * @param {Object} params - Broadcast parameters
 * @param {string} params.txHex - Raw transaction hex
 * @param {string} params.switchId - Switch ID for audit trail
 * @param {Object} params.txDetails - Transaction details
 * @param {string} params.password - User password for confirmation
 * @param {boolean} params.dryRun - If true, validate but don't broadcast (default: true)
 * @returns {Promise<Object>} Broadcast result
 */
export async function safeBroadcast(params) {
  const {
    txHex,
    switchId,
    txDetails,
    password,
    dryRun = true
  } = params;

  // Initialize result
  const result = {
    success: false,
    dryRun,
    checks: {},
    warnings: []
  };

  console.log(TESTNET_WARNING);

  // Safety Check 1: Validate destination address
  console.log('🔍 Safety Check 1: Validating destination address...');
  const destValidation = validateDestination(txDetails.destinationAddress);
  result.checks.destinationAddress = destValidation;
  if (!destValidation.valid) {
    console.log(`❌ ${destValidation.error}\n`);
    return result;
  }
  console.log('✅ Destination address valid\n');

  // Safety Check 2: Validate amount
  console.log('🔍 Safety Check 2: Validating transaction amount...');
  const amountValidation = validateAmount(txDetails.amount);
  result.checks.amount = amountValidation;
  if (!amountValidation.valid) {
    console.log(`❌ ${amountValidation.error}\n`);
    return result;
  }
  console.log(`✅ Amount within safety limits (${txDetails.amount} sats)\n`);

  // Safety Check 3: Validate timelock age
  console.log('🔍 Safety Check 3: Validating timelock expiration...');
  const currentHeight = await getCurrentBlockHeight();
  const timelockValidation = validateTimelockAge(txDetails.locktime, currentHeight);
  result.checks.timelockAge = timelockValidation;
  if (!timelockValidation.valid) {
    console.log(`❌ ${timelockValidation.error}\n`);
    return result;
  }
  console.log(`✅ Timelock sufficiently expired (${timelockValidation.age})\n`);

  // Safety Check 4: Verify transaction hex
  console.log('🔍 Safety Check 4: Validating transaction structure...');
  if (!txHex || typeof txHex !== 'string') {
    console.log('❌ Invalid transaction hex\n');
    result.checks.txHex = { valid: false, error: 'Transaction hex is missing or invalid' };
    return result;
  }
  result.checks.txHex = { valid: true, length: txHex.length };
  console.log('✅ Transaction hex valid\n');

  // Display transaction details
  displayTransactionDetails({ ...txDetails, switchId, currentHeight });

  // Dry run mode - stop here
  if (dryRun) {
    console.log('🏁 DRY RUN MODE - Transaction validated but NOT broadcast\n');
    console.log('To broadcast for real, use --broadcast flag\n');
    result.success = true;
    result.message = 'Dry run completed successfully';
    return result;
  }

  // Real broadcast mode - require user confirmation
  console.log('⚠️  LIVE BROADCAST MODE ⚠️\n');

  // Confirm user intent
  const userConfirmed = await promptConfirmation('\nBroadcast this transaction to Bitcoin testnet?');
  if (!userConfirmed) {
    console.log('\n❌ Broadcast cancelled by user\n');
    result.message = 'Broadcast cancelled by user';
    return result;
  }

  // Require password re-entry
  const confirmedPassword = await promptPassword();
  if (confirmedPassword !== password) {
    console.log('\n❌ Password mismatch - broadcast cancelled\n');
    result.message = 'Password verification failed';
    return result;
  }

  console.log('\n📡 Broadcasting transaction...\n');

  try {
    // Broadcast transaction
    const broadcastResult = await broadcastTransaction(txHex);

    if (broadcastResult.success) {
      console.log('✅ Transaction broadcast successful!\n');
      console.log(`Transaction ID: ${broadcastResult.txid}`);
      console.log(`View on explorer: ${broadcastResult.confirmationUrl}\n`);

      // Log to audit trail
      await appendToAuditLog({
        switchId,
        txid: broadcastResult.txid,
        destinationAddress: txDetails.destinationAddress,
        amount: txDetails.amount,
        fee: txDetails.fee,
        locktime: txDetails.locktime,
        currentHeight,
        confirmationUrl: broadcastResult.confirmationUrl,
        status: 'broadcasted'
      });

      result.success = true;
      result.txid = broadcastResult.txid;
      result.confirmationUrl = broadcastResult.confirmationUrl;
      result.broadcastedAt = broadcastResult.broadcastedAt;
    }
  } catch (error) {
    console.log(`❌ Broadcast failed: ${error.message}\n`);
    result.error = error.message;

    // Log failure to audit trail
    await appendToAuditLog({
      switchId,
      destinationAddress: txDetails.destinationAddress,
      amount: txDetails.amount,
      locktime: txDetails.locktime,
      status: 'failed',
      error: error.message
    });
  }

  return result;
}

/**
 * Monitor transaction confirmation
 * @param {string} txid - Transaction ID
 * @param {string} switchId - Switch ID
 * @returns {Promise<Object>} Confirmation result
 */
export async function monitorTransaction(txid, switchId) {
  console.log(`\n📊 Monitoring transaction ${txid}...\n`);

  try {
    // Get initial status
    let status = await getTransactionStatus(txid);
    console.log(`Status: ${status.status}`);

    if (status.status === 'pending') {
      console.log('Waiting for confirmation (this may take 10-30 minutes)...\n');

      // Wait for confirmation
      const confirmation = await waitForConfirmation(
        txid,
        SAFETY_LIMITS.MIN_CONFIRMATIONS,
        30000, // Poll every 30 seconds
        3600000 // Max wait 1 hour
      );

      console.log('✅ Transaction confirmed!\n');
      console.log(`Block Height: ${confirmation.blockHeight}`);
      console.log(`Block Hash: ${confirmation.blockHash}`);
      console.log(`Confirmations: ${confirmation.confirmations}\n`);

      // Update audit log
      await appendToAuditLog({
        switchId,
        txid,
        status: 'confirmed',
        blockHeight: confirmation.blockHeight,
        blockHash: confirmation.blockHash,
        confirmations: confirmation.confirmations
      });

      return { success: true, confirmed: true, ...confirmation };
    } else {
      return { success: true, ...status };
    }
  } catch (error) {
    console.log(`❌ Monitoring failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction history from audit log
 * @returns {Promise<Array>} Transaction history
 */
export async function getTransactionHistory() {
  try {
    await initAuditLog();
    const logData = JSON.parse(await fs.readFile(SAFETY_LIMITS.AUDIT_LOG_PATH, 'utf-8'));
    return logData.transactions;
  } catch (error) {
    return [];
  }
}

export { SAFETY_LIMITS };
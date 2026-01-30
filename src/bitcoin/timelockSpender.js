'use strict';

// ECHOLOCK Bitcoin Timelock Spending
// Creates and signs transactions that spend from timelock addresses

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { CURRENT_NETWORK } from './constants.js';
import { getUTXOs, selectUTXOs, estimateTxSize } from './utxoManager.js';
import { getCurrentBlockHeight, getFeeEstimates, createTimelockScript } from './testnetClient.js';
import { PBKDF2_ITERATIONS, zeroize, reconstructKeyHierarchy } from '../crypto/keyDerivation.js';

// Initialize bitcoinjs-lib with elliptic curve operations
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

/**
 * Create a timelock spending transaction
 *
 * This creates a PSBT (Partially Signed Bitcoin Transaction) that spends from
 * a timelock address. The transaction must satisfy OP_CHECKLOCKTIMEVERIFY by:
 * 1. Setting nSequence to 0xFFFFFFFE or lower (enables nLockTime)
 * 2. Setting nLockTime to the timelock value or higher
 *
 * @param {Object} params - Transaction parameters
 * @param {string} params.timelockAddress - Source address with timelock
 * @param {Buffer} params.timelockScript - The timelock script to satisfy
 * @param {number} params.locktime - The timelock value (block height or timestamp)
 * @param {Buffer} params.privateKey - Private key for signing (32 bytes)
 * @param {Buffer} params.publicKey - Public key corresponding to private key (33 bytes)
 * @param {string} params.destinationAddress - Where to send funds
 * @param {number} params.feeRate - Fee rate in sat/vbyte (optional)
 * @param {boolean} params.dryRun - If true, create but don't sign transaction (default: true)
 * @returns {Promise<Object>} Transaction details
 */
export async function createTimelockSpendingTx(params) {
  const {
    timelockAddress,
    timelockScript,
    locktime,
    privateKey,
    publicKey,
    destinationAddress,
    feeRate = null,
    dryRun = true
  } = params;

  // Validate inputs
  if (!timelockAddress) {
    throw new Error('timelockAddress is required');
  }
  if (!timelockScript) {
    throw new Error('timelockScript is required');
  }
  if (!locktime) {
    throw new Error('locktime is required');
  }
  if (!publicKey) {
    throw new Error('publicKey is required');
  }
  if (!destinationAddress) {
    throw new Error('destinationAddress is required');
  }

  // 1. Fetch UTXOs from the timelock address
  const utxos = await getUTXOs(timelockAddress);

  if (utxos.length === 0) {
    throw new Error('No UTXOs found at timelock address - address needs funding');
  }

  // 2. Determine fee rate
  let actualFeeRate = feeRate;
  if (!actualFeeRate) {
    const feeEstimates = await getFeeEstimates();
    actualFeeRate = feeEstimates.halfHour; // Default to 30-minute confirmation
  }

  // 3. Estimate transaction size and calculate fee
  const estimatedSize = estimateTxSize(1, 1); // 1 input, 1 output for now
  const estimatedFee = Math.ceil(estimatedSize * actualFeeRate);

  // 4. Select UTXOs (need to cover fee)
  const { selectedUTXOs, totalValue } = selectUTXOs(utxos, estimatedFee + 10000); // Add dust threshold

  // 5. Calculate output amount (total - fee)
  const outputAmount = totalValue - estimatedFee;

  if (outputAmount < 546) {
    throw new Error(`Output amount (${outputAmount} sats) below dust threshold (546 sats)`);
  }

  // 6. Verify timelock validity
  const currentHeight = await getCurrentBlockHeight();
  if (locktime < 500000000 && locktime > currentHeight) {
    throw new Error(
      `Timelock not yet valid: requires block ${locktime}, current block ${currentHeight}`
    );
  }

  // 7. Create PSBT
  const psbt = new bitcoin.Psbt({ network: CURRENT_NETWORK });

  // Set locktime to satisfy OP_CHECKLOCKTIMEVERIFY
  psbt.setLocktime(locktime);

  // 8. Add inputs from selected UTXOs
  for (const utxo of selectedUTXOs) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xFFFFFFFE, // Required for OP_CHECKLOCKTIMEVERIFY (enables nLockTime)
      witnessUtxo: {
        script: Buffer.from(timelockScript, 'hex'),
        value: utxo.value
      },
      // For P2SH-wrapped witness
      redeemScript: Buffer.from(timelockScript, 'hex')
    });
  }

  // 9. Add output
  psbt.addOutput({
    address: destinationAddress,
    value: outputAmount
  });

  // 10. Sign transaction (unless dry run)
  let signedTxHex = null;
  let txid = null;

  if (!dryRun && privateKey) {
    const keyPair = ECPair.fromPrivateKey(privateKey, { network: CURRENT_NETWORK });

    // Sign all inputs
    for (let i = 0; i < selectedUTXOs.length; i++) {
      psbt.signInput(i, keyPair);
    }

    // Finalize inputs
    psbt.finalizeAllInputs();

    // Extract transaction
    const tx = psbt.extractTransaction();
    signedTxHex = tx.toHex();
    txid = tx.getId();
  }

  return {
    success: true,
    dryRun,
    psbt: psbt.toBase64(),
    signedTxHex,
    txid,
    details: {
      inputs: selectedUTXOs.length,
      totalInput: totalValue,
      outputs: 1,
      outputAmount,
      fee: estimatedFee,
      feeRate: actualFeeRate,
      locktime,
      timelockAddress,
      destinationAddress,
      estimatedSize
    }
  };
}

/**
 * Verify that a timelock is currently valid (can be spent)
 * @param {number} locktime - The timelock value
 * @returns {Promise<Object>} Validation result
 */
export async function verifyTimelockValidity(locktime) {
  const currentHeight = await getCurrentBlockHeight();
  const now = Math.floor(Date.now() / 1000);

  let isValid = false;
  let reason = '';

  if (locktime < 500000000) {
    // Block height based
    isValid = currentHeight >= locktime;
    reason = isValid
      ? `Timelock valid: current block ${currentHeight} >= required block ${locktime}`
      : `Timelock not yet valid: current block ${currentHeight} < required block ${locktime}`;
  } else {
    // Timestamp based
    isValid = now >= locktime;
    reason = isValid
      ? `Timelock valid: current time ${now} >= required time ${locktime}`
      : `Timelock not yet valid: current time ${now} < required time ${locktime}`;
  }

  return {
    isValid,
    reason,
    locktime,
    currentHeight,
    currentTimestamp: now
  };
}

/**
 * Broadcast a signed transaction to the Bitcoin network
 * Uses multiple broadcasting services for redundancy
 *
 * @param {string} txHex - Signed transaction hex
 * @returns {Promise<Object>} Broadcast result
 */
export async function broadcastTransaction(txHex) {
  const endpoints = [
    {
      name: 'mempool.space',
      url: CURRENT_NETWORK === bitcoin.networks.testnet
        ? 'https://mempool.space/testnet/api/tx'
        : 'https://mempool.space/api/tx',
      method: 'POST',
      contentType: 'text/plain',
    },
    {
      name: 'blockstream.info',
      url: CURRENT_NETWORK === bitcoin.networks.testnet
        ? 'https://blockstream.info/testnet/api/tx'
        : 'https://blockstream.info/api/tx',
      method: 'POST',
      contentType: 'text/plain',
    },
  ];

  const results = [];
  let successfulBroadcast = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: { 'Content-Type': endpoint.contentType },
        body: txHex,
      });

      if (response.ok) {
        const txid = await response.text();
        results.push({
          endpoint: endpoint.name,
          success: true,
          txid: txid.trim(),
        });
        if (!successfulBroadcast) {
          successfulBroadcast = txid.trim();
        }
      } else {
        const error = await response.text();
        results.push({
          endpoint: endpoint.name,
          success: false,
          error,
        });
      }
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: !!successfulBroadcast,
    txid: successfulBroadcast,
    broadcastResults: results,
  };
}

/**
 * Check transaction status in mempool and blockchain
 *
 * @param {string} txid - Transaction ID to check
 * @returns {Promise<Object>} Transaction status
 */
export async function checkTransactionStatus(txid) {
  const baseUrl = CURRENT_NETWORK === bitcoin.networks.testnet
    ? 'https://mempool.space/testnet/api'
    : 'https://mempool.space/api';

  try {
    const response = await fetch(`${baseUrl}/tx/${txid}`);

    if (response.status === 404) {
      return {
        found: false,
        status: 'not_found',
        reason: 'Transaction not found - may have been dropped from mempool',
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const txData = await response.json();

    return {
      found: true,
      txid: txData.txid,
      status: txData.status.confirmed ? 'confirmed' : 'pending',
      confirmed: txData.status.confirmed,
      blockHeight: txData.status.block_height || null,
      blockHash: txData.status.block_hash || null,
      fee: txData.fee,
      size: txData.size,
      weight: txData.weight,
    };
  } catch (error) {
    return {
      found: false,
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Monitor and rebroadcast transaction if dropped
 * Implements exponential backoff for retries
 *
 * @param {string} txHex - Signed transaction hex
 * @param {string} expectedTxid - Expected transaction ID
 * @param {Object} options - Monitoring options
 * @param {number} options.maxRetries - Maximum number of rebroadcast attempts (default: 5)
 * @param {number} options.checkIntervalMs - Initial check interval in ms (default: 60000)
 * @param {number} options.maxWaitTimeMs - Maximum total wait time in ms (default: 3600000 = 1hr)
 * @returns {Promise<Object>} Final transaction status
 */
export async function monitorAndRebroadcast(txHex, expectedTxid, options = {}) {
  const {
    maxRetries = 5,
    checkIntervalMs = 60000,
    maxWaitTimeMs = 3600000,
  } = options;

  const startTime = Date.now();
  let retryCount = 0;
  let currentInterval = checkIntervalMs;
  let lastStatus = null;

  while (Date.now() - startTime < maxWaitTimeMs) {
    // Check current status
    const status = await checkTransactionStatus(expectedTxid);
    lastStatus = status;

    // Success: Transaction confirmed
    if (status.confirmed) {
      return {
        success: true,
        status: 'confirmed',
        txid: expectedTxid,
        blockHeight: status.blockHeight,
        retryCount,
      };
    }

    // Transaction still in mempool
    if (status.found && status.status === 'pending') {
      console.log(`[TxMonitor] Transaction ${expectedTxid.slice(0, 8)}... still pending in mempool`);
      await new Promise((resolve) => setTimeout(resolve, currentInterval));
      continue;
    }

    // Transaction dropped - attempt rebroadcast
    if (!status.found || status.status === 'not_found') {
      if (retryCount >= maxRetries) {
        return {
          success: false,
          status: 'max_retries_exceeded',
          txid: expectedTxid,
          retryCount,
          error: `Transaction dropped and max retries (${maxRetries}) exceeded`,
        };
      }

      console.log(`[TxMonitor] Transaction ${expectedTxid.slice(0, 8)}... dropped from mempool, rebroadcasting (attempt ${retryCount + 1}/${maxRetries})`);

      const broadcastResult = await broadcastTransaction(txHex);

      if (broadcastResult.success) {
        console.log(`[TxMonitor] Rebroadcast successful`);
        retryCount++;
      } else {
        console.warn(`[TxMonitor] Rebroadcast failed:`, broadcastResult.broadcastResults);
        retryCount++;
      }

      // Exponential backoff for next check
      currentInterval = Math.min(currentInterval * 1.5, 300000); // Max 5 minutes
    }

    await new Promise((resolve) => setTimeout(resolve, currentInterval));
  }

  return {
    success: false,
    status: 'timeout',
    txid: expectedTxid,
    retryCount,
    lastStatus,
    error: `Monitoring timed out after ${maxWaitTimeMs}ms`,
  };
}

/**
 * Decrypt Bitcoin private key using password
 * Supports both legacy (v1) and hierarchical HKDF (v2) key derivation
 *
 * @param {Object} encryptedData - Encrypted private key data
 * @param {string} encryptedData.encryptedPrivateKey - Base64 encoded ciphertext
 * @param {string} encryptedData.privateKeyIV - Base64 encoded IV
 * @param {string} encryptedData.privateKeyAuthTag - Base64 encoded auth tag
 * @param {string} encryptedData.privateKeySalt - Base64 encoded salt
 * @param {number} [encryptedData.keyVersion] - Key version (1=legacy, 2=HKDF)
 * @param {string} password - Password to decrypt with
 * @param {string} [switchId] - Switch ID (required for keyVersion 2)
 * @returns {Promise<Buffer>} Decrypted private key
 */
export async function decryptPrivateKey(encryptedData, password, switchId = null) {
  const crypto = await import('crypto');
  const { decrypt } = await import('../crypto/encryption.js');

  const salt = Buffer.from(encryptedData.privateKeySalt, 'base64');
  const keyVersion = encryptedData.keyVersion || 1;

  let decryptionKey;

  if (keyVersion === 2) {
    // NEW: Use hierarchical key derivation with context binding
    if (!switchId) {
      throw new Error('switchId is required for keyVersion 2 decryption');
    }

    const keyHierarchy = reconstructKeyHierarchy(password, switchId, salt);
    decryptionKey = keyHierarchy.bitcoinKey;

    // Zeroize other keys we don't need
    zeroize(keyHierarchy.encryptionKey);
    zeroize(keyHierarchy.authKey);
    zeroize(keyHierarchy.nostrKey);
    keyHierarchy.fragmentKeys.forEach(k => zeroize(k));
  } else {
    // Legacy: Direct PBKDF2 derivation (no context binding)
    decryptionKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  }

  // Decrypt private key
  const ciphertext = Buffer.from(encryptedData.encryptedPrivateKey, 'base64');
  const iv = Buffer.from(encryptedData.privateKeyIV, 'base64');
  const authTag = Buffer.from(encryptedData.privateKeyAuthTag, 'base64');

  const decryptedKey = decrypt(ciphertext, decryptionKey, iv, authTag);

  // SECURITY: Zeroize decryption key after use
  zeroize(decryptionKey);

  // NOTE: Caller is responsible for zeroizing the returned decryptedKey after use
  return decryptedKey;
}
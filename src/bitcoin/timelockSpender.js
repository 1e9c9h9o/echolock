'use strict';

// ECHOLOCK Bitcoin Timelock Spending
// Creates and signs transactions that spend from timelock addresses

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { CURRENT_NETWORK } from './constants.js';
import { getUTXOs, selectUTXOs, estimateTxSize } from './utxoManager.js';
import { getCurrentBlockHeight, getFeeEstimates, createTimelockScript } from './testnetClient.js';
import { PBKDF2_ITERATIONS, zeroize } from '../crypto/keyDerivation.js';

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
 * Decrypt Bitcoin private key using password
 * @param {Object} encryptedData - Encrypted private key data
 * @param {string} encryptedData.encryptedPrivateKey - Base64 encoded ciphertext
 * @param {string} encryptedData.privateKeyIV - Base64 encoded IV
 * @param {string} encryptedData.privateKeyAuthTag - Base64 encoded auth tag
 * @param {string} encryptedData.privateKeySalt - Base64 encoded salt
 * @param {string} password - Password to decrypt with
 * @returns {Promise<Buffer>} Decrypted private key
 */
export async function decryptPrivateKey(encryptedData, password) {
  const crypto = await import('crypto');
  const { decrypt } = await import('../crypto/encryption.js');

  // Derive master key from password using centralized iteration count
  const salt = Buffer.from(encryptedData.privateKeySalt, 'base64');
  const masterKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');

  // Decrypt private key
  const ciphertext = Buffer.from(encryptedData.encryptedPrivateKey, 'base64');
  const iv = Buffer.from(encryptedData.privateKeyIV, 'base64');
  const authTag = Buffer.from(encryptedData.privateKeyAuthTag, 'base64');

  const decryptedKey = decrypt(ciphertext, masterKey, iv, authTag);

  // SECURITY: Zeroize master key after use
  zeroize(masterKey);

  // NOTE: Caller is responsible for zeroizing the returned decryptedKey after use
  return decryptedKey;
}
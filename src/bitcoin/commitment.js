'use strict';

/**
 * Bitcoin Timelock Commitment
 *
 * Creates on-chain proof that a dead man's switch timer was set.
 * Anyone can verify this commitment using any block explorer.
 *
 * How it works:
 * 1. User creates a timelock script with their expiry time
 * 2. User sends dust + fees to the timelock address
 * 3. This TX is now on-chain proof: "Timer set at block X, expires at time Y"
 * 4. Before expiry: User can spend to prove they're alive (optional)
 * 5. After expiry: Guardians can reference this as trigger signal
 *
 * @see CLAUDE.md - Phase 4: Bitcoin Commitments
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import {
  createTimelockScript,
  createTimelockAddressSegWit,
  parseTimelockScript,
  checkTimelockValidity,
} from './timelockScript.js';
import { estimateFee, PRIORITY } from './feeEstimation.js';

// Initialize libraries
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// Dust threshold for Bitcoin outputs
const DUST_THRESHOLD = 546; // satoshis

// Commitment amount (dust + buffer)
const DEFAULT_COMMITMENT_SATS = 1000;

/**
 * Commitment transaction data
 */
export class BitcoinCommitment {
  constructor(data) {
    this.switchId = data.switchId;
    this.locktime = data.locktime;
    this.publicKey = data.publicKey;
    this.address = data.address;
    this.script = data.script;
    this.txid = data.txid || null;
    this.vout = data.vout ?? null;
    this.amount = data.amount || DEFAULT_COMMITMENT_SATS;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.confirmedAt = data.confirmedAt || null;
    this.blockHeight = data.blockHeight || null;
    this.status = data.status || 'pending'; // pending, confirmed, spent, expired
    this.network = data.network || 'testnet';
  }

  /**
   * Get verification URL for block explorer
   */
  getExplorerUrl() {
    if (!this.txid) return null;

    if (this.network === 'mainnet') {
      return `https://mempool.space/tx/${this.txid}`;
    }
    return `https://mempool.space/testnet/tx/${this.txid}`;
  }

  /**
   * Get address URL for block explorer
   */
  getAddressUrl() {
    if (this.network === 'mainnet') {
      return `https://mempool.space/address/${this.address}`;
    }
    return `https://mempool.space/testnet/address/${this.address}`;
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      switchId: this.switchId,
      locktime: this.locktime,
      publicKey: this.publicKey,
      address: this.address,
      script: this.script,
      txid: this.txid,
      vout: this.vout,
      amount: this.amount,
      createdAt: this.createdAt,
      confirmedAt: this.confirmedAt,
      blockHeight: this.blockHeight,
      status: this.status,
      network: this.network,
    };
  }

  /**
   * Deserialize from storage
   */
  static fromJSON(json) {
    return new BitcoinCommitment(json);
  }
}

/**
 * Create a new Bitcoin commitment for a switch
 *
 * @param {string} switchId - The switch identifier
 * @param {number} locktime - Unix timestamp when switch expires
 * @param {Buffer} publicKey - User's Bitcoin public key (33 bytes compressed)
 * @param {Object} options - { network: 'testnet' | 'mainnet', amount: number }
 * @returns {BitcoinCommitment} Commitment ready for funding
 */
export function createCommitment(switchId, locktime, publicKey, options = {}) {
  const { network = 'testnet', amount = DEFAULT_COMMITMENT_SATS } = options;

  // Validate public key
  if (!Buffer.isBuffer(publicKey)) {
    publicKey = Buffer.from(publicKey, 'hex');
  }

  if (publicKey.length !== 33) {
    throw new Error('Public key must be 33 bytes (compressed)');
  }

  // Create timelock script
  const script = createTimelockScript(locktime, publicKey);
  const address = createTimelockAddressSegWit(script);

  return new BitcoinCommitment({
    switchId,
    locktime,
    publicKey: publicKey.toString('hex'),
    address,
    script: script.toString('hex'),
    amount,
    network,
    status: 'pending',
  });
}

/**
 * Create a funding transaction for the commitment
 *
 * This transaction sends funds to the timelock address.
 * The user must sign this with their wallet.
 *
 * @param {BitcoinCommitment} commitment - The commitment to fund
 * @param {Array} utxos - Available UTXOs [{ txid, vout, value, scriptPubKey }]
 * @param {string} changeAddress - Address for change output
 * @param {number} feeRate - Fee rate in sat/vB
 * @returns {Object} { psbt, fee, totalInput, totalOutput }
 */
export function createFundingTransaction(commitment, utxos, changeAddress, feeRate) {
  const network = commitment.network === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

  const psbt = new bitcoin.Psbt({ network });

  // Calculate inputs needed
  let totalInput = 0;
  const selectedUtxos = [];

  // Estimate transaction size (1 input, 2 outputs)
  const estimatedVSize = 140; // ~140 vbytes for simple tx
  const estimatedFee = Math.ceil(estimatedVSize * feeRate);
  const targetAmount = commitment.amount + estimatedFee;

  // Select UTXOs (simple greedy selection)
  for (const utxo of utxos.sort((a, b) => b.value - a.value)) {
    if (totalInput >= targetAmount) break;
    selectedUtxos.push(utxo);
    totalInput += utxo.value;
  }

  if (totalInput < targetAmount) {
    throw new Error(`Insufficient funds. Need ${targetAmount} sats, have ${totalInput} sats`);
  }

  // Add inputs
  for (const utxo of selectedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.value,
      },
    });
  }

  // Add commitment output
  psbt.addOutput({
    address: commitment.address,
    value: commitment.amount,
  });

  // Add change output if needed
  const change = totalInput - commitment.amount - estimatedFee;
  if (change > DUST_THRESHOLD) {
    psbt.addOutput({
      address: changeAddress,
      value: change,
    });
  }

  return {
    psbt,
    psbtHex: psbt.toHex(),
    psbtBase64: psbt.toBase64(),
    fee: estimatedFee,
    totalInput,
    totalOutput: commitment.amount + (change > DUST_THRESHOLD ? change : 0),
  };
}

/**
 * Create a spend transaction to prove user is alive (optional)
 *
 * Spending from the timelock address before expiry proves the user
 * is still in control. This is optional - the main proof is the
 * commitment existing on-chain.
 *
 * @param {BitcoinCommitment} commitment - The commitment to spend
 * @param {string} destinationAddress - Where to send the funds
 * @param {Buffer} privateKey - User's private key for signing
 * @param {number} currentBlockHeight - Current Bitcoin block height
 * @param {number} feeRate - Fee rate in sat/vB
 * @returns {Object} { txHex, txid } Signed transaction ready to broadcast
 */
export function createSpendTransaction(
  commitment,
  destinationAddress,
  privateKey,
  currentBlockHeight,
  feeRate
) {
  if (!commitment.txid || commitment.vout === null) {
    throw new Error('Commitment has not been funded yet');
  }

  // Check if timelock has expired (can we spend?)
  const validity = checkTimelockValidity(commitment.locktime, currentBlockHeight);

  // For spending before expiry, the timelock must NOT be valid yet
  // If it's valid, we can spend but so can anyone with the release mechanism

  const network = commitment.network === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

  const keyPair = ECPair.fromPrivateKey(
    Buffer.isBuffer(privateKey) ? privateKey : Buffer.from(privateKey, 'hex'),
    { network }
  );

  const script = Buffer.from(commitment.script, 'hex');

  // Create transaction
  const tx = new bitcoin.Transaction();
  tx.version = 2;

  // Set nLockTime to the timelock value
  tx.locktime = commitment.locktime;

  // Add input with nSequence < 0xFFFFFFFF (required for CLTV)
  tx.addInput(
    Buffer.from(commitment.txid, 'hex').reverse(),
    commitment.vout,
    0xfffffffe // Sequence number must be < 0xffffffff for CLTV
  );

  // Calculate fee
  const estimatedVSize = 150; // ~150 vbytes for P2WSH spend
  const fee = Math.ceil(estimatedVSize * feeRate);
  const outputValue = commitment.amount - fee;

  if (outputValue < DUST_THRESHOLD) {
    throw new Error('Output would be dust. Need more sats in commitment.');
  }

  // Add output
  tx.addOutput(bitcoin.address.toOutputScript(destinationAddress, network), outputValue);

  // Create witness for P2WSH
  const hashType = bitcoin.Transaction.SIGHASH_ALL;
  const signatureHash = tx.hashForWitnessV0(
    0, // input index
    script,
    commitment.amount,
    hashType
  );

  const signature = bitcoin.script.signature.encode(
    keyPair.sign(signatureHash),
    hashType
  );

  // Witness: <signature> <script>
  tx.setWitness(0, [signature, script]);

  return {
    txHex: tx.toHex(),
    txid: tx.getId(),
    fee,
    outputValue,
  };
}

/**
 * Verify a commitment exists on-chain
 *
 * @param {BitcoinCommitment} commitment - The commitment to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyCommitment(commitment) {
  if (!commitment.txid) {
    return {
      verified: false,
      reason: 'Commitment has no transaction ID',
    };
  }

  const baseUrl = commitment.network === 'mainnet'
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  try {
    // Fetch transaction
    const txResponse = await fetch(`${baseUrl}/tx/${commitment.txid}`);
    if (!txResponse.ok) {
      return {
        verified: false,
        reason: 'Transaction not found on blockchain',
      };
    }

    const tx = await txResponse.json();

    // Check if output exists at correct address
    const output = tx.vout[commitment.vout ?? 0];
    if (!output) {
      return {
        verified: false,
        reason: 'Output not found in transaction',
      };
    }

    if (output.scriptpubkey_address !== commitment.address) {
      return {
        verified: false,
        reason: 'Output address does not match commitment',
      };
    }

    // Check confirmation status
    const confirmed = tx.status?.confirmed ?? false;
    const blockHeight = tx.status?.block_height ?? null;

    // Check if output is spent
    const utxoResponse = await fetch(
      `${baseUrl}/tx/${commitment.txid}/outspend/${commitment.vout ?? 0}`
    );
    const utxoData = await utxoResponse.json();
    const spent = utxoData.spent ?? false;

    return {
      verified: true,
      confirmed,
      blockHeight,
      spent,
      spentTxid: spent ? utxoData.txid : null,
      amount: output.value,
      locktime: commitment.locktime,
      explorerUrl: commitment.getExplorerUrl(),
    };
  } catch (error) {
    return {
      verified: false,
      reason: `Verification failed: ${error.message}`,
    };
  }
}

/**
 * Get current block height from mempool.space
 */
export async function getCurrentBlockHeight(network = 'testnet') {
  const baseUrl = network === 'mainnet'
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  const response = await fetch(`${baseUrl}/blocks/tip/height`);
  if (!response.ok) {
    throw new Error('Failed to fetch block height');
  }

  return parseInt(await response.text(), 10);
}

/**
 * Estimate when commitment timelock will be valid
 */
export function estimateUnlockTime(commitment) {
  const now = Math.floor(Date.now() / 1000);

  if (commitment.locktime < 500000000) {
    // Block height based - can't estimate exactly without current height
    return {
      type: 'block_height',
      targetBlock: commitment.locktime,
      estimateAvailable: false,
    };
  }

  // Timestamp based
  const secondsRemaining = Math.max(0, commitment.locktime - now);
  const mtpUncertainty = 2 * 60 * 60; // 2 hours

  return {
    type: 'timestamp',
    unlockTimestamp: commitment.locktime,
    earliestUnlock: new Date(commitment.locktime * 1000),
    latestUnlock: new Date((commitment.locktime + mtpUncertainty) * 1000),
    secondsRemaining,
    hoursRemaining: Math.ceil(secondsRemaining / 3600),
    isValid: secondsRemaining <= 0,
  };
}

/**
 * Create proof data for Nostr publication
 *
 * This creates a verifiable proof that can be published to Nostr,
 * allowing guardians to verify the Bitcoin commitment.
 */
export function createCommitmentProof(commitment) {
  return {
    type: 'bitcoin_commitment',
    version: 1,
    switchId: commitment.switchId,
    network: commitment.network,
    txid: commitment.txid,
    vout: commitment.vout,
    address: commitment.address,
    locktime: commitment.locktime,
    amount: commitment.amount,
    script: commitment.script,
    explorerUrl: commitment.getExplorerUrl(),
    createdAt: commitment.createdAt,
  };
}

export default {
  BitcoinCommitment,
  createCommitment,
  createFundingTransaction,
  createSpendTransaction,
  verifyCommitment,
  getCurrentBlockHeight,
  estimateUnlockTime,
  createCommitmentProof,
};

'use strict';

// ECHOLOCK Bitcoin UTXO Management
// Fetches and selects UTXOs for spending from Bitcoin timelock addresses

/**
 * Fetch UTXOs for a given address from Blockstream API
 * @param {string} address - Bitcoin address
 * @returns {Promise<Array>} Array of UTXO objects
 */
export async function getUTXOs(address) {
  const BLOCKSTREAM_API = 'https://blockstream.info/testnet/api';

  try {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}/utxo`);

    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.status} ${response.statusText}`);
    }

    const utxos = await response.json();

    // Transform to standard format
    return utxos.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      status: utxo.status,
      confirmed: utxo.status?.confirmed || false
    }));
  } catch (error) {
    throw new Error(`UTXO fetch failed: ${error.message}`);
  }
}

/**
 * Select UTXOs to meet target amount using simple first-fit algorithm
 * @param {Array} utxos - Array of available UTXOs
 * @param {number} targetAmount - Target amount in satoshis
 * @returns {Object} { selectedUTXOs, totalValue, change }
 */
export function selectUTXOs(utxos, targetAmount) {
  if (!utxos || utxos.length === 0) {
    throw new Error('No UTXOs available for selection');
  }

  if (targetAmount <= 0) {
    throw new Error('Target amount must be positive');
  }

  // Filter confirmed UTXOs only
  const confirmedUTXOs = utxos.filter(utxo => utxo.confirmed);

  if (confirmedUTXOs.length === 0) {
    throw new Error('No confirmed UTXOs available');
  }

  // Sort by value descending (larger UTXOs first for efficiency)
  const sortedUTXOs = [...confirmedUTXOs].sort((a, b) => b.value - a.value);

  // Simple first-fit selection
  const selected = [];
  let totalValue = 0;

  for (const utxo of sortedUTXOs) {
    selected.push(utxo);
    totalValue += utxo.value;

    if (totalValue >= targetAmount) {
      break;
    }
  }

  if (totalValue < targetAmount) {
    throw new Error(`Insufficient funds: have ${totalValue} sats, need ${targetAmount} sats`);
  }

  const change = totalValue - targetAmount;

  return {
    selectedUTXOs: selected,
    totalValue,
    change
  };
}

/**
 * Calculate transaction size estimate (for fee estimation)
 * @param {number} inputCount - Number of inputs
 * @param {number} outputCount - Number of outputs
 * @returns {number} Estimated size in vbytes
 */
export function estimateTxSize(inputCount, outputCount) {
  // Rough estimates for P2WSH inputs and P2WPKH outputs
  const INPUT_SIZE = 68; // P2WSH input (witness data)
  const OUTPUT_SIZE = 31; // P2WPKH output
  const OVERHEAD = 10; // Version, locktime, etc.

  return OVERHEAD + (inputCount * INPUT_SIZE) + (outputCount * OUTPUT_SIZE);
}
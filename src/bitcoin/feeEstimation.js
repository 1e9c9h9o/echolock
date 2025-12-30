'use strict';

// SECURITY BOUNDARY: ISOLATED MODULE - MUST BE MOCK-TESTABLE
//
// Bitcoin fee estimation to handle fee market volatility
// Critical for ensuring timelock transactions confirm in time
//
// CRITICAL: Insufficient fees can cause transaction delays
// This could result in secrets being released late or not at all

/**
 * Estimate appropriate fee rate for transaction confirmation
 * Uses mempool.space API with fallback to conservative defaults
 *
 * @param {number} targetBlocks - Number of blocks for confirmation target
 *   - 1 block (~10 min): Use 'fastestFee'
 *   - 3 blocks (~30 min): Use 'halfHourFee'
 *   - 6 blocks (~1 hour): Use 'hourFee'
 *   - 144+ blocks (~24 hours): Use 'economyFee'
 * @returns {Promise<number>} Fee rate in satoshis per vbyte
 */
export async function estimateFeeRate(targetBlocks = 6) {
  try {
    // Determine which network endpoint to use
    const network = process.env.BITCOIN_NETWORK || 'testnet';
    const baseUrl = network === 'mainnet'
      ? 'https://mempool.space/api'
      : 'https://mempool.space/testnet/api';

    // Fetch fee estimates from mempool.space
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/v1/fees/recommended`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EchoLock/1.0'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`mempool.space API returned ${response.status}`);
    }

    const fees = await response.json();

    // Map target blocks to appropriate fee tier
    // mempool.space returns: fastestFee, halfHourFee, hourFee, economyFee, minimumFee
    if (targetBlocks <= 1) {
      return fees.fastestFee || FALLBACK_FEE_RATES.urgent;
    } else if (targetBlocks <= 3) {
      return fees.halfHourFee || FALLBACK_FEE_RATES.urgent;
    } else if (targetBlocks <= 6) {
      return fees.hourFee || FALLBACK_FEE_RATES.normal;
    } else if (targetBlocks <= 144) {
      return fees.economyFee || FALLBACK_FEE_RATES.economy;
    } else {
      return fees.minimumFee || FALLBACK_FEE_RATES.economy;
    }
  } catch (error) {
    // Log warning but don't fail - use fallback rates
    console.warn(`Fee estimation failed, using fallback: ${error.message}`);

    // Return appropriate fallback based on target
    if (targetBlocks <= 1) {
      return FALLBACK_FEE_RATES.urgent;
    } else if (targetBlocks <= 6) {
      return FALLBACK_FEE_RATES.normal;
    } else {
      return FALLBACK_FEE_RATES.economy;
    }
  }
}

/**
 * Calculate total fee for a transaction
 * @param {number} inputCount - Number of inputs
 * @param {number} outputCount - Number of outputs
 * @param {number} feeRate - Fee rate in satoshis per byte
 * @returns {number} Total fee in satoshis
 */
export function calculateFee(inputCount, outputCount, feeRate) {
  // Rough transaction size estimation
  // P2PKH input: ~148 bytes, P2PKH output: ~34 bytes, overhead: ~10 bytes
  const estimatedSize = (inputCount * 148) + (outputCount * 34) + 10;
  return Math.ceil(estimatedSize * feeRate);
}

/**
 * Get conservative fallback fee rates (satoshis per byte)
 * Used when API fee estimation fails
 */
export const FALLBACK_FEE_RATES = {
  urgent: 50,    // ~10 minutes
  normal: 20,    // ~1 hour
  economy: 5     // ~24 hours
};
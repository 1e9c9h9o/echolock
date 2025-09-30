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
 * @param {number} targetBlocks - Number of blocks for confirmation target
 * @returns {number} Fee rate in satoshis per byte
 */
export function estimateFeeRate(targetBlocks = 6) {
  // TODO: Implement fee estimation
  // Should use multiple data sources:
  // - mempool.space API
  // - Bitcoin Core RPC estimatesmartfee
  // - Manual fallback rates
  throw new Error('Not implemented');
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
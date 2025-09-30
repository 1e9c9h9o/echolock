'use strict';

// Tests for Bitcoin Fee Estimation module
import { calculateFee, FALLBACK_FEE_RATES } from '../../src/bitcoin/feeEstimation.js';

describe('Bitcoin Fee Estimation', () => {
  describe('calculateFee', () => {
    test('should calculate fee for single input/output', () => {
      const fee = calculateFee(1, 1, 5); // 5 sat/byte

      // 1*148 + 1*34 + 10 = 192 bytes
      // 192 * 5 = 960 sats
      expect(fee).toBe(960);
    });

    test('should calculate fee for multiple inputs', () => {
      const fee = calculateFee(3, 1, 10);

      // 3*148 + 1*34 + 10 = 488 bytes
      // 488 * 10 = 4880 sats
      expect(fee).toBe(4880);
    });

    test('should calculate fee for multiple outputs', () => {
      const fee = calculateFee(1, 3, 20);

      // 1*148 + 3*34 + 10 = 260 bytes
      // 260 * 20 = 5200 sats
      expect(fee).toBe(5200);
    });

    test('should handle zero inputs (edge case)', () => {
      const fee = calculateFee(0, 1, 5);

      // 0*148 + 1*34 + 10 = 44 bytes
      // 44 * 5 = 220 sats
      expect(fee).toBe(220);
    });

    test('should handle zero outputs (edge case)', () => {
      const fee = calculateFee(1, 0, 5);

      // 1*148 + 0*34 + 10 = 158 bytes
      // 158 * 5 = 790 sats
      expect(fee).toBe(790);
    });

    test('should handle large transaction (100 inputs)', () => {
      const fee = calculateFee(100, 2, 1);

      // 100*148 + 2*34 + 10 = 14878 bytes
      // 14878 * 1 = 14878 sats
      expect(fee).toBe(14878);
    });

    test('should ceil fractional results', () => {
      const fee = calculateFee(1, 1, 0.5); // Non-integer fee rate

      // 192 * 0.5 = 96.0 -> ceil -> 96
      expect(fee).toBe(96);
    });

    test('should handle high fee rate (urgent)', () => {
      const fee = calculateFee(1, 1, 50);

      // 192 * 50 = 9600 sats
      expect(fee).toBe(9600);
    });

    test('should handle low fee rate (economy)', () => {
      const fee = calculateFee(1, 1, 1);

      // 192 * 1 = 192 sats
      expect(fee).toBe(192);
    });

    test('should scale linearly with inputs', () => {
      const fee1 = calculateFee(1, 1, 10);
      const fee2 = calculateFee(2, 1, 10);

      // Difference should be 148 * 10 = 1480
      expect(fee2 - fee1).toBe(1480);
    });

    test('should scale linearly with outputs', () => {
      const fee1 = calculateFee(1, 1, 10);
      const fee2 = calculateFee(1, 2, 10);

      // Difference should be 34 * 10 = 340
      expect(fee2 - fee1).toBe(340);
    });

    test('should scale linearly with fee rate', () => {
      const fee1 = calculateFee(1, 1, 10);
      const fee2 = calculateFee(1, 1, 20);

      // Double fee rate -> double fee
      expect(fee2).toBe(fee1 * 2);
    });

    test('should handle batch transaction (10 inputs, 10 outputs)', () => {
      const fee = calculateFee(10, 10, 5);

      // 10*148 + 10*34 + 10 = 1830 bytes
      // 1830 * 5 = 9150 sats
      expect(fee).toBe(9150);
    });

    test('should handle consolidation transaction (many inputs, 1 output)', () => {
      const fee = calculateFee(50, 1, 3);

      // 50*148 + 1*34 + 10 = 7444 bytes
      // 7444 * 3 = 22332 sats
      expect(fee).toBe(22332);
    });

    test('should handle distribution transaction (1 input, many outputs)', () => {
      const fee = calculateFee(1, 50, 3);

      // 1*148 + 50*34 + 10 = 1858 bytes
      // 1858 * 3 = 5574 sats
      expect(fee).toBe(5574);
    });

    test('should handle mempool congestion scenario (high fee)', () => {
      const fee = calculateFee(2, 2, 100); // Very high fee rate

      // 2*148 + 2*34 + 10 = 374 bytes
      // 374 * 100 = 37400 sats
      expect(fee).toBe(37400);
    });

    test('should handle low priority scenario (low fee)', () => {
      const fee = calculateFee(1, 1, 1);

      // 192 * 1 = 192 sats
      expect(fee).toBe(192);
    });
  });

  describe('FALLBACK_FEE_RATES', () => {
    test('should have urgent rate defined', () => {
      expect(FALLBACK_FEE_RATES.urgent).toBeDefined();
      expect(FALLBACK_FEE_RATES.urgent).toBeGreaterThan(0);
    });

    test('should have normal rate defined', () => {
      expect(FALLBACK_FEE_RATES.normal).toBeDefined();
      expect(FALLBACK_FEE_RATES.normal).toBeGreaterThan(0);
    });

    test('should have economy rate defined', () => {
      expect(FALLBACK_FEE_RATES.economy).toBeDefined();
      expect(FALLBACK_FEE_RATES.economy).toBeGreaterThan(0);
    });

    test('should have urgent > normal > economy', () => {
      expect(FALLBACK_FEE_RATES.urgent).toBeGreaterThan(FALLBACK_FEE_RATES.normal);
      expect(FALLBACK_FEE_RATES.normal).toBeGreaterThan(FALLBACK_FEE_RATES.economy);
    });

    test('should provide reasonable fallback values', () => {
      // Reasonable ranges for testnet
      expect(FALLBACK_FEE_RATES.urgent).toBeGreaterThanOrEqual(10);
      expect(FALLBACK_FEE_RATES.urgent).toBeLessThanOrEqual(100);

      expect(FALLBACK_FEE_RATES.normal).toBeGreaterThanOrEqual(5);
      expect(FALLBACK_FEE_RATES.normal).toBeLessThanOrEqual(50);

      expect(FALLBACK_FEE_RATES.economy).toBeGreaterThanOrEqual(1);
      expect(FALLBACK_FEE_RATES.economy).toBeLessThanOrEqual(20);
    });
  });
});
'use strict';

// Unit tests for Bitcoin fee estimation

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { estimateFeeRate, calculateFee, FALLBACK_FEE_RATES } from '../../src/bitcoin/feeEstimation.js';

describe('Fee Estimation', () => {
  describe('estimateFeeRate', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return urgent fee for 1 block target', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fastestFee: 100,
          halfHourFee: 50,
          hourFee: 25,
          economyFee: 10,
          minimumFee: 5
        })
      });

      const fee = await estimateFeeRate(1);
      expect(fee).toBe(100);
    });

    it('should return halfHour fee for 3 block target', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fastestFee: 100,
          halfHourFee: 50,
          hourFee: 25,
          economyFee: 10,
          minimumFee: 5
        })
      });

      const fee = await estimateFeeRate(3);
      expect(fee).toBe(50);
    });

    it('should return hour fee for 6 block target', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fastestFee: 100,
          halfHourFee: 50,
          hourFee: 25,
          economyFee: 10,
          minimumFee: 5
        })
      });

      const fee = await estimateFeeRate(6);
      expect(fee).toBe(25);
    });

    it('should return economy fee for 144 block target', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fastestFee: 100,
          halfHourFee: 50,
          hourFee: 25,
          economyFee: 10,
          minimumFee: 5
        })
      });

      const fee = await estimateFeeRate(144);
      expect(fee).toBe(10);
    });

    it('should return minimum fee for 1000+ block target', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fastestFee: 100,
          halfHourFee: 50,
          hourFee: 25,
          economyFee: 10,
          minimumFee: 5
        })
      });

      const fee = await estimateFeeRate(1000);
      expect(fee).toBe(5);
    });

    it('should use fallback rates when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const fee = await estimateFeeRate(6);
      expect(fee).toBe(FALLBACK_FEE_RATES.normal);
    });

    it('should use fallback rates when API returns error status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const fee = await estimateFeeRate(6);
      expect(fee).toBe(FALLBACK_FEE_RATES.normal);
    });

    it('should use urgent fallback for 1 block when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const fee = await estimateFeeRate(1);
      expect(fee).toBe(FALLBACK_FEE_RATES.urgent);
    });

    it('should use economy fallback for 144+ blocks when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const fee = await estimateFeeRate(200);
      expect(fee).toBe(FALLBACK_FEE_RATES.economy);
    });
  });

  describe('calculateFee', () => {
    it('should calculate fee for single input/output', () => {
      // 1 input (148 bytes) + 1 output (34 bytes) + 10 overhead = 192 bytes
      const fee = calculateFee(1, 1, 10);
      expect(fee).toBe(1920); // 192 * 10 = 1920 sats
    });

    it('should calculate fee for multiple inputs', () => {
      // 2 inputs (296 bytes) + 1 output (34 bytes) + 10 overhead = 340 bytes
      const fee = calculateFee(2, 1, 10);
      expect(fee).toBe(3400); // 340 * 10 = 3400 sats
    });

    it('should calculate fee for multiple outputs', () => {
      // 1 input (148 bytes) + 2 outputs (68 bytes) + 10 overhead = 226 bytes
      const fee = calculateFee(1, 2, 10);
      expect(fee).toBe(2260); // 226 * 10 = 2260 sats
    });

    it('should scale with fee rate', () => {
      const fee1 = calculateFee(1, 1, 10);
      const fee2 = calculateFee(1, 1, 20);
      expect(fee2).toBe(fee1 * 2);
    });

    it('should ceil fractional fees', () => {
      const fee = calculateFee(1, 1, 11);
      // 192 * 11 = 2112, which is already an integer
      expect(Number.isInteger(fee)).toBe(true);
    });
  });

  describe('FALLBACK_FEE_RATES', () => {
    it('should have urgent rate', () => {
      expect(FALLBACK_FEE_RATES.urgent).toBeDefined();
      expect(FALLBACK_FEE_RATES.urgent).toBeGreaterThan(0);
    });

    it('should have normal rate', () => {
      expect(FALLBACK_FEE_RATES.normal).toBeDefined();
      expect(FALLBACK_FEE_RATES.normal).toBeGreaterThan(0);
    });

    it('should have economy rate', () => {
      expect(FALLBACK_FEE_RATES.economy).toBeDefined();
      expect(FALLBACK_FEE_RATES.economy).toBeGreaterThan(0);
    });

    it('should have ordered rates (urgent > normal > economy)', () => {
      expect(FALLBACK_FEE_RATES.urgent).toBeGreaterThan(FALLBACK_FEE_RATES.normal);
      expect(FALLBACK_FEE_RATES.normal).toBeGreaterThan(FALLBACK_FEE_RATES.economy);
    });
  });
});

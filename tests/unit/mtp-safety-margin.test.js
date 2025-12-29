'use strict';

/**
 * Tests for MTP Safety Margin Enforcement
 *
 * These tests verify that check-ins are rejected when too close
 * to the Bitcoin timelock expiry, preventing race conditions.
 */

import { describe, test, expect } from '@jest/globals';
import {
  isCheckInSafe,
  MTP_SAFETY_MARGIN_SECONDS,
  MTP_SAFETY_MARGIN_MS
} from '../../src/bitcoin/timelockScript.js';

describe('MTP Safety Margin', () => {
  describe('Constants', () => {
    test('safety margin should be 4 hours', () => {
      expect(MTP_SAFETY_MARGIN_SECONDS).toBe(4 * 60 * 60); // 4 hours in seconds
      expect(MTP_SAFETY_MARGIN_MS).toBe(4 * 60 * 60 * 1000); // 4 hours in ms
    });
  });

  describe('isCheckInSafe', () => {
    test('should be safe when far from timelock', () => {
      const timelockHeight = 1000;
      const currentHeight = 500;

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.isSafe).toBe(true);
      expect(result.warningLevel).toBe('NONE');
      expect(result.blocksUntilTimelock).toBe(500);
    });

    test('should be unsafe when timelock already passed', () => {
      const timelockHeight = 1000;
      const currentHeight = 1001; // Past the timelock

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.isSafe).toBe(false);
      expect(result.warningLevel).toBe('CRITICAL');
      expect(result.blocksUntilTimelock).toBe(0);
      expect(result.reason).toContain('already become valid');
    });

    test('should be unsafe when at exact timelock height', () => {
      const timelockHeight = 1000;
      const currentHeight = 1000; // Exactly at timelock

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.isSafe).toBe(false);
      expect(result.warningLevel).toBe('CRITICAL');
    });

    test('should be unsafe within safety margin (~24 blocks)', () => {
      const timelockHeight = 1000;
      const currentHeight = 980; // 20 blocks away (< 24 block safety margin)

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.isSafe).toBe(false);
      expect(result.warningLevel).toBe('HIGH');
      expect(result.blocksUntilTimelock).toBe(20);
      expect(result.recommendation).toContain('rejected');
    });

    test('should be safe just outside safety margin', () => {
      const timelockHeight = 1000;
      const currentHeight = 970; // 30 blocks away (> 24 block safety margin)

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.isSafe).toBe(true);
      expect(result.warningLevel).toBe('NONE');
    });

    test('should warn about app timer desync', () => {
      const timelockHeight = 1000;
      const currentHeight = 800; // 200 blocks away

      // App timer shows way more time than Bitcoin
      // 200 blocks * 10 min = ~2000 min
      // But app timer says 5000 min remaining (much more)
      const applicationExpiryMs = Date.now() + (5000 * 60 * 1000);

      const result = isCheckInSafe(timelockHeight, currentHeight, applicationExpiryMs);

      expect(result.isSafe).toBe(true);
      expect(result.warningLevel).toBe('MEDIUM');
      expect(result.reason).toContain('desynchronized');
      expect(result.desyncMs).toBeGreaterThan(0);
    });

    test('should not warn when app timer and Bitcoin are in sync', () => {
      const timelockHeight = 1000;
      const currentHeight = 800; // 200 blocks away

      // App timer matches Bitcoin estimate (~2000 minutes)
      const estimatedBitcoinMs = 200 * 10 * 60 * 1000;
      const applicationExpiryMs = Date.now() + estimatedBitcoinMs;

      const result = isCheckInSafe(timelockHeight, currentHeight, applicationExpiryMs);

      expect(result.isSafe).toBe(true);
      expect(result.warningLevel).toBe('NONE');
    });

    test('should calculate correct blocks until timelock', () => {
      const timelockHeight = 1500;
      const currentHeight = 1000;

      const result = isCheckInSafe(timelockHeight, currentHeight);

      expect(result.blocksUntilTimelock).toBe(500);
    });

    test('should calculate time until safety margin', () => {
      const timelockHeight = 1000;
      const currentHeight = 800; // 200 blocks = ~2000 min

      const result = isCheckInSafe(timelockHeight, currentHeight);

      // 200 blocks * 10 min/block = 2000 min = 120000000 ms
      // Minus 4 hour safety margin = 120000000 - 14400000 = 105600000 ms
      expect(result.timeUntilSafetyMargin).toBeGreaterThan(0);
    });

    test('should handle edge case at safety margin boundary', () => {
      const timelockHeight = 1000;
      // ~24 blocks is the safety margin
      const currentHeight = 976; // Exactly 24 blocks away

      const result = isCheckInSafe(timelockHeight, currentHeight);

      // Should be unsafe (at or below safety margin)
      expect(result.isSafe).toBe(false);
      expect(result.warningLevel).toBe('HIGH');
    });

    test('should handle one block over safety margin', () => {
      const timelockHeight = 1000;
      const currentHeight = 975; // 25 blocks away (1 over safety margin)

      const result = isCheckInSafe(timelockHeight, currentHeight);

      // Should be safe (just over safety margin)
      expect(result.isSafe).toBe(true);
    });
  });

  describe('Warning Levels', () => {
    test('CRITICAL when timelock has passed', () => {
      const result = isCheckInSafe(1000, 1001);
      expect(result.warningLevel).toBe('CRITICAL');
    });

    test('HIGH when within safety margin', () => {
      const result = isCheckInSafe(1000, 990);
      expect(result.warningLevel).toBe('HIGH');
    });

    test('MEDIUM when desync detected', () => {
      const futureAppExpiry = Date.now() + (1000 * 60 * 60 * 1000); // Way in future
      const result = isCheckInSafe(1000, 500, futureAppExpiry);
      expect(result.warningLevel).toBe('MEDIUM');
    });

    test('NONE when safe', () => {
      const result = isCheckInSafe(1000, 500);
      expect(result.warningLevel).toBe('NONE');
    });
  });

  describe('Recommendations', () => {
    test('should provide recommendation when unsafe', () => {
      const result = isCheckInSafe(1000, 1001);
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    test('should provide recommendation for HIGH warning', () => {
      const result = isCheckInSafe(1000, 990);
      expect(result.recommendation).toContain('rejected');
    });

    test('should provide recommendation for desync', () => {
      const futureAppExpiry = Date.now() + (1000 * 60 * 60 * 1000);
      const result = isCheckInSafe(1000, 500, futureAppExpiry);
      expect(result.recommendation).toContain('Bitcoin timelock');
    });

    test('should have null recommendation when safe with no warnings', () => {
      const result = isCheckInSafe(1000, 500);
      expect(result.recommendation).toBeNull();
    });
  });
});

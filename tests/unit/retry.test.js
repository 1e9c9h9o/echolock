'use strict';

/**
 * Tests for Retry Utilities
 *
 * Verifies retry logic, exponential backoff, and error handling
 */

import { describe, test, expect, jest } from '@jest/globals';
import {
  withRetry,
  isRetryableError,
  calculateRetryDelay,
  createRetryWrapper,
  DEFAULT_RETRY_CONFIG,
  RETRY_PRESETS
} from '../../src/api/utils/retry.js';

describe('Retry Utilities', () => {
  describe('isRetryableError', () => {
    test('should identify network errors as retryable', () => {
      const networkErrors = [
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
        { code: 'ECONNREFUSED' },
        { code: 'EAI_AGAIN' }
      ];

      for (const error of networkErrors) {
        expect(isRetryableError(error)).toBe(true);
      }
    });

    test('should identify 5xx errors as retryable', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 502 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 504 })).toBe(true);
    });

    test('should identify 429 rate limit as retryable', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
    });

    test('should identify connection errors by message', () => {
      expect(isRetryableError({ message: 'connection refused' })).toBe(true);
      expect(isRetryableError({ message: 'timeout occurred' })).toBe(true);
    });

    test('should not identify 4xx client errors as retryable', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
      expect(isRetryableError({ status: 403 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
    });

    test('should not identify generic errors as retryable', () => {
      expect(isRetryableError(new Error('Something went wrong'))).toBe(false);
      expect(isRetryableError({ message: 'validation failed' })).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    test('should calculate exponential backoff', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitterMs: 0 }; // Remove jitter for testing

      const delay0 = calculateRetryDelay(0, config);
      const delay1 = calculateRetryDelay(1, config);
      const delay2 = calculateRetryDelay(2, config);

      // With multiplier of 2:
      // attempt 0: 1000 * 2^0 = 1000
      // attempt 1: 1000 * 2^1 = 2000
      // attempt 2: 1000 * 2^2 = 4000
      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
    });

    test('should cap at maxDelayMs', () => {
      const config = {
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterMs: 0
      };

      // Attempt 10 would be 1000 * 2^10 = 1,024,000, but should be capped
      const delay = calculateRetryDelay(10, config);
      expect(delay).toBe(5000);
    });

    test('should add jitter', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitterMs: 1000 };

      const delays = new Set();
      for (let i = 0; i < 10; i++) {
        delays.add(calculateRetryDelay(0, config));
      }

      // Should have variation due to jitter
      expect(delays.size).toBeGreaterThan(1);
    });

    test('should use default config values', () => {
      const delay = calculateRetryDelay(0);

      // Should be initialDelayMs + some jitter
      expect(delay).toBeGreaterThanOrEqual(DEFAULT_RETRY_CONFIG.initialDelayMs);
      expect(delay).toBeLessThanOrEqual(
        DEFAULT_RETRY_CONFIG.initialDelayMs + DEFAULT_RETRY_CONFIG.jitterMs
      );
    });
  });

  describe('withRetry', () => {
    test('should succeed on first try', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 3, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 }
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    test('should retry on retryable error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'success after retry';
      };

      const result = await withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 3, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 }
      });

      expect(result).toBe('success after retry');
      expect(attempts).toBe(3);
    });

    test('should throw after max retries exceeded', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Always fails');
        error.code = 'ECONNRESET';
        throw error;
      };

      await expect(withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 2, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 }
      })).rejects.toThrow('Always fails');

      expect(attempts).toBe(3); // Initial + 2 retries
    });

    test('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Business logic error'); // Not retryable
      };

      await expect(withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 3, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 }
      })).rejects.toThrow('Business logic error');

      expect(attempts).toBe(1); // No retries
    });

    test('should call onRetry callback', async () => {
      let attempts = 0;
      const onRetryCalls = [];

      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Retry me');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'done';
      };

      await withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 3, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 },
        onRetry: (error, attempt, delay) => {
          onRetryCalls.push({ error: error.message, attempt, delay });
        }
      });

      expect(onRetryCalls).toHaveLength(1);
      expect(onRetryCalls[0].attempt).toBe(0);
    });

    test('should use custom shouldRetry function', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Custom error');
        error.customRetryable = attempts < 3;
        throw error;
      };

      await expect(withRetry(fn, {
        operationName: 'test-op',
        config: { maxRetries: 5, initialDelayMs: 10, jitterMs: 0, backoffMultiplier: 1 },
        shouldRetry: (error) => error.customRetryable === true
      })).rejects.toThrow('Custom error');

      expect(attempts).toBe(3); // Stopped when customRetryable became false
    });
  });

  describe('createRetryWrapper', () => {
    test('should create a reusable retry wrapper', async () => {
      const wrapper = createRetryWrapper('my-operation', {
        maxRetries: 2,
        initialDelayMs: 10,
        jitterMs: 0,
        backoffMultiplier: 1
      });

      let attempts = 0;
      const result = await wrapper(async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Retry');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'wrapped success';
      });

      expect(result).toBe('wrapped success');
      expect(attempts).toBe(2);
    });
  });

  describe('RETRY_PRESETS', () => {
    test('critical preset should have more retries', () => {
      expect(RETRY_PRESETS.critical.maxRetries).toBeGreaterThan(DEFAULT_RETRY_CONFIG.maxRetries);
    });

    test('fast preset should have fewer retries and shorter delays', () => {
      expect(RETRY_PRESETS.fast.maxRetries).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxRetries);
      expect(RETRY_PRESETS.fast.initialDelayMs).toBeLessThan(DEFAULT_RETRY_CONFIG.initialDelayMs);
    });

    test('background preset should have many retries with long max delay', () => {
      expect(RETRY_PRESETS.background.maxRetries).toBeGreaterThan(5);
      expect(RETRY_PRESETS.background.maxDelayMs).toBeGreaterThan(60000);
    });
  });
});

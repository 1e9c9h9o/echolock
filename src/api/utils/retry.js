'use strict';

/**
 * Retry Utilities
 *
 * Provides robust retry logic with exponential backoff for critical operations
 * like check-ins where network failures should not result in missed deadlines.
 */

import { logger } from './logger.js';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,    // 1 second
  maxDelayMs: 30000,       // 30 seconds
  backoffMultiplier: 2,    // Exponential backoff
  jitterMs: 500,           // Random jitter to prevent thundering herd
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'NETWORK_ERROR'
  ]
};

/**
 * Check if an error is retryable
 *
 * @param {Error} error - The error to check
 * @param {string[]} retryableErrors - List of retryable error codes
 * @returns {boolean} Whether the error is retryable
 */
export function isRetryableError(error, retryableErrors = DEFAULT_RETRY_CONFIG.retryableErrors) {
  // Network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Database connection errors
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Rate limiting (429)
  if (error.status === 429) {
    return true;
  }

  return false;
}

/**
 * Calculate delay for next retry with exponential backoff and jitter
 *
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateRetryDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitterMs } = config;

  // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * jitterMs;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {string} options.operationName - Name for logging
 * @param {Object} options.config - Override retry configuration
 * @param {Function} options.onRetry - Callback called before each retry
 * @param {Function} options.shouldRetry - Custom function to determine if should retry
 * @returns {Promise<*>} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const {
    operationName = 'operation',
    config = DEFAULT_RETRY_CONFIG,
    onRetry = null,
    shouldRetry = null
  } = options;

  const { maxRetries, retryableErrors } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetryError = shouldRetry
        ? shouldRetry(error, attempt)
        : isRetryableError(error, retryableErrors);

      if (!shouldRetryError || attempt >= maxRetries) {
        logger.error(`${operationName} failed after ${attempt + 1} attempts:`, {
          error: error.message,
          code: error.code,
          attempts: attempt + 1
        });
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateRetryDelay(attempt, config);

      logger.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, {
        error: error.message,
        code: error.code
      });

      // Call onRetry callback if provided
      if (onRetry) {
        await onRetry(error, attempt, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for a specific operation
 *
 * @param {string} operationName - Name for logging
 * @param {Object} config - Retry configuration
 * @returns {Function} Wrapper function
 */
export function createRetryWrapper(operationName, config = {}) {
  return function retryWrapper(fn) {
    return withRetry(fn, { operationName, config });
  };
}

/**
 * Retry configuration presets for different scenarios
 */
export const RETRY_PRESETS = {
  // Critical operations (check-ins) - more retries, longer delays
  critical: {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterMs: 1000
  },

  // Fast operations - fewer retries, shorter delays
  fast: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterMs: 250
  },

  // Background operations - many retries with long waits
  background: {
    maxRetries: 10,
    initialDelayMs: 5000,
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 1.5,
    jitterMs: 2000
  }
};

export default {
  withRetry,
  createRetryWrapper,
  isRetryableError,
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
  RETRY_PRESETS
};

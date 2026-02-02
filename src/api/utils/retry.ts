'use strict';

/**
 * Retry Utilities
 *
 * Provides robust retry logic with exponential backoff for critical operations
 * like check-ins where network failures should not result in missed deadlines.
 */

import { logger } from './logger.js';

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableErrors?: string[];
}

/**
 * Error with optional code and status properties
 */
interface RetryableError extends Error {
  code?: string;
  status?: number;
}

/**
 * Options for withRetry function
 */
export interface WithRetryOptions {
  operationName?: string;
  config?: Partial<RetryConfig>;
  onRetry?: ((error: RetryableError, attempt: number, delay: number) => Promise<void> | void) | null;
  shouldRetry?: ((error: RetryableError, attempt: number) => boolean) | null;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
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
 */
export function isRetryableError(
  error: RetryableError,
  retryableErrors: string[] = DEFAULT_RETRY_CONFIG.retryableErrors ?? []
): boolean {
  // Network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Database connection errors
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.status !== undefined && error.status >= 500 && error.status < 600) {
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
 */
export function calculateRetryDelay(
  attempt: number,
  config: Partial<RetryConfig> = DEFAULT_RETRY_CONFIG
): number {
  const {
    initialDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
    jitterMs = DEFAULT_RETRY_CONFIG.jitterMs
  } = config;

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
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const {
    operationName = 'operation',
    config = DEFAULT_RETRY_CONFIG,
    onRetry = null,
    shouldRetry = null
  } = options;

  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, retryableErrors } = mergedConfig;

  let lastError: RetryableError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const error = err as RetryableError;
      lastError = error;

      // Check if we should retry
      const shouldRetryError = shouldRetry
        ? shouldRetry(error, attempt)
        : isRetryableError(error, retryableErrors ?? []);

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
 */
export function createRetryWrapper(
  operationName: string,
  config: Partial<RetryConfig> = {}
): <T>(fn: () => Promise<T>) => Promise<T> {
  return function retryWrapper<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, { operationName, config });
  };
}

/**
 * Retry configuration presets for different scenarios
 */
export const RETRY_PRESETS: Record<string, RetryConfig> = {
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

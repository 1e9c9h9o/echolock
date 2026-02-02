'use strict';

/**
 * Sentry Error Tracking Integration (v10+)
 *
 * Provides error tracking and performance monitoring via Sentry.
 * Configuration is done via environment variables:
 * - SENTRY_DSN: Your Sentry DSN (required for Sentry to work)
 * - SENTRY_ENVIRONMENT: Environment name (defaults to NODE_ENV)
 * - SENTRY_RELEASE: Release version (optional)
 * - SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (0.0 - 1.0)
 *
 * @see https://docs.sentry.io/platforms/node/
 */

import * as Sentry from '@sentry/node';
import type { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

// Track if Sentry is initialized
let isInitialized = false;

/**
 * Initialize Sentry
 * Call this early in your application startup, before other middleware
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info('Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || undefined,

      // Performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

      // Only send errors in production by default
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-csrf-token'];
        }

        // Remove sensitive data from request body
        if (event.request?.data) {
          try {
            const data = typeof event.request.data === 'string'
              ? JSON.parse(event.request.data)
              : event.request.data;

            // Redact known sensitive fields
            const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey', 'encryptedMessage'];
            for (const field of sensitiveFields) {
              if (data[field]) {
                data[field] = '[REDACTED]';
              }
            }
            event.request.data = JSON.stringify(data);
          } catch {
            // If parsing fails, leave data as-is
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors that are usually client-side issues
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        // Rate limiting is expected behavior
        'Rate limit exceeded',
        // Invalid tokens are expected for expired sessions
        'Invalid token',
        'Token expired',
      ],
    });

    isInitialized = true;
    logger.info('Sentry initialized', {
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Setup Sentry request handler middleware (v10+)
 * Must be the first middleware (before routes)
 */
export function setupSentryRequestHandler(app: Express): void {
  if (!isInitialized) return;

  // In Sentry v10+, use setupExpressErrorHandler at the end
  // Request tracking is automatic with the SDK initialization
  logger.debug('Sentry request tracking enabled (automatic in v10+)');
}

/**
 * Setup Sentry tracing middleware for performance monitoring
 * In v10+, tracing is automatic when tracesSampleRate > 0
 */
export function setupSentryTracing(app: Express): void {
  if (!isInitialized) return;
  logger.debug('Sentry tracing enabled (automatic in v10+)');
}

/**
 * Setup Sentry error handler middleware (v10+)
 * Must be after all routes and other error handlers
 */
export function setupSentryErrorHandler(app: Express): void {
  if (!isInitialized) return;

  // Use the v10+ API for Express error handling
  Sentry.setupExpressErrorHandler(app);
  logger.debug('Sentry error handler installed');
}

/**
 * Capture an exception manually
 * Use this for errors you catch but still want to track
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | undefined {
  if (!isInitialized) {
    logger.error('Error (Sentry not initialized):', error);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message (non-error event)
 * Use for warnings or notable events
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    logger.info(`Message (Sentry not initialized): ${message}`);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 * Call this after authentication to associate errors with users
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!isInitialized) return;

  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs are attached to errors to show what happened before
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Create a custom Sentry middleware for setting user context
 * Use after authentication middleware
 */
export function sentryUserMiddleware() {
  return (req: Request & { user?: { id: string; email?: string } }, _res: Response, next: NextFunction): void => {
    if (isInitialized && req.user) {
      Sentry.setUser({
        id: req.user.id,
        email: req.user.email,
      });
    }
    next();
  };
}

/**
 * Flush Sentry events before shutdown
 * Call this during graceful shutdown
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  if (!isInitialized) return;

  try {
    await Sentry.flush(timeout);
    logger.debug('Sentry events flushed');
  } catch (error) {
    logger.warn('Failed to flush Sentry events:', error);
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return isInitialized;
}

export default {
  initSentry,
  setupSentryRequestHandler,
  setupSentryTracing,
  setupSentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  sentryUserMiddleware,
  flushSentry,
  isSentryInitialized,
};
